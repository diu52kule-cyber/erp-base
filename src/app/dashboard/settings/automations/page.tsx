'use client';

import { useEffect, useState } from 'react';

type Rule = {
  id: string;
  name: string;
  enabled: boolean;
  trigger_type: string;
  action_type: string;
  run_count: number;
  last_run_at: string | null;
  created_at: string;
};

const TRIGGER_LABELS: Record<string, string> = {
  deal_won:          'Deal Won',
  invoice_overdue:   'Invoice Overdue',
  stock_low:         'Stock Below Threshold',
  deal_stage_change: 'Deal Stage Changed',
};

const ACTION_LABELS: Record<string, string> = {
  create_invoice_draft: 'Create Invoice Draft',
  create_task:          'Create Task',
  create_po:            'Create Purchase Order',
  send_notification:    'Send Notification',
};

const PRESETS = [
  {
    name: 'New task when deal is won',
    trigger_type: 'deal_won',
    action_type: 'create_task',
    action_config: { title: 'Follow up after winning {{deal_name}}', priority: 'high' },
  },
  {
    name: 'Notify team when invoice is overdue',
    trigger_type: 'invoice_overdue',
    action_type: 'send_notification',
    action_config: {
      title: 'Invoice Overdue',
      message: 'Invoice {{invoice_number}} ({{contact_name}}) is overdue.',
      roles: ['owner', 'admin', 'accountant'],
    },
  },
  {
    name: 'Create task when stock is low',
    trigger_type: 'stock_low',
    action_type: 'create_task',
    action_config: { title: 'Reorder {{product_name}} — stock is low', priority: 'medium' },
  },
];

export default function AutomationsPage() {
  const [rules, setRules]   = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm]     = useState({
    name: '',
    trigger_type: 'deal_won',
    action_type: 'create_task',
    action_config_json: '{}',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/automations');
      const data = await res.json();
      setRules(Array.isArray(data) ? data : []);
    } catch { setRules([]); }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function applyPreset(preset: typeof PRESETS[0]) {
    setForm({
      name: preset.name,
      trigger_type: preset.trigger_type,
      action_type: preset.action_type,
      action_config_json: JSON.stringify(preset.action_config, null, 2),
    });
    setAdding(true);
  }

  async function handleCreate() {
    if (!form.name.trim()) { setError('Name required'); return; }
    let action_config: Record<string, unknown> = {};
    try {
      action_config = JSON.parse(form.action_config_json || '{}');
    } catch {
      setError('Action config must be valid JSON');
      return;
    }

    setSaving(true);
    setError(null);
    const res = await fetch('/api/settings/automations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name.trim(),
        trigger_type: form.trigger_type,
        action_type: form.action_type,
        action_config,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.error) { setError(data.error); return; }
    setForm({ name: '', trigger_type: 'deal_won', action_type: 'create_task', action_config_json: '{}' });
    setAdding(false);
    load();
  }

  async function toggleEnabled(rule: Rule) {
    await fetch('/api/settings/automations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: rule.id, enabled: !rule.enabled }),
    });
    load();
  }

  async function deleteRule(id: string) {
    if (!confirm('Delete this automation rule?')) return;
    await fetch('/api/settings/automations', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Automations</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Trigger actions automatically when business events happen</p>
        </div>
        <button
          onClick={() => setAdding((v) => !v)}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700"
        >
          {adding ? 'Cancel' : '+ New Rule'}
        </button>
      </div>

      {/* Presets */}
      {!adding && rules.length === 0 && !loading && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Quick start</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                onClick={() => applyPreset(p)}
                className="rounded-xl border border-neutral-200 p-4 text-left hover:border-neutral-400 hover:bg-neutral-50 transition-colors"
              >
                <p className="text-xs text-neutral-400">{TRIGGER_LABELS[p.trigger_type]} → {ACTION_LABELS[p.action_type]}</p>
                <p className="mt-1 text-sm font-medium">{p.name}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {adding && (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-5 space-y-4">
          <h2 className="font-medium text-sm">New Automation Rule</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-neutral-500">Rule Name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Notify on overdue invoice"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">When (Trigger)</label>
              <select
                value={form.trigger_type}
                onChange={(e) => setForm({ ...form, trigger_type: e.target.value })}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
              >
                {Object.entries(TRIGGER_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Then (Action)</label>
              <select
                value={form.action_type}
                onChange={(e) => setForm({ ...form, action_type: e.target.value })}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
              >
                {Object.entries(ACTION_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-neutral-500">
                Action Config (JSON) — use <code className="text-xs bg-neutral-100 px-1 rounded">{`{{variable}}`}</code> for dynamic values
              </label>
              <textarea
                rows={4}
                value={form.action_config_json}
                onChange={(e) => setForm({ ...form, action_config_json: e.target.value })}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
              <p className="mt-1 text-xs text-neutral-400">
                Available variables: <code className="bg-neutral-100 px-1 rounded">deal_name</code>, <code className="bg-neutral-100 px-1 rounded">contact_name</code>, <code className="bg-neutral-100 px-1 rounded">invoice_number</code>, <code className="bg-neutral-100 px-1 rounded">product_name</code>
              </p>
            </div>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={saving}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50"
            >
              {saving ? 'Creating…' : 'Create Rule'}
            </button>
            <button
              onClick={() => setAdding(false)}
              className="rounded-lg border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : rules.length === 0 && !adding ? null : rules.length > 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-100 bg-neutral-50">
              <tr className="text-xs text-neutral-500">
                <th className="px-4 py-3 text-left font-medium">Rule</th>
                <th className="px-4 py-3 text-left font-medium">Trigger</th>
                <th className="px-4 py-3 text-left font-medium">Action</th>
                <th className="px-4 py-3 text-right font-medium">Runs</th>
                <th className="px-4 py-3 text-left font-medium">Last Run</th>
                <th className="px-4 py-3 text-center font-medium">Enabled</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rules.map((r) => (
                <tr key={r.id} className={r.enabled ? '' : 'opacity-50'}>
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3 text-neutral-500">{TRIGGER_LABELS[r.trigger_type] ?? r.trigger_type}</td>
                  <td className="px-4 py-3 text-neutral-500">{ACTION_LABELS[r.action_type] ?? r.action_type}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.run_count}</td>
                  <td className="px-4 py-3 text-neutral-400 text-xs">
                    {r.last_run_at ? new Date(r.last_run_at).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleEnabled(r)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        r.enabled ? 'bg-green-500' : 'bg-neutral-300'
                      }`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform shadow ${
                        r.enabled ? 'translate-x-4.5' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => deleteRule(r.id)} className="text-xs text-neutral-400 hover:text-red-600">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
