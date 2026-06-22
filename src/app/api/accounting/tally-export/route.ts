import { NextRequest, NextResponse } from 'next/server';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';

function escXml(s: string) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function tallyDate(iso: string) {
  // Tally expects YYYYMMDD
  return iso.replace(/-/g, '');
}

function formatAmt(n: number | null | undefined) {
  return Math.abs(Number(n ?? 0)).toFixed(2);
}

export async function GET(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('accounting') || !ctx.org) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url    = new URL(req.url);
  const from   = url.searchParams.get('from') ?? '';
  const to     = url.searchParams.get('to') ?? '';
  const supabase = createClient();

  let q = supabase
    .from('invoices')
    .select('id, invoice_number, issue_date, customer_name, customer_gstin, subtotal, gst_amount, total, cgst_amount, sgst_amount, igst_amount, doc_type, status, supply_type, line_items')
    .eq('org_id', ctx.org.id)
    .eq('doc_type', 'invoice')
    .in('status', ['sent', 'paid']);

  if (from) q = q.gte('issue_date', from);
  if (to)   q = q.lte('issue_date', to);

  const { data: invoices, error } = await q.order('issue_date');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const orgName = escXml(ctx.org.name);

  let vouchers = '';
  for (const inv of invoices ?? []) {
    const invNo    = escXml(inv.invoice_number ?? '');
    const date     = tallyDate(inv.issue_date ?? '');
    const party    = escXml(inv.customer_name ?? 'Cash');
    const total    = formatAmt(inv.total);
    const subtotal = formatAmt(inv.subtotal);
    const cgst     = formatAmt(inv.cgst_amount);
    const sgst     = formatAmt(inv.sgst_amount);
    const igst     = formatAmt(inv.igst_amount);

    vouchers += `
    <VOUCHER VCHTYPE="Sales" ACTION="Create" OBJVIEW="Invoice Voucher View">
      <DATE>${date}</DATE>
      <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
      <VOUCHERNUMBER>${invNo}</VOUCHERNUMBER>
      <PARTYLEDGERNAME>${party}</PARTYLEDGERNAME>
      <EFFECTIVEDATE>${date}</EFFECTIVEDATE>
      <ALLLEDGERENTRIES.LIST>
        <LEDGERNAME>${party}</LEDGERNAME>
        <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
        <AMOUNT>-${total}</AMOUNT>
      </ALLLEDGERENTRIES.LIST>
      <ALLLEDGERENTRIES.LIST>
        <LEDGERNAME>Sales</LEDGERNAME>
        <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
        <AMOUNT>${subtotal}</AMOUNT>
      </ALLLEDGERENTRIES.LIST>${cgst !== '0.00' ? `
      <ALLLEDGERENTRIES.LIST>
        <LEDGERNAME>Output CGST</LEDGERNAME>
        <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
        <AMOUNT>${cgst}</AMOUNT>
      </ALLLEDGERENTRIES.LIST>
      <ALLLEDGERENTRIES.LIST>
        <LEDGERNAME>Output SGST</LEDGERNAME>
        <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
        <AMOUNT>${sgst}</AMOUNT>
      </ALLLEDGERENTRIES.LIST>` : ''}${igst !== '0.00' ? `
      <ALLLEDGERENTRIES.LIST>
        <LEDGERNAME>Output IGST</LEDGERNAME>
        <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
        <AMOUNT>${igst}</AMOUNT>
      </ALLLEDGERENTRIES.LIST>` : ''}
    </VOUCHER>`;
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${orgName}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">${vouchers}
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

  const filename = `tally-export-${new Date().toISOString().split('T')[0]}.xml`;
  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
