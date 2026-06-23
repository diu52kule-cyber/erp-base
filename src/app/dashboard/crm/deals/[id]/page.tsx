import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import { DEAL_STAGE_LABELS, DEAL_STAGE_COLORS } from '@/lib/types/crm';
import type { Deal } from '@/lib/types/crm';
import StageButton from './StageButton';
import Comments from '@/components/Comments';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default async function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('crm') || !ctx.org) redirect('/dashboard');

  const { id } = await params;
  const supabase = createClient();
  const { data } = await supabase
    .from('deals')
    .select('*, contact:contacts(id, name, company, type)')
    .eq('id', id)
    .eq('org_id', ctx.org.id)
    .single();

  if (!data) notFound();
  const deal = data as Deal & { contact: { id: string; name: string; company: string | null; type: string } | null };

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/crm" className="text-sm text-neutral-500 hover:text-neutral-900">← CRM</Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{deal.title}</h1>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${DEAL_STAGE_COLORS[deal.stage]}`}>
            {DEAL_STAGE_LABELS[deal.stage]}
          </span>
        </div>
        {deal.contact && (
          <Link
            href={`/dashboard/crm/contacts/${deal.contact.id}`}
            className="mt-1 text-sm text-neutral-500 hover:underline"
          >
            {deal.contact.name}{deal.contact.company ? ` · ${deal.contact.company}` : ''}
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <p className="text-xs text-neutral-400">Deal Value</p>
          <p className="mt-1 text-2xl font-semibold">{fmt(Number(deal.value))}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <p className="text-xs text-neutral-400">Expected Close</p>
          <p className="mt-1 text-lg font-semibold">{deal.expected_close ?? '—'}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <p className="text-xs text-neutral-400">Created</p>
          <p className="mt-1 text-lg font-semibold">
            {new Date(deal.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-4">
        <h2 className="font-medium">Move Stage</h2>
        <StageButton dealId={deal.id} currentStage={deal.stage} />
      </div>

      {deal.notes && (
        <div className="rounded-xl border border-neutral-200 bg-white p-6">
          <h2 className="mb-2 font-medium">Notes</h2>
          <p className="text-sm text-neutral-700 whitespace-pre-line">{deal.notes}</p>
        </div>
      )}

      <Comments entityType="deal" entityId={deal.id} currentUserId={ctx.user.id} />
    </div>
  );
}
