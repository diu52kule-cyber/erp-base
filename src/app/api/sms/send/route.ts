import { NextRequest, NextResponse } from 'next/server';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import { sendSMS } from '@/lib/sms';

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { to, message, reference } = await req.json();
  if (!to || !message) return NextResponse.json({ error: 'to and message required' }, { status: 400 });

  const result = await sendSMS(ctx.org.id, to, message);

  // Log the attempt
  const supabase = createClient();
  try {
    await supabase.from('sms_logs').insert({
      org_id: ctx.org.id,
      to_number: to,
      message,
      status: result.ok ? 'sent' : 'failed',
      error: result.error ?? null,
      reference: reference ?? null,
    });
  } catch { /* log table not yet run */ }

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ ok: true });
}
