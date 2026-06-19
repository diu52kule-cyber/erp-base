import PreferencesClient from "./PreferencesClient";

export default function PreferencesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Preferences</h1>
        <p className="text-sm text-neutral-500 mt-1">Personalise how the app looks. Saved on this device.</p>
      </div>
      <PreferencesClient />
    </div>
  );
}
