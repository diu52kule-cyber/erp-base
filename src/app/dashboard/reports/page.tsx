import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

function fmtNum(n: number) {
  return new Intl.NumberFormat('en-IN').format(n);
}

export default async function ReportsPage() {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('reports') || !ctx.org) redirect('/dashboard');

  const supabase = await createClient();
  const orgId = ctx.org.id;

  const [
    { data: invoices },
    { data: employees },
    { data: products },
    { data: contacts },
    { data: deals },
    { data: payrollRuns },
  ] = await Promise.all([
    supabase.from('invoices').select('id,status,total,created_at,customer_name,line_items').eq('org_id', orgId).eq('doc_type', 'invoice'),
    supabase.from('employees').select('id,status,monthly_salary,employment_type').eq('org_id', orgId),
    supabase.from('products').select('id,name,stock_qty,selling_price,low_stock_threshold').eq('org_id', orgId),
    supabase.from('contacts').select('id,type,created_at').eq('org_id', orgId),
    supabase.from('deals').select('id,stage,value,created_at').eq('org_id', orgId),
    supabase.from('payroll_runs').select('id,month,total_gross,total_net,status').eq('org_id', orgId).order('month', { ascending: false }).limit(6),
  ]);

  const invList = invoices ?? [];
  const empList = employees ?? [];
  const prodList = products ?? [];
  const contactList = contacts ?? [];
  const dealList = deals ?? [];
  const payrollList = payrollRuns ?? [];

  // Billing metrics
  const totalRevenue = invList.filter((i) => i.status === 'paid').reduce((s, i) => s + (i.total ?? 0), 0);
  const outstanding = invList.filter((i) => i.status === 'sent').reduce((s, i) => s + (i.total ?? 0), 0);
  const draftCount = invList.filter((i) => i.status === 'draft').length;
  const paidCount = invList.filter((i) => i.status === 'paid').length;

  // Monthly revenue (last 6 months)
  const now = new Date();
  const monthlyRevenue: { month: string; revenue: number; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    const monthInvs = invList.filter((inv) => inv.status === 'paid' && (inv.created_at ?? '').startsWith(key));
    monthlyRevenue.push({ month: label, revenue: monthInvs.reduce((s, i) => s + (i.total ?? 0), 0), count: monthInvs.length });
  }
  const maxRev = Math.max(...monthlyRevenue.map((m) => m.revenue), 1);

  // HR metrics
  const activeEmployees = empList.filter((e) => e.status === 'active');
  const totalPayroll = activeEmployees.reduce((s, e) => s + (e.monthly_salary ?? 0), 0);
  const empByType: Record<string, number> = {};
  activeEmployees.forEach((e) => { empByType[e.employment_type] = (empByType[e.employment_type] ?? 0) + 1; });

  // Inventory metrics
  const totalInventoryValue = prodList.reduce((s, p) => s + (p.stock_qty ?? 0) * (p.selling_price ?? 0), 0);
  const lowStockItems = prodList.filter((p) => (p.stock_qty ?? 0) <= (p.low_stock_threshold ?? 0));

  // MoM / YoY comparison
  const paidInvs = invList.filter((i) => i.status === 'paid');
  const curMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
  const lastYearKey = `${now.getFullYear() - 1}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const curMonthRev = paidInvs.filter((i) => (i.created_at ?? '').startsWith(curMonthKey)).reduce((s, i) => s + (i.total ?? 0), 0);
  const prevMonthRev = paidInvs.filter((i) => (i.created_at ?? '').startsWith(prevMonthKey)).reduce((s, i) => s + (i.total ?? 0), 0);
  const lastYearRev = paidInvs.filter((i) => (i.created_at ?? '').startsWith(lastYearKey)).reduce((s, i) => s + (i.total ?? 0), 0);

  const momPct = prevMonthRev === 0 ? null : ((curMonthRev - prevMonthRev) / prevMonthRev) * 100;
  const yoyPct = lastYearRev === 0 ? null : ((curMonthRev - lastYearRev) / lastYearRev) * 100;

  // Top customers by revenue (LTV)
  const customerRevMap: Record<string, number> = {};
  paidInvs.forEach((i) => {
    const name = (i.customer_name as string) || 'Unknown';
    customerRevMap[name] = (customerRevMap[name] ?? 0) + (i.total ?? 0);
  });
  const topCustomers = Object.entries(customerRevMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Top products by revenue (from line_items JSON)
  const productRevMap: Record<string, number> = {};
  paidInvs.forEach((i) => {
    const lines: any[] = Array.isArray(i.line_items) ? i.line_items : [];
    lines.forEach((line) => {
      const name = (line.description as string) || 'Unknown';
      const amount = Number(line.amount ?? (line.unit_price ?? 0) * (line.quantity ?? 1));
      productRevMap[name] = (productRevMap[name] ?? 0) + amount;
    });
  });
  const topProducts = Object.entries(productRevMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxProductRev = topProducts[0]?.[1] ?? 1;

  // CRM metrics
  const leads = contactList.filter((c) => c.type === 'lead').length;
  const customers = contactList.filter((c) => c.type === 'customer').length;
  const wonDeals = dealList.filter((d) => d.stage === 'won');
  const lostDeals = dealList.filter((d) => d.stage === 'lost');
  const closedDeals = wonDeals.length + lostDeals.length;
  const winRate = closedDeals === 0 ? null : Math.round((wonDeals.length / closedDeals) * 100);
  const pipeline = dealList.filter((d) => !['won','lost'].includes(d.stage)).reduce((s, d) => s + (d.value ?? 0), 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Reports</h1>
          <p className="mt-1 text-sm text-neutral-500">Business overview across all modules</p>
        </div>
        <Link href="/dashboard/reports/custom" className="rounded-lg border border-neutral-200 px-3 py-2 text-sm hover:bg-neutral-50">
          Custom Reports
        </Link>
      </div>

      {/* Billing */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Billing & Revenue</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Total Revenue', value: fmt(totalRevenue), sub: `${paidCount} paid invoices` },
            { label: 'Outstanding', value: fmt(outstanding), sub: 'sent, not paid' },
            { label: 'Draft Invoices', value: draftCount, sub: '' },
            { label: 'Total Invoices', value: invList.length, sub: '' },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-neutral-200 bg-white p-5">
              <p className="text-sm text-neutral-500">{s.label}</p>
              <p className="mt-1 text-2xl font-semibold">{s.value}</p>
              {s.sub && <p className="mt-0.5 text-xs text-neutral-400">{s.sub}</p>}
            </div>
          ))}
        </div>

        {/* Bar chart */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6">
          <h3 className="mb-4 text-sm font-medium text-neutral-600">Monthly Revenue (last 6 months)</h3>
          <div className="flex items-end gap-3 h-32">
            {monthlyRevenue.map((m) => (
              <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs text-neutral-500">{m.revenue > 0 ? fmt(m.revenue) : ''}</span>
                <div className="w-full rounded-t-sm bg-neutral-900" style={{ height: `${(m.revenue / maxRev) * 80 + (m.revenue > 0 ? 4 : 0)}px`, minHeight: '2px' }} />
                <span className="text-xs text-neutral-400">{m.month}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HR */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">HR</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Active Employees', value: activeEmployees.length },
            { label: 'Monthly Payroll', value: fmt(totalPayroll) },
            { label: 'Full-time', value: empByType['full-time'] ?? 0 },
            { label: 'Part-time / Contract', value: (empByType['part-time'] ?? 0) + (empByType['contract'] ?? 0) },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-neutral-200 bg-white p-5">
              <p className="text-sm text-neutral-500">{s.label}</p>
              <p className="mt-1 text-2xl font-semibold">{s.value}</p>
            </div>
          ))}
        </div>
        {payrollList.length > 0 && (
          <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-500">
                <th className="px-4 py-3 text-left font-medium">Month</th>
                <th className="px-4 py-3 text-right font-medium">Gross</th>
                <th className="px-4 py-3 text-right font-medium">Net</th>
                <th className="px-4 py-3 text-right font-medium">Status</th>
              </tr></thead>
              <tbody className="divide-y divide-neutral-100">
                {payrollList.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-2">{p.month}</td>
                    <td className="px-4 py-2 text-right">{fmt(p.total_gross ?? 0)}</td>
                    <td className="px-4 py-2 text-right">{fmt(p.total_net ?? 0)}</td>
                    <td className="px-4 py-2 text-right">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${p.status === 'processed' ? 'bg-green-50 text-green-700' : 'bg-neutral-100 text-neutral-500'}`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* CRM */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">CRM</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Leads', value: leads },
            { label: 'Customers', value: customers },
            { label: 'Active Pipeline', value: fmt(pipeline) },
            { label: 'Deals Won', value: wonDeals.length },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-neutral-200 bg-white p-5">
              <p className="text-sm text-neutral-500">{s.label}</p>
              <p className="mt-1 text-2xl font-semibold">{s.value}</p>
            </div>
          ))}
        </div>
        {winRate !== null && (
          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <p className="text-sm text-neutral-500 mb-2">Deal Win Rate</p>
            <div className="flex items-center gap-4">
              <span className="text-3xl font-bold">{winRate}%</span>
              <div className="flex-1">
                <div className="h-3 rounded-full bg-neutral-100 overflow-hidden">
                  <div className="h-full rounded-full bg-green-500" style={{ width: `${winRate}%` }} />
                </div>
                <p className="mt-1 text-xs text-neutral-400">{wonDeals.length} won · {lostDeals.length} lost out of {closedDeals} closed</p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Analytics */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Analytics</h2>

        {/* MoM / YoY comparison */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <p className="text-sm text-neutral-500">This Month vs Last Month</p>
            <p className="mt-1 text-2xl font-semibold">{fmt(curMonthRev)}</p>
            {momPct !== null ? (
              <p className={`mt-1 text-sm font-medium ${momPct >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {momPct >= 0 ? '▲' : '▼'} {Math.abs(momPct).toFixed(1)}% vs {prevDate.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })} ({fmt(prevMonthRev)})
              </p>
            ) : (
              <p className="mt-1 text-xs text-neutral-400">No data for previous month</p>
            )}
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <p className="text-sm text-neutral-500">This Month vs Same Month Last Year</p>
            <p className="mt-1 text-2xl font-semibold">{fmt(curMonthRev)}</p>
            {yoyPct !== null ? (
              <p className={`mt-1 text-sm font-medium ${yoyPct >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {yoyPct >= 0 ? '▲' : '▼'} {Math.abs(yoyPct).toFixed(1)}% vs {new Date(now.getFullYear() - 1, now.getMonth()).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })} ({fmt(lastYearRev)})
              </p>
            ) : (
              <p className="mt-1 text-xs text-neutral-400">No data for same month last year</p>
            )}
          </div>
        </div>

        {/* Top customers */}
        {topCustomers.length > 0 && (
          <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
            <div className="border-b border-neutral-100 px-5 py-3">
              <h3 className="text-sm font-medium text-neutral-700">Top Customers by Revenue</h3>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-500">
                <th className="px-5 py-2 text-left font-medium">#</th>
                <th className="px-5 py-2 text-left font-medium">Customer</th>
                <th className="px-5 py-2 text-right font-medium">Revenue</th>
                <th className="px-5 py-2 text-right font-medium">Share</th>
              </tr></thead>
              <tbody className="divide-y divide-neutral-100">
                {topCustomers.map(([name, rev], i) => (
                  <tr key={name}>
                    <td className="px-5 py-2.5 text-neutral-400 text-xs">{i + 1}</td>
                    <td className="px-5 py-2.5 font-medium">{name}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums">{fmt(rev)}</td>
                    <td className="px-5 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                          <div className="h-full rounded-full bg-indigo-500" style={{ width: `${totalRevenue > 0 ? (rev / totalRevenue) * 100 : 0}%` }} />
                        </div>
                        <span className="text-xs text-neutral-500 w-8">{totalRevenue > 0 ? ((rev / totalRevenue) * 100).toFixed(0) : 0}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Product profitability */}
        {topProducts.length > 0 && (
          <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
            <div className="border-b border-neutral-100 px-5 py-3">
              <h3 className="text-sm font-medium text-neutral-700">Top Products / Services by Revenue</h3>
            </div>
            <div className="divide-y divide-neutral-100">
              {topProducts.map(([name, rev]) => (
                <div key={name} className="flex items-center gap-4 px-5 py-3">
                  <span className="flex-1 text-sm font-medium truncate">{name}</span>
                  <span className="text-sm tabular-nums text-neutral-600 shrink-0">{fmt(rev)}</span>
                  <div className="w-24 h-2 rounded-full bg-neutral-100 overflow-hidden shrink-0">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(rev / maxProductRev) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Inventory */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Inventory</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {[
            { label: 'Total Products', value: prodList.length },
            { label: 'Inventory Value', value: fmt(totalInventoryValue) },
            { label: 'Low Stock Items', value: lowStockItems.length },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl border p-5 ${s.label === 'Low Stock Items' && lowStockItems.length > 0 ? 'border-amber-200 bg-amber-50' : 'border-neutral-200 bg-white'}`}>
              <p className="text-sm text-neutral-500">{s.label}</p>
              <p className="mt-1 text-2xl font-semibold">{s.value}</p>
            </div>
          ))}
        </div>
        {lowStockItems.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-800 mb-2">Low Stock Alert</p>
            <ul className="space-y-1">
              {lowStockItems.map((p) => (
                <li key={p.id} className="text-sm text-amber-700">
                  {p.name} — {fmtNum(p.stock_qty ?? 0)} remaining (threshold: {fmtNum(p.low_stock_threshold ?? 0)})
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
