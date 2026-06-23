import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import ExpensesClient from './ExpensesClient';

export default async function ExpensesPage() {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('expenses') || !ctx.org) redirect('/dashboard');
  const supabase = createClient();
  const [{ data: claims }, { data: categories }] = await Promise.all([
    supabase.from('expense_claims').select('*, category:expense_categories(name)')
      .eq('org_id', ctx.org.id).order('created_at', { ascending: false }),
    supabase.from('expense_categories').select('*').eq('org_id', ctx.org.id).order('name'),
  ]);

  const myRole = ctx.org.role as string;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Expenses</h1>
      </div>
      <ExpensesClient claims={claims ?? []} categories={categories ?? []} myRole={myRole} orgId={ctx.org.id} />
    </div>
  );
}
