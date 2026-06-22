'use client';

import { useEffect, useState } from 'react';

type Provider = 'msg91' | 'twilio';
type FormState = {
  provider: Provider;
  msg91_authkey: string;
  msg91_sender: string;
  twilio_sid: string;
  twilio_token: string;
  twilio_from: string;
  is_active: boolean;
};

const EMPTY: FormState = {
  provider: 'msg91',
  msg91_authkey: '',
  msg91_sender: '',
  twilio_sid: '',
  twilio_token: '',
  twilio_from: '',
  is_active: false,
};

export default function SMSSettingsPage() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [testing, setTesting]   = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [status, setStatus]     = useState<{ ok: boolean; msg: string } | null>(null);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/settings/sms')
      .then((r) => r.json())
      .then((data) => {
        if (data && Object.keys(data).length > 0) {
          setForm((f) => ({ ...f, ...data, msg91_authkey: '', twilio_sid: '', twilio_token: '' }));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true); setError(null); setStatus(null);
    const res = await fetch('/api/settings/sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.error) setError(data.error);
    else setStatus({ ok: true, msg: 'Saved successfully' });
    setSaving(false);
  }

  async function sendTest() {
    if (!testPhone) return;
    setTesting(true); setStatus(null);
    const res = await fetch('/api/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: testPhone, message: 'Test SMS from your ERP. If you see this, SMS is working!' }),
    });
    const data = await res.json();
    setStatus(data.ok ? { ok: true, msg: 'Test SMS sent!' } : { ok: false, msg: data.error ?? 'Failed' });
    setTesting(false);
  }

  if (loading) return <p className="text-sm text-neutral-400">Loading…</p>;

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold">SMS Gateway</h1>
        <p className="mt-1 text-sm text-neutral-500">Configure SMS provider for POS receipts and invoice reminders</p>
      </div>

      {status && (
        <div className={`rounded-lg px-4 py-3 text-sm ${status.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {status.msg}
        </div>
      )}
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* Enable toggle */}
      <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-4">
        <div>
          <p className="font-medium text-sm">Enable SMS</p>
          <p className="text-xs text-neutral-500 mt-0.5">Turn on to send SMS messages via the configured provider</p>
        </div>
        <button
          onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
          className={`relative h-6 w-11 rounded-full transition-colors ${form.is_active ? 'bg-green-500' : 'bg-neutral-200'}`}
        >
          <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.is_active ? 'translate-x-5' : ''}`} />
        </button>
      </div>

      {/* Provider */}
      <div>
        <label className="block text-xs font-medium text-neutral-500 mb-1">Provider</label>
        <div className="flex gap-3">
          {(['msg91', 'twilio'] as Provider[]).map((p) => (
            <button
              key={p}
              onClick={() => setForm((f) => ({ ...f, provider: p }))}
              className={`flex-1 rounded-xl border py-2.5 text-sm font-medium transition-colors ${form.provider === p ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 hover:bg-neutral-50'}`}
            >
              {p === 'msg91' ? 'MSG91 (India)' : 'Twilio (Global)'}
            </button>
          ))}
        </div>
      </div>

      {/* MSG91 fields */}
      {form.provider === 'msg91' && (
        <div className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4">
          <h3 className="text-sm font-medium">MSG91 Configuration</h3>
          {[
            { label: 'Auth Key', key: 'msg91_authkey', placeholder: 'Enter MSG91 auth key', type: 'password' },
            { label: 'Sender ID', key: 'msg91_sender', placeholder: 'e.g. ERPHUB (6 chars)', type: 'text' },
          ].map(({ label, key, placeholder, type }) => (
            <div key={key}>
              <label className="block text-xs text-neutral-500 mb-1">{label}</label>
              <input
                type={type}
                value={(form as any)[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
          ))}
          <p className="text-xs text-neutral-400">
            Get your auth key from <span className="font-mono">msg91.com/api</span>. Sender ID must be approved.
          </p>
        </div>
      )}

      {/* Twilio fields */}
      {form.provider === 'twilio' && (
        <div className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4">
          <h3 className="text-sm font-medium">Twilio Configuration</h3>
          {[
            { label: 'Account SID', key: 'twilio_sid', placeholder: 'ACxxxxxxxxxxxxxxxx', type: 'password' },
            { label: 'Auth Token', key: 'twilio_token', placeholder: 'Enter auth token', type: 'password' },
            { label: 'From Number', key: 'twilio_from', placeholder: '+1234567890', type: 'text' },
          ].map(({ label, key, placeholder, type }) => (
            <div key={key}>
              <label className="block text-xs text-neutral-500 mb-1">{label}</label>
              <input
                type={type}
                value={(form as any)[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
          ))}
        </div>
      )}

      <button onClick={save} disabled={saving} className="w-full rounded-xl bg-neutral-900 py-2.5 text-sm text-white hover:bg-neutral-700 disabled:opacity-50">
        {saving ? 'Saving…' : 'Save Settings'}
      </button>

      {/* Test SMS */}
      {form.is_active && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3">
          <h3 className="text-sm font-medium">Send Test SMS</h3>
          <div className="flex gap-2">
            <input
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="Mobile number (e.g. 9876543210)"
              className="flex-1 rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none"
            />
            <button onClick={sendTest} disabled={testing || !testPhone} className="rounded-xl bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50">
              {testing ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
