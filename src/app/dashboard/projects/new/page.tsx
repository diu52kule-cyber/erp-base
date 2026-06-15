import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import NewProjectForm from './NewProjectForm';

export default async function NewProjectPage() {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('projects') || !ctx.org) redirect('/dashboard');
  const supabase = await createClient();
  const { data: contacts } = await supabase.from('contacts').select('id,name')
    .eq('org_id', ctx.org.id).in('type', ['customer', 'lead']).order('name');
  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <Link href="/dashboard/projects" className="text-sm text-neutral-500 hover:text-neutral-900">← Projects</Link>
        <h1 className="mt-2 text-2xl font-semibold">New Project</h1>
      </div>
      <NewProjectForm contacts={contacts ?? []} />
    </div>
  );
}
