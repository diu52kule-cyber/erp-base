import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import TablesClient from './TablesClient';

export default async function POSTablesPage() {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('pos') || !ctx.org) redirect('/dashboard');

  const supabase = createClient();
  let tables: any[] = [];
  try {
    const { data } = await supabase
      .from('pos_tables')
      .select('*')
      .eq('org_id', ctx.org.id)
      .order('name');
    tables = data ?? [];
  } catch { /* migration not run yet */ }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/pos" className="text-sm text-neutral-500 hover:text-neutral-900">← POS</Link>
          <h1 className="mt-1 text-2xl font-semibold">Table Management</h1>
          <p className="mt-1 text-sm text-neutral-500">Set up dining tables, counters, or zones for your POS.</p>
        </div>
      </div>
      <TablesClient initialTables={tables} />
    </div>
  );
}
