import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function GET() {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = createClient();
  const { data } = await supabase.from('recurring_invoices').select('*').eq('org_id', ctx.org.id).order('created_at', { ascending: false });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('billing')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const b = await req.json();
  if (!b.customer_name?.trim()) return NextResponse.json({ error: 'Customer name is required' }, { status: 400 });
  if (!Array.isArray(b.items) || !b.items.length || b.items.some((i: { description?: string }) => !i.description?.trim())) {
    return NextResponse.json({ error: 'Add at least one line item with a description' }, { status: 400 });
  }

  const supabase = createClient();
  const startDate = b.start_date || new Date().toISOString().split('T')[0];
  const { error } = await supabase.from('recurring_invoices').insert({
    org_id: ctx.org.id,
    title: b.title?.trim() || null,
    customer_id: b.customer_id || null,
    customer_name: b.customer_name.trim(),
    customer_email: b.customer_email?.trim() || null,
    customer_gstin: b.customer_gstin?.trim() || null,
    billing_address: b.billing_address?.trim() || null,
    place_of_supply: b.place_of_supply || null,
    currency: b.currency || 'INR',
    notes: b.notes?.trim() || null,
    terms: b.terms?.trim() || null,
    discount_type: b.discount_type || null,
    discount_value: Number(b.discount_value) || 0,
    items: b.items,
    frequency: b.frequency || 'monthly',
    interval_count: Math.max(1, parseInt(b.interval_count) || 1),
    start_date: startDate,
    next_run_date: startDate,
    end_date: b.end_date || null,
    status: 'active',
    created_by: ctx.user.id,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
