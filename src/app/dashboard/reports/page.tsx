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
    supabase.from('invoices').select('id,status,total,created_at').eq('org_id', orgId),
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

  // CRM metrics
  const leads = contactList.filter((c) => c.type === 'lead').length;
  const customers = contactList.filter((c) => c.type === 'customer').length;
  const wonDeals = dealList.filter((d) => d.stage === 'won');
  const pipeline = dealList.filter((d) => !['won','lost'].includes(d.stage)).reduce((s, d) => s + (d.value ?? 0), 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="mt-1 text-sm text-neutral-500">Business overview across all modules</p>
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
