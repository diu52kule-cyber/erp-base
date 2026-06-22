'use client';

import { useState } from 'react';

export default function SelfServiceTokenButton({
  employeeId,
  existingToken,
}: {
  employeeId: string;
  existingToken: string | null;
}) {
  const [token, setToken]     = useState<string | null>(existingToken);
  const [pending, setPending] = useState(false);
  const [copied, setCopied]   = useState(false);

  const link = token ? `${typeof window !== 'undefined' ? window.location.origin : ''}/employee/${token}` : null;

  async function generate() {
    setPending(true);
    const res  = await fetch(`/api/hr/employees/${employeeId}/self-service-token`, { method: 'POST' });
    const data = await res.json();
    setPending(false);
    if (data.token) setToken(data.token);
  }

  async function revoke() {
    if (!confirm('Revoke self-service access for this employee?')) return;
    setPending(true);
    await fetch(`/api/hr/employees/${employeeId}/self-service-token`, { method: 'DELETE' });
    setToken(null);
    setPending(false);
  }

  async function copy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!token) {
    return (
      <button
        onClick={generate}
        disabled={pending}
        className="rounded-lg border border-neutral-200 px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50"
      >
        {pending ? '…' : 'Self-Service Link'}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={copy}
        className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700 hover:bg-blue-100"
      >
        {copied ? 'Copied!' : 'Copy Link'}
      </button>
      <button
        onClick={revoke}
        disabled={pending}
        className="rounded-lg border border-neutral-200 px-2 py-2 text-xs text-neutral-400 hover:text-red-600 disabled:opacity-50"
        title="Revoke access"
      >
        ✕
      </button>
    </div>
  );
}
