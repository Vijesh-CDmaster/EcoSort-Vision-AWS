
"use client";

import React, { useState, useRef, useMemo, useEffect, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Upload, X, Loader2, Sparkles, Camera, Video, FlipHorizontal, Server, ServerCrash, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Icons } from "@/components/icons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useCamera } from "@/hooks/use-camera";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useScanStore, type WasteBin } from "@/components/scan/scan-store";
import { useSettingsStore } from "@/hooks/use-settings-store";
import { Badge } from "@/components/ui/badge";
import { playSuccessSound } from "@/lib/sounds";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useBehavioralInsights } from "@/hooks/use-behavioral-insights";

type Detection = {
  label: string;
  confidence: number;
  box?: { x1: number; y1: number; x2: number; y2: number };
};

type ScanResult = {
  wasteType: string;
  wasteTypeConfidence: number;
  binSuggestion: WasteBin;
  binConfidence: number;
  imageUrl: string;
  detections?: Detection[];
};

type YoloStatus = "checking" | "online" | "offline";

type YoloStableVote = {
  label: string;
  votes: number;
  window: number;
  frames: number;
  ready: boolean;
  isStable: boolean;
};

function guessBinFromLabel(label: string): WasteBin {
  const l = label.toLowerCase();
  if (l.includes("glass")) {
    return "glass";
  }
  if (
    l.includes("paper") ||
    l.includes("cardboard") ||
    l.includes("plastic") ||
    l.includes("metal") ||
    l.includes("can") ||
    l.includes("bottle")
  ) {
    return "plastic";
  }
  if (l.includes("food") || l.includes("organic") || l.includes("compost") || l.includes("fruit") || l.includes("vegetable")) {
    return "compost";
  }
  return "landfill";
}

const binInfo = {
  plastic: {
    icon: Icons.Recycling,
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    label: "Plastic",
  },
  glass: {
    icon: Icons.Glass,
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    label: "Glass",
  },
  compost: {
    icon: Icons.Compost,
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    label: "Compost",
  },
  landfill: {
    icon: Icons.Landfill,
    color: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
    label: "Landfill",
  },
};

const DetectionBox = ({ detection, videoWidth, videoHeight }: { detection: Detection; videoWidth: number; videoHeight: number }) => {
  if (!detection.box || videoWidth === 0 || videoHeight === 0) return null;

  const { x1, y1, x2, y2 } = detection.box;
  
  const width = x2 - x1;
  const height = y2 - y1;

  return (
    <div
      className="absolute border-2 border-primary rounded-md shadow-lg"
      style={{
        left: `${(x1 / videoWidth) * 100}%`,
        top: `${(y1 / videoHeight) * 100}%`,
        width: `${(width / videoWidth) * 100}%`,
        height: `${(height / videoHeight) * 100}%`,
      }}
    >
      <div className="absolute -top-7 left-0 bg-primary text-primary-foreground text-xs font-semibold px-2 py-0.5 rounded-t-md whitespace-nowrap">
        {detection.label} ({(detection.confidence * 100).toFixed(0)}%)
      </div>
    </div>
  );
};


export function WasteScanner() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [tab, setTab] = useState<"upload" | "camera">("upload");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [recentScans, setRecentScans] = useState<ScanResult[]>([]);
  const { addScan } = useScanStore();
  const { detectionConfidence, enableSoundEffects, enableLiveDetection } = useSettingsStore();
  const [yoloStatus, setYoloStatus] = useState<YoloStatus>("checking");
  const [showMistakeWarning, setShowMistakeWarning] = useState(false);
  const insights = useBehavioralInsights();
  const [isCameraScanning, setIsCameraScanning] = useState(false);
  const scanStreamIdRef = useRef<string>(crypto.randomUUID());
  
  const {
    videoRef,
    isCameraOn,
    hasCameraPermission,
    startCamera,
    stopCamera,
    toggleCamera,
    captureFrame,
    flipCamera,
  } = useCamera();

  const [liveDetections, setLiveDetections] = useState<Detection[]>([]);
  const isScanningLive = useRef(false);
  const videoSizeRef = useRef({ width: 0, height: 0 });

  const placeholderImage = useMemo(() => PlaceHolderImages.find(p => p.id === 'scanner-placeholder'), []);

  useEffect(() => {
    const checkYoloStatus = async () => {
      try {
        const res = await fetch("/api/yolo/health");
        const data = await res.json();
        if (res.ok && data.ok) {
          setYoloStatus("online");
        } else {
          setYoloStatus("offline");
        }
      } catch (err) {
        setYoloStatus("offline");
      }
    };

    checkYoloStatus();
    const interval = setInterval(checkYoloStatus, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const handleFileChange = (selectedFile: File | null) => {
    if (selectedFile) {
      if (!selectedFile.type.startsWith("image/")) {
        toast({
          variant: "destructive",
          title: "Invalid File Type",
          description: "Please upload an image file.",
        });
        return;
      }
      setResult(null);
      setShowMistakeWarning(false);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleClear = useCallback(() => {
    setPreviewUrl(null);
    setResult(null);
    setLiveDetections([]);
    setShowMistakeWarning(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleScan = useCallback(async (
    imageUrl: string | null,
    options: {
      source: "upload" | "camera";
      isLiveScan?: boolean;
    }
  ) => {
    if (!imageUrl) return;

    if (!options.isLiveScan) {
      setIsLoading(true);
      setResult(null);
      setShowMistakeWarning(false);
    }

    try {
      const yoloRes = await fetch("/api/yolo/predict", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ image: imageUrl, conf: detectionConfidence, source: options.source }),
      });

      if (!yoloRes.ok) {
        const err = await yoloRes.json().catch(() => null);
        throw new Error(err?.error ? String(err.error) : `YOLO service returned ${yoloRes.status}`);
      }

      const yoloData = await yoloRes.json();
      const top = yoloData?.top;
      const detections = Array.isArray(yoloData?.detections) ? yoloData.detections : [];
      
      if (options.isLiveScan) {
        setLiveDetections(detections);
        return;
      }

      if (top?.label) {
        const wasteType = String(top.label);
        const wasteTypeConfidence = Number(top.confidence ?? 0);
        const binSuggestion = guessBinFromLabel(wasteType);

        const newResult: ScanResult = {
          wasteType,
          wasteTypeConfidence,
          binSuggestion,
          binConfidence: wasteTypeConfidence,
          imageUrl,
          detections,
        };

        setResult(newResult);
        setRecentScans(prev => [newResult, ...prev.slice(0, 4)]);
        addScan({ source: options.source, ...newResult });

        if (enableSoundEffects) {
          playSuccessSound();
        }

        if (insights?.mostCommonMistake && insights.mostCommonMistake.item.toLowerCase() === newResult.wasteType.toLowerCase()) {
          setShowMistakeWarning(true);
        }
      } else {
        if (!options.isLiveScan) {
          toast({
            variant: "destructive",
            title: "No Detection",
            description: "No object detected. Try moving closer or improving lighting.",
          });
        }
      }
    } catch (error) {
      if (!options.isLiveScan) {
        console.error("AI classification failed:", error);
        toast({
          variant: "destructive",
          title: "Scan Failed",
          description: error instanceof Error ? error.message : "Could not classify the item. Ensure the YOLO service is running.",
        });
      }
    } finally {
      if (!options.isLiveScan) {
        setIsLoading(false);
      }
    }
  }, [addScan, toast, detectionConfidence, enableSoundEffects, insights]);
  
  const handleCapture = useCallback(async () => {
    if (isCameraScanning) return;
    setIsCameraScanning(true);
    setIsLoading(true);
    setResult(null);
    setShowMistakeWarning(false);

    try {
      scanStreamIdRef.current = crypto.randomUUID();
      const FRAMES = 5;
      const INTERVAL_MS = 250;
      let lastFrame: string | null = null;

      for (let i = 0; i < FRAMES; i++) {
        const currentFrame = await captureFrame();
        if (!currentFrame) {
          await new Promise((r) => setTimeout(r, INTERVAL_MS));
          continue;
        }
        lastFrame = currentFrame;

        // Send frame for voting, but don't process result yet
        fetch("/api/yolo/predict", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            image: currentFrame,
            conf: detectionConfidence,
            source: "camera",
            vote: true,
            streamId: scanStreamIdRef.current,
            voteWindow: FRAMES,
            voteMin: 3,
          }),
        });

        await new Promise((r) => setTimeout(r, INTERVAL_MS));
      }

      if (!lastFrame) {
        throw new Error("Could not capture frames from camera");
      }
      setPreviewUrl(lastFrame);
      toggleCamera(false);

      const yoloRes = await fetch("/api/yolo/predict", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          image: lastFrame,
          conf: detectionConfidence,
          source: "camera",
          vote: true,
          streamId: scanStreamIdRef.current,
          voteWindow: FRAMES,
          voteMin: 3,
        }),
      });

      if (!yoloRes.ok) throw new Error("Final prediction failed");
      const yoloData = await yoloRes.json();
      const stable = (yoloData?.stable ?? null) as YoloStableVote | null;
      const detections = yoloData?.detections || [];
      const label = stable?.label && stable.label !== "Thinking..." ? stable.label : "unknown";
      const votes = Number(stable?.votes ?? 0);
      const window = Number(stable?.window ?? FRAMES);
      const voteConfidence = window > 0 ? Math.min(1, Math.max(0, votes / window)) : 0;
      
      const newResult: ScanResult = {
        wasteType: label,
        wasteTypeConfidence: voteConfidence,
        binSuggestion: guessBinFromLabel(label),
        binConfidence: voteConfidence,
        imageUrl: lastFrame,
        detections: detections,
      };

      setResult(newResult);
      setRecentScans((prev) => [newResult, ...prev.slice(0, 4)]);
      addScan({ source: "camera", ...newResult });
      if (enableSoundEffects) playSuccessSound();
      if (insights?.mostCommonMistake && insights.mostCommonMistake.item.toLowerCase() === newResult.wasteType.toLowerCase()) {
        setShowMistakeWarning(true);
      }
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Scan Failed",
        description: e instanceof Error ? e.message : "Camera scan failed",
      });
    } finally {
      setIsLoading(false);
      setIsCameraScanning(false);
    }
  }, [captureFrame, toast, isCameraScanning, detectionConfidence, addScan, enableSoundEffects, insights, toggleCamera]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;

    const liveScanLoop = async () => {
      if (isCameraOn && videoRef.current && !isScanningLive.current) {
        isScanningLive.current = true;
        try {
          const frame = await captureFrame();
          if (frame) {
            await handleScan(frame, { source: 'camera', isLiveScan: true });
          }
        } finally {
          isScanningLive.current = false;
        }
      }
    };

    if (isCameraOn && yoloStatus === 'online' && enableLiveDetection) {
      intervalId = setInterval(liveScanLoop, 500);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (isCameraOn) {
        setLiveDetections([]);
      }
    };
  }, [isCameraOn, yoloStatus, captureFrame, handleScan, videoRef, enableLiveDetection]);
  
  useEffect(() => {
    if (tab === "camera") {
      startCamera();
    } else {
      stopCamera();
    }
  }, [tab, startCamera, stopCamera]);

  const handleDragEvents = (e: React.DragEvent<HTMLDivElement>, isEntering: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(isEntering);
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    handleDragEvents(e, false);
    const droppedFile = e.dataTransfer.files && e.dataTransfer.files[0];
    handleFileChange(droppedFile);
  };

  const SuggestedBinCard = ({ bin }: { bin: WasteBin }) => {
    const { icon: BinIcon, color, label } = binInfo[bin];
    return (
      <div className={cn("flex flex-col items-center justify-center p-6 rounded-lg", color)}>
        <BinIcon className="w-16 h-16" />
        <p className="mt-4 text-2xl font-bold">{label}</p>
      </div>
    );
  };

  const onVideoMetadataLoaded = () => {
    if (videoRef.current) {
      videoSizeRef.current = {
        width: videoRef.current.videoWidth,
        height: videoRef.current.videoHeight
      };
    }
  }

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
        video.addEventListener('loadedmetadata', onVideoMetadataLoaded);
        return () => {
            video.removeEventListener('loadedmetadata', onVideoMetadataLoaded);
        }
    }
  }, [videoRef]);
  
  const isScanDisabled = yoloStatus !== "online";

  return (
    <div className="space-y-6">
       <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-4">
            <span>Scanner Control</span>
            {yoloStatus === "checking" && (
              <Badge variant="outline"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Checking AI Service...</Badge>
            )}
            {yoloStatus === "online" && (
              <Badge variant="secondary" className="border-green-500/50"><Server className="mr-2 h-4 w-4 text-green-500" />AI Service Online</Badge>
            )}
            {yoloStatus === "offline" && (
              <Badge variant="destructive"><ServerCrash className="mr-2 h-4 w-4" />AI Service Offline</Badge>
            )}
          </CardTitle>
           {yoloStatus === "offline" && (
              <Alert variant="destructive" className="mt-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>AI Service Offline</AlertTitle>
                <AlertDescription>
                  <p>The web app cannot connect to the AI detection service.</p>
                  <p className="mt-2 font-semibold">Please check the following:</p>
                  <ol className="list-decimal list-inside space-y-3 mt-2 text-sm">
                      <li>
                          <strong>Is the AI Service running?</strong>
                          <p className="pl-5 text-xs text-muted-foreground">The Python service must be running in a separate terminal. See the project's `README.md` file for the full setup guide.</p>
                      </li>
                      <li>
                          <strong>Is the URL configured correctly?</strong>
                          <ul className="list-disc list-inside pl-5 mt-1 space-y-1 text-xs text-muted-foreground">
                              <li>In a cloud IDE, you must provide the public URL for the AI service in the `.env` file.</li>
                              <li>The file should contain: <code className="bg-muted px-1 rounded-sm text-foreground">YOLO_SERVICE_URL=https://...</code></li>
                              <li>After editing the `.env` file, you **must restart this web app** for the change to take effect.</li>
                          </ul>
                      </li>
                  </ol>
                </AlertDescription>
              </Alert>
           )}
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={(v) => setTab(v as "upload" | "camera")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload" disabled={isScanDisabled}>
                <Upload className="mr-2 h-4 w-4" /> Upload Image
              </TabsTrigger>
              <TabsTrigger value="camera" disabled={isScanDisabled || hasCameraPermission === false}>
                <Video className="mr-2 h-4 w-4" /> Live Camera
              </TabsTrigger>
            </TabsList>
            <TabsContent value="upload">
              <div
                className={cn(
                  "mt-4 flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg transition-colors",
                  isDragging ? "border-primary bg-accent" : "border-border",
                  isScanDisabled ? "cursor-not-allowed bg-muted/50" : "border-border hover:border-primary/50 cursor-pointer"
                )}
                onClick={() => !isScanDisabled && fileInputRef.current?.click()}
                onDragEnter={(e) => !isScanDisabled && handleDragEvents(e, true)}
                onDragLeave={(e) => !isScanDisabled && handleDragEvents(e, false)}
                onDragOver={(e) => !isScanDisabled && e.preventDefault()}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                  disabled={isScanDisabled}
                />
                <div className="text-center">
                  <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                  <p className="mt-4 font-semibold">
                    {isScanDisabled ? "AI Service Offline" : "Drag & drop or click to upload"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    PNG, JPG, or WEBP files accepted.
                  </p>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="camera">
               <div className="mt-4 relative aspect-video w-full">
                 <video ref={videoRef} className={cn("w-full h-full rounded-md object-cover", {"hidden": !isCameraOn})} autoPlay muted playsInline onLoadedMetadata={onVideoMetadataLoaded} />
                 
                {!isCameraOn && (
                  <div className="w-full h-full bg-muted rounded-md flex items-center justify-center">
                     {hasCameraPermission === false ? (
                      <Alert variant="destructive" className="w-auto">
                        <AlertTitle>Camera Access Denied</AlertTitle>
                        <AlertDescription>
                          Enable camera permissions to use this feature.
                        </AlertDescription>
                      </Alert>
                     ) : (
                      <p className="text-muted-foreground">Camera is off. {isScanDisabled && "AI Service is offline."}</p>
                     )}
                  </div>
                )}
                
                {isCameraOn && (
                  <>
                    {liveDetections.map((detection, index) => (
                      <DetectionBox 
                        key={index}
                        detection={detection}
                        videoWidth={videoSizeRef.current.width}
                        videoHeight={videoSizeRef.current.height}
                      />
                    ))}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-4">
                      <Button onClick={handleCapture} size="lg" className="rounded-full h-16 w-16" disabled={isLoading || isCameraScanning}>
                        {isCameraScanning ? <Loader2 className="h-8 w-8 animate-spin" /> : <Camera className="h-8 w-8" />}
                      </Button>
                      <Button onClick={flipCamera} size="icon" variant="secondary" className="rounded-full h-16 w-16">
                        <FlipHorizontal className="h-8 w-8" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Image Preview</CardTitle>
          </CardHeader>
          <CardContent>
            {previewUrl ? (
                <div className="relative aspect-video rounded-lg overflow-hidden">
                  <Image
                    src={previewUrl}
                    alt="Waste item preview"
                    fill
                    objectFit="cover"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 rounded-full h-8 w-8"
                    onClick={handleClear}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                    {placeholderImage && (
                        <Image
                          src={placeholderImage.imageUrl}
                          alt={placeholderImage.description}
                          data-ai-hint={placeholderImage.imageHint}
                          fill
                          objectFit="cover"
                          className="opacity-20"
                        />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <p className="text-muted-foreground">Image preview will appear here</p>
                    </div>
                </div>
              )}
          </CardContent>
          {previewUrl && !result && !isLoading && (
            <CardFooter>
              <Button onClick={() => handleScan(previewUrl, {source: 'upload'})} size="lg" className="w-full" disabled={isScanDisabled}>
                {isScanDisabled ? (
                  <>
                    <ServerCrash className="mr-2 h-5 w-5" />
                    AI Service Offline
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Identify Item
                  </>
                )}
              </Button>
            </CardFooter>
          )}
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Scan Result</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="flex items-center justify-center text-center p-8 space-y-4 rounded-lg bg-secondary min-h-[300px]">
                 <Loader2 className="h-8 w-8 animate-spin text-primary" />
                 <p className="font-semibold ml-4">Analyzing item...</p>
              </div>
            )}
            
            {result && (
              <div className="space-y-4 animate-in fade-in-50">
                <SuggestedBinCard bin={result.binSuggestion} />
                {showMistakeWarning && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Heads Up!</AlertTitle>
                    <AlertDescription>
                      You've commonly mistaken this item. Please double-check the sorting suggestion.
                    </AlertDescription>
                  </Alert>
                )}
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Confidence: {(result.binConfidence * 100).toFixed(0)}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-semibold capitalize">{result.wasteType}</p>
                  <p className="text-sm text-muted-foreground">
                    Confidence: {(result.wasteTypeConfidence * 100).toFixed(0)}%
                  </p>
                </div>
                {result.detections && result.detections.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    <Separator className="my-2" />
                    <p className="font-medium text-foreground">Detected</p>
                    <ul className="mt-2 space-y-1">
                      {result.detections.map((d, idx) => (
                        <li key={idx} className="flex items-center justify-between gap-4">
                          <span className="capitalize">{d.label}</span>
                          <span>{(d.confidence * 100).toFixed(0)}%</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {!result && !isLoading && (
              <div className="flex items-center justify-center text-center p-8 space-y-4 rounded-lg bg-muted min-h-[300px]">
                <p className="text-muted-foreground">
                  {isScanDisabled ? "AI Service is offline. Start it to see results." : "Results will be displayed here."}
                </p>
              </div>
            )}
          </CardContent>
           {(result || isLoading) && (
            <CardFooter>
               <Button onClick={handleClear} variant="outline" className="w-full">
                  Scan Another Item
                </Button>
            </CardFooter>
           )}
        </Card>
      </div>

       <Card>
        <CardHeader>
          <CardTitle>Recent Scans</CardTitle>
        </CardHeader>
        <CardContent>
          {recentScans.length > 0 ? (
            <ScrollArea>
              <div className="flex space-x-4 pb-4">
                {recentScans.map((scan, index) => (
                  <div key={index} className="flex-shrink-0 w-[200px] space-y-2">
                    <Image
                      src={scan.imageUrl}
                      alt={`Scan of ${scan.wasteType}`}
                      width={200}
                      height={150}
                      className="rounded-md object-cover aspect-[4/3]"
                    />
                    <div className="text-sm">
                      <p className="font-semibold capitalize">{scan.wasteType}</p>
                      <p className="text-xs text-muted-foreground">{binInfo[scan.binSuggestion].label}</p>
                    </div>
                  </div>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              No recent scans to display.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
