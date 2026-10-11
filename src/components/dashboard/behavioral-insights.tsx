
"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useBehavioralInsights } from "@/hooks/use-behavioral-insights";
import { toBinLabel } from "@/lib/utils";
import { BrainCircuit, Lightbulb, Repeat, Sparkles } from "lucide-react";

export function BehavioralInsights() {
    const insights = useBehavioralInsights();

    if (!insights) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BrainCircuit className="w-6 h-6" />
                        Behavioral Insights
                    </CardTitle>
                    <CardDescription>Your personalized waste sorting feedback.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center h-40 text-center text-muted-foreground">
                        <Sparkles className="w-12 h-12 mb-4" />
                        <p className="font-semibold">Not enough data yet.</p>
                        <p>Scan at least 5 items to unlock personalized insights!</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle  className="flex items-center gap-2">
                    <BrainCircuit className="w-6 h-6" />
                    Behavioral Insights
                </CardTitle>
                <CardDescription>Your personalized waste sorting feedback.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {insights.mostCommonMistake ? (
                     <div className="flex items-start gap-4 p-3 rounded-lg bg-secondary/50">
                        <Repeat className="w-8 h-8 text-destructive mt-1 flex-shrink-0" />
                        <div>
                            <h4 className="font-semibold">Common Mistake</h4>
                            <p className="text-sm text-secondary-foreground">
                                Your most frequent sorting error is placing <span className="font-bold">{insights.mostCommonMistake.item}</span> in the <span className="font-bold">{toBinLabel(insights.mostCommonMistake.wrongBin)}</span> bin.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-start gap-4 p-3 rounded-lg bg-secondary/50">
                        <Sparkles className="w-8 h-8 text-primary mt-1 flex-shrink-0" />
                        <div>
                            <h4 className="font-semibold">Great Job!</h4>
                            <p className="text-sm text-secondary-foreground">
                                We haven't detected any recurring sorting mistakes. Keep up the excellent work!
                            </p>
                        </div>
                    </div>
                )}

                {insights.mostCommonWaste && (
                    <div className="flex items-start gap-4 p-3 rounded-lg bg-secondary/50">
                        <Lightbulb className="w-8 h-8 text-primary mt-1 flex-shrink-0" />
                         <div>
                            <h4 className="font-semibold">Top Item</h4>
                             <p className="text-sm text-secondary-foreground">
                                The item you scan most frequently is <span className="font-bold">{insights.mostCommonWaste}</span>.
                            </p>
                        </div>
                    </div>
                )}

                 <div className="flex items-start gap-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <Sparkles className="w-8 h-8 text-primary mt-1 flex-shrink-0" />
                    <div>
                        <h4 className="font-semibold text-primary">Actionable Tip</h4>
                        <p className="text-sm text-primary/90">
                           {insights.proTip}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
