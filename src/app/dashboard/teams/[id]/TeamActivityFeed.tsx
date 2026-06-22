'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type AuditRow = {
  id: string;
  user_id: string;
  table_name: string;
  record_id: string | null;
  action: string;
  created_at: string;
};

const ACTION_COLORS: Record<string, string> = {
  INSERT: 'bg-green-50 text-green-700',
  UPDATE: 'bg-blue-50 text-blue-700',
  DELETE: 'bg-red-50 text-red-600',
};

function relTime(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(ts).toLocaleDateString('en-IN');
}

function emailLabel(emails: Record<string, string>, userId: string) {
  return emails[userId] ?? userId.slice(0, 8) + '…';
}

export default function TeamActivityFeed({
  orgId,
  teamMemberIds,
  initialLogs,
  memberEmails,
}: {
  orgId: string;
  teamMemberIds: string[];
  initialLogs: AuditRow[];
  memberEmails: Record<string, string>;
}) {
  const [logs, setLogs]     = useState<AuditRow[]>(initialLogs);
  const memberSet           = useRef(new Set(teamMemberIds));

  useEffect(() => { memberSet.current = new Set(teamMemberIds); }, [teamMemberIds]);

  useEffect(() => {
    const supabase = createClient();
    const channel  = supabase
      .channel(`team-activity-${orgId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'audit_log', filter: `org_id=eq.${orgId}` },
        (payload) => {
          const row = payload.new as AuditRow;
          if (memberSet.current.has(row.user_id)) {
            setLogs((prev) => [row, ...prev].slice(0, 50));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orgId]);

  if (logs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-200 py-8 text-center text-sm text-neutral-400">
        No recent activity from team members.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-neutral-100">
      {logs.map((log) => (
        <li key={log.id} className="flex items-start gap-3 py-3">
          <div className="mt-0.5 flex-shrink-0">
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${ACTION_COLORS[log.action] ?? 'bg-neutral-100 text-neutral-600'}`}>
              {log.action}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm">
              <span className="font-medium">{emailLabel(memberEmails, log.user_id)}</span>
              {' '}
              <span className="text-neutral-500 capitalize">{log.action.toLowerCase()}d</span>
              {' '}
              <span className="text-neutral-700">{log.table_name?.replace(/_/g, ' ')}</span>
            </p>
          </div>
          <span className="flex-shrink-0 text-xs text-neutral-400">{relTime(log.created_at)}</span>
        </li>
      ))}
    </ul>
  );
}
