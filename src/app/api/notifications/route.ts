import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function GET() {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = createClient();
  const { data } = await supabase.from('notifications').select('*')
    .eq('org_id', ctx.org.id).eq('user_id', ctx.user.id)
    .order('created_at', { ascending: false }).limit(30);
  return NextResponse.json(data ?? []);
}

export async function PATCH(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { ids } = await req.json(); // mark ids as read, or all if empty
  const supabase = createClient();
  let q = supabase.from('notifications').update({ read_at: new Date().toISOString() })
    .eq('user_id', ctx.user.id).is('read_at', null);
  if (ids?.length) q = q.in('id', ids);
  await q;
  return NextResponse.json({ success: true });
}
