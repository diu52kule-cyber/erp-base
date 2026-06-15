import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';
import { deriveSupplyType, splitGst } from '@/lib/types/accounting';
import type { CreateInvoiceInput } from '@/lib/types/billing';

export async function GET() {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = createClient();
  const { data } = await supabase.from('invoices').select('id,invoice_number,customer_name,total,status,issue_date')
    .eq('org_id', ctx.org.id).order('created_at', { ascending: false }).limit(100);
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('billing')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const input: CreateInvoiceInput & { place_of_supply?: string } = await req.json();

  if (!input.customer_name?.trim()) {
    return NextResponse.json({ error: 'Customer name is required' }, { status: 400 });
  }
  if (!input.items?.length || input.items.some((i) => !i.description.trim())) {
    return NextResponse.json({ error: 'All line items must have a description' }, { status: 400 });
  }

  const supabase = createClient();

  const itemsWithTotals = input.items.map((item) => {
    const amount = Math.round(item.quantity * item.unit_price * 100) / 100;
    const gst_amount = Math.round(amount * item.gst_rate) / 100;
    return { ...item, amount, gst_amount };
  });

  const subtotal = itemsWithTotals.reduce((s, i) => s + i.amount, 0);
  const gst_amount = itemsWithTotals.reduce((s, i) => s + i.gst_amount, 0);
  const total = Math.round((subtotal + gst_amount) * 100) / 100;

  // Determine supply type and tax split
  const supply_type = deriveSupplyType(input.customer_gstin ?? null, total);

  // Check org state code to determine IGST vs CGST+SGST
  const { data: gstSettings } = await supabase
    .from('org_gst_settings')
    .select('state_code')
    .eq('org_id', ctx.org.id)
    .maybeSingle();

  const orgStateCode = gstSettings?.state_code ?? null;
  const placeOfSupply = input.place_of_supply || null;
  const isInterState = !!(orgStateCode && placeOfSupply && orgStateCode !== placeOfSupply);
  const { igst, cgst, sgst } = splitGst(gst_amount, isInterState);

  const { data: invoiceNumber, error: seqErr } = await supabase.rpc(
    'next_invoice_number',
    { p_org_id: ctx.org.id }
  );
  if (seqErr || !invoiceNumber) {
    return NextResponse.json(
      { error: seqErr?.message ?? 'Failed to generate invoice number' },
      { status: 500 }
    );
  }

  const { data: invoice, error: invErr } = await supabase
    .from('invoices')
    .insert({
      org_id: ctx.org.id,
      invoice_number: invoiceNumber as string,
      customer_name: input.customer_name.trim(),
      customer_email: input.customer_email?.trim() || null,
      customer_gstin: input.customer_gstin?.trim() || null,
      billing_address: input.billing_address?.trim() || null,
      place_of_supply: placeOfSupply,
      supply_type,
      status: 'draft',
      issue_date: input.issue_date,
      due_date: input.due_date || null,
      notes: input.notes?.trim() || null,
      subtotal,
      gst_amount,
      igst_amount: igst,
      cgst_amount: cgst,
      sgst_amount: sgst,
      total,
      created_by: ctx.user.id,
    })
    .select('id')
    .single();

  if (invErr || !invoice) {
    return NextResponse.json(
      { error: invErr?.message ?? 'Failed to create invoice' },
      { status: 500 }
    );
  }

  const { error: itemsErr } = await supabase.from('invoice_items').insert(
    itemsWithTotals.map((item, index) => ({
      invoice_id: invoice.id,
      org_id: ctx.org!.id,
      description: item.description.trim(),
      hsn_code: (item as any).hsn_code || null,
      quantity: item.quantity,
      unit_price: item.unit_price,
      gst_rate: item.gst_rate,
      amount: item.amount,
      gst_amount: item.gst_amount,
      sort_order: index,
    }))
  );

  if (itemsErr) {
    return NextResponse.json({ error: itemsErr.message }, { status: 500 });
  }

  return NextResponse.json({ id: invoice.id });
}
