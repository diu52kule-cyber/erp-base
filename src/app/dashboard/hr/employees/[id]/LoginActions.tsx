'use client';

import { useState } from 'react';
import { ORG_ROLES, ROLE_LABELS } from '@/lib/types/roles';
import type { OrgRole } from '@/lib/types/roles';

const EMPLOYEE_ROLES: OrgRole[] = [
  'staff', 'manager', 'accountant', 'hr', 'sales', 'marketing',
  'developer', 'designer', 'support', 'operations', 'cashier',
  'warehouse', 'procurement', 'chef', 'store_manager', 'viewer',
];

type Credentials = { email: string; password: string };

function CredentialsModal({ creds, onClose }: { creds: Credentials; onClose: () => void }) {
  const [copied, setCopied] = useState<string | null>(null);
  function copy(text: string, field: string) {
    navigator.clipboard.writeText(text).then(() => { setCopied(field); setTimeout(() => setCopied(null), 2000); });
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
            <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold">Login account ready</h2>
            <p className="text-sm text-neutral-500">Share these credentials with the employee</p>
          </div>
        </div>
        <div className="space-y-3 rounded-xl bg-neutral-50 p-4 border border-neutral-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-neutral-400 mb-0.5">Email</p>
              <p className="text-sm font-mono font-medium">{creds.email}</p>
            </div>
            <button onClick={() => copy(creds.email, 'email')}
              className="text-xs text-neutral-500 hover:text-neutral-900 border border-neutral-200 rounded px-2 py-1">
              {copied === 'email' ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div className="border-t border-neutral-200 pt-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-neutral-400 mb-0.5">Password</p>
              <p className="text-sm font-mono font-medium tracking-wider">{creds.password}</p>
            </div>
            <button onClick={() => copy(creds.password, 'password')}
              className="text-xs text-neutral-500 hover:text-neutral-900 border border-neutral-200 rounded px-2 py-1">
              {copied === 'password' ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div className="border-t border-neutral-200 pt-3">
            <button onClick={() => copy(`Email: ${creds.email}\nPassword: ${creds.password}`, 'both')}
              className="w-full rounded-lg bg-neutral-900 py-2 text-sm text-white hover:bg-neutral-700">
              {copied === 'both' ? 'Copied!' : 'Copy both'}
            </button>
          </div>
        </div>
        <p className="mt-3 text-xs text-neutral-400 text-center">
          This password won&apos;t be shown again. Employee can change it via Settings → Password.
        </p>
        <button onClick={onClose}
          className="mt-4 w-full rounded-lg border border-neutral-200 py-2 text-sm text-neutral-600 hover:bg-neutral-50">
          Close
        </button>
      </div>
    </div>
  );
}

function CreateLoginModal({
  employeeId, onClose,
}: { employeeId: string; onClose: () => void }) {
  const [role, setRole] = useState<OrgRole>('staff');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creds, setCreds] = useState<Credentials | null>(null);

  async function create() {
    setLoading(true); setError(null);
    const res = await fetch(`/api/hr/employees/${employeeId}/create-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? 'Failed'); return; }
    if (data.generated_password) {
      setCreds({ email: data.login_email, password: data.generated_password });
    } else {
      onClose();
      window.location.reload();
    }
  }

  if (creds) {
    return <CredentialsModal creds={creds} onClose={() => { onClose(); window.location.reload(); }} />;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-lg font-semibold mb-1">Create login account</h2>
        <p className="text-sm text-neutral-500 mb-4">A password will be auto-generated.</p>
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        <div className="mb-4">
          <label className="mb-1 block text-sm text-neutral-600">Permission Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value as OrgRole)}
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm">
            {EMPLOYEE_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-lg border border-neutral-200 py-2 text-sm">Cancel</button>
          <button onClick={create} disabled={loading} className="flex-1 rounded-lg bg-neutral-900 py-2 text-sm text-white disabled:opacity-50">
            {loading ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LoginActions({
  employeeId, userId, email,
}: {
  employeeId: string;
  userId: string | null;
  email: string | null;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetCreds, setResetCreds] = useState<Credentials | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function resetPassword() {
    setResetting(true); setError(null);
    const res = await fetch(`/api/hr/employees/${employeeId}/reset-password`, { method: 'POST' });
    const data = await res.json();
    setResetting(false);
    if (!res.ok) { setError(data.error ?? 'Failed'); return; }
    setResetCreds({ email: email ?? '', password: data.generated_password });
  }

  return (
    <>
      {showCreate && <CreateLoginModal employeeId={employeeId} onClose={() => setShowCreate(false)} />}
      {resetCreds && <CredentialsModal creds={resetCreds} onClose={() => setResetCreds(null)} />}

      {userId ? (
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            Has login
          </span>
          <button onClick={resetPassword} disabled={resetting}
            className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50 disabled:opacity-50">
            {resetting ? 'Resetting…' : 'Reset password'}
          </button>
          {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-500">No login</span>
          <button
            onClick={() => email ? setShowCreate(true) : setError('Add an email address first')}
            className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs text-white hover:bg-neutral-700">
            Create login
          </button>
          {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
      )}
    </>
  );
}
