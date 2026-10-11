"use client"

import * as React from "react"
import { Pie, PieChart, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { TrendingUp } from "lucide-react";

import { useScanStore } from "@/components/scan/scan-store";

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

const chartConfig = {
    value: {
        label: "Items",
    },
    Correct: {
        label: "Correct",
        color: "hsl(var(--chart-1))",
    },
    Incorrect: {
        label: "Incorrect",
        color: "hsl(var(--chart-2))",
    },
}

export function SegregationPerformanceChart() {
  const { scans } = useScanStore();

  const chartData = React.useMemo(() => {
    // Proxy metric: treat each scan's binConfidence as "probability correct".
    const correct = scans.reduce((acc, s) => acc + clamp01(s.binConfidence ?? 0), 0);
    const incorrect = scans.reduce((acc, s) => acc + (1 - clamp01(s.binConfidence ?? 0)), 0);
    return [
      { type: "Correct", value: Math.round(correct * 100), fill: "hsl(var(--chart-1))" },
      { type: "Incorrect", value: Math.round(incorrect * 100), fill: "hsl(var(--chart-2))" },
    ];
  }, [scans]);

  const totalValue = React.useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.value, 0)
  }, [chartData])
  
  const accuracy = totalValue > 0 ? ((chartData[0].value / totalValue) * 100).toFixed(1) : "0.0";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Segregation Performance</CardTitle>
        <CardDescription>Last 30 days</CardDescription>
      </CardHeader>
      <div className="grid gap-6 md:grid-cols-2 items-center p-6 pt-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square w-full max-w-[300px]"
        >
          <PieChart>
            <Tooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="type"
              innerRadius={80}
              strokeWidth={5}
            >
                {chartData.map((entry) => (
                    <Cell key={`cell-${entry.type}`} fill={entry.fill} />
                ))}
            </Pie>
            <Legend content={({ payload }) => {
                return (
                    <ul className="flex flex-wrap justify-center gap-4 mt-4 text-xs">
                    {payload?.map((entry, index) => (
                        <li key={`item-${index}`} className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                          <span>{entry.value}</span>
                          <span>
                            ({(((Number((entry as any)?.payload?.value ?? 0) / Math.max(1, totalValue)) * 100)).toFixed(1)}%)
                          </span>
                        </li>
                    ))}
                    </ul>
                )
            }} />
          </PieChart>
        </ChartContainer>
        <div className="flex flex-col gap-8 text-center md:text-left items-center md:items-start">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Overall Accuracy</p>
            <p className="text-6xl font-bold">{accuracy}%</p>
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-center gap-2 font-medium leading-none justify-center md:justify-start">
              Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />
            </div>
            <div className="leading-none text-muted-foreground">
              Most common error: Plastics in compost
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
