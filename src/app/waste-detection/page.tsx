import { WasteScanner } from "@/components/scan/waste-scanner";

export default function WasteDetectionPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Waste Detection
        </h1>
        <p className="text-muted-foreground">
          Use your device camera or upload an image to identify waste and get a segregation decision.
        </p>
      </div>
      <WasteScanner />
    </div>
  );
}
