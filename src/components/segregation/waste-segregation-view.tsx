"use client";

import React from "react";
import Image from "next/image";
import { useScanStore, type ScanRecord, type WasteBin } from "@/components/scan/scan-store";
import { Badge } from "@/components/ui/badge";
import { Icons } from "@/components/icons";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const binMeta = {
  plastic: {
    name: "Plastic",
    icon: Icons.Recycling,
    styles: {
      lid: "bg-chart-1",
      body: "bg-chart-1/10",
      border: "border-chart-1/20",
      separator: "bg-chart-1/50"
    },
  },
  glass: {
    name: "Glass",
    icon: Icons.Glass,
    styles: {
      lid: "bg-chart-2",
      body: "bg-chart-2/10",
      border: "border-chart-2/20",
      separator: "bg-chart-2/50"
    },
  },
  compost: {
    name: "Compost",
    icon: Icons.Compost,
    styles: {
      lid: "bg-chart-3",
      body: "bg-chart-3/10",
      border: "border-chart-3/20",
      separator: "bg-chart-3/50"
    },
  },
  landfill: {
    name: "Landfill",
    icon: Icons.Landfill,
    styles: {
      lid: "bg-muted-foreground",
      body: "bg-muted-foreground/10",
      border: "border-muted-foreground/20",
      separator: "bg-muted-foreground/50"
    },
  },
} satisfies Record<WasteBin, any>;

const ItemCard = ({ item }: { item: ScanRecord }) => {
  return (
    <div className="relative group flex flex-col items-center text-center">
      <div className="aspect-[4/3] w-full relative rounded-md overflow-hidden border border-white/10">
        <Image src={item.imageUrl} alt={item.wasteType} fill className="object-cover" />
      </div>
      <h4 className="mt-1 font-semibold text-xs capitalize truncate w-full">{item.wasteType}</h4>
      <p className="text-xs text-muted-foreground/80">
        {(item.wasteTypeConfidence * 100).toFixed(0)}%
      </p>
    </div>
  );
};

const ConfidenceSection = ({ title, items }: { title: string; items: ScanRecord[] }) => (
  <div>
    <h3 className="font-semibold mb-2 text-base text-center">{title}</h3>
    {items.length > 0 ? (
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>
    ) : (
      <div className="flex items-center justify-center h-16 text-muted-foreground/60 rounded-lg">
        <p className="text-sm">No items</p>
      </div>
    )}
  </div>
);

const BinView = ({ binKey, items }: { binKey: WasteBin; items: ScanRecord[] }) => {
  const meta = binMeta[binKey];
  const { name, styles } = meta;

  const highConfidenceItems = items.filter(item => item.wasteTypeConfidence * 100 > 50);
  const lowConfidenceItems = items.filter(item => item.wasteTypeConfidence * 100 <= 50);

  return (
    <div className="flex flex-col items-center">
        <div className="relative w-full max-w-[320px] h-[450px] flex flex-col">
            {/* Lid */}
            <div className={cn("h-10 rounded-t-lg w-full z-10", styles.lid)}>
                <div className="w-1/3 h-2 mx-auto mt-3 bg-white/20 rounded-full" />
            </div>
            {/* Bin Body */}
            <div className={cn("flex-1 -mt-2 p-3 rounded-b-lg border-x-2 border-b-2", styles.body, styles.border)}>
                <div className="h-full overflow-y-auto space-y-4 pr-1">
                    <ConfidenceSection title="High Confidence (>50%)" items={highConfidenceItems} />
                    <Separator className={cn(styles.separator)} />
                    <ConfidenceSection title="Low Confidence (<=50%)" items={lowConfidenceItems} />
                </div>
            </div>
        </div>
        <div className="text-center mt-4">
            <h3 className="text-xl font-bold">{name}</h3>
            <Badge variant="secondary">{items.length} items</Badge>
        </div>
    </div>
  );
};

export function WasteSegregationView() {
  const { scans } = useScanStore();

  const groupedScans = React.useMemo(() => {
    const groups: Record<WasteBin, ScanRecord[]> = {
      plastic: [],
      glass: [],
      compost: [],
      landfill: [],
    };
    for (const scan of scans) {
      if (groups[scan.binSuggestion]) {
        groups[scan.binSuggestion].push(scan);
      }
    }
    return groups;
  }, [scans]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
      {(Object.keys(groupedScans) as WasteBin[]).map(binKey => (
        <BinView key={binKey} binKey={binKey} items={groupedScans[binKey]} />
      ))}
    </div>
  );
}
