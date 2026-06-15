import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import { DEAL_STAGES, DEAL_STAGE_LABELS, DEAL_STAGE_COLORS } from '@/lib/types/crm';
import type { Deal, DealStage } from '@/lib/types/crm';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default async function DealsPage() {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('crm') || !ctx.org) redirect('/dashboard');

  const supabase = await createClient();
  const { data } = await supabase
    .from('deals')
    .select('*, contact:contacts(name, company)')
    .eq('org_id', ctx.org.id)
    .order('created_at', { ascending: false });

  const deals = (data ?? []) as Deal[];
  const byStage = DEAL_STAGES.reduce<Record<DealStage, Deal[]>>(
    (acc, s) => ({ ...acc, [s]: deals.filter((d) => d.stage === s) }),
    {} as Record<DealStage, Deal[]>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/crm" className="text-sm text-neutral-500 hover:text-neutral-900">← CRM</Link>
          <h1 className="mt-1 text-2xl font-semibold">Pipeline</h1>
        </div>
        <Link
          href="/dashboard/crm/deals/new"
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700"
        >
          + New Deal
        </Link>
      </div>

      {deals.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 py-16 text-center">
          <p className="text-neutral-500">No deals yet</p>
          <Link href="/dashboard/crm/deals/new" className="mt-3 inline-block rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white">
            Create your first deal
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {DEAL_STAGES.map((stage) => {
            const col = byStage[stage] ?? [];
            const total = col.reduce((s, d) => s + Number(d.value), 0);
            return (
              <div key={stage} className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${DEAL_STAGE_COLORS[stage]}`}>
                    {DEAL_STAGE_LABELS[stage]}
                  </span>
                  <span className="text-xs text-neutral-400">{col.length}</span>
                </div>
                <p className="text-xs font-semibold text-neutral-600">{fmt(total)}</p>
                <div className="space-y-2">
                  {col.map((d) => (
                    <Link
                      key={d.id}
                      href={`/dashboard/crm/deals/${d.id}`}
                      className="block rounded-xl border border-neutral-200 bg-white p-3 hover:border-neutral-400"
                    >
                      <p className="text-sm font-medium leading-snug">{d.title}</p>
                      {d.contact && (
                        <p className="mt-1 text-xs text-neutral-400 truncate">
                          {(d.contact as any).name}
                          {(d.contact as any).company ? ` · ${(d.contact as any).company}` : ''}
                        </p>
                      )}
                      <p className="mt-2 text-sm font-semibold">{fmt(Number(d.value))}</p>
                      {d.expected_close && (
                        <p className="mt-1 text-xs text-neutral-400">Close: {d.expected_close}</p>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
