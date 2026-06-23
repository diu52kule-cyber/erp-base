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
  const today = new Date().toISOString().split('T')[0];

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

  // Actionable data — wrapped in try/catch so missing tables don't break dashboard
  let overdueList: { id: string; invoice_number: string; customer_name: string; total: number; due_date: string }[] = [];
  let pendingLeaveList: { id: string; employee: { name: string } | null; start_date: string; end_date: string }[] = [];
  let pendingExpenseList: { id: string; title: string; amount: number; employee: { name: string } | null }[] = [];
  let lowStock: { id: string; name: string; stock_qty: number; low_stock_threshold: number; unit: string }[] = [];
  let openPOS: { id: string; opened_at: string; cash_float: number }[] = [];

  await Promise.all([
    has("billing") ? (async () => {
      try {
        const { data } = await supabase.from("invoices")
          .select("id, invoice_number, customer_name, total, due_date")
          .eq("org_id", orgId).eq("doc_type", "invoice")
          .in("status", ["sent", "partial"]).lt("due_date", today)
          .order("due_date", { ascending: true }).limit(5);
        overdueList = (data ?? []) as typeof overdueList;
      } catch { /* ignore */ }
    })() : Promise.resolve(),

    has("hr") ? (async () => {
      try {
        const { data } = await supabase.from("leave_requests")
          .select("id, employee:employee_id(name), start_date, end_date")
          .eq("org_id", orgId).eq("status", "pending")
          .order("created_at", { ascending: false }).limit(5);
        pendingLeaveList = (data ?? []) as unknown as typeof pendingLeaveList;
      } catch { /* ignore */ }
    })() : Promise.resolve(),

    has("expenses") ? (async () => {
      try {
        const { data } = await supabase.from("expense_claims")
          .select("id, title, amount, employee:employee_id(name)")
          .eq("org_id", orgId).eq("status", "submitted")
          .order("created_at", { ascending: false }).limit(5);
        pendingExpenseList = (data ?? []) as unknown as typeof pendingExpenseList;
      } catch { /* ignore */ }
    })() : Promise.resolve(),

    has("inventory") ? (async () => {
      try {
        const { data } = await supabase.from("products")
          .select("id, name, stock_qty, low_stock_threshold, unit")
          .eq("org_id", orgId).eq("is_active", true)
          .not("low_stock_threshold", "is", null)
          .order("stock_qty", { ascending: true }).limit(20);
        lowStock = ((data ?? []) as typeof lowStock)
          .filter(p => Number(p.stock_qty) <= Number(p.low_stock_threshold))
          .slice(0, 5);
      } catch { /* ignore */ }
    })() : Promise.resolve(),

    has("pos") ? (async () => {
      try {
        const { data } = await supabase.from("pos_sessions")
          .select("id, opened_at, cash_float")
          .eq("org_id", orgId).eq("status", "open")
          .order("opened_at", { ascending: false }).limit(1);
        openPOS = (data ?? []) as typeof openPOS;
      } catch { /* ignore */ }
    })() : Promise.resolve(),
  ]);

  const invRows = (invoices as { data: { total: number; status: string }[] | null }).data ?? [];
  const ledgerRows = (ledger as { data: { amount: number }[] | null }).data ?? [];
  const receivable = ledgerRows.reduce((s, e) => s + (Number(e.amount) > 0 ? Number(e.amount) : 0), 0);
  const revenue = invRows.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.total ?? 0), 0);
  const unpaid = invRows.filter((i) => i.status !== "paid" && i.status !== "draft").length;

  const overdueTotal = overdueList.reduce((s, i) => s + Number(i.total), 0);
  const expTotal = pendingExpenseList.reduce((s, e) => s + Number(e.amount), 0);

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
    MODULES.some((m) => a.href.startsWith(m.href) && has(m.key)) || a.href === "/dashboard/reports"
  );
  const moduleGroups = (["business", "workspace"] as const)
    .map((cat) => ({ cat, items: MODULES.filter((m) => m.category === cat && has(m.key)) }))
    .filter((g) => g.items.length > 0);
  const firstName = (ctx.user.email ?? "there").split("@")[0];

  // Build action items
  type Urgency = 'high' | 'medium' | 'low';
  const actionItems: { type: string; title: string; subtitle: string; href: string; urgency: Urgency }[] = [];

  if (overdueList.length > 0) actionItems.push({
    type: 'overdue',
    title: `${overdueList.length} invoice${overdueList.length > 1 ? 's' : ''} overdue — ${fmt(overdueTotal)}`,
    subtitle: overdueList.slice(0, 2).map(i => `${i.invoice_number} · ${i.customer_name}`).join(', ') + (overdueList.length > 2 ? ` +${overdueList.length - 2} more` : ''),
    href: '/dashboard/billing',
    urgency: 'high',
  });
  if (pendingLeaveList.length > 0) actionItems.push({
    type: 'leaves',
    title: `${pendingLeaveList.length} leave request${pendingLeaveList.length > 1 ? 's' : ''} awaiting approval`,
    subtitle: pendingLeaveList.slice(0, 2).map(l => (l.employee as any)?.name ?? 'Employee').join(', ') + (pendingLeaveList.length > 2 ? ` +${pendingLeaveList.length - 2} more` : ''),
    href: '/dashboard/hr/leaves',
    urgency: 'medium',
  });
  if (pendingExpenseList.length > 0) actionItems.push({
    type: 'expenses',
    title: `${pendingExpenseList.length} expense claim${pendingExpenseList.length > 1 ? 's' : ''} pending — ${fmt(expTotal)}`,
    subtitle: pendingExpenseList.slice(0, 2).map(e => e.title).join(', ') + (pendingExpenseList.length > 2 ? ` +${pendingExpenseList.length - 2} more` : ''),
    href: '/dashboard/expenses',
    urgency: 'medium',
  });
  if (lowStock.length > 0) actionItems.push({
    type: 'stock',
    title: `${lowStock.length} product${lowStock.length > 1 ? 's' : ''} running low on stock`,
    subtitle: lowStock.slice(0, 3).map(p => `${p.name} (${p.stock_qty} ${p.unit ?? 'units'})`).join(', '),
    href: '/dashboard/inventory',
    urgency: 'low',
  });
  if (openPOS.length > 0) {
    const sess = openPOS[0];
    const openedAt = new Date(sess.opened_at);
    const hoursOpen = Math.round((Date.now() - openedAt.getTime()) / 3600000);
    actionItems.push({
      type: 'pos',
      title: `POS session open for ${hoursOpen}h`,
      subtitle: `Started at ${openedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} · Cash float ${fmt(sess.cash_float)}`,
      href: '/dashboard/pos',
      urgency: 'low',
    });
  }

  const urgencyStyle: Record<Urgency, { border: string; bg: string; dot: string; text: string }> = {
    high:   { border: 'border-l-red-500',    bg: 'bg-red-50 dark:bg-red-950/20',    dot: 'bg-red-500',    text: 'text-red-700 dark:text-red-400' },
    medium: { border: 'border-l-amber-500',  bg: 'bg-amber-50 dark:bg-amber-950/20', dot: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-400' },
    low:    { border: 'border-l-blue-400',   bg: 'bg-blue-50 dark:bg-blue-950/20',  dot: 'bg-blue-400',   text: 'text-blue-700 dark:text-blue-400' },
  };

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

      {/* Action Required */}
      {actionItems.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">Action Required</h2>
          <div className="space-y-2">
            {actionItems.map((item) => {
              const s = urgencyStyle[item.urgency];
              return (
                <Link key={item.type} href={item.href}
                  className={`flex items-start gap-4 rounded-xl border border-l-4 ${s.border} border-neutral-200 dark:border-neutral-800 ${s.bg} p-4 hover:brightness-95 transition-all`}>
                  <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${s.dot}`} />
                  <div className="min-w-0 flex-1">
                    <p className={`font-medium text-sm ${s.text}`}>{item.title}</p>
                    <p className="text-xs text-neutral-500 mt-0.5 truncate">{item.subtitle}</p>
                  </div>
                  <svg className="mt-1 h-4 w-4 shrink-0 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Date-range filter */}
      {kpis.length > 0 && (
        <DashboardFilters fromDate={fromDate} toDate={toDate} />
      )}

      {/* KPIs */}
      {kpis.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {kpis.map((k) => (
            <Link key={k.label} href={k.href}
              className="rounded-xl border border-neutral-200 bg-white p-4 hover:border-neutral-300 transition-colors dark:border-neutral-800 dark:bg-neutral-900">
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
                className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4 hover:border-neutral-400 hover:bg-neutral-50 transition-all dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800">
                <span className="text-xl">{a.icon}</span>
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{a.label}</span>
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
                className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4 hover:border-neutral-300 hover:shadow-sm transition-all dark:border-neutral-800 dark:bg-neutral-900">
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
