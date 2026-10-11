
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useSettingsStore } from "@/hooks/use-settings-store";

export function useCamera() {
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const { toast } = useToast();
  const restartOnFacingModeChangeRef = useRef(false);
  const { cameraSource, esp32CamUrl } = useSettingsStore();

  type ImageCaptureConstructor = new (track: MediaStreamTrack) => {
    grabFrame: () => Promise<ImageBitmap>;
  };

  const attachStreamToVideo = useCallback(async () => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;
    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }
    try {
      await video.play();
    } catch {
      // ignore autoplay/play errors; user gesture may be required in some browsers
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.srcObject = null;
      } catch { /* ignore */ }
    }
    if (imgRef.current) {
      imgRef.current.src = "";
    }
    setIsCameraOn(false);
  }, []);

  const startCamera = useCallback(async () => {
    if (isCameraOn || hasCameraPermission === false) return;

    if (cameraSource === "esp32cam") {
      // For ESP32-CAM, we just set the image source to the MJPEG stream
      if (imgRef.current) {
        imgRef.current.src = esp32CamUrl;
      }
      setIsCameraOn(true);
      return;
    }

    // Webcam mode
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode }
      });
      streamRef.current = stream;
      setIsCameraOn(true); 
    } catch (error) {
      console.error("Error starting camera:", error);
      toast({
        variant: "destructive",
        title: "Could not start camera",
        description: "Please ensure your camera is not being used by another application or that you have granted permissions.",
      });
      setIsCameraOn(false);
      setHasCameraPermission(false);
    }
  }, [cameraSource, esp32CamUrl, facingMode, hasCameraPermission, isCameraOn, toast]);

  const toggleCamera = useCallback((forceState?: boolean) => {
    const turnOn = forceState ?? !isCameraOn;
    if (turnOn) {
      startCamera();
    } else {
      stopCamera();
    }
  }, [isCameraOn, startCamera, stopCamera]);

  const flipCamera = useCallback(() => {
    restartOnFacingModeChangeRef.current = isCameraOn;
    stopCamera(); 
    setFacingMode(prev => (prev === "user" ? "environment" : "user"));
  }, [isCameraOn, stopCamera]);
  
  useEffect(() => {
    if (!restartOnFacingModeChangeRef.current) return;
    restartOnFacingModeChangeRef.current = false;
    startCamera();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  useEffect(() => {
    const getCameraPermission = async () => {
      if (hasCameraPermission !== null) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
        setHasCameraPermission(true);
      } catch (error) {
        console.error("Error checking camera permissions:", error);
        setHasCameraPermission(false);
      }
    };
    getCameraPermission();
  }, [hasCameraPermission]);

  useEffect(() => {
    if (isCameraOn) {
      attachStreamToVideo();
    }
  }, [isCameraOn, attachStreamToVideo]);


  const waitForVideoReady = async (timeoutMs = 5000) => {
    const video = videoRef.current;
    if (!video) return false;
    if (video.videoWidth && video.videoHeight && video.readyState >= 3) return true;

    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (video.videoWidth && video.videoHeight && video.readyState >= 3) return true;
      await new Promise(r => setTimeout(r, 50));
    }
    return Boolean(video.videoWidth && video.videoHeight && video.readyState >= 3);
  };

  const waitForImageReady = async (timeoutMs = 5000) => {
    const img = imgRef.current;
    if (!img) return false;
    if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) return true;

    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) return true;
      await new Promise(r => setTimeout(r, 50));
    }
    return Boolean(img.complete && img.naturalWidth > 0 && img.naturalHeight > 0);
  };

  const captureFrame = useCallback(async () => {
    // ESP32-CAM mode - capture from img element
    if (cameraSource === "esp32cam" && imgRef.current) {
      const img = imgRef.current;
      const ready = await waitForImageReady();
      if (!ready) {
        toast({
          variant: "destructive",
          title: "ESP32-CAM not ready",
          description: "Wait a moment for the stream to load, or check the ESP32-CAM URL.",
        });
        return null;
      }
      
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const context = canvas.getContext("2d");
      if (context) {
        context.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);
        return canvas.toDataURL("image/jpeg");
      }
      return null;
    }

    // Webcam mode
    try {
      const stream = streamRef.current;
      const ImageCaptureCtor = (globalThis as unknown as { ImageCapture?: ImageCaptureConstructor }).ImageCapture;
      if (stream && ImageCaptureCtor) {
        const track = stream.getVideoTracks?.()[0];
        if (track) {
          const imageCapture = new ImageCaptureCtor(track);
          const bitmap = await imageCapture.grabFrame();
          const canvas = document.createElement("canvas");
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(bitmap, 0, 0);
            return canvas.toDataURL("image/jpeg");
          }
        }
      }
    } catch {
      // ignore and fallback to video+canvas
    }
    
    if (videoRef.current) {
      const video = videoRef.current;
      const ready = await waitForVideoReady();
      if (!ready) {
        toast({
          variant: "destructive",
          title: "Camera not ready",
          description: "Wait a moment for the video to start, then try again.",
        });
        return null;
      }
      
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      if (context) {
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        return canvas.toDataURL("image/jpeg");
      }
    }
    return null;
  }, [cameraSource, toast]);


  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    isCameraOn,
    hasCameraPermission,
    videoRef,
    imgRef,
    cameraSource,
    startCamera,
    stopCamera,
    toggleCamera,
    captureFrame,
    flipCamera,
  };
}
