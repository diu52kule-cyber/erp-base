import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { yesterday, today, blockers } = await req.json();

  const supabase = createClient();
  const { error } = await supabase.from('checkins').upsert({
    org_id: ctx.org.id,
    user_id: ctx.user.id,
    checkin_date: new Date().toISOString().split('T')[0],
    yesterday: yesterday || null,
    today: today || null,
    blockers: blockers || null,
  }, { onConflict: 'org_id,user_id,checkin_date' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
