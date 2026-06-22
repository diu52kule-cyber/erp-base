'use client';

import { useEffect, useState } from 'react';

type Department = { id: string; name: string; description: string | null; color: string };
type Team = { id: string; name: string; description: string | null; color: string; department_id: string | null; focus_area: string | null; members?: { user_id: string; is_lead: boolean }[] };

const COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6b7280'];

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${value === c ? 'border-neutral-900 scale-110' : 'border-transparent'}`}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );
}

export default function DepartmentsSettingsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teams, setTeams]             = useState<Team[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  // Department form
  const [deptName, setDeptName]   = useState('');
  const [deptDesc, setDeptDesc]   = useState('');
  const [deptColor, setDeptColor] = useState(COLORS[0]);
  const [deptSaving, setDeptSaving] = useState(false);

  // Team form
  const [teamName, setTeamName]     = useState('');
  const [teamDesc, setTeamDesc]     = useState('');
  const [teamColor, setTeamColor]   = useState(COLORS[1]);
  const [teamDept, setTeamDept]     = useState('');
  const [teamFocus, setTeamFocus]   = useState('');
  const [teamSaving, setTeamSaving] = useState(false);

  async function load() {
    setLoading(true);
    const [dRes, tRes] = await Promise.all([
      fetch('/api/departments').then((r) => r.json()),
      fetch('/api/teams').then((r) => r.json()),
    ]);
    setDepartments(Array.isArray(dRes) ? dRes : []);
    setTeams(Array.isArray(tRes) ? tRes : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function createDept(e: React.FormEvent) {
    e.preventDefault();
    if (!deptName.trim()) return;
    setDeptSaving(true);
    setError(null);
    const res = await fetch('/api/departments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: deptName, description: deptDesc || null, color: deptColor }),
    });
    const data = await res.json();
    if (data.error) { setError(data.error); } else { setDeptName(''); setDeptDesc(''); await load(); }
    setDeptSaving(false);
  }

  async function deleteDept(id: string, name: string) {
    if (!confirm(`Delete department "${name}"? Teams inside will be unlinked.`)) return;
    await fetch(`/api/departments/${id}`, { method: 'DELETE' });
    await load();
  }

  async function createTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!teamName.trim()) return;
    setTeamSaving(true);
    setError(null);
    const res = await fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: teamName, description: teamDesc || null, color: teamColor,
        department_id: teamDept || null, focus_area: teamFocus || null,
      }),
    });
    const data = await res.json();
    if (data.error) { setError(data.error); } else { setTeamName(''); setTeamDesc(''); setTeamDept(''); setTeamFocus(''); await load(); }
    setTeamSaving(false);
  }

  async function deleteTeam(id: string, name: string) {
    if (!confirm(`Delete team "${name}"?`)) return;
    await fetch(`/api/teams/${id}`, { method: 'DELETE' });
    await load();
  }

  const deptMap = Object.fromEntries(departments.map((d) => [d.id, d]));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Departments & Teams</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Organise your people into departments (e.g. Engineering, Sales) and teams within them.
          Members can then be added to teams from their team workspace.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* ─── DEPARTMENTS ─────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="font-medium text-neutral-800">Departments</h2>

        {loading ? (
          <p className="text-sm text-neutral-400">Loading…</p>
        ) : (
          <div className="space-y-2">
            {departments.length === 0 && (
              <p className="text-sm text-neutral-400">No departments yet.</p>
            )}
            {departments.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                  <div>
                    <p className="text-sm font-medium">{d.name}</p>
                    {d.description && <p className="text-xs text-neutral-500">{d.description}</p>}
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {teams.filter((t) => t.department_id === d.id).length} team(s)
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => deleteDept(d.id, d.name)}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Create dept form */}
        <form onSubmit={createDept} className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3">
          <p className="text-sm font-medium text-neutral-700">New Department</p>
          <div className="flex gap-3">
            <input
              value={deptName}
              onChange={(e) => setDeptName(e.target.value)}
              placeholder="Department name (e.g. Engineering)"
              className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>
          <input
            value={deptDesc}
            onChange={(e) => setDeptDesc(e.target.value)}
            placeholder="Description (optional)"
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
          <ColorPicker value={deptColor} onChange={setDeptColor} />
          <button
            type="submit"
            disabled={deptSaving || !deptName.trim()}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-40"
          >
            {deptSaving ? 'Creating…' : 'Create Department'}
          </button>
        </form>
      </section>

      {/* ─── TEAMS ───────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="font-medium text-neutral-800">Teams</h2>

        {loading ? (
          <p className="text-sm text-neutral-400">Loading…</p>
        ) : (
          <div className="space-y-2">
            {teams.length === 0 && (
              <p className="text-sm text-neutral-400">No teams yet.</p>
            )}
            {teams.map((t) => {
              const dept = t.department_id ? deptMap[t.department_id] : null;
              return (
                <div key={t.id} className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{t.name}</p>
                        {dept && (
                          <span className="rounded-full px-2 py-0.5 text-xs" style={{ backgroundColor: dept.color + '20', color: dept.color }}>
                            {dept.name}
                          </span>
                        )}
                        {t.focus_area && (
                          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">{t.focus_area}</span>
                        )}
                      </div>
                      {t.description && <p className="text-xs text-neutral-500">{t.description}</p>}
                      <p className="text-xs text-neutral-400 mt-0.5">
                        {(t.members ?? []).length} member(s)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <a href={`/dashboard/teams/${t.id}`} className="text-xs text-blue-600 hover:underline">Open workspace →</a>
                    <button onClick={() => deleteTeam(t.id, t.name)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create team form */}
        <form onSubmit={createTeam} className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3">
          <p className="text-sm font-medium text-neutral-700">New Team</p>
          <div className="flex gap-3">
            <input
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Team name (e.g. Growth Squad)"
              className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
            <select
              value={teamDept}
              onChange={(e) => setTeamDept(e.target.value)}
              className="rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
            >
              <option value="">No Department</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <input
              value={teamDesc}
              onChange={(e) => setTeamDesc(e.target.value)}
              placeholder="Description (optional)"
              className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
            <input
              value={teamFocus}
              onChange={(e) => setTeamFocus(e.target.value)}
              placeholder="Focus area (e.g. frontend, kitchen)"
              className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>
          <ColorPicker value={teamColor} onChange={setTeamColor} />
          <button
            type="submit"
            disabled={teamSaving || !teamName.trim()}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-40"
          >
            {teamSaving ? 'Creating…' : 'Create Team'}
          </button>
        </form>
      </section>

      <p className="text-xs text-neutral-400">
        After creating teams, members can be added from each team's workspace page under Teams in the sidebar.
      </p>
    </div>
  );
}
