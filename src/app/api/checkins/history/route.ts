import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function GET(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const days = parseInt(new URL(req.url).searchParams.get('days') ?? '7');
  const supabase = createClient();
  try {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const { data } = await supabase
      .from('checkins')
      .select('id,user_id,checkin_date,yesterday,today,blockers,mood,created_at,memberships(display_name,email)')
      .eq('org_id', ctx.org.id)
      .gte('checkin_date', since.toISOString().slice(0, 10))
      .order('checkin_date', { ascending: false })
      .order('created_at', { ascending: false });
    return NextResponse.json(data ?? []);
  } catch { return NextResponse.json([]); }
}
