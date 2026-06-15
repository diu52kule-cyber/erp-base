import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import ContactForm from './ContactForm';

export default async function NewContactPage() {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('crm')) redirect('/dashboard');

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/crm" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← CRM
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Add Contact</h1>
      </div>
      <ContactForm />
    </div>
  );
}
