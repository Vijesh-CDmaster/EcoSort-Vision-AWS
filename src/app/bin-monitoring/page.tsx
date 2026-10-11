import { BinMonitoring } from "@/components/dashboard/bin-monitoring";

export default function BinMonitoringPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Bin Monitoring
        </h1>
        <p className="text-muted-foreground">
          Check real-time fullness levels of your waste bins.
        </p>
      </div>
      <BinMonitoring />
    </div>
  );
}
