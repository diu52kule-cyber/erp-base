import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';
import { periodToDateRange } from '@/lib/types/accounting';

function toCSV(headers: string[], rows: (string | number)[][]): string {
  const escape = (v: string | number) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers, ...rows].map((row) => row.map(escape).join(',')).join('\r\n');
}

export async function GET(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const period = req.nextUrl.searchParams.get('period') ?? '';
  const section = req.nextUrl.searchParams.get('section') ?? 'b2b';
  if (!period) return NextResponse.json({ error: 'period required' }, { status: 400 });

  const { start, end } = periodToDateRange(period);
  const supabase = createClient();

  const { data: invoices } = await supabase
    .from('invoices')
    .select('id,invoice_number,customer_name,customer_gstin,place_of_supply,issue_date,subtotal,gst_amount,igst_amount,cgst_amount,sgst_amount,total')
    .eq('org_id', ctx.org.id)
    .in('status', ['sent', 'paid'])
    .gte('issue_date', start)
    .lte('issue_date', end)
    .order('issue_date');

  const invList = invoices ?? [];
  let csv = '';
  let filename = `gstr1-${section}-${period}.csv`;

  if (section === 'b2b') {
    const rows = invList
      .filter((i) => i.customer_gstin)
      .map((i) => [
        i.customer_gstin!, i.customer_name, i.invoice_number, i.issue_date,
        i.total, i.place_of_supply ?? '', i.subtotal,
        i.igst_amount ?? 0, i.cgst_amount ?? 0, i.sgst_amount ?? 0,
      ]);
    csv = toCSV(
      ['Receiver GSTIN','Receiver Name','Invoice No','Invoice Date','Invoice Value','Place of Supply','Taxable Value','IGST','CGST','SGST'],
      rows
    );
  } else if (section === 'b2cl') {
    const rows = invList
      .filter((i) => !i.customer_gstin && (i.total ?? 0) > 250000)
      .map((i) => [
        i.invoice_number, i.customer_name, i.issue_date, i.total,
        i.place_of_supply ?? '', i.subtotal, i.igst_amount ?? 0,
      ]);
    csv = toCSV(
      ['Invoice No','Customer Name','Invoice Date','Invoice Value','Place of Supply','Taxable Value','IGST'],
      rows
    );
  } else {
    // all invoices
    const rows = invList.map((i) => [
      i.invoice_number, i.customer_name, i.customer_gstin ?? '', i.issue_date,
      i.place_of_supply ?? '', i.subtotal, i.igst_amount ?? 0, i.cgst_amount ?? 0,
      i.sgst_amount ?? 0, i.gst_amount, i.total,
    ]);
    csv = toCSV(
      ['Invoice No','Customer','GSTIN','Date','Place of Supply','Taxable','IGST','CGST','SGST','Total GST','Invoice Total'],
      rows
    );
    filename = `gstr1-all-${period}.csv`;
  }

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
