import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import ContactForm from '../../new/ContactForm';

export default async function EditContactPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('crm') || !ctx.org) redirect('/dashboard');

  const { id } = await params;
  const supabase = createClient();
  const { data: contact } = await supabase
    .from('contacts').select('*').eq('id', id).eq('org_id', ctx.org.id).maybeSingle();
  if (!contact) notFound();

  const c = contact as Record<string, unknown>;
  return (
    <div className="space-y-6">
      <div>
        <Link href={`/dashboard/crm/contacts/${id}`} className="text-sm text-neutral-500 hover:text-neutral-900">← Back to contact</Link>
        <h1 className="mt-2 text-2xl font-semibold">Edit Contact</h1>
      </div>
      <ContactForm
        mode="edit"
        contactId={id}
        initial={{
          name: (c.name as string) ?? '',
          email: (c.email as string) ?? '',
          phone: (c.phone as string) ?? '',
          type: (c.type as string) ?? 'lead',
          company: (c.company as string) ?? '',
          gstin: (c.gstin as string) ?? '',
          address: (c.address as string) ?? '',
          notes: (c.notes as string) ?? '',
          tags: Array.isArray(c.tags) ? (c.tags as string[]).join(', ') : '',
          lead_source: (c.lead_source as string) ?? '',
          opening_balance: '',
        }}
      />
    </div>
  );
}
