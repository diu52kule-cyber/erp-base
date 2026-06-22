'use client';

import { useState, useEffect, useCallback } from 'react';
import { ORG_ROLES, ROLE_LABELS, ROLE_COLORS, ROLE_DESCRIPTIONS, canInvite, canManageRoles, canRemoveMember } from '@/lib/types/roles';
import type { OrgRole } from '@/lib/types/roles';
import { confirmDialog, toast } from '@/lib/toast';

type Member = { id: string; user_id: string; email: string; role: OrgRole; joined_at: string; is_self: boolean; is_guest?: boolean; guest_modules?: string[] };
type Invite  = { id: string; email: string; role: OrgRole; token: string; expires_at: string; created_at: string };

const GUEST_MODULES = [
  { key: 'billing', label: 'Billing (view invoices)' },
  { key: 'projects', label: 'Projects' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'docs', label: 'Docs & KB' },
  { key: 'crm', label: 'CRM Contacts' },
  { key: 'issues', label: 'Issues' },
  { key: 'goals', label: 'Goals / OKRs' },
  { key: 'meetings', label: 'Meetings' },
];

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
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestEmail, setGuestEmail]   = useState('');
  const [guestMods, setGuestMods]     = useState<string[]>(['billing', 'projects']);
  const [guestPending, setGuestPending] = useState(false);
  const [guestUrl, setGuestUrl]       = useState<string | null>(null);

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
    if (!(await confirmDialog({ title: 'Remove member', message: 'Remove this member from the organisation? They will lose access immediately.', confirmLabel: 'Remove', danger: true }))) return;
    await fetch(`/api/settings/team/${userId}`, { method: 'DELETE' });
    toast('Member removed');
    load();
  }

  function copyInviteUrl(url: string) {
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  async function handleGuestInvite() {
    if (!guestEmail.trim()) { setError('Email is required'); return; }
    if (guestMods.length === 0) { setError('Select at least one module for the guest'); return; }
    setError(null); setGuestPending(true); setGuestUrl(null);
    const res = await fetch('/api/settings/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: guestEmail, role: 'viewer', is_guest: true, guest_modules: guestMods }),
    });
    const data = await res.json();
    if (data.error) { setError(data.error); }
    else { setGuestUrl(data.invite_url); setGuestEmail(''); }
    setGuestPending(false);
  }

  function toggleGuestMod(key: string) {
    setGuestMods((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
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
                      {m.is_guest && <span className="ml-2 rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">guest</span>}
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

      {/* Guest access */}
      {canInvite(myRole) && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Guest Access</h2>
            <button onClick={() => setShowGuestForm((v) => !v)}
              className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs hover:bg-neutral-50">
              {showGuestForm ? 'Cancel' : '+ Invite Guest'}
            </button>
          </div>
          <p className="text-sm text-neutral-500">
            Guests (e.g., clients, contractors) get view-only access to specific modules only — no HR, payroll, or settings.
          </p>
          {showGuestForm && (
            <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-4">
              {guestUrl && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4 space-y-2">
                  <p className="text-sm font-medium text-green-800">Guest invite created! Share this link:</p>
                  <div className="flex gap-2">
                    <input readOnly value={guestUrl} className="flex-1 rounded-lg border border-green-200 bg-white px-3 py-2 font-mono text-xs" />
                    <button onClick={() => copyInviteUrl(guestUrl)}
                      className="rounded-lg bg-green-700 px-4 py-2 text-sm text-white hover:bg-green-800">
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-xs text-green-600">Expires in 7 days. Guest sees only the modules you selected.</p>
                </div>
              )}
              <div>
                <label className="mb-1 block text-sm text-neutral-600">Guest email</label>
                <input type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="client@company.com"
                  className="w-full max-w-sm rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
              </div>
              <div>
                <label className="mb-2 block text-sm text-neutral-600">Modules guest can view</label>
                <div className="flex flex-wrap gap-2">
                  {GUEST_MODULES.map((m) => (
                    <button
                      key={m.key}
                      onClick={() => toggleGuestMod(m.key)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        guestMods.includes(m.key)
                          ? 'border-neutral-900 bg-neutral-900 text-white'
                          : 'border-neutral-200 text-neutral-500 hover:border-neutral-400'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end">
                <button onClick={handleGuestInvite} disabled={guestPending}
                  className="rounded-md bg-neutral-900 px-5 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50">
                  {guestPending ? 'Generating…' : 'Generate Guest Link'}
                </button>
              </div>
            </div>
          )}
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
