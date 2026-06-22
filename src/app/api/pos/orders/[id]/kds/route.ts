import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

const VALID = ['new', 'preparing', 'ready', 'served'];

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { kds_status } = await req.json();
  if (!VALID.includes(kds_status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });

  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from('pos_orders')
      .update({ kds_status })
      .eq('id', params.id)
      .eq('org_id', ctx.org.id)
      .select('id, kds_status')
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
