// No sidebar — full screen for kiosk / station mode
export default function StationLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-900 text-white">
      {children}
    </div>
  );
}
