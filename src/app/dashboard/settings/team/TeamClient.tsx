'use client';

import { useState, useEffect, useCallback } from 'react';
import { ORG_ROLES, ROLE_LABELS, ROLE_COLORS, ROLE_DESCRIPTIONS, canInvite, canManageRoles, canRemoveMember } from '@/lib/types/roles';
import type { OrgRole } from '@/lib/types/roles';

type Member = { id: string; user_id: string; email: string; role: OrgRole; joined_at: string; is_self: boolean };
type Invite  = { id: string; email: string; role: OrgRole; token: string; expires_at: string; created_at: string };

export default function TeamClient({ myRole, appUrl }: { myRole: OrgRole; appUrl: string }) {
  const [members, setMembers]   = useState<Member[]>([]);
  const [invites, setInvites]   = useState<Invite[]>([]);
  const [loading, setLoading]   = useState(true);
  const [invEmail, setInvEmail] = useState('');
  const [invRole, setInvRole]   = useState<OrgRole>('staff');
  const [invPending, setInvPending] = useState(false);
  const [newInviteUrl, setNewInviteUrl] = useState<string | null>(null);
  const [copied, setCopied]     = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res  = await fetch('/api/settings/team');
    const data = await res.json();
    setMembers(data.members ?? []);
    setInvites(data.invites  ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleInvite() {
    if (!invEmail.trim()) { setError('Email is required'); return; }
    setError(null); setInvPending(true); setNewInviteUrl(null);
    const res  = await fetch('/api/settings/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: invEmail, role: invRole }),
    });
    const data = await res.json();
    if (data.error) { setError(data.error); }
    else { setNewInviteUrl(data.invite_url); setInvEmail(''); load(); }
    setInvPending(false);
  }

  async function changeRole(userId: string, role: OrgRole) {
    await fetch(`/api/settings/team/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    load();
  }

  async function removeMember(userId: string) {
    if (!confirm('Remove this member from the organisation?')) return;
    await fetch(`/api/settings/team/${userId}`, { method: 'DELETE' });
    load();
  }

  function copyInviteUrl(url: string) {
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  return (
    <div className="space-y-8">
      {/* Members */}
      <section className="space-y-3">
        <h2 className="font-semibold">Team Members</h2>
        {loading ? (
          <p className="text-sm text-neutral-400">Loading…</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-500">
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Role</th>
                <th className="px-4 py-3 text-left font-medium">Joined</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-neutral-100">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      {m.email}
                      {m.is_self && <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-400">you</span>}
                    </td>
                    <td className="px-4 py-3">
                      {canManageRoles(myRole) && !m.is_self ? (
                        <select value={m.role} onChange={(e) => changeRole(m.user_id, e.target.value as OrgRole)}
                          className="rounded-lg border border-neutral-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900">
                          {ORG_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                        </select>
                      ) : (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[m.role]}`}>
                          {ROLE_LABELS[m.role]}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-neutral-500">{new Date(m.joined_at).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-3 text-right">
                      {canRemoveMember(myRole) && !m.is_self && (
                        <button onClick={() => removeMember(m.user_id)}
                          className="text-xs text-red-500 hover:text-red-700">Remove</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Pending invites */}
      {invites.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold">Pending Invites</h2>
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-500">
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Role</th>
                <th className="px-4 py-3 text-left font-medium">Expires</th>
                <th className="px-4 py-3 text-right font-medium">Link</th>
              </tr></thead>
              <tbody className="divide-y divide-neutral-100">
                {invites.map((inv) => {
                  const url = `${appUrl}/invite/${inv.token}`;
                  return (
                    <tr key={inv.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-3">{inv.email}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[inv.role]}`}>
                          {ROLE_LABELS[inv.role]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-neutral-500">{new Date(inv.expires_at).toLocaleDateString('en-IN')}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => copyInviteUrl(url)}
                          className="text-xs text-neutral-500 hover:text-neutral-900">Copy link</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Invite form */}
      {canInvite(myRole) && (
        <section className="space-y-4">
          <h2 className="font-semibold">Invite a Team Member</h2>
          {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          {newInviteUrl && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 space-y-2">
              <p className="text-sm font-medium text-green-800">Invite created! Share this link:</p>
              <div className="flex gap-2">
                <input readOnly value={newInviteUrl}
                  className="flex-1 rounded-lg border border-green-200 bg-white px-3 py-2 font-mono text-xs" />
                <button onClick={() => copyInviteUrl(newInviteUrl)}
                  className="rounded-lg bg-green-700 px-4 py-2 text-sm text-white hover:bg-green-800">
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className="text-xs text-green-600">Link expires in 7 days. Send it to the person you want to invite.</p>
            </div>
          )}

          <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm text-neutral-600">Email address</label>
                <input type="email" value={invEmail} onChange={(e) => setInvEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-neutral-600">Role</label>
                <select value={invRole} onChange={(e) => setInvRole(e.target.value as OrgRole)}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900">
                  {ORG_ROLES.filter((r) => r !== 'owner').map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-xs text-neutral-400">{ROLE_DESCRIPTIONS[invRole]}</p>
            <div className="flex justify-end">
              <button onClick={handleInvite} disabled={invPending}
                className="rounded-md bg-neutral-900 px-5 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50">
                {invPending ? 'Generating…' : 'Generate Invite Link'}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Role reference */}
      <section className="space-y-3">
        <h2 className="font-semibold text-sm text-neutral-500">Role Reference</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ORG_ROLES.map((r) => (
            <div key={r} className="rounded-lg border border-neutral-200 bg-white p-3 space-y-1">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[r]}`}>{ROLE_LABELS[r]}</span>
              <p className="text-xs text-neutral-500 mt-1">{ROLE_DESCRIPTIONS[r]}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
