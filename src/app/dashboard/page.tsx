import Link from "next/link";
import { getOrgContext } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";
import { MODULES, quickActionsFor } from "@/lib/modules";

export const dynamic = "force-dynamic";

function fmt(n: number) { return "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 }); }

export default async function DashboardHome() {
  const ctx = await getOrgContext();
  if (!ctx?.org) {
    return <div className="text-neutral-500">Loading…</div>;
  }

  const supabase = createClient();
  const orgId = ctx.org.id;
  const has = (k: string) => ctx.enabledModules.has(k);

  // Fetch only the KPIs relevant to this org's enabled modules, in parallel.
  const [invoices, productCount, contactCount, employeeCount] = await Promise.all([
    has("billing")
      ? supabase.from("invoices").select("total,status").eq("org_id", orgId)
      : Promise.resolve({ data: null }),
    has("inventory")
      ? supabase.from("products").select("id", { count: "exact", head: true }).eq("org_id", orgId)
      : Promise.resolve({ count: null }),
    has("crm")
      ? supabase.from("contacts").select("id", { count: "exact", head: true }).eq("org_id", orgId)
      : Promise.resolve({ count: null }),
    has("hr")
      ? supabase.from("employees").select("id", { count: "exact", head: true }).eq("org_id", orgId)
      : Promise.resolve({ count: null }),
  ]);

  const invRows = (invoices as { data: { total: number; status: string }[] | null }).data ?? [];
  const revenue = invRows.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.total ?? 0), 0);
  const unpaid = invRows.filter((i) => i.status !== "paid" && i.status !== "draft").length;

  const kpis: { label: string; value: string; href: string; accent?: string }[] = [];
  if (has("billing")) {
    kpis.push({ label: "Revenue collected", value: fmt(revenue), href: "/dashboard/billing", accent: "text-green-600" });
    kpis.push({ label: "Unpaid invoices", value: String(unpaid), href: "/dashboard/billing", accent: unpaid > 0 ? "text-amber-600" : "" });
  }
  if (has("inventory")) kpis.push({ label: "Products", value: String((productCount as { count: number | null }).count ?? 0), href: "/dashboard/inventory" });
  if (has("crm")) kpis.push({ label: "Contacts", value: String((contactCount as { count: number | null }).count ?? 0), href: "/dashboard/crm" });
  if (has("hr")) kpis.push({ label: "Employees", value: String((employeeCount as { count: number | null }).count ?? 0), href: "/dashboard/hr" });

  const actions = quickActionsFor(ctx.org.business_type).filter((a) =>
    // only show actions whose target module is enabled
    MODULES.some((m) => a.href.startsWith(m.href) && has(m.key)) || a.href === "/dashboard/reports"
  );
  const visibleModules = MODULES.filter((m) => has(m.key));
  const firstName = (ctx.user.email ?? "there").split("@")[0];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Welcome back, {firstName} 👋</h1>
        <p className="text-neutral-500 mt-1">
          {ctx.org.name} · <span className="capitalize">{ctx.org.business_type}</span>
          {ctx.access === "trial" && ctx.trialDaysLeft !== null && (
            <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
              {ctx.trialDaysLeft} day{ctx.trialDaysLeft === 1 ? "" : "s"} left in trial
            </span>
          )}
        </p>
      </div>

      {/* KPIs */}
      {kpis.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {kpis.map((k) => (
            <Link key={k.label} href={k.href}
              className="rounded-xl border border-neutral-200 bg-white p-4 hover:border-neutral-300 transition-colors">
              <p className="text-xs text-neutral-400">{k.label}</p>
              <p className={`mt-1 text-2xl font-semibold ${k.accent ?? ""}`}>{k.value}</p>
            </Link>
          ))}
        </div>
      )}

      {/* Quick actions */}
      {actions.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">Quick actions</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {actions.map((a) => (
              <Link key={a.href + a.label} href={a.href}
                className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4 hover:border-neutral-400 hover:bg-neutral-50 transition-all">
                <span className="text-xl">{a.icon}</span>
                <span className="text-sm font-medium text-neutral-700">{a.label}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Modules */}
      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">Your modules</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {visibleModules.map((m) => (
            <Link key={m.key} href={m.href}
              className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4 hover:border-neutral-300 hover:shadow-sm transition-all">
              <span className="text-2xl">{m.icon}</span>
              <span className="font-medium text-sm">{m.name}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
