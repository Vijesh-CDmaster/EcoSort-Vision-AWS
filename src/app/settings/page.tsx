import { SettingsForm } from "@/components/settings/settings-form";

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your application settings and preferences.
        </p>
      </div>
      <SettingsForm />
    </div>
  );
}
