import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function GET() {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createClient();
  const { data } = await supabase
    .from('statutory_settings')
    .select('*')
    .eq('org_id', ctx.org.id)
    .maybeSingle();

  return NextResponse.json(data ?? {
    org_id: ctx.org.id,
    pf_enabled: true,
    esi_enabled: true,
    pt_enabled: false,
    pt_state: 'MH',
    tds_enabled: false,
  });
}

export async function PUT(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const supabase = await createClient();

  const { error } = await supabase
    .from('statutory_settings')
    .upsert({ ...body, org_id: ctx.org.id, updated_at: new Date().toISOString() }, { onConflict: 'org_id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
