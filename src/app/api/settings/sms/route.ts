import { NextRequest, NextResponse } from 'next/server';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = createClient();
  try {
    const { data } = await supabase
      .from('org_sms_settings')
      .select('provider,msg91_sender,twilio_from,is_active')  // never return secrets
      .eq('org_id', ctx.org.id)
      .maybeSingle();
    return NextResponse.json(data ?? {});
  } catch {
    return NextResponse.json({});
  }
}

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['owner', 'admin'].includes(ctx.org.role ?? '')) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }
  const body = await req.json();
  const allowed = ['provider', 'msg91_authkey', 'msg91_sender', 'twilio_sid', 'twilio_token', 'twilio_from', 'is_active'] as const;
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of allowed) if (k in body) patch[k] = body[k];

  const supabase = createClient();
  try {
    const { error } = await supabase
      .from('org_sms_settings')
      .upsert({ org_id: ctx.org.id, ...patch }, { onConflict: 'org_id' });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
