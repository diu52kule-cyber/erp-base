import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

const FIELDS = [
  'bank_name', 'account_name', 'account_number', 'ifsc', 'branch', 'upi_id',
  'logo_url', 'signature_url', 'default_terms', 'default_notes',
] as const;

export async function GET() {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = createClient();
  const { data } = await supabase.from('org_invoice_settings').select('*').eq('org_id', ctx.org.id).maybeSingle();
  return NextResponse.json(data ?? {});
}

export async function PUT(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const row: Record<string, unknown> = { org_id: ctx.org.id, updated_at: new Date().toISOString() };
  for (const f of FIELDS) row[f] = (body[f] ?? '').toString().trim() || null;
  row.default_due_days = Math.max(0, parseInt(body.default_due_days) || 0);
  row.show_bank = body.show_bank !== false;
  row.show_upi_qr = body.show_upi_qr !== false;
  row.enable_round_off = body.enable_round_off !== false;

  const supabase = createClient();
  const { error } = await supabase.from('org_invoice_settings').upsert(row, { onConflict: 'org_id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
