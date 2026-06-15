import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('subscriptions')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();

  const supabase = await createClient();
  const { error } = await supabase
    .from('customer_subscriptions')
    .update({ status: body.status, notes: body.notes, ends_at: body.ends_at || null })
    .eq('id', id).eq('org_id', ctx.org.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
