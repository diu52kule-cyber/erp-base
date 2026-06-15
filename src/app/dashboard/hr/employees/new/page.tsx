import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import EmployeeForm from './EmployeeForm';

export default async function NewEmployeePage() {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('hr')) redirect('/dashboard');

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/hr" className="text-sm text-neutral-500 hover:text-neutral-900">← HR</Link>
        <h1 className="mt-2 text-2xl font-semibold">Add Employee</h1>
      </div>
      <EmployeeForm />
    </div>
  );
}
