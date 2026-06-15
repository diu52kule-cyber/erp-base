import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function GET() {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient();
  const { data } = await supabase
    .from('org_gst_settings')
    .select('*')
    .eq('org_id', ctx.org.id)
    .maybeSingle();

  return NextResponse.json({ settings: data ?? null });
}

export async function PUT(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const supabase = createClient();

  const { error } = await supabase
    .from('org_gst_settings')
    .upsert({
      org_id: ctx.org.id,
      gstin: body.gstin?.trim().toUpperCase() || null,
      legal_name: body.legal_name?.trim() || null,
      state_code: body.state_code || null,
      filing_period: body.filing_period ?? 'monthly',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'org_id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
