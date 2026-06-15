import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function GET() {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = await createClient();
  const [{ data: currencies }, { data: orgSettings }] = await Promise.all([
    supabase.from('currencies').select('*').order('code'),
    supabase.from('org_currency_settings').select('*').eq('org_id', ctx.org.id),
  ]);
  return NextResponse.json({ currencies: currencies ?? [], orgSettings: orgSettings ?? [] });
}

export async function PUT(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { code, exchange_rate, enabled } = await req.json();
  const supabase = await createClient();
  const { error } = await supabase.from('org_currency_settings').upsert({
    org_id: ctx.org.id, currency_code: code, exchange_rate, enabled,
  }, { onConflict: 'org_id,currency_code' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
