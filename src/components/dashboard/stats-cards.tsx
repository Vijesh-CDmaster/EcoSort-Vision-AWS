"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScanLine, Target } from "lucide-react";
import { useScanStore } from "@/components/scan/scan-store";
import { Icons } from "@/components/icons";

function formatPercent(n: number) {
  if (!Number.isFinite(n)) return "0%";
  return `${Math.round(n)}%`;
}

function formatNumber(n: number) {
  return new Intl.NumberFormat().format(Math.max(0, Math.floor(n)));
}

export function StatsCards() {
  const { scans } = useScanStore();

  const totalScans = scans.length;
  const plasticScans = scans.filter(s => s.binSuggestion === "plastic").length;
  const plasticRate = totalScans > 0 ? (plasticScans / totalScans) * 100 : 0;
  
  const glassScans = scans.filter(s => s.binSuggestion === "glass").length;
  const glassRate = totalScans > 0 ? (glassScans / totalScans) * 100 : 0;

  // Approximate "accuracy" as average confidence (until you have ground truth).
  const avgConfidence =
    totalScans > 0
      ? (scans.reduce((acc, s) => acc + (s.binConfidence ?? 0), 0) / totalScans) * 100
      : 0;

  const stats = [
    {
      title: "Plastic Rate",
      value: formatPercent(plasticRate),
      description: totalScans > 0 ? `${plasticScans} of ${totalScans} scans` : "No scans yet",
      icon: Icons.Recycling,
    },
    {
      title: "Total Items Scanned",
      value: formatNumber(totalScans),
      description: totalScans > 0 ? "Updates from your scans" : "Scan an item to begin",
      icon: ScanLine,
    },
    {
      title: "Segregation Confidence",
      value: formatPercent(avgConfidence),
      description: "Average model confidence",
      icon: Target,
    },
    {
      title: "Glass Rate",
      value: formatPercent(glassRate),
      description: `${glassScans} of ${totalScans} scans`,
      icon: Icons.Glass,
    },
  ];

  return (
    <>
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </>
  );
}
