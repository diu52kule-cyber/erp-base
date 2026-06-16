import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdminRequest } from '@/lib/adminAuth';

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const admin = createAdminClient();
  const { data } = await admin.from('platform_settings').select('*').eq('id', 1).maybeSingle();
  return NextResponse.json(data ?? {});
}

export async function PATCH(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const admin = createAdminClient();
  const body = await req.json();

  const update = {
    id: 1,
    whatsapp_number: body.whatsapp_number ?? null,
    whatsapp_message: body.whatsapp_message ?? null,
    upi_id: body.upi_id ?? null,
    contact_email: body.contact_email ?? null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await admin.from('platform_settings').upsert(update, { onConflict: 'id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
