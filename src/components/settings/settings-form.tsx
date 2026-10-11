
"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useSettingsStore } from "@/hooks/use-settings-store";
import { useScanStore } from "@/components/scan/scan-store";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useTheme } from "@/hooks/use-theme";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";

export function SettingsForm() {
  const {
    detectionConfidence,
    setDetectionConfidence,
    alertThreshold,
    setAlertThreshold,
    binFullThreshold,
    setBinFullThreshold,
    enableSoundEffects,
    setEnableSoundEffects,
    enableLiveDetection,
    setEnableLiveDetection,
    cameraSource,
    setCameraSource,
    esp32CamUrl,
    setEsp32CamUrl,
    resetSettings,
  } = useSettingsStore();
  const { theme, setTheme } = useTheme();
  
  const { clearScans } = useScanStore();
  const { toast } = useToast();

  const handleClearData = () => {
    clearScans();
    toast({
        title: "Data Cleared",
        description: "All scan history has been successfully deleted.",
    });
  }

  const handleResetSettings = () => {
    resetSettings();
    toast({
      title: "Settings Reset",
      description: "All settings have been restored to their default values.",
    });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>AI & Detection</CardTitle>
          <CardDescription>
            Adjust the sensitivity and behavior of the waste detection AI model.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="detection-confidence">
              Detection Confidence Threshold
            </Label>
            <div className="flex items-center gap-4">
              <Slider
                id="detection-confidence"
                min={0.1}
                max={0.9}
                step={0.05}
                value={[detectionConfidence]}
                onValueChange={(value) => setDetectionConfidence(value[0])}
              />
              <span className="text-sm font-medium w-16 text-right">
                {(detectionConfidence * 100).toFixed(0)}%
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              This sets the minimum confidence score the AI needs to recognize an object. A higher value (e.g., 75%) results in fewer but more accurate detections. A lower value (e.g., 25%) detects more items but may increase errors.
            </p>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                    <Label htmlFor="live-detection" className="font-medium">Enable Live Detection</Label>
                    <p className="text-sm text-muted-foreground">
                      Continuously scan for objects in real-time when the camera is active, showing live bounding boxes. Disabling this can save battery.
                    </p>
                </div>
                <Switch
                    id="live-detection"
                    checked={enableLiveDetection}
                    onCheckedChange={setEnableLiveDetection}
                    suppressHydrationWarning
                />
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Camera Source</CardTitle>
          <CardDescription>
            Choose between your device&apos;s webcam or an ESP32-CAM module for waste detection.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Label>Camera Input</Label>
            <RadioGroup
              value={cameraSource}
              onValueChange={(value: "webcam" | "esp32cam") => setCameraSource(value)}
              className="grid gap-4"
            >
              <Label className="flex items-center space-x-3 space-y-0 rounded-md border p-4 cursor-pointer [&:has([data-state=checked])]:border-primary">
                <RadioGroupItem value="webcam" />
                <div className="space-y-1">
                  <p className="font-medium leading-none">Device Webcam</p>
                  <p className="text-sm text-muted-foreground">
                    Use your laptop or phone&apos;s built-in camera
                  </p>
                </div>
              </Label>
              <Label className="flex items-center space-x-3 space-y-0 rounded-md border p-4 cursor-pointer [&:has([data-state=checked])]:border-primary">
                <RadioGroupItem value="esp32cam" />
                <div className="space-y-1">
                  <p className="font-medium leading-none">ESP32-CAM Module</p>
                  <p className="text-sm text-muted-foreground">
                    Connect to an ESP32-CAM MJPEG stream over WiFi
                  </p>
                </div>
              </Label>
            </RadioGroup>
          </div>

          {cameraSource === "esp32cam" && (
            <div className="space-y-2">
              <Label htmlFor="esp32-url">ESP32-CAM Stream URL</Label>
              <Input
                id="esp32-url"
                type="url"
                placeholder="http://192.168.1.100:81/stream"
                value={esp32CamUrl}
                onChange={(e) => setEsp32CamUrl(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Enter the MJPEG stream URL from your ESP32-CAM. Typically this is <code className="bg-muted px-1 py-0.5 rounded">http://&lt;ESP32_IP&gt;:81/stream</code> for CameraWebServer example.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alerts & Notifications</CardTitle>
          <CardDescription>
            Configure when and how you receive alerts about waste management events.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="alert-threshold">
              Contamination Alert Threshold
            </Label>
            <div className="flex items-center gap-4">
              <Slider
                id="alert-threshold"
                min={0.1}
                max={0.9}
                step={0.05}
                value={[alertThreshold]}
                onValueChange={(value) => setAlertThreshold(value[0])}
              />
              <span className="text-sm font-medium w-16 text-right">
                {(alertThreshold * 100).toFixed(0)}%
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
             If an item's sorting confidence is below this level, a "Contamination Alert" is created for your review. This helps you catch and correct potential sorting mistakes.
            </p>
          </div>
           <div className="space-y-2">
            <Label htmlFor="bin-full-threshold">
              Bin Full Threshold
            </Label>
            <div className="flex items-center gap-4">
              <Slider
                id="bin-full-threshold"
                min={50}
                max={100}
                step={5}
                value={[binFullThreshold]}
                onValueChange={(value) => setBinFullThreshold(value[0])}
              />
              <span className="text-sm font-medium w-16 text-right">
                {binFullThreshold}%
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Triggers a "Bin Full" alert when the system estimates a bin has reached this percentage of its capacity, allowing for timely collection.
            </p>
          </div>
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
            <CardTitle>Appearance & Sound</CardTitle>
            <CardDescription>
                Customize the visual theme and auditory feedback of the application.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="space-y-2">
                <Label>Theme</Label>
                <RadioGroup
                    value={theme}
                    onValueChange={(newTheme: "light" | "dark") => setTheme(newTheme)}
                    className="grid max-w-md grid-cols-2 gap-8 pt-2"
                >
                    <Label className="[&:has([data-state=checked])>div]:border-primary">
                        <RadioGroupItem value="light" className="sr-only" />
                        <div className="items-center rounded-md border-2 border-muted p-1 hover:border-accent">
                            <div className="space-y-2 rounded-sm bg-[#ecedef] p-2">
                                <div className="space-y-2 rounded-md bg-white p-2 shadow-sm">
                                    <div className="h-2 w-[80px] rounded-lg bg-[#ecedef]" />
                                    <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
                                </div>
                                <div className="flex items-center space-x-2 rounded-md bg-white p-2 shadow-sm">
                                    <div className="h-4 w-4 rounded-full bg-[#ecedef]" />
                                    <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
                                </div>
                                <div className="flex items-center space-x-2 rounded-md bg-white p-2 shadow-sm">
                                    <div className="h-4 w-4 rounded-full bg-[#ecedef]" />
                                    <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
                                </div>
                            </div>
                        </div>
                        <span className="block w-full p-2 text-center font-normal">
                            Light
                        </span>
                    </Label>
                    <Label className="[&:has([data-state=checked])>div]:border-primary">
                        <RadioGroupItem value="dark" className="sr-only" />
                        <div className="items-center rounded-md border-2 border-muted bg-popover p-1 hover:border-accent">
                            <div className="space-y-2 rounded-sm bg-slate-950 p-2">
                                <div className="space-y-2 rounded-md bg-slate-800 p-2 shadow-sm">
                                    <div className="h-2 w-[80px] rounded-lg bg-slate-400" />
                                    <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                                </div>
                                <div className="flex items-center space-x-2 rounded-md bg-slate-800 p-2 shadow-sm">
                                    <div className="h-4 w-4 rounded-full bg-slate-400" />
                                    <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                                </div>
                                <div className="flex items-center space-x-2 rounded-md bg-slate-800 p-2 shadow-sm">
                                    <div className="h-4 w-4 rounded-full bg-slate-400" />
                                    <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                                </div>
                            </div>
                        </div>
                        <span className="block w-full p-2 text-center font-normal">
                            Dark
                        </span>
                    </Label>
                </RadioGroup>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                    <Label htmlFor="sound-effects" className="font-medium">Sound Effects</Label>
                    <p className="text-sm text-muted-foreground">
                        Play a confirmation sound for events like a successful scan.
                    </p>
                </div>
                <Switch
                    id="sound-effects"
                    checked={enableSoundEffects}
                    onCheckedChange={setEnableSoundEffects}
                    suppressHydrationWarning
                />
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
          <CardDescription>
            Manage the application's stored data. These actions are permanent and cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
           <div>
              <h4 className="font-medium">Clear Scan History</h4>
              <p className="text-sm text-muted-foreground">
                This permanently deletes all scan records from your browser. Your dashboard statistics, bin contents, and recent scan history will be completely erased.
              </p>
           </div>
           <div>
              <h4 className="font-medium">Reset All Settings</h4>
              <p className="text-sm text-muted-foreground">
                This restores all settings on this page to their original factory state. Your scan history will not be affected.
              </p>
           </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
           <Button variant="outline" onClick={handleResetSettings} suppressHydrationWarning>
                Reset All Settings
            </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" suppressHydrationWarning>
                <Trash className="mr-2 h-4 w-4" />
                Clear Scan History
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action will permanently delete all scan data from your browser's local storage. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClearData}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Confirm & Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>
    </div>
  );
}

    