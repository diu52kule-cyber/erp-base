import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { runRecurring } from '@/lib/invoice/recurring';

// Vercel Cron hits this daily. Generates every active recurring invoice that is
// due (next_run_date <= today) across all orgs, then advances each schedule.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const today = new Date().toISOString().split('T')[0];

  const { data: due } = await admin
    .from('recurring_invoices')
    .select('*')
    .eq('status', 'active')
    .lte('next_run_date', today);

  // Cache per-org lookups across the batch.
  const stateCache = new Map<string, string | null>();
  const ledgerCache = new Map<string, boolean>();
  let created = 0;
  const errors: string[] = [];

  for (const row of due ?? []) {
    const orgId = row.org_id as string;
    if (!stateCache.has(orgId)) {
      const { data: gst } = await admin.from('org_gst_settings').select('state_code').eq('org_id', orgId).maybeSingle();
      stateCache.set(orgId, gst?.state_code ?? null);
    }
    if (!ledgerCache.has(orgId)) {
      const { data: ent } = await admin.from('entitlements').select('module_key').eq('org_id', orgId).eq('module_key', 'ledger').eq('enabled', true).maybeSingle();
      ledgerCache.set(orgId, !!ent);
    }
    const res = await runRecurring(admin, row, stateCache.get(orgId) ?? null, ledgerCache.get(orgId) ?? false);
    if ('error' in res) errors.push(`${row.id}: ${res.error}`);
    else created++;
  }

  return NextResponse.json({ created, errors });
}
