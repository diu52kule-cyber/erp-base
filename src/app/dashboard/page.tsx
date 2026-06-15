import { getOrgContext } from "@/lib/entitlements";
import { MODULES } from "@/lib/modules";

export default async function DashboardHome() {
  const ctx = await getOrgContext();
  const enabled = MODULES.filter((m) => ctx?.enabledModules.has(m.key));
  const disabled = MODULES.filter((m) => !ctx?.enabledModules.has(m.key));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-neutral-600">
          Signed in as {ctx?.user.email}. You have {enabled.length} active module
          {enabled.length === 1 ? "" : "s"}.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">
          Active modules
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {enabled.map((m) => (
            <div key={m.key} className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="font-medium">{m.name}</div>
              <div className="mt-1 text-xs text-green-600">Enabled</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">
          Available to add
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {disabled.map((m) => (
            <div key={m.key} className="rounded-xl border border-dashed border-neutral-300 bg-white p-4 opacity-70">
              <div className="font-medium">{m.name}</div>
              <div className="mt-1 text-xs text-neutral-400">Not in plan</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
