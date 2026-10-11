
"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "ecosort.settings.v1";

type CameraSource = "webcam" | "esp32cam";

type Settings = {
  detectionConfidence: number;
  alertThreshold: number;
  binFullThreshold: number;
  enableSoundEffects: boolean;
  enableLiveDetection: boolean;
  cameraSource: CameraSource;
  esp32CamUrl: string;
};

type SettingsStore = Settings & {
  setDetectionConfidence: (value: number) => void;
  setAlertThreshold: (value: number) => void;
  setBinFullThreshold: (value: number) => void;
  setEnableSoundEffects: (value: boolean) => void;
  setEnableLiveDetection: (value: boolean) => void;
  setCameraSource: (value: CameraSource) => void;
  setEsp32CamUrl: (value: string) => void;
  resetSettings: () => void;
};

const defaultSettings: Settings = {
  detectionConfidence: 0.25,
  alertThreshold: 0.35,
  binFullThreshold: 90,
  enableSoundEffects: true,
  enableLiveDetection: true,
  cameraSource: "webcam",
  esp32CamUrl: "http://192.168.1.100:81/stream",
};

function safeParseSettings(raw: string | null): Settings {
  if (!raw) return defaultSettings;
  try {
    const parsed = JSON.parse(raw);
    return {
      detectionConfidence: typeof parsed.detectionConfidence === 'number' ? parsed.detectionConfidence : defaultSettings.detectionConfidence,
      alertThreshold: typeof parsed.alertThreshold === 'number' ? parsed.alertThreshold : defaultSettings.alertThreshold,
      binFullThreshold: typeof parsed.binFullThreshold === 'number' ? parsed.binFullThreshold : defaultSettings.binFullThreshold,
      enableSoundEffects: typeof parsed.enableSoundEffects === 'boolean' ? parsed.enableSoundEffects : defaultSettings.enableSoundEffects,
      enableLiveDetection: typeof parsed.enableLiveDetection === 'boolean' ? parsed.enableLiveDetection : defaultSettings.enableLiveDetection,
      cameraSource: parsed.cameraSource === 'esp32cam' ? 'esp32cam' : defaultSettings.cameraSource,
      esp32CamUrl: typeof parsed.esp32CamUrl === 'string' ? parsed.esp32CamUrl : defaultSettings.esp32CamUrl,
    };
  } catch {
    return defaultSettings;
  }
}

function loadInitialSettings(): Settings {
  if (typeof window === "undefined") return defaultSettings;
  return safeParseSettings(window.localStorage.getItem(STORAGE_KEY));
}

const SettingsContext = createContext<SettingsStore | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  useEffect(() => {
    setSettings(loadInitialSettings());
  }, []);

  const saveSettings = useCallback((newSettings: Settings) => {
    setSettings(newSettings);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
    } catch {
      // ignore
    }
  }, []);
  
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setSettings(safeParseSettings(e.newValue));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  
  const setDetectionConfidence = useCallback((value: number) => {
    saveSettings({ ...settings, detectionConfidence: value });
  }, [settings, saveSettings]);

  const setAlertThreshold = useCallback((value: number) => {
    saveSettings({ ...settings, alertThreshold: value });
  }, [settings, saveSettings]);

  const setBinFullThreshold = useCallback((value: number) => {
    saveSettings({ ...settings, binFullThreshold: value });
  }, [settings, saveSettings]);

  const setEnableSoundEffects = useCallback((value: boolean) => {
    saveSettings({ ...settings, enableSoundEffects: value });
  }, [settings, saveSettings]);

  const setEnableLiveDetection = useCallback((value: boolean) => {
    saveSettings({ ...settings, enableLiveDetection: value });
  }, [settings, saveSettings]);

  const setCameraSource = useCallback((value: CameraSource) => {
    saveSettings({ ...settings, cameraSource: value });
  }, [settings, saveSettings]);

  const setEsp32CamUrl = useCallback((value: string) => {
    saveSettings({ ...settings, esp32CamUrl: value });
  }, [settings, saveSettings]);

  const resetSettings = useCallback(() => {
    saveSettings(defaultSettings);
  }, [saveSettings]);

  const value = useMemo(() => ({ 
    ...settings,
    setDetectionConfidence,
    setAlertThreshold,
    setBinFullThreshold,
    setEnableSoundEffects,
    setEnableLiveDetection,
    setCameraSource,
    setEsp32CamUrl,
    resetSettings
  }), [settings, setDetectionConfidence, setAlertThreshold, setBinFullThreshold, setEnableSoundEffects, setEnableLiveDetection, setCameraSource, setEsp32CamUrl, resetSettings]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettingsStore(): SettingsStore {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettingsStore must be used within SettingsProvider");
  return ctx;
}
