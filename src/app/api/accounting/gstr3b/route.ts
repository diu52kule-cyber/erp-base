import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';
import { periodToDateRange } from '@/lib/types/accounting';

export async function GET(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const period = req.nextUrl.searchParams.get('period') ?? '';
  if (!period) return NextResponse.json({ error: 'period required' }, { status: 400 });

  const { start, end } = periodToDateRange(period);
  const supabase = createClient();

  const { data: invoices } = await supabase
    .from('invoices')
    .select('supply_type,subtotal,gst_amount,igst_amount,cgst_amount,sgst_amount,total')
    .eq('org_id', ctx.org.id)
    .in('status', ['sent', 'paid'])
    .gte('issue_date', start)
    .lte('issue_date', end);

  const invList = invoices ?? [];

  // Table 3.1(a): Outward taxable supplies (non-zero, non-nil, non-exempt)
  const taxable = invList.filter((i) => !['nil', 'export'].includes(i.supply_type ?? ''));
  const exports_ = invList.filter((i) => i.supply_type === 'export');
  const nil = invList.filter((i) => i.supply_type === 'nil');

  function sumUp(list: typeof invList) {
    return {
      taxable_value: list.reduce((s, i) => s + (i.subtotal ?? 0), 0),
      igst: list.reduce((s, i) => s + (i.igst_amount ?? 0), 0),
      cgst: list.reduce((s, i) => s + (i.cgst_amount ?? 0), 0),
      sgst: list.reduce((s, i) => s + (i.sgst_amount ?? 0), 0),
      total_tax: list.reduce((s, i) => s + (i.gst_amount ?? 0), 0),
    };
  }

  const outwardTaxable = sumUp(taxable);
  const outwardExports = sumUp(exports_);
  const outwardNil     = sumUp(nil);

  // Total output tax liability
  const totalIgst = outwardTaxable.igst + outwardExports.igst;
  const totalCgst = outwardTaxable.cgst;
  const totalSgst = outwardTaxable.sgst;
  const totalTax  = totalIgst + totalCgst + totalSgst;

  return NextResponse.json({
    period,
    start,
    end,
    invoice_count: invList.length,
    table_3_1: {
      a_outward_taxable: outwardTaxable,
      b_zero_rated_exports: outwardExports,
      e_nil_exempted: outwardNil,
    },
    tax_payable: {
      igst: totalIgst,
      cgst: totalCgst,
      sgst: totalSgst,
      total: totalTax,
    },
  });
}
