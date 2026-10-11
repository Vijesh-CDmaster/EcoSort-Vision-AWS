import { SegregationPerformanceChart } from "@/components/dashboard/segregation-performance-chart";

export default function SegregationPerformancePage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Segregation Performance
        </h1>
        <p className="text-muted-foreground">
          Analyze the accuracy of waste segregation over time.
        </p>
      </div>
      <div className="flex justify-center">
        <div className="w-full max-w-4xl">
          <SegregationPerformanceChart />
        </div>
      </div>
    </div>
  );
}
