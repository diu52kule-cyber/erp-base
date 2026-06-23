import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import {
  CONTACT_TYPE_LABELS,
  CONTACT_TYPE_COLORS,
  DEAL_STAGE_LABELS,
  DEAL_STAGE_COLORS,
  DEAL_STAGES,
  STAGE_PROBABILITY,
} from '@/lib/types/crm';
import PageHotkeys from '@/components/PageHotkeys';
import ContactsTable from './ContactsTable';
import type { Contact, Deal, DealStage } from '@/lib/types/crm';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default async function CRMPage() {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('crm') || !ctx.org) redirect('/dashboard');

  const supabase = createClient();

  const [{ data: contacts }, { data: deals }] = await Promise.all([
    supabase
      .from('contacts')
      .select('*')
      .eq('org_id', ctx.org.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('deals')
      .select('*, contact:contacts(name, company)')
      .eq('org_id', ctx.org.id)
      .order('created_at', { ascending: false }),
  ]);

  const contactList = (contacts ?? []) as Contact[];
  const dealList = (deals ?? []) as Deal[];

  const totalLeads = contactList.filter((c) => c.type === 'lead').length;
  const totalCustomers = contactList.filter((c) => c.type === 'customer').length;
  const openPipeline = dealList
    .filter((d) => !['won', 'lost'].includes(d.stage))
    .reduce((s, d) => s + Number(d.value), 0);
  const wonValue = dealList
    .filter((d) => d.stage === 'won')
    .reduce((s, d) => s + Number(d.value), 0);

  const weightedPipeline = dealList
    .filter((d) => !['won', 'lost'].includes(d.stage))
    .reduce((s, d) => s + Number(d.value) * (STAGE_PROBABILITY[d.stage] / 100), 0);

  const winRate = dealList.filter((d) => ['won', 'lost'].includes(d.stage)).length > 0
    ? Math.round((dealList.filter((d) => d.stage === 'won').length /
        dealList.filter((d) => ['won', 'lost'].includes(d.stage)).length) * 100)
    : null;

  const dealsByStage = DEAL_STAGES.reduce<Record<DealStage, Deal[]>>(
    (acc, s) => ({ ...acc, [s]: dealList.filter((d) => d.stage === s) }),
    {} as Record<DealStage, Deal[]>
  );

  return (
    <div className="space-y-8">
      <PageHotkeys newHref="/dashboard/crm/contacts/new" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">CRM</h1>
          <p className="mt-1 text-sm text-neutral-500">Contacts and sales pipeline</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/crm/loyalty"
            className="rounded-lg border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50"
          >
            Loyalty
          </Link>
          <Link
            href="/dashboard/crm/deals/new"
            className="rounded-lg border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50"
          >
            + New Deal
          </Link>
          <Link
            href="/dashboard/crm/contacts/new"
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700"
          >
            + Add Contact
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
        {[
          { label: 'Total Contacts', value: contactList.length },
          { label: 'Leads', value: totalLeads },
          { label: 'Customers', value: totalCustomers },
          { label: 'Open Pipeline', value: fmt(openPipeline) },
          { label: 'Weighted Forecast', value: fmt(weightedPipeline), hint: 'value × stage probability' },
          { label: 'Win Rate', value: winRate !== null ? `${winRate}%` : '—', hint: 'won / (won + lost)' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-neutral-200 bg-white p-5">
            <p className="text-sm text-neutral-500">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold">{s.value}</p>
            {(s as any).hint && <p className="mt-0.5 text-xs text-neutral-400">{(s as any).hint}</p>}
          </div>
        ))}
      </div>

      {/* Pipeline board */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium">Pipeline</h2>
          <Link href="/dashboard/crm/deals" className="text-sm text-neutral-500 hover:text-neutral-900">
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {DEAL_STAGES.filter((s) => s !== 'lost').map((stage) => {
            const stagDeals = dealsByStage[stage] ?? [];
            const stageTotal = stagDeals.reduce((s, d) => s + Number(d.value), 0);
            return (
              <div key={stage} className="rounded-xl border border-neutral-200 bg-white p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${DEAL_STAGE_COLORS[stage]}`}>
                    {DEAL_STAGE_LABELS[stage]}
                  </span>
                  <span className="text-xs text-neutral-400">{stagDeals.length}</span>
                </div>
                <p className="text-sm font-semibold">{fmt(stageTotal)}</p>
                <div className="mt-2 space-y-1">
                  {stagDeals.slice(0, 3).map((d) => (
                    <Link
                      key={d.id}
                      href={`/dashboard/crm/deals/${d.id}`}
                      className="block truncate rounded bg-neutral-50 px-2 py-1 text-xs hover:bg-neutral-100"
                    >
                      {d.title}
                    </Link>
                  ))}
                  {stagDeals.length > 3 && (
                    <p className="px-2 text-xs text-neutral-400">+{stagDeals.length - 3} more</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Contacts table */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium">Contacts</h2>
          <span className="text-sm text-neutral-400">{contactList.length} total</span>
        </div>

        {contactList.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-200 py-16 text-center">
            <p className="text-neutral-500">No contacts yet</p>
            <Link
              href="/dashboard/crm/contacts/new"
              className="mt-3 inline-block rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white"
            >
              Add your first contact
            </Link>
          </div>
        ) : (
          <ContactsTable contacts={contactList} deals={dealList} />
        )}
      </div>

      {wonValue > 0 && (
        <p className="text-right text-sm text-green-700">
          Won this period: <span className="font-semibold">{fmt(wonValue)}</span>
        </p>
      )}
    </div>
  );
}
