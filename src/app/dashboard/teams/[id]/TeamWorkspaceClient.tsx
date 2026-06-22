'use client';

import { useState } from 'react';
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/types/roles';

type TeamMember = { user_id: string; is_lead: boolean; joined_at: string };
type OrgMember  = { user_id: string; role: string; job_title: string | null; email: any };

type Props = {
  teamId: string;
  currentMembers: TeamMember[];
  orgMembers: OrgMember[];
  teamMemberIds: string[];
  canManage: boolean;
  currentUserId: string;
};

function extractEmail(email: unknown): string {
  if (!email) return 'Unknown';
  if (typeof email === 'string') return email;
  if (Array.isArray(email) && email.length > 0) return (email[0] as any)?.email ?? 'Unknown';
  if (typeof email === 'object' && email !== null && 'email' in email) return (email as any).email ?? 'Unknown';
  return 'Unknown';
}

export default function TeamWorkspaceClient({
  teamId, currentMembers, orgMembers, teamMemberIds, canManage, currentUserId,
}: Props) {
  const [members, setMembers]     = useState<TeamMember[]>(currentMembers);
  const [memberIds, setMemberIds] = useState<Set<string>>(new Set(teamMemberIds));
  const [addUserId, setAddUserId] = useState('');
  const [addLead, setAddLead]     = useState(false);
  const [adding, setAdding]       = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const nonMembers = orgMembers.filter((m) => !memberIds.has(m.user_id));
  const memberDetails = members.map((tm) => {
    const om = orgMembers.find((o) => o.user_id === tm.user_id);
    return { ...tm, role: om?.role ?? 'staff', job_title: om?.job_title ?? null, email: om?.email };
  });

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    if (!addUserId) return;
    setAdding(true); setError(null);
    const res = await fetch(`/api/teams/${teamId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: addUserId, is_lead: addLead }),
    });
    const data = await res.json();
    if (data.error) { setError(data.error); }
    else {
      setMembers((prev) => [...prev, { user_id: addUserId, is_lead: addLead, joined_at: new Date().toISOString() }]);
      setMemberIds((prev) => new Set([...prev, addUserId]));
      setAddUserId(''); setAddLead(false);
    }
    setAdding(false);
  }

  async function removeMember(userId: string) {
    if (!confirm('Remove this member from the team?')) return;
    const res = await fetch(`/api/teams/${teamId}/members?user_id=${userId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.error) { setError(data.error); return; }
    setMembers((prev) => prev.filter((m) => m.user_id !== userId));
    setMemberIds((prev) => { const s = new Set(prev); s.delete(userId); return s; });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-neutral-200 bg-white">
        <div className="border-b border-neutral-100 px-4 py-3">
          <h2 className="font-medium">Members ({members.length})</h2>
        </div>

        {error && (
          <div className="px-4 pt-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {memberDetails.length === 0 ? (
          <p className="px-4 py-6 text-sm text-neutral-400">No members yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-500">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Member</th>
                <th className="px-4 py-2.5 text-left font-medium">Role / Title</th>
                <th className="px-4 py-2.5 text-left font-medium">Status</th>
                <th className="px-4 py-2.5 text-left font-medium">Joined</th>
                {canManage && <th className="px-4 py-2.5 text-right font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {memberDetails.map((m) => {
                const isYou     = m.user_id === currentUserId;
                const roleKey   = m.role as keyof typeof ROLE_LABELS;
                const roleLabel = ROLE_LABELS[roleKey] ?? m.role;
                const roleColor = ROLE_COLORS[roleKey] ?? 'bg-neutral-100 text-neutral-600';
                const email     = extractEmail(m.email);
                return (
                  <tr key={m.user_id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-200 text-xs font-medium text-neutral-600">
                          {email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-medium">{email}</p>
                          {isYou && <p className="text-xs text-neutral-400">(you)</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className={`inline-block w-fit rounded-full px-2 py-0.5 text-xs ${roleColor}`}>{roleLabel}</span>
                        {m.job_title && <span className="text-xs text-neutral-500">{m.job_title}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {m.is_lead
                        ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">Lead</span>
                        : <span className="text-xs text-neutral-400">Member</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-500">
                      {new Date(m.joined_at).toLocaleDateString('en-IN')}
                    </td>
                    {canManage && (
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => removeMember(m.user_id)} className="text-xs text-red-500 hover:text-red-700">
                          Remove
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Add member form */}
        {canManage && nonMembers.length > 0 && (
          <form onSubmit={addMember} className="flex items-center gap-3 border-t border-neutral-100 px-4 py-3">
            <select
              value={addUserId}
              onChange={(e) => setAddUserId(e.target.value)}
              className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
            >
              <option value="">Select member to add…</option>
              {nonMembers.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {extractEmail(m.email)} ({ROLE_LABELS[m.role as keyof typeof ROLE_LABELS] ?? m.role})
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" checked={addLead} onChange={(e) => setAddLead(e.target.checked)} className="rounded" />
              Lead
            </label>
            <button
              type="submit"
              disabled={adding || !addUserId}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-40"
            >
              {adding ? 'Adding…' : 'Add'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
