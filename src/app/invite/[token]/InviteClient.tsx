'use client';

import { useState } from 'react';
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/types/roles';
import type { OrgRole } from '@/lib/types/roles';

type InviteInfo = {
  email: string;
  role: OrgRole;
  org: { name: string; business_type: string };
  expires_at: string;
};

export default function InviteClient({ token, invite, loggedIn }: {
  token: string;
  invite: InviteInfo | null;
  loggedIn: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [done, setDone]       = useState(false);

  if (!invite) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center w-full max-w-md">
          <p className="text-lg font-semibold">Invite not found</p>
          <p className="mt-2 text-sm text-neutral-500">This link may have expired or already been used.</p>
          <a href="/dashboard" className="mt-4 inline-block rounded-lg bg-neutral-900 px-5 py-2 text-sm text-white">
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }

  async function accept() {
    setPending(true); setError(null);
    try {
      const res = await fetch(`/api/settings/invites/${token}`, { method: 'POST' });
      const data = await res.json();
      if (data.error) { setError(data.error); setPending(false); }
      else { setDone(true); setTimeout(() => { window.location.href = '/dashboard'; }, 1500); }
    } catch { setError('Failed to accept invite'); setPending(false); }
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center w-full max-w-md">
          <p className="text-3xl mb-2">✓</p>
          <p className="text-lg font-semibold text-green-800">You've joined {invite.org.name}!</p>
          <p className="mt-1 text-sm text-green-600">Redirecting to dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-4">
      <div className="rounded-2xl border border-neutral-200 bg-white p-8 w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-900 text-2xl text-white font-bold">
            {invite.org.name.charAt(0).toUpperCase()}
          </div>
          <h1 className="text-xl font-semibold">You've been invited to join</h1>
          <p className="text-2xl font-bold">{invite.org.name}</p>
          <p className="text-sm text-neutral-500 capitalize">{invite.org.business_type} business</p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-neutral-500">Invited email</span>
            <span>{invite.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Role</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[invite.role]}`}>
              {ROLE_LABELS[invite.role]}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Expires</span>
            <span>{new Date(invite.expires_at).toLocaleDateString('en-IN')}</span>
          </div>
        </div>

        {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {loggedIn ? (
          <button onClick={accept} disabled={pending}
            className="w-full rounded-xl bg-neutral-900 py-3 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50">
            {pending ? 'Joining…' : `Accept & Join ${invite.org.name}`}
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-center text-sm text-neutral-500">Sign in or create an account to accept this invite.</p>
            <a href={`/login?next=/invite/${token}`}
              className="block w-full rounded-xl bg-neutral-900 py-3 text-center text-sm font-medium text-white hover:bg-neutral-700">
              Sign In
            </a>
            <a href={`/signup?next=/invite/${token}`}
              className="block w-full rounded-xl border border-neutral-200 py-3 text-center text-sm font-medium hover:bg-neutral-50">
              Create Account
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
