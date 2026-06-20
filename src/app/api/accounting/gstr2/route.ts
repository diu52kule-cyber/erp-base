import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';
import { periodToDateRange, STATE_CODE_TO_NAME } from '@/lib/types/accounting';

// GSTR-2 / purchase register — Input Tax Credit (ITC) from vendor bills.
// Split into IGST vs CGST+SGST using the vendor's state (first 2 digits of GSTIN)
// vs the org's home state.
export async function GET(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const period = req.nextUrl.searchParams.get('period') ?? '';
  if (!period) return NextResponse.json({ error: 'period required' }, { status: 400 });

  const { start, end } = periodToDateRange(period);
  const supabase = createClient();

  const { data: orgGst } = await supabase.from('org_gst_settings').select('state_code').eq('org_id', ctx.org.id).maybeSingle();
  const orgState = orgGst?.state_code ?? null;

  // Resilient: vendor_bills may not exist until migration 0008 is applied.
  const billsRes = await supabase
    .from('vendor_bills')
    .select('id,bill_number,vendor_name,vendor_gstin,bill_date,subtotal,gst_amount,total')
    .eq('org_id', ctx.org.id)
    .gte('bill_date', start).lte('bill_date', end)
    .order('bill_date');

  if (billsRes.error) {
    return NextResponse.json({
      b2b: [], unregistered: [], totals: { taxable_value: 0, igst: 0, cgst: 0, sgst: 0, total_itc: 0, bill_count: 0 },
      period, start, end, needsMigration: true,
    });
  }

  const bills = billsRes.data ?? [];
  const split = (gstin: string | null, taxable: number, gst: number) => {
    const vendorState = gstin ? gstin.slice(0, 2) : null;
    const interState = !!(orgState && vendorState && vendorState !== orgState);
    return interState
      ? { igst: gst, cgst: 0, sgst: 0 }
      : { igst: 0, cgst: Math.round(gst * 50) / 100, sgst: Math.round(gst * 50) / 100 };
  };

  const b2b = bills.filter((b) => b.vendor_gstin).map((b) => {
    const s = split(b.vendor_gstin, Number(b.subtotal ?? 0), Number(b.gst_amount ?? 0));
    return {
      supplier_gstin: b.vendor_gstin,
      supplier_name: b.vendor_name,
      bill_number: b.bill_number ?? '—',
      bill_date: b.bill_date,
      supplier_state: b.vendor_gstin ? `${b.vendor_gstin.slice(0, 2)}-${STATE_CODE_TO_NAME[b.vendor_gstin.slice(0, 2)] ?? ''}` : '',
      taxable_value: Number(b.subtotal ?? 0),
      ...s,
      total: Number(b.total ?? 0),
    };
  });

  const unregistered = bills.filter((b) => !b.vendor_gstin).map((b) => ({
    supplier_name: b.vendor_name,
    bill_number: b.bill_number ?? '—',
    bill_date: b.bill_date,
    taxable_value: Number(b.subtotal ?? 0),
    gst: Number(b.gst_amount ?? 0),
    total: Number(b.total ?? 0),
  }));

  const totals = bills.reduce(
    (acc, b) => {
      const s = split(b.vendor_gstin, Number(b.subtotal ?? 0), Number(b.gst_amount ?? 0));
      acc.taxable_value += Number(b.subtotal ?? 0);
      acc.igst += s.igst; acc.cgst += s.cgst; acc.sgst += s.sgst;
      acc.total_itc += Number(b.gst_amount ?? 0);
      acc.bill_count += 1;
      return acc;
    },
    { taxable_value: 0, igst: 0, cgst: 0, sgst: 0, total_itc: 0, bill_count: 0 },
  );

  return NextResponse.json({ b2b, unregistered, totals, period, start, end });
}
