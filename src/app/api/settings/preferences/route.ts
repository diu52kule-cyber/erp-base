import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function GET() {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient();
  try {
    const { data } = await supabase
      .from('user_preferences')
      .select('key, value')
      .eq('user_id', ctx.user.id);
    const prefs: Record<string, string> = {};
    for (const row of data ?? []) prefs[row.key] = row.value;
    return NextResponse.json(prefs);
  } catch {
    return NextResponse.json({});
  }
}

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  if (!body.key || body.value === undefined) {
    return NextResponse.json({ error: 'key and value required' }, { status: 400 });
  }

  const supabase = createClient();
  try {
    const { error } = await supabase.from('user_preferences').upsert({
      user_id: ctx.user.id,
      org_id: ctx.org.id,
      key: body.key,
      value: String(body.value),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,key' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to save preference' }, { status: 500 });
  }
}
