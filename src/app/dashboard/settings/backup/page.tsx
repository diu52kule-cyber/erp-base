'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

type BackupSettings = {
  frequency: string;
  drive_connected: boolean;
  drive_email?: string | null;
  last_backup_at?: string | null;
  last_backup_size?: number | null;
};

type HistoryRow = {
  id: string;
  created_at: string;
  status: 'success' | 'failed';
  file_name?: string | null;
  file_size?: number | null;
  drive_file_id?: string | null;
  error_message?: string | null;
};

function fmtBytes(b: number | null | undefined) {
  if (!b) return '—';
  if (b < 1024)        return `${b} B`;
  if (b < 1048576)     return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

function fmtTime(iso: string | null | undefined) {
  if (!iso) return 'Never';
  const d = new Date(iso);
  const now = new Date();
  const today = now.toDateString() === d.toDateString();
  const yesterday = new Date(now.getTime() - 86400000).toDateString() === d.toDateString();
  const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  if (today)     return `Today at ${timeStr}`;
  if (yesterday) return `Yesterday at ${timeStr}`;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ` at ${timeStr}`;
}

const FREQ_OPTIONS = [
  { key: 'daily',   label: 'Daily',   desc: 'Backed up every night at 2:00 AM' },
  { key: 'weekly',  label: 'Weekly',  desc: 'Backed up every Sunday at 2:00 AM' },
  { key: 'monthly', label: 'Monthly', desc: 'Backed up on the 1st of each month' },
  { key: 'off',     label: 'Off',     desc: 'Automatic backups disabled' },
];

export default function BackupPage() {
  const searchParams = useSearchParams();

  const [settings, setSettings]       = useState<BackupSettings | null>(null);
  const [history,  setHistory]        = useState<HistoryRow[]>([]);
  const [googleCfg, setGoogleCfg]     = useState(false);
  const [loading,  setLoading]        = useState(true);
  const [backing,  setBacking]        = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [toast, setToast]             = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    load();
    const s = searchParams.get('success');
    const e = searchParams.get('error');
    if (s === 'connected') showToast('Google Drive connected! Your backups will now upload automatically.', 'ok');
    if (e === 'cancelled')  showToast('Connection cancelled.', 'err');
    if (e === 'not_configured') showToast('Google OAuth is not configured on this server.', 'err');
    if (e && e !== 'cancelled' && e !== 'not_configured') showToast(`Connection failed: ${e}`, 'err');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/api/backup/status');
      const d = await r.json();
      setSettings(d.settings);
      setHistory(d.history ?? []);
      setGoogleCfg(d.google_configured ?? false);
    } finally {
      setLoading(false);
    }
  }

  function showToast(msg: string, type: 'ok' | 'err') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  }

  async function setFrequency(freq: string) {
    setSettings((s) => s ? { ...s, frequency: freq } : s);
    await fetch('/api/backup/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frequency: freq }),
    });
  }

  async function backupNow() {
    setBacking(true);
    try {
      const r = await fetch('/api/backup/create', { method: 'POST' });
      const d = await r.json();
      if (d.ok) {
        const where = d.driveConnected && d.driveFileId ? 'Google Drive' : 'history';
        showToast(`Backup saved to ${where} (${fmtBytes(d.size)})`, 'ok');
        await load();
      } else {
        showToast(d.error ?? 'Backup failed', 'err');
      }
    } catch {
      showToast('Backup failed — please try again', 'err');
    } finally {
      setBacking(false);
    }
  }

  async function downloadNow() {
    setDownloading(true);
    try {
      const r = await fetch('/api/backup/download');
      if (!r.ok) { showToast('Download failed', 'err'); return; }
      const blob = await r.blob();
      const cd = r.headers.get('Content-Disposition') ?? '';
      const fnMatch = cd.match(/filename="([^"]+)"/);
      const name = fnMatch?.[1] ?? 'erp-backup.json';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = name; a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  async function disconnect() {
    setDisconnecting(true);
    try {
      await fetch('/api/backup/settings', { method: 'DELETE' });
      showToast('Google Drive disconnected.', 'ok');
      await load();
    } finally {
      setDisconnecting(false);
    }
  }

  const connected = settings?.drive_connected;

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-lg font-semibold">Backup & Restore</h1>
        <p className="text-sm text-neutral-500 mt-0.5">
          Automatically back up all your business data — like WhatsApp backups, but for your ERP.
        </p>
      </div>

      {toast && (
        <div className={`rounded-lg px-4 py-3 text-sm font-medium ${
          toast.type === 'ok'
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Google Drive connection card */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <div className="flex items-start gap-3">
          {/* Drive icon */}
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-green-400 text-white font-bold text-lg">
            G
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-sm">Google Drive</h2>
            {connected ? (
              <p className="text-xs text-green-700 mt-0.5">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1 align-middle" />
                Connected as <span className="font-medium">{settings?.drive_email ?? 'Google account'}</span>
              </p>
            ) : (
              <p className="text-xs text-neutral-500 mt-0.5">
                Connect Google Drive to automatically upload backups to your account.
              </p>
            )}
          </div>
          {connected ? (
            <button
              onClick={disconnect}
              disabled={disconnecting}
              className="shrink-0 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs text-neutral-600 hover:border-red-300 hover:text-red-600 disabled:opacity-50"
            >
              {disconnecting ? 'Disconnecting…' : 'Disconnect'}
            </button>
          ) : (
            <a
              href="/api/backup/google/auth"
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-white ${
                googleCfg
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-neutral-300 cursor-not-allowed pointer-events-none'
              }`}
              title={!googleCfg ? 'GOOGLE_CLIENT_ID not configured on this server' : undefined}
            >
              Connect Google Drive
            </a>
          )}
        </div>
        {!googleCfg && (
          <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Set <code className="font-mono">GOOGLE_CLIENT_ID</code> and{' '}
            <code className="font-mono">GOOGLE_CLIENT_SECRET</code> in your environment variables to enable Google Drive integration.
          </p>
        )}
      </section>

      {/* Last backup status — WhatsApp-style */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="font-semibold text-sm mb-1">Last backup</h2>
        {loading ? (
          <p className="text-sm text-neutral-400">Loading…</p>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              {settings?.last_backup_at ? (
                <>
                  <p className="text-sm font-medium text-neutral-800">
                    {fmtTime(settings.last_backup_at)}
                  </p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {fmtBytes(settings.last_backup_size)}
                    {connected ? ' · Saved to Google Drive' : ' · Local download only'}
                  </p>
                </>
              ) : (
                <p className="text-sm text-neutral-500">No backup yet</p>
              )}
            </div>
            {/* Status icon */}
            {settings?.last_backup_at && (
              <div className="flex items-center justify-center h-9 w-9 rounded-full bg-green-100">
                <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Manual actions */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="font-semibold text-sm mb-3">Manual backup</h2>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={backupNow}
            disabled={backing}
            className="flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            {backing ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Backing up…
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Back Up Now
              </>
            )}
          </button>
          <button
            onClick={downloadNow}
            disabled={downloading}
            className="flex items-center gap-2 rounded-lg border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
          >
            {downloading ? 'Preparing…' : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download JSON
              </>
            )}
          </button>
        </div>
        <p className="mt-2 text-xs text-neutral-400">
          {connected
            ? 'Back Up Now uploads to your Google Drive and logs a history entry.'
            : 'Back Up Now without Drive logs a history entry. Connect Drive to save to the cloud.'}
        </p>
      </section>

      {/* Automatic backup frequency */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="font-semibold text-sm mb-1">Automatic backup frequency</h2>
        <p className="text-xs text-neutral-400 mb-3">
          Backups run automatically at 2:00 AM and upload to Google Drive if connected.
        </p>
        <div className="space-y-2">
          {FREQ_OPTIONS.map((opt) => (
            <label
              key={opt.key}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-all ${
                settings?.frequency === opt.key
                  ? 'border-neutral-900 bg-neutral-50'
                  : 'border-neutral-200 hover:border-neutral-300'
              }`}
            >
              <input
                type="radio"
                name="frequency"
                value={opt.key}
                checked={settings?.frequency === opt.key}
                onChange={() => setFrequency(opt.key)}
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-medium leading-tight">{opt.label}</p>
                <p className="text-xs text-neutral-400">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </section>

      {/* Backup history */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="font-semibold text-sm mb-3">Backup history</h2>
        {history.length === 0 ? (
          <p className="text-sm text-neutral-400">No backups yet. Run your first backup above.</p>
        ) : (
          <div className="divide-y divide-neutral-100">
            {history.map((row) => (
              <div key={row.id} className="flex items-center gap-3 py-3">
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs ${
                  row.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {row.status === 'success' ? '✓' : '✕'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{row.file_name ?? 'Backup'}</p>
                  <p className="text-xs text-neutral-400">
                    {fmtTime(row.created_at)}
                    {row.file_size ? ` · ${fmtBytes(row.file_size)}` : ''}
                    {row.drive_file_id ? ' · Google Drive' : ''}
                    {row.error_message ? ` · ${row.error_message}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
