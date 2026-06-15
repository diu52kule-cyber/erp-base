import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import {
  CONTACT_TYPE_LABELS,
  CONTACT_TYPE_COLORS,
  DEAL_STAGE_LABELS,
  DEAL_STAGE_COLORS,
} from '@/lib/types/crm';
import type { Contact, Deal } from '@/lib/types/crm';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('crm') || !ctx.org) redirect('/dashboard');

  const { id } = await params;
  const supabase = await createClient();

  const [{ data: contact }, { data: deals }] = await Promise.all([
    supabase.from('contacts').select('*').eq('id', id).eq('org_id', ctx.org.id).single(),
    supabase.from('deals').select('*').eq('contact_id', id).eq('org_id', ctx.org.id).order('created_at', { ascending: false }),
  ]);

  if (!contact) notFound();

  const c = contact as Contact;
  const dealList = (deals ?? []) as Deal[];
  const openValue = dealList.filter((d) => !['won', 'lost'].includes(d.stage)).reduce((s, d) => s + Number(d.value), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/dashboard/crm" className="text-sm text-neutral-500 hover:text-neutral-900">← CRM</Link>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{c.name}</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CONTACT_TYPE_COLORS[c.type]}`}>
              {CONTACT_TYPE_LABELS[c.type]}
            </span>
          </div>
          {c.company && <p className="mt-1 text-neutral-500">{c.company}</p>}
        </div>
        <Link
          href={`/dashboard/crm/deals/new?contact=${id}`}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700"
        >
          + New Deal
        </Link>
      </div>

      {/* Contact info */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
          <h2 className="font-medium">Contact Info</h2>
          {[
            { label: 'Email', value: c.email },
            { label: 'Phone', value: c.phone },
            { label: 'GSTIN', value: c.gstin },
            { label: 'Address', value: c.address },
          ].map(({ label, value }) =>
            value ? (
              <div key={label}>
                <p className="text-xs text-neutral-400">{label}</p>
                <p className="text-sm">{value}</p>
              </div>
            ) : null
          )}
          {!c.email && !c.phone && !c.gstin && !c.address && (
            <p className="text-sm text-neutral-400">No contact details added</p>
          )}
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
          <h2 className="font-medium">Pipeline</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-neutral-400">Total Deals</p>
              <p className="text-xl font-semibold">{dealList.length}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-400">Open Value</p>
              <p className="text-xl font-semibold">{fmt(openValue)}</p>
            </div>
          </div>
          {c.notes && (
            <div className="border-t border-neutral-100 pt-3">
              <p className="text-xs text-neutral-400">Notes</p>
              <p className="mt-1 text-sm text-neutral-700 whitespace-pre-line">{c.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Deals */}
      <div>
        <h2 className="mb-3 font-medium">Deals</h2>
        {dealList.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-200 py-12 text-center">
            <p className="text-neutral-500">No deals yet</p>
            <Link
              href={`/dashboard/crm/deals/new?contact=${id}`}
              className="mt-3 inline-block text-sm text-neutral-900 underline"
            >
              Add a deal
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-500">
                  <th className="px-4 py-3 text-left font-medium">Deal</th>
                  <th className="px-4 py-3 text-left font-medium">Stage</th>
                  <th className="px-4 py-3 text-right font-medium">Value</th>
                  <th className="px-4 py-3 text-left font-medium">Close Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {dealList.map((d) => (
                  <tr key={d.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/crm/deals/${d.id}`} className="font-medium hover:underline">
                        {d.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${DEAL_STAGE_COLORS[d.stage]}`}>
                        {DEAL_STAGE_LABELS[d.stage]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{fmt(Number(d.value))}</td>
                    <td className="px-4 py-3 text-neutral-500">{d.expected_close ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
