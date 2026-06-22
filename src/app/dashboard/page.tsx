import Link from "next/link";
import { getOrgContext } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";
import { MODULES, quickActionsFor } from "@/lib/modules";
import DashboardFilters from "./DashboardFilters";

export const dynamic = "force-dynamic";

function fmt(n: number) { return "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 }); }

export default async function DashboardHome({ searchParams }: { searchParams: { from_date?: string; to_date?: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org) {
    return <div className="text-neutral-500">Loading…</div>;
  }

  const supabase = createClient();
  const orgId = ctx.org.id;
  const has = (k: string) => ctx.enabledModules.has(k);
  const fromDate = searchParams.from_date ?? '';
  const toDate   = searchParams.to_date ?? '';

  // Fetch only the KPIs relevant to this org's enabled modules, in parallel.
  const [invoices, productCount, contactCount, employeeCount, ledger] = await Promise.all([
    has("billing")
      ? (() => {
          let q = supabase.from("invoices").select("total,status").eq("org_id", orgId).eq("doc_type", "invoice");
          if (fromDate) q = q.gte("issue_date", fromDate);
          if (toDate)   q = q.lte("issue_date", toDate);
          return q;
        })()
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
    has("ledger")
      ? supabase.from("ledger_entries").select("amount").eq("org_id", orgId)
      : Promise.resolve({ data: null }),
  ]);

  const invRows = (invoices as { data: { total: number; status: string }[] | null }).data ?? [];
  const ledgerRows = (ledger as { data: { amount: number }[] | null }).data ?? [];
  const receivable = ledgerRows.reduce((s, e) => s + (Number(e.amount) > 0 ? Number(e.amount) : 0), 0);
  const revenue = invRows.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.total ?? 0), 0);
  const unpaid = invRows.filter((i) => i.status !== "paid" && i.status !== "draft").length;

  const kpis: { label: string; value: string; href: string; accent?: string }[] = [];
  if (has("billing")) {
    kpis.push({ label: "Revenue collected", value: fmt(revenue), href: "/dashboard/billing", accent: "text-green-600" });
    kpis.push({ label: "Unpaid invoices", value: String(unpaid), href: "/dashboard/billing", accent: unpaid > 0 ? "text-amber-600" : "" });
  }
  if (has("ledger")) kpis.push({ label: "Credit outstanding", value: fmt(receivable), href: "/dashboard/ledger", accent: receivable > 0 ? "text-amber-600" : "" });
  if (has("inventory")) kpis.push({ label: "Products", value: String((productCount as { count: number | null }).count ?? 0), href: "/dashboard/inventory" });
  if (has("crm")) kpis.push({ label: "Contacts", value: String((contactCount as { count: number | null }).count ?? 0), href: "/dashboard/crm" });
  if (has("hr")) kpis.push({ label: "Employees", value: String((employeeCount as { count: number | null }).count ?? 0), href: "/dashboard/hr" });

  const actions = quickActionsFor(ctx.org.business_type).filter((a) =>
    // only show actions whose target module is enabled
    MODULES.some((m) => a.href.startsWith(m.href) && has(m.key)) || a.href === "/dashboard/reports"
  );
  const moduleGroups = (["business", "workspace"] as const)
    .map((cat) => ({ cat, items: MODULES.filter((m) => m.category === cat && has(m.key)) }))
    .filter((g) => g.items.length > 0);
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

      {/* Date-range filter (KPI period) */}
      {kpis.length > 0 && (
        <DashboardFilters fromDate={fromDate} toDate={toDate} />
      )}

      {/* KPIs */}
      {kpis.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {kpis.map((k) => (
            <Link key={k.label} href={k.href}
              className="rounded-xl border border-neutral-200 bg-white p-4 hover:border-neutral-300 transition-colors">
              <p className="text-xs text-neutral-400">
                {k.label}
                {(fromDate || toDate) && <span className="ml-1 text-neutral-300">(filtered)</span>}
              </p>
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

      {/* Modules grouped by category */}
      {moduleGroups.map((g) => (
        <section key={g.cat}>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">
            {g.cat === "workspace" ? "Workspace · Startup OS" : "Business"}
          </h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {g.items.map((m) => (
              <Link key={m.key} href={m.href}
                className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4 hover:border-neutral-300 hover:shadow-sm transition-all">
                <span className="text-2xl">{m.icon}</span>
                <span className="font-medium text-sm">{m.name}</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
