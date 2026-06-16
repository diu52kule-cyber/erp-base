'use client';
import { useState } from 'react';

type Module = { key: string; name: string; enabled: boolean };
type Plan = { plan_name: string; status: string; amount: number; billing_period: string; next_billing_date?: string | null; notes?: string | null };
type Member = { user_id: string; role: string; email?: string };
type Stats = { invoice_count: number; revenue: number; employee_count: number };

const PLAN_NAMES = ['trial', 'starter', 'growth', 'scale', 'custom', 'suspended'];
const STATUSES   = ['trial', 'active', 'suspended', 'cancelled'];
const PLAN_PRICES: Record<string, number> = { trial: 0, starter: 999, growth: 2499, scale: 4999, custom: 0, suspended: 0 };

const STATUS_COLORS: Record<string, string> = {
  trial: 'bg-yellow-50 text-yellow-700', active: 'bg-green-50 text-green-700',
  suspended: 'bg-red-50 text-red-600', cancelled: 'bg-neutral-100 text-neutral-400',
};

function fmt(n: number) { return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0 }); }

export default function ClientDetail({ orgId, orgName, initialPlan, initialModules, members, stats }:
  { orgId: string; orgName: string; initialPlan: Plan; initialModules: Module[]; members: Member[]; stats: Stats }) {

  const [plan, setPlan] = useState<Plan>(initialPlan);
  const [modules, setModules] = useState<Module[]>(initialModules);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function patch(body: object) {
    setSaving(true); setSaved(false);
    await fetch(`/api/admin/orgs/${orgId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function savePlan() { await patch({ plan }); }

  async function toggleModule(key: string, enabled: boolean) {
    setModules((m) => m.map((mod) => mod.key === key ? { ...mod, enabled } : mod));
    await patch({ module_key: key, enabled });
  }

  async function toggleAll(enabled: boolean) {
    setModules((m) => m.map((mod) => ({ ...mod, enabled })));
    await patch({ all_modules: enabled });
  }

  function setPlanField(k: keyof Plan, v: string | number) {
    setPlan((p) => ({ ...p, [k]: v }));
  }

  const enabledCount = modules.filter((m) => m.enabled).length;

  return (
    <div className="space-y-6">

      {/* Plan editor */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">Subscription Plan</h2>
          <div className="flex items-center gap-3">
            {saved && <span className="text-xs text-green-600 font-medium">Saved ✓</span>}
            <button onClick={savePlan} disabled={saving}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Plan'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-neutral-500">Plan</label>
            <select value={plan.plan_name}
              onChange={(e) => { const name = e.target.value; setPlanField('plan_name', name); if (PLAN_PRICES[name] !== undefined) setPlanField('amount', PLAN_PRICES[name]); }}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm">
              {PLAN_NAMES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-neutral-500">Status</label>
            <select value={plan.status} onChange={(e) => setPlanField('status', e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm">
              {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-neutral-500">Billing Period</label>
            <select value={plan.billing_period} onChange={(e) => setPlanField('billing_period', e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm">
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-neutral-500">Amount (₹/period)</label>
            <input type="number" value={plan.amount} onChange={(e) => setPlanField('amount', parseFloat(e.target.value) || 0)}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
            <p className="mt-1 text-[11px] text-neutral-400">This is the price the client pays on the paywall via Razorpay.</p>
          </div>
          <div>
            <label className="text-xs text-neutral-500">Next Billing Date</label>
            <input type="date" value={plan.next_billing_date ?? ''} onChange={(e) => setPlanField('next_billing_date', e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-neutral-500">Internal Notes</label>
            <input value={plan.notes ?? ''} onChange={(e) => setPlanField('notes', e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" placeholder="e.g. referred by X, special pricing" />
          </div>
        </div>

        {/* Quick status badges */}
        <div className="mt-4 flex gap-2">
          {STATUSES.map((s) => (
            <button key={s} onClick={() => { setPlanField('status', s); patch({ plan: { ...plan, status: s } }); }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${plan.status === s ? STATUS_COLORS[s] + ' ring-2 ring-offset-1 ring-current' : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'}`}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Module entitlements */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-lg">Module Access</h2>
            <p className="text-xs text-neutral-400 mt-0.5">{enabledCount}/{modules.length} modules enabled</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => toggleAll(false)} className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs hover:bg-neutral-50">Disable All</button>
            <button onClick={() => toggleAll(true)} className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs text-white">Enable All</button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {modules.map((mod) => (
            <label key={mod.key} className={`flex items-center justify-between rounded-lg border px-4 py-3 cursor-pointer transition-all ${mod.enabled ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200 hover:border-neutral-300'}`}>
              <div className="flex items-center gap-3">
                <div className={`h-2 w-2 rounded-full ${mod.enabled ? 'bg-green-500' : 'bg-neutral-300'}`} />
                <span className="text-sm font-medium">{mod.name}</span>
                <code className="text-xs text-neutral-400">{mod.key}</code>
              </div>
              <button onClick={() => toggleModule(mod.key, !mod.enabled)}
                className={`relative h-5 w-9 rounded-full transition-colors ${mod.enabled ? 'bg-neutral-900' : 'bg-neutral-200'}`}>
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${mod.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </label>
          ))}
        </div>
        <p className="mt-3 text-xs text-neutral-400">
          Module gating is live — disabled modules are hidden from this client’s sidebar immediately.
        </p>
      </div>

      {/* Stats + Members side by side */}
      <div className="grid grid-cols-2 gap-6">
        {/* Stats */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6">
          <h2 className="font-semibold mb-4">Usage Stats</h2>
          <div className="space-y-3">
            {[
              ['Invoices created', stats.invoice_count],
              ['Revenue collected', fmt(stats.revenue)],
              ['Employees', stats.employee_count],
            ].map(([l, v]) => (
              <div key={l as string} className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0">
                <span className="text-sm text-neutral-500">{l}</span>
                <span className="text-sm font-semibold">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Members */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6">
          <h2 className="font-semibold mb-4">Team Members <span className="ml-1 text-sm font-normal text-neutral-400">({members.length})</span></h2>
          <div className="space-y-2">
            {members.length === 0 ? (
              <p className="text-sm text-neutral-400">No members yet</p>
            ) : members.map((m) => (
              <div key={m.user_id} className="flex items-center justify-between py-1.5">
                <span className="text-sm truncate">{m.email ?? m.user_id}</span>
                <span className="ml-2 shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-xs capitalize">{m.role}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
