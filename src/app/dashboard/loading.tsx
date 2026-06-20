// Shown instantly while any dashboard route loads (incl. cold serverless hits),
// so the user never sees a blank pane.
export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-7 w-52 rounded-lg bg-neutral-200" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="h-3 w-16 rounded bg-neutral-200" />
            <div className="mt-3 h-6 w-24 rounded bg-neutral-200" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <div className="space-y-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-9 rounded bg-neutral-100" />
          ))}
        </div>
      </div>
    </div>
  );
}
