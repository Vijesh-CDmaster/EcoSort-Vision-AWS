import { WasteSegregationView } from "@/components/segregation/waste-segregation-view";

export default function WasteSegregationPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Waste Segregation
        </h1>
        <p className="text-muted-foreground">
          View items sorted into bins based on detection confidence.
        </p>
      </div>
      <WasteSegregationView />
    </div>
  );
}
