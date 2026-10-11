import { SegregationPerformanceChart } from "@/components/dashboard/segregation-performance-chart";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { BinMonitoring } from "@/components/dashboard/bin-monitoring";
import { ContaminationAlerts } from "@/components/dashboard/contamination-alerts";
import { BehavioralInsights } from "@/components/dashboard/behavioral-insights";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Dashboard
        </h1>
        <p className="text-muted-foreground">
          An overview of your waste management system.
        </p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCards />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <SegregationPerformanceChart />
        </div>
        <div className="lg:col-span-1 xl:col-span-2">
           <BinMonitoring />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ContaminationAlerts limit={5} />
        <BehavioralInsights />
      </div>

    </div>
  );
}
