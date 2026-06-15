import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';
import { periodToDateRange, STATE_CODE_TO_NAME } from '@/lib/types/accounting';

export async function GET(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const period = req.nextUrl.searchParams.get('period') ?? '';
  if (!period) return NextResponse.json({ error: 'period required' }, { status: 400 });

  const { start, end } = periodToDateRange(period);
  const supabase = createClient();

  const [{ data: invoices }, { data: items }, { data: gstSettings }] = await Promise.all([
    supabase
      .from('invoices')
      .select('id,invoice_number,customer_name,customer_gstin,place_of_supply,supply_type,issue_date,subtotal,gst_amount,igst_amount,cgst_amount,sgst_amount,total')
      .eq('org_id', ctx.org.id)
      .in('status', ['sent', 'paid'])
      .gte('issue_date', start)
      .lte('issue_date', end)
      .order('issue_date'),
    supabase
      .from('invoice_items')
      .select('invoice_id,description,hsn_code,quantity,gst_rate,amount,gst_amount')
      .eq('org_id', ctx.org.id),
    supabase.from('org_gst_settings').select('state_code').eq('org_id', ctx.org.id).maybeSingle(),
  ]);

  const invList = invoices ?? [];
  const itemList = items ?? [];
  const orgStateCode = gstSettings?.state_code ?? null;

  const itemsByInvoice = new Map<string, typeof itemList>();
  for (const item of itemList) {
    if (!itemsByInvoice.has(item.invoice_id)) itemsByInvoice.set(item.invoice_id, []);
    itemsByInvoice.get(item.invoice_id)!.push(item);
  }

  // B2B: invoices with customer GSTIN
  const b2b = invList
    .filter((inv) => inv.customer_gstin)
    .map((inv) => ({
      receiver_gstin: inv.customer_gstin,
      receiver_name: inv.customer_name,
      invoice_number: inv.invoice_number,
      invoice_date: inv.issue_date,
      invoice_value: inv.total,
      place_of_supply: inv.place_of_supply ? `${inv.place_of_supply}-${STATE_CODE_TO_NAME[inv.place_of_supply] ?? inv.place_of_supply}` : '',
      taxable_value: inv.subtotal,
      igst: inv.igst_amount ?? 0,
      cgst: inv.cgst_amount ?? 0,
      sgst: inv.sgst_amount ?? 0,
    }));

  // B2CL: no GSTIN, total > ₹2.5L
  const b2cl = invList
    .filter((inv) => !inv.customer_gstin && (inv.total ?? 0) > 250000)
    .map((inv) => ({
      invoice_number: inv.invoice_number,
      invoice_date: inv.issue_date,
      invoice_value: inv.total,
      place_of_supply: inv.place_of_supply ? `${inv.place_of_supply}-${STATE_CODE_TO_NAME[inv.place_of_supply] ?? inv.place_of_supply}` : '',
      taxable_value: inv.subtotal,
      igst: inv.igst_amount ?? 0,
    }));

  // B2CS: no GSTIN, total ≤ ₹2.5L — group by place_of_supply + gst_rate
  const b2csMap = new Map<string, { place_of_supply: string; rate: number; taxable_value: number; igst: number; cgst: number; sgst: number }>();
  for (const inv of invList.filter((inv) => !inv.customer_gstin && (inv.total ?? 0) <= 250000)) {
    const invItems = itemsByInvoice.get(inv.id) ?? [];
    const pos = inv.place_of_supply ?? 'UNK';
    const isInterState = !!(orgStateCode && pos !== 'UNK' && orgStateCode !== pos);
    for (const item of invItems) {
      const key = `${pos}__${item.gst_rate}`;
      const existing = b2csMap.get(key) ?? { place_of_supply: pos, rate: item.gst_rate, taxable_value: 0, igst: 0, cgst: 0, sgst: 0 };
      existing.taxable_value += item.amount;
      if (isInterState) { existing.igst += item.gst_amount; }
      else { existing.cgst += Math.round(item.gst_amount * 50) / 100; existing.sgst += Math.round(item.gst_amount * 50) / 100; }
      b2csMap.set(key, existing);
    }
  }
  const b2cs = Array.from(b2csMap.values()).map((r) => ({
    ...r,
    place_of_supply: r.place_of_supply !== 'UNK' ? `${r.place_of_supply}-${STATE_CODE_TO_NAME[r.place_of_supply] ?? r.place_of_supply}` : 'Unknown',
  }));

  // HSN Summary: group by hsn_code + gst_rate across all invoices in period
  const invIds = new Set(invList.map((i) => i.id));
  const hsnMap = new Map<string, { hsn_code: string; rate: number; taxable_value: number; igst: number; cgst: number; sgst: number; count: number }>();
  for (const item of itemList.filter((i) => invIds.has(i.invoice_id))) {
    const hsn = item.hsn_code || 'N/A';
    const key = `${hsn}__${item.gst_rate}`;
    const existing = hsnMap.get(key) ?? { hsn_code: hsn, rate: item.gst_rate, taxable_value: 0, igst: 0, cgst: 0, sgst: 0, count: 0 };
    existing.taxable_value += item.amount;
    existing.count += 1;
    // Use invoice-level tax split
    const inv = invList.find((i) => i.id === item.invoice_id);
    const isInterState = !!(orgStateCode && inv?.place_of_supply && orgStateCode !== inv.place_of_supply);
    if (isInterState) { existing.igst += item.gst_amount; }
    else { existing.cgst += Math.round(item.gst_amount * 50) / 100; existing.sgst += Math.round(item.gst_amount * 50) / 100; }
    hsnMap.set(key, existing);
  }
  const hsn = Array.from(hsnMap.values());

  // Totals summary
  const totals = {
    taxable_value: invList.reduce((s, i) => s + (i.subtotal ?? 0), 0),
    igst: invList.reduce((s, i) => s + (i.igst_amount ?? 0), 0),
    cgst: invList.reduce((s, i) => s + (i.cgst_amount ?? 0), 0),
    sgst: invList.reduce((s, i) => s + (i.sgst_amount ?? 0), 0),
    total_tax: invList.reduce((s, i) => s + (i.gst_amount ?? 0), 0),
    invoice_count: invList.length,
  };

  return NextResponse.json({ b2b, b2cs, b2cl, hsn, totals, period, start, end });
}
