
"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Icons } from "@/components/icons";
import { cn, titleCase } from "@/lib/utils";
import { useScanStore, type WasteBin } from "@/components/scan/scan-store";

const binMeta = {
  plastic: {
    name: "Plastic",
    icon: Icons.Recycling,
    color: "text-chart-1",
    progressColor: "bg-chart-1",
  },
  glass: {
    name: "Glass",
    icon: Icons.Glass,
    color: "text-chart-2",
    progressColor: "bg-chart-2",
  },
  compost: {
    name: "Compost",
    icon: Icons.Compost,
    color: "text-chart-3",
    progressColor: "bg-chart-3",
  },
  landfill: {
    name: "Landfill",
    icon: Icons.Landfill,
    color: "text-muted-foreground",
    progressColor: "bg-muted-foreground",
  },
} satisfies Record<WasteBin, any>;

function clampPercent(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function computeBinLevel(scansCount: number) {
  // Simple demo heuristic: each scan adds ~5% until full.
  return clampPercent(scansCount * 5);
}

const WasteComposition = ({ composition }: { composition: { name: string, percentage: number, confidence: number }[] }) => (
    <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground">Waste Composition</h4>
        <ul className="space-y-1 text-sm">
            {composition.map(item => (
                <li key={item.name} className="flex justify-between items-center">
                    <span>{item.name}</span>
                    <div className="text-right">
                      <div>{item.percentage}%</div>
                      <div className="text-xs text-muted-foreground">Conf: {(item.confidence * 100).toFixed(0)}%</div>
                    </div>
                </li>
            ))}
        </ul>
    </div>
);


export function BinMonitoring() {
  const { scans } = useScanStore();

  const byBin = React.useMemo(() => {
    const groups: Record<WasteBin, typeof scans> = { plastic: [], glass: [], compost: [], landfill: [] };
    for (const s of scans) {
      if (groups[s.binSuggestion]) {
        groups[s.binSuggestion].push(s);
      }
    }
    return groups;
  }, [scans]);

  const binData = React.useMemo(() => {
    const bins: Array<{
      key: WasteBin;
      name: string;
      level: number;
      icon: any;
      color: string;
      progressColor: string;
      composition: { name: string; percentage: number; confidence: number }[];
    }> = [];

    (Object.keys(binMeta) as WasteBin[]).forEach((binKey) => {
      const binScans = byBin[binKey] ?? [];
      const level = computeBinLevel(binScans.length);

      // Build composition from recent detections.
      const counts = new Map<string, { count: number; confSum: number }>();
      for (const s of binScans.slice(0, 50)) {
        const label = titleCase(s.wasteType || "unknown");
        const prev = counts.get(label) ?? { count: 0, confSum: 0 };
        counts.set(label, { count: prev.count + 1, confSum: prev.confSum + (s.wasteTypeConfidence ?? 0) });
      }

      const total = Array.from(counts.values()).reduce((a, v) => a + v.count, 0);
      const composition = Array.from(counts.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 4)
        .map(([name, v]) => ({
          name,
          percentage: total > 0 ? Math.round((v.count / total) * 100) : 0,
          confidence: v.count > 0 ? v.confSum / v.count : 0,
        }));

      bins.push({
        key: binKey,
        name: binMeta[binKey].name,
        level,
        icon: binMeta[binKey].icon,
        color: binMeta[binKey].color,
        progressColor: binMeta[binKey].progressColor,
        composition: composition.length > 0 ? composition : [{ name: "No data yet", percentage: 0, confidence: 0 }],
      });
    });

    return bins;
  }, [byBin]);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Bin Monitoring</CardTitle>
          <CardDescription>Real-time waste bin status and composition.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {scans.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
             <Icons.Landfill className="w-16 h-16" />
             <p className="font-semibold">All bins are empty.</p>
             <p>Scan some items to start monitoring.</p>
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {binData.map((bin) => (
              <div key={bin.name} className="space-y-4">
                  <div className="flex items-center gap-4 w-full">
                      <bin.icon className={cn('w-8 h-8', bin.color)} />
                      <div className="flex-1 text-left">
                          <span className="text-lg font-bold">{bin.name}</span>
                          <div className="flex items-center gap-2 mt-1">
                              <Progress value={bin.level} aria-label={`${bin.name} bin fullness`} className="h-2" indicatorClassName={bin.progressColor} />
                              <span className="text-xs font-semibold w-12 text-right">{bin.level}%</span>
                          </div>
                      </div>
                  </div>
                  
                  <div>
                    <WasteComposition composition={bin.composition} />
                  </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
