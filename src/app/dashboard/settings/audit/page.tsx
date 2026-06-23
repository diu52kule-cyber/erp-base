import { redirect } from 'next/navigation';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import type { OrgRole } from '@/lib/types/roles';

const ALLOWED: OrgRole[] = ['owner', 'admin', 'manager'];

export default async function AuditLogPage({ searchParams }: { searchParams: { page?: string; table?: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org) redirect('/login');
  if (!ALLOWED.includes(ctx.org.role as OrgRole)) redirect('/dashboard/settings/preferences');

  const supabase = createClient();
  const page   = Math.max(0, parseInt(searchParams.page ?? '0', 10));
  const table  = searchParams.table ?? '';
  const limit  = 50;
  const offset = page * limit;

  let logs: any[] = [];
  let totalCount  = 0;

  try {
    let q = supabase
      .from('audit_log')
      .select('*', { count: 'exact' })
      .eq('org_id', ctx.org.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (table) q = q.eq('table_name', table);

    const { data, count } = await q;
    logs = data ?? [];
    totalCount = count ?? 0;
  } catch { /* table may not exist */ }

  // Get distinct table names for filter dropdown
  let tables: string[] = [];
  try {
    const { data } = await supabase
      .from('audit_log')
      .select('table_name')
      .eq('org_id', ctx.org.id)
      .order('table_name');
    tables = [...new Set((data ?? []).map((r: any) => r.table_name as string))];
  } catch { /* */ }

  const pageCount = Math.ceil(totalCount / limit);

  const ACTION_COLORS: Record<string, string> = {
    INSERT: 'bg-green-50 text-green-700',
    UPDATE: 'bg-blue-50 text-blue-700',
    DELETE: 'bg-red-50 text-red-700',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Audit Log</h1>
        <p className="mt-1 text-sm text-neutral-500">Who changed what — all data mutations tracked</p>
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap items-center gap-3">
        <select name="table" defaultValue={table}
          className="rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900">
          <option value="">All tables</option>
          {tables.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input type="hidden" name="page" value="0" />
        <button type="submit" className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700">Filter</button>
        {table && <a href="/dashboard/settings/audit" className="text-sm text-neutral-500 hover:text-neutral-900">Clear</a>}
        <span className="text-xs text-neutral-400">{totalCount} entries</span>
      </form>

      {logs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 py-16 text-center text-neutral-500">
          {totalCount === 0 ? 'No audit log entries yet. Mutations will appear here.' : 'No entries match your filter.'}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-500">
                <th className="px-4 py-3 text-left font-medium">Time</th>
                <th className="px-4 py-3 text-left font-medium">Table</th>
                <th className="px-4 py-3 text-left font-medium">Action</th>
                <th className="px-4 py-3 text-left font-medium">User</th>
                <th className="px-4 py-3 text-left font-medium">Record ID</th>
                <th className="px-4 py-3 text-left font-medium">Changes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {logs.map((log: any) => (
                <tr key={log.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-2.5 text-xs text-neutral-500 tabular-nums whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs">{log.table_name}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_COLORS[log.action] ?? 'bg-neutral-100 text-neutral-600'}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-neutral-500">{log.user_email ?? log.user_id?.slice(0, 8) ?? '—'}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-neutral-400">{(log.record_id ?? '').slice(0, 8)}…</td>
                  <td className="px-4 py-2.5 max-w-xs">
                    {log.new_values ? (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-blue-600 hover:underline">View diff</summary>
                        <pre className="mt-1 max-h-32 overflow-auto rounded bg-neutral-50 p-2 text-[10px] text-neutral-600 whitespace-pre-wrap">
                          {JSON.stringify(log.new_values, null, 2)}
                        </pre>
                      </details>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {pageCount > 1 && (
            <div className="flex items-center justify-between border-t border-neutral-100 px-4 py-2">
              <span className="text-xs text-neutral-400">Page {page + 1} of {pageCount}</span>
              <div className="flex gap-2">
                {page > 0 && (
                  <a href={`/dashboard/settings/audit?page=${page - 1}${table ? `&table=${table}` : ''}`}
                    className="rounded border border-neutral-200 px-2 py-1 text-xs hover:bg-neutral-50">‹ Prev</a>
                )}
                {page < pageCount - 1 && (
                  <a href={`/dashboard/settings/audit?page=${page + 1}${table ? `&table=${table}` : ''}`}
                    className="rounded border border-neutral-200 px-2 py-1 text-xs hover:bg-neutral-50">Next ›</a>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
