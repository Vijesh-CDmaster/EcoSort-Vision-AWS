"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, type ScanDto } from "@/lib/api";

export type WasteBin = "plastic" | "glass" | "compost" | "landfill";

export type ScanDetection = {
  label: string;
  confidence: number;
};

export type ScanRecord = {
  id: string;
  timestamp: number;
  source: "upload" | "camera";
  wasteType: string;
  wasteTypeConfidence: number;
  binSuggestion: WasteBin;
  binConfidence: number;
  imageUrl: string;
  detections?: ScanDetection[];
};

type ScanStore = {
  scans: ScanRecord[];
  addScan: (scan: Omit<ScanRecord, "id" | "timestamp"> & Partial<Pick<ScanRecord, "id" | "timestamp">>) => void;
  clearScans: () => void;
};

const MAX_SCANS = 200;

function toRecord(dto: ScanDto): ScanRecord {
  let binSuggestion = dto.binSuggestion ?? "landfill";
  if (binSuggestion === "recycling") {
    binSuggestion = "plastic";
  }
  return {
    id: dto.id,
    timestamp: Number(dto.timestamp ?? Date.now()),
    source: (dto.source === "camera" ? "camera" : "upload") as "camera" | "upload",
    wasteType: dto.wasteType ?? "unknown",
    wasteTypeConfidence: Number(dto.wasteTypeConfidence ?? 0),
    binSuggestion: binSuggestion as WasteBin,
    binConfidence: Number(dto.binConfidence ?? 0),
    imageUrl: dto.imageUrl ?? "",
    detections: Array.isArray(dto.detections)
      ? dto.detections.map((d: any) => ({ label: String(d.label), confidence: Number(d.confidence ?? 0) }))
      : undefined,
  };
}

const ScanContext = createContext<ScanStore | null>(null);

export function ScanProvider({ children }: { children: React.ReactNode }) {
  const [scans, setScans] = useState<ScanRecord[]>([]);

  // Load scan history from the backend on mount.
  useEffect(() => {
    let cancelled = false;
    api.get<{ scans: ScanDto[] }>("/db/scans").then((res) => {
      if (cancelled) return;
      if (res.ok && res.data) {
        setScans(res.data.scans.map(toRecord).slice(0, MAX_SCANS));
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const addScan: ScanStore["addScan"] = useCallback((scan) => {
    const record: ScanRecord = {
      id: scan.id ?? crypto.randomUUID(),
      timestamp: scan.timestamp ?? Date.now(),
      source: scan.source ?? "upload",
      wasteType: scan.wasteType,
      wasteTypeConfidence: scan.wasteTypeConfidence,
      binSuggestion: scan.binSuggestion,
      binConfidence: scan.binConfidence,
      imageUrl: scan.imageUrl,
      detections: scan.detections,
    };

    // Optimistic local insert, then persist to the backend.
    setScans((prev) => [record, ...prev].slice(0, MAX_SCANS));
    api
      .post<ScanDto>("/db/scans", {
        id: record.id,
        timestamp: record.timestamp,
        source: record.source,
        wasteType: record.wasteType,
        wasteTypeConfidence: record.wasteTypeConfidence,
        binSuggestion: record.binSuggestion,
        binConfidence: record.binConfidence,
        imageUrl: record.imageUrl,
        detections: record.detections,
      })
      .then((res) => {
        if (res.ok && res.data) {
          const saved = toRecord(res.data);
          setScans((prev) => {
            const exists = prev.some((s) => s.id === saved.id);
            return exists
              ? prev.map((s) => (s.id === saved.id ? saved : s))
              : [saved, ...prev].slice(0, MAX_SCANS);
          });
        }
      });
  }, []);

  const clearScans = useCallback(() => {
    setScans([]);
    api.del("/db/scans");
  }, []);

  const value = useMemo(() => ({ scans, addScan, clearScans }), [scans, addScan, clearScans]);

  return <ScanContext.Provider value={value}>{children}</ScanContext.Provider>;
}

export function useScanStore(): ScanStore {
  const ctx = useContext(ScanContext);
  if (!ctx) throw new Error("useScanStore must be used within ScanProvider");
  return ctx;
}
