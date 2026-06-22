import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';

// Public: POST to place a QR order (no auth required)
export async function POST(req: NextRequest) {
  const { table_token, customer_name, items, notes } = await req.json();

  if (!table_token || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'table_token and items required' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Resolve table by token
  let tableData: any = null;
  try {
    const { data } = await admin
      .from('pos_tables')
      .select('id, org_id, name')
      .eq('qr_token', table_token)
      .single();
    tableData = data;
  } catch {
    return NextResponse.json({ error: 'Table not found' }, { status: 404 });
  }

  if (!tableData) return NextResponse.json({ error: 'Invalid QR code' }, { status: 404 });

  const total = items.reduce((s: number, it: any) => s + (Number(it.price ?? 0) * Number(it.qty ?? 1)), 0);

  const { data, error } = await admin.from('pos_qr_orders').insert({
    org_id: tableData.org_id,
    table_id: tableData.id,
    table_name: tableData.name,
    customer_name: customer_name?.trim() ?? null,
    items,
    total,
    notes: notes?.trim() ?? null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// Authenticated: GET list of pending QR orders for the org
export async function GET() {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient();
  try {
    const { data } = await supabase
      .from('pos_qr_orders')
      .select('*')
      .eq('org_id', ctx.org.id)
      .order('created_at', { ascending: false })
      .limit(100);
    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json([]);
  }
}

// Authenticated: PATCH to confirm/reject an order
export async function PATCH(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, status } = await req.json();
  if (!id || !status) return NextResponse.json({ error: 'id and status required' }, { status: 400 });

  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from('pos_qr_orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('org_id', ctx.org.id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
