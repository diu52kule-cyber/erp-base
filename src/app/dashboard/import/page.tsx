import { redirect } from 'next/navigation';
import { getOrgContext } from '@/lib/entitlements';
import ImportWizard from './ImportWizard';

export default async function ImportPage() {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('import') || !ctx.org) redirect('/dashboard');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Data Import</h1>
        <p className="mt-1 text-sm text-neutral-500">Import contacts, products, or employees from a CSV file</p>
      </div>
      <ImportWizard />
    </div>
  );
}
