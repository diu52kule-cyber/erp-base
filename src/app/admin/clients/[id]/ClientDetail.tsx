'use client';
import { useState } from 'react';

type Module = { key: string; name: string; enabled: boolean; category?: string };
type Plan = { plan_name: string; status: string; amount: number; billing_period: string; next_billing_date?: string | null; notes?: string | null };
type Member = { user_id: string; role: string; job_title?: string | null; email?: string };
type Stats = { invoice_count: number; revenue: number; employee_count: number; contact_count: number; pos_order_count: number; last_pos_date: string | null };
type RecentInvoice = { id: string; number: string; total: number; status: string; date: string };

const PLAN_NAMES = ['trial', 'starter', 'growth', 'scale', 'custom', 'suspended'];
const STATUSES   = ['trial', 'active', 'suspended', 'cancelled'];
const PLAN_PRICES: Record<string, number> = { trial: 0, starter: 999, growth: 2499, scale: 4999, custom: 0, suspended: 0 };

const STATUS_COLORS: Record<string, string> = {
  trial: 'bg-yellow-50 text-yellow-700', active: 'bg-green-50 text-green-700',
  suspended: 'bg-red-50 text-red-600', cancelled: 'bg-neutral-100 text-neutral-400',
};
const INV_STATUS: Record<string, string> = {
  draft: 'bg-neutral-100 text-neutral-500', sent: 'bg-blue-50 text-blue-600',
  paid: 'bg-green-50 text-green-700', overdue: 'bg-red-50 text-red-600',
  void: 'bg-neutral-100 text-neutral-400',
};

const fmt = (n: number) => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });

function daysLeft(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr + 'T23:59:59').getTime() - Date.now()) / 86400000);
}

export default function ClientDetail({ orgId, orgName, initialPlan, initialModules, members, stats, recentInvoices, ownerEmail }:
  { orgId: string; orgName: string; initialPlan: Plan; initialModules: Module[]; members: Member[]; stats: Stats; recentInvoices: RecentInvoice[]; ownerEmail: string | null }) {

  const [plan, setPlan] = useState<Plan>(initialPlan);
  const [modules, setModules] = useState<Module[]>(initialModules);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [extending, setExtending] = useState(false);

  async function patch(body: object) {
    setSaving(true); setSaved(false); setSaveError(null);
    try {
      const res = await fetch(`/api/admin/orgs/${orgId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSaveError((data as any).error ?? `Error ${res.status}`);
      } else {
        setSaved(true); setTimeout(() => setSaved(false), 2500);
      }
    } catch { setSaveError('Network error'); }
    finally { setSaving(false); }
  }

  async function extendTrial(days: number) {
    setExtending(true);
    await fetch(`/api/admin/orgs/${orgId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ extend_trial_days: days }),
    });
    setExtending(false);
    window.location.reload();
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

  async function toggleBundle(category: string, enabled: boolean) {
    const keys = modules.filter((m) => (m.category ?? 'business') === category).map((m) => m.key);
    setModules((m) => m.map((mod) => keys.includes(mod.key) ? { ...mod, enabled } : mod));
    await patch({ module_keys: keys, enabled });
  }

  function setPlanField(k: keyof Plan, v: string | number) { setPlan((p) => ({ ...p, [k]: v })); }

  const enabledCount = modules.filter((m) => m.enabled).length;
  const trialDays = plan.status === 'trial' ? daysLeft(plan.next_billing_date ?? null) : null;

  return (
    <div className="space-y-6">

      {/* Trial expiry banner */}
      {plan.status === 'trial' && trialDays !== null && (
        <div className={`rounded-xl border p-4 flex items-center justify-between ${trialDays <= 0 ? 'border-red-200 bg-red-50' : trialDays <= 3 ? 'border-amber-200 bg-amber-50' : 'border-yellow-100 bg-yellow-50'}`}>
          <div>
            <p className={`font-semibold text-sm ${trialDays <= 0 ? 'text-red-800' : 'text-amber-800'}`}>
              {trialDays <= 0 ? '⚠ Trial has expired' : `Trial ends in ${trialDays} day${trialDays !== 1 ? 's' : ''}`}
            </p>
            <p className="text-xs text-neutral-500 mt-0.5">Extend to keep the client active, or activate a paid plan below.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            {[7, 30, 90].map((d) => (
              <button key={d} onClick={() => extendTrial(d)} disabled={extending}
                className="rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50">
                {extending ? '…' : `+${d} days`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Invoices', value: stats.invoice_count },
          { label: 'Revenue', value: fmt(stats.revenue) },
          { label: 'Employees', value: stats.employee_count },
          { label: 'Contacts', value: stats.contact_count },
          { label: 'POS Orders', value: stats.pos_order_count },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-neutral-200 bg-white p-4 text-center">
            <p className="text-xs text-neutral-400">{label}</p>
            <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      {/* Plan + recent invoices side by side */}
      <div className="grid grid-cols-5 gap-6">
        {/* Plan editor */}
        <div className="col-span-3 rounded-xl border border-neutral-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Subscription Plan</h2>
            <div className="flex items-center gap-3">
              {saved && <span className="text-xs text-green-600 font-medium">Saved ✓</span>}
              {saveError && <span className="text-xs text-red-600 font-medium">{saveError}</span>}
              <button onClick={savePlan} disabled={saving}
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50">
                {saving ? 'Saving…' : 'Save Plan'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-xs text-neutral-500">Plan</label>
              <select value={plan.plan_name}
                onChange={(e) => { const n = e.target.value; setPlanField('plan_name', n); if (PLAN_PRICES[n] !== undefined) setPlanField('amount', PLAN_PRICES[n]); }}
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
            </div>
            <div>
              <label className="text-xs text-neutral-500">Next Billing / Trial End</label>
              <input type="date" value={plan.next_billing_date ?? ''} onChange={(e) => setPlanField('next_billing_date', e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-neutral-500">Internal Notes</label>
              <input value={plan.notes ?? ''} onChange={(e) => setPlanField('notes', e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" placeholder="e.g. referred by X" />
            </div>
          </div>

          {/* Quick status badges */}
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <button key={s} onClick={() => { setPlanField('status', s); patch({ plan: { ...plan, status: s } }); }}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${plan.status === s ? STATUS_COLORS[s] + ' ring-2 ring-offset-1 ring-current' : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'}`}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Recent invoices */}
        <div className="col-span-2 rounded-xl border border-neutral-200 bg-white p-6">
          <h2 className="font-semibold mb-4">Recent Invoices <span className="text-sm font-normal text-neutral-400">(last 5)</span></h2>
          {recentInvoices.length === 0 ? (
            <p className="text-sm text-neutral-400">No invoices yet</p>
          ) : (
            <div className="divide-y divide-neutral-100">
              {recentInvoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium tabular-nums">{inv.number}</p>
                    <p className="text-xs text-neutral-400">{new Date(inv.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm tabular-nums font-semibold">{fmt(inv.total)}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${INV_STATUS[inv.status] ?? 'bg-neutral-100 text-neutral-500'}`}>
                      {inv.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Module access */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-lg">Module Access</h2>
            <p className="text-xs text-neutral-400 mt-0.5">{enabledCount}/{modules.length} modules enabled</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => toggleBundle('business', true)} className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs hover:bg-neutral-50">+ Business</button>
            <button onClick={() => toggleBundle('workspace', true)} className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs hover:bg-neutral-50">+ Workspace</button>
            <button onClick={() => toggleAll(false)} className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs hover:bg-neutral-50 text-red-500">Disable All</button>
            <button onClick={() => toggleAll(true)} className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs text-white">Enable All</button>
          </div>
        </div>
        {(['business', 'workspace'] as const).map((cat) => {
          const mods = modules.filter((m) => (m.category ?? 'business') === cat);
          if (mods.length === 0) return null;
          return (
            <div key={cat} className="mb-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">{cat === 'workspace' ? 'Startup OS / Workspace' : 'Business'}</span>
                <button onClick={() => toggleBundle(cat, false)} className="text-[11px] text-neutral-400 hover:text-red-600">turn off all</button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {mods.map((mod) => (
                  <label key={mod.key} className={`flex items-center justify-between rounded-lg border px-4 py-3 cursor-pointer transition-all ${mod.enabled ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200 hover:border-neutral-300'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full flex-shrink-0 ${mod.enabled ? 'bg-green-500' : 'bg-neutral-300'}`} />
                      <span className="text-sm font-medium">{mod.name}</span>
                      <code className="text-xs text-neutral-400">{mod.key}</code>
                    </div>
                    <button onClick={() => toggleModule(mod.key, !mod.enabled)}
                      className={`relative h-5 w-9 rounded-full transition-colors flex-shrink-0 ${mod.enabled ? 'bg-neutral-900' : 'bg-neutral-200'}`}>
                      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${mod.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Team members */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6">
        <h2 className="font-semibold mb-4">Team Members <span className="ml-1 text-sm font-normal text-neutral-400">({members.length})</span></h2>
        {members.length === 0 ? (
          <p className="text-sm text-neutral-400">No members</p>
        ) : (
          <div className="divide-y divide-neutral-100">
            {members.map((m) => (
              <div key={m.user_id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm">{m.email ?? m.user_id}</p>
                  {m.job_title && <p className="text-xs text-neutral-400">{m.job_title}</p>}
                </div>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs capitalize">{m.role}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
