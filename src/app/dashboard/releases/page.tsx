import { redirect } from 'next/navigation';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import ReleasesClient from './ReleasesClient';

export const dynamic = 'force-dynamic';

export default async function ReleasesPage() {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('releases') || !ctx.org) redirect('/dashboard');

  const supabase = createClient();
  const [{ data: releases }, { data: tasks }, { data: issues }] = await Promise.all([
    supabase.from('releases').select('id,version,title,notes,status,released_at,created_at').eq('org_id', ctx.org.id).order('created_at', { ascending: false }),
    supabase.from('tasks').select('id,title,status').eq('org_id', ctx.org.id).is('parent_task_id', null).order('created_at', { ascending: false }).limit(200),
    supabase.from('issues').select('id,title,status').eq('org_id', ctx.org.id).order('created_at', { ascending: false }).limit(200),
  ]);

  return <ReleasesClient initial={releases ?? []} tasks={tasks ?? []} issues={issues ?? []} />;
}
