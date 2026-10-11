
"use client";

import React from "react";
import { useScanStore } from "@/components/scan/scan-store";
import { useSettingsStore } from "@/hooks/use-settings-store";
import { titleCase } from "@/lib/utils";

export function useBehavioralInsights() {
    const { scans } = useScanStore();
    const { alertThreshold } = useSettingsStore();

    const insights = React.useMemo(() => {
        if (scans.length < 5) {
            return null;
        }

        // 1. Most common waste type
        const wasteCounts = new Map<string, number>();
        for (const scan of scans) {
            wasteCounts.set(scan.wasteType, (wasteCounts.get(scan.wasteType) || 0) + 1);
        }
        const mostCommonWaste = [...wasteCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

        // 2. Most common misclassification
        const misclassifiedScans = scans.filter(s => s.binConfidence < alertThreshold);
        const mistakeCounts = new Map<string, number>();
        for (const scan of misclassifiedScans) {
            const mistakeKey = `${scan.wasteType} -> ${scan.binSuggestion}`;
            mistakeCounts.set(mistakeKey, (mistakeCounts.get(mistakeKey) || 0) + 1);
        }
        const mostCommonMistakeRaw = [...mistakeCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
        
        const mostCommonMistake = mostCommonMistakeRaw
            ? {
                item: titleCase(mostCommonMistakeRaw.split(' -> ')[0]),
                wrongBin: mostCommonMistakeRaw.split(' -> ')[1]
            }
            : null;
        
        // Pro-tip can be selected based on the most common mistake
        let proTip = "Keep up the great sorting! Every little bit helps the planet.";
        if (mostCommonMistake?.item.toLowerCase().includes('plastic') && mostCommonMistake?.wrongBin !== 'plastic') {
            proTip = "Pro Tip: Check for the recycling symbol on plastics. Not all types are recyclable in all areas.";
        } else if (mostCommonMistake?.wrongBin === 'compost' && !mostCommonMistake.item.toLowerCase().includes('food')) {
            proTip = "Pro Tip: Only organic materials like food scraps and yard trimmings belong in the compost bin."
        } else if (mostCommonMistake) {
            proTip = "Pro Tip: When in doubt, check the item for sorting instructions or use the landfill bin to avoid contamination."
        }

        return {
            mostCommonWaste: mostCommonWaste ? titleCase(mostCommonWaste) : null,
            mostCommonMistake,
            proTip
        };

    }, [scans, alertThreshold]);

    return insights;
}
