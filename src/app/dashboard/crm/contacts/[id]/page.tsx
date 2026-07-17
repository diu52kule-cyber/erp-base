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
import ActivityTimeline from './ActivityTimeline';
import ArchiveButton from '@/components/ArchiveButton';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

type ContactExtended = Contact & {
  tags?: string[];
  lead_source?: string | null;
  opening_balance?: number;
};

type Activity = {
  id: string;
  type: string;
  body: string;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
};

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('crm') || !ctx.org) redirect('/dashboard');

  const { id } = await params;
  const supabase = createClient();

  const [{ data: contact }, { data: deals }] = await Promise.all([
    supabase.from('contacts').select('*').eq('id', id).eq('org_id', ctx.org.id).single(),
    supabase.from('deals').select('*').eq('contact_id', id).eq('org_id', ctx.org.id).order('created_at', { ascending: false }),
  ]);

  // Fetch linked invoices + payments for this contact
  let contactInvoices: { id: string; invoice_number: string; issue_date: string; total: number; status: string; amount_paid: number | null; due_date: string | null }[] = [];
  let contactPayments: { id: string; paid_at: string; amount: number; method: string; notes: string | null }[] = [];
  if (contact) {
    try {
      const { data: invs } = await supabase.from('invoices')
        .select('id, invoice_number, issue_date, total, status, amount_paid, due_date')
        .eq('org_id', ctx.org.id).eq('doc_type', 'invoice')
        .ilike('customer_name', contact.name)
        .order('issue_date', { ascending: false }).limit(10);
      contactInvoices = (invs ?? []) as typeof contactInvoices;

      // Fetch payments for those invoices
      if (contactInvoices.length > 0) {
        const invIds = contactInvoices.map(i => i.id);
        const { data: pays } = await supabase.from('payments')
          .select('id, paid_at, amount, method, notes')
          .eq('org_id', ctx.org.id).in('invoice_id', invIds)
          .order('paid_at', { ascending: false }).limit(10);
        contactPayments = (pays ?? []) as typeof contactPayments;
      }
    } catch { /* billing module not enabled or tables missing */ }
  }

  let activityList: Activity[] = [];
  try {
    const { data: acts } = await supabase
      .from('contact_activities')
      .select('*')
      .eq('contact_id', id)
      .eq('org_id', ctx.org.id)
      .order('created_at', { ascending: false });
    activityList = (acts ?? []) as Activity[];
  } catch { /* table not yet migrated */ }

  let loyaltyAccount: { points: number; lifetime_points: number } | null = null;
  let loyaltyTx: { id: string; points: number; type: string; notes: string | null; created_at: string }[] = [];
  try {
    const [{ data: la }, { data: lt }] = await Promise.all([
      supabase.from('loyalty_accounts').select('points,lifetime_points').eq('contact_id', id).eq('org_id', ctx.org.id).maybeSingle(),
      supabase.from('loyalty_transactions').select('id,points,type,notes,created_at').eq('contact_id', id).eq('org_id', ctx.org.id).order('created_at', { ascending: false }).limit(20),
    ]);
    loyaltyAccount = la ?? null;
    loyaltyTx = (lt ?? []) as typeof loyaltyTx;
  } catch { /* loyalty tables not yet run */ }

  if (!contact) notFound();

  const c = contact as ContactExtended;
  const dealList = (deals ?? []) as Deal[];
  const openValue = dealList.filter((d) => !['won', 'lost'].includes(d.stage)).reduce((s, d) => s + Number(d.value), 0);

  const waPhone = c.phone?.replace(/\D/g, '');

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/dashboard/crm" className="text-sm text-neutral-500 hover:text-neutral-900">← CRM</Link>
          <div className="mt-2 flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold">{c.name}</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CONTACT_TYPE_COLORS[c.type]}`}>
              {CONTACT_TYPE_LABELS[c.type]}
            </span>
            {c.lead_source && (
              <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                via {c.lead_source.replace(/_/g, ' ')}
              </span>
            )}
          </div>
          {c.company && <p className="mt-1 text-neutral-500">{c.company}</p>}
          {c.tags && c.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {c.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs text-neutral-600">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {c.email && (
            <a
              href={`mailto:${c.email}`}
              className="rounded-lg border border-neutral-200 px-3 py-2 text-sm hover:bg-neutral-50 flex items-center gap-1.5"
            >
              ✉️ Email
            </a>
          )}
          {c.phone && (
            <a
              href={`https://wa.me/${waPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 hover:bg-green-100 flex items-center gap-1.5"
            >
              💬 WhatsApp
            </a>
          )}
          <Link
            href={`/dashboard/crm/deals/new?contact=${id}`}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700"
          >
            + New Deal
          </Link>
          <Link href={`/dashboard/crm/contacts/${id}/edit`} className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-2 text-sm hover:bg-neutral-50">✏️ Edit</Link>
          <ArchiveButton table="contacts" id={id} archived={!!(c as any).archived_at} redirectTo="/dashboard/crm" />
        </div>
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
          {c.notes && (
            <div className="border-t border-neutral-100 pt-3">
              <p className="text-xs text-neutral-400">Notes</p>
              <p className="mt-1 text-sm text-neutral-700 whitespace-pre-line">{c.notes}</p>
            </div>
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
          {(c.opening_balance ?? 0) > 0 && (
            <div className="border-t border-neutral-100 pt-3">
              <p className="text-xs text-neutral-400">Opening Balance</p>
              <p className="text-sm font-semibold text-amber-600">{fmt(c.opening_balance ?? 0)}</p>
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

      {/* Loyalty */}
      {loyaltyAccount && (
        <div>
          <h2 className="mb-3 font-medium">Loyalty Points</h2>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 space-y-4">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-xs text-amber-600">Current Balance</p>
                <p className="text-3xl font-bold text-amber-800">{loyaltyAccount.points} pts</p>
              </div>
              <div>
                <p className="text-xs text-amber-600">Lifetime Earned</p>
                <p className="text-2xl font-semibold text-amber-700">{loyaltyAccount.lifetime_points} pts</p>
              </div>
              <div>
                <p className="text-xs text-amber-600">Redemption Value</p>
                <p className="text-2xl font-semibold text-amber-700">{fmt(loyaltyAccount.points / 10)}</p>
              </div>
            </div>
            {loyaltyTx.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-amber-200 bg-white">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-amber-100 bg-amber-50/50 text-xs text-amber-600">
                    <th className="px-4 py-2 text-left font-medium">Date</th>
                    <th className="px-4 py-2 text-left font-medium">Type</th>
                    <th className="px-4 py-2 text-left font-medium">Notes</th>
                    <th className="px-4 py-2 text-right font-medium">Points</th>
                  </tr></thead>
                  <tbody className="divide-y divide-amber-100">
                    {loyaltyTx.map((tx) => (
                      <tr key={tx.id}>
                        <td className="px-4 py-2 text-xs text-neutral-500">{new Date(tx.created_at).toLocaleDateString('en-IN')}</td>
                        <td className="px-4 py-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tx.type === 'earn' ? 'bg-green-50 text-green-700' : tx.type === 'redeem' ? 'bg-red-50 text-red-700' : 'bg-neutral-100 text-neutral-600'}`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-xs text-neutral-500">{tx.notes ?? '—'}</td>
                        <td className={`px-4 py-2 text-right font-mono font-medium ${tx.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.points > 0 ? '+' : ''}{tx.points}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Billing History */}
      {(contactInvoices.length > 0 || contactPayments.length > 0) && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Invoices */}
          {contactInvoices.length > 0 && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-medium">Invoices</h2>
                <Link href={`/dashboard/billing?q=${encodeURIComponent(c.name)}`}
                  className="text-xs text-neutral-400 hover:text-neutral-700">View all →</Link>
              </div>
              <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950">
                      <th className="px-4 py-3 text-left font-medium">Invoice</th>
                      <th className="px-4 py-3 text-left font-medium">Date</th>
                      <th className="px-4 py-3 text-right font-medium">Amount</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {contactInvoices.map((inv) => {
                      const statusColor: Record<string, string> = {
                        paid: 'bg-green-50 text-green-700', sent: 'bg-blue-50 text-blue-700',
                        partial: 'bg-amber-50 text-amber-700', draft: 'bg-neutral-100 text-neutral-500',
                        cancelled: 'bg-neutral-100 text-neutral-400',
                      };
                      const balanceDue = Math.max(0, Number(inv.total) - Number(inv.amount_paid ?? 0));
                      return (
                        <tr key={inv.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                          <td className="px-4 py-3">
                            <Link href={`/dashboard/billing/${inv.id}`} className="font-mono text-xs font-medium hover:text-indigo-600 hover:underline">
                              {inv.invoice_number}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-neutral-500 text-xs">
                            {new Date(inv.issue_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            <span className="font-medium">{fmt(Number(inv.total))}</span>
                            {balanceDue > 0 && inv.status !== 'cancelled' && (
                              <span className="block text-xs text-amber-600">Due: {fmt(balanceDue)}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusColor[inv.status] ?? 'bg-neutral-100 text-neutral-500'}`}>
                              {inv.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {/* Summary row */}
                <div className="border-t border-neutral-100 dark:border-neutral-800 px-4 py-2 flex items-center justify-between text-xs text-neutral-500">
                  <span>{contactInvoices.length} invoice{contactInvoices.length > 1 ? 's' : ''}</span>
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">
                    Total billed: {fmt(contactInvoices.reduce((s, i) => s + Number(i.total), 0))}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Payments */}
          {contactPayments.length > 0 && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-medium">Payments Received</h2>
                <span className="text-xs text-neutral-400">
                  {fmt(contactPayments.reduce((s, p) => s + Number(p.amount), 0))} total
                </span>
              </div>
              <div className="space-y-2">
                {contactPayments.map((pay) => (
                  <div key={pay.id}
                    className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-50 text-green-600 text-xs">
                        {pay.method === 'cash' ? '💵' : pay.method === 'upi' ? '📲' : pay.method === 'card' ? '💳' : '💰'}
                      </div>
                      <div>
                        <p className="text-sm font-medium capitalize">{pay.method}</p>
                        <p className="text-xs text-neutral-400">{new Date(pay.paid_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-700">{fmt(Number(pay.amount))}</p>
                      {pay.notes && <p className="text-xs text-neutral-400 truncate max-w-24">{pay.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Activity Timeline */}
      <div>
        <h2 className="mb-3 font-medium">Activity Timeline</h2>
        <ActivityTimeline contactId={id} initial={activityList} />
      </div>
    </div>
  );
}
