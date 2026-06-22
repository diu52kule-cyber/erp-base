import { NextRequest, NextResponse } from 'next/server';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const contactId = new URL(req.url).searchParams.get('contact_id');
  const supabase  = createClient();
  try {
    let q = supabase
      .from('loyalty_accounts')
      .select('*, contact:contacts(name, phone, email)')
      .eq('org_id', ctx.org.id)
      .order('points', { ascending: false });
    if (contactId) q = q.eq('contact_id', contactId);
    const { data } = await q;
    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { contact_id, points, type, reference_id, reference_type, notes } = await req.json();
  if (!contact_id || !points || !type) {
    return NextResponse.json({ error: 'contact_id, points, type required' }, { status: 400 });
  }

  const delta = type === 'redeem' ? -Math.abs(points) : Math.abs(points);
  const supabase = createClient();

  try {
    // Check if account exists
    const { data: existing } = await supabase
      .from('loyalty_accounts')
      .select('id, points, lifetime_points')
      .eq('org_id', ctx.org.id)
      .eq('contact_id', contact_id)
      .maybeSingle();

    if (existing) {
      const newPoints   = (existing.points ?? 0) + delta;
      const newLifetime = (existing.lifetime_points ?? 0) + (delta > 0 ? delta : 0);
      await supabase
        .from('loyalty_accounts')
        .update({ points: newPoints, lifetime_points: newLifetime, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await supabase.from('loyalty_accounts').insert({
        org_id: ctx.org.id,
        contact_id,
        points: Math.max(0, delta),
        lifetime_points: delta > 0 ? delta : 0,
      });
    }

    // Record transaction
    await supabase.from('loyalty_transactions').insert({
      org_id: ctx.org.id,
      contact_id,
      points: delta,
      type,
      reference_id: reference_id ?? null,
      reference_type: reference_type ?? null,
      notes: notes ?? null,
    });

    return NextResponse.json({ ok: true, points: delta });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
