import { ContaminationAlerts } from "@/components/dashboard/contamination-alerts";

export default function ContaminationAlertsPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Contamination Alerts
        </h1>
        <p className="text-muted-foreground">
          Review recent contamination alerts and notifications.
        </p>
      </div>
      <ContaminationAlerts />
    </div>
  );
}
