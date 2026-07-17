// Dependency-free renderer for org-defined custom invoice layouts.
//
// Supported syntax:
//   {{field}}                         — a single value (HTML-escaped)
//   {{#items}} … {{/items}}           — repeated once per line item
//   {{#gst_summary}} … {{/gst_summary}} — repeated once per GST-rate bucket
//
// Values are HTML-escaped so invoice data can never break the layout; the
// template markup itself is the org's own. Obvious script vectors are stripped
// on render as defence-in-depth (an org only ever sees its own template).

export type TemplateRow = Record<string, string>;
export type TemplateData = {
  fields: Record<string, string>;
  items: TemplateRow[];
  gst_summary: TemplateRow[];
};

function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderLoop(tpl: string, name: string, rows: TemplateRow[]): string {
  const re = new RegExp(`{{#${name}}}([\\s\\S]*?){{/${name}}}`, 'g');
  return tpl.replace(re, (_m, inner: string) =>
    rows.map((row) => inner.replace(/{{\s*(\w+)\s*}}/g, (_x, k: string) => esc(row[k]))).join(''),
  );
}

function sanitize(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<\/?(iframe|object|embed)[^>]*>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript:/gi, '');
}

export function renderInvoiceTemplate(template: string, data: TemplateData): string {
  let out = template;
  out = renderLoop(out, 'items', data.items);
  out = renderLoop(out, 'gst_summary', data.gst_summary);
  out = out.replace(/{{\s*(\w+)\s*}}/g, (_m, k: string) => esc(data.fields[k]));
  return sanitize(out);
}

// Shown in the settings editor so users know what they can use.
export const TEMPLATE_PLACEHOLDERS: { key: string; desc: string }[] = [
  { key: 'seller_name', desc: 'Your business name' },
  { key: 'seller_address', desc: 'Your city / address' },
  { key: 'seller_phone', desc: 'Your phone' },
  { key: 'seller_gstin', desc: 'Your GSTIN' },
  { key: 'header_note', desc: 'Extra header line (FSSAI, etc.)' },
  { key: 'invoice_title', desc: 'Document title' },
  { key: 'invoice_number', desc: 'Invoice number' },
  { key: 'issue_date', desc: 'Invoice date' },
  { key: 'due_date', desc: 'Due date' },
  { key: 'customer_name', desc: 'Buyer name' },
  { key: 'customer_gstin', desc: 'Buyer GSTIN' },
  { key: 'customer_address', desc: 'Buyer address' },
  { key: 'place_of_supply', desc: 'Place of supply' },
  { key: 'subtotal', desc: 'Subtotal' },
  { key: 'discount', desc: 'Discount amount' },
  { key: 'taxable', desc: 'Taxable value' },
  { key: 'cgst / sgst / igst', desc: 'Tax totals' },
  { key: 'round_off', desc: 'Round off' },
  { key: 'total', desc: 'Grand total' },
  { key: 'amount_paid / balance_due', desc: 'Payment' },
  { key: 'amount_words', desc: 'Total in words' },
  { key: 'terms', desc: 'Terms & conditions' },
  { key: 'footer_note', desc: 'Footer note' },
  { key: 'bank_name / account_number / ifsc / upi_id', desc: 'Bank details' },
  { key: '#items … /items', desc: 'Loop: sn, description, hsn, qty, rate, disc, gst_rate, cgst, sgst, igst, amount' },
  { key: '#gst_summary … /gst_summary', desc: 'Loop: rate, taxable, cgst, sgst, igst, total' },
];

// A ready-made traditional Indian GST tax-invoice layout (Marg/Tally style) the
// user can load and then edit freely. Inline styles keep it print-safe.
export const DEFAULT_GST_TEMPLATE = `<div style="font-family:Arial,Helvetica,sans-serif;color:#000;font-size:12px;border:1px solid #000">
  <div style="display:flex;justify-content:space-between;padding:8px 10px;border-bottom:1px solid #000">
    <div>
      <div style="font-size:18px;font-weight:bold">{{seller_name}}</div>
      <div>{{seller_address}}</div>
      <div>{{header_note}}</div>
      <div>Phone: {{seller_phone}}</div>
      <div>GSTIN: {{seller_gstin}}</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:16px;font-weight:bold;letter-spacing:1px">{{invoice_title}}</div>
      <div>Invoice No: <b>{{invoice_number}}</b></div>
      <div>Date: {{issue_date}}</div>
      <div>Due: {{due_date}}</div>
    </div>
  </div>
  <div style="padding:6px 10px;border-bottom:1px solid #000">
    <b>Bill To:</b> {{customer_name}} &nbsp;&nbsp; GSTIN: {{customer_gstin}} &nbsp;&nbsp; State: {{place_of_supply}}
    <div>{{customer_address}}</div>
  </div>
  <table style="width:100%;border-collapse:collapse;font-size:11px">
    <thead>
      <tr>
        <th style="border:1px solid #000;padding:3px">Sn</th>
        <th style="border:1px solid #000;padding:3px;text-align:left">Product</th>
        <th style="border:1px solid #000;padding:3px">HSN</th>
        <th style="border:1px solid #000;padding:3px">Qty</th>
        <th style="border:1px solid #000;padding:3px">Rate</th>
        <th style="border:1px solid #000;padding:3px">Disc</th>
        <th style="border:1px solid #000;padding:3px">GST%</th>
        <th style="border:1px solid #000;padding:3px">CGST</th>
        <th style="border:1px solid #000;padding:3px">SGST</th>
        <th style="border:1px solid #000;padding:3px">Amount</th>
      </tr>
    </thead>
    <tbody>
      {{#items}}
      <tr>
        <td style="border:1px solid #000;padding:3px;text-align:center">{{sn}}</td>
        <td style="border:1px solid #000;padding:3px">{{description}}</td>
        <td style="border:1px solid #000;padding:3px;text-align:center">{{hsn}}</td>
        <td style="border:1px solid #000;padding:3px;text-align:right">{{qty}}</td>
        <td style="border:1px solid #000;padding:3px;text-align:right">{{rate}}</td>
        <td style="border:1px solid #000;padding:3px;text-align:right">{{disc}}</td>
        <td style="border:1px solid #000;padding:3px;text-align:right">{{gst_rate}}</td>
        <td style="border:1px solid #000;padding:3px;text-align:right">{{cgst}}</td>
        <td style="border:1px solid #000;padding:3px;text-align:right">{{sgst}}</td>
        <td style="border:1px solid #000;padding:3px;text-align:right">{{amount}}</td>
      </tr>
      {{/items}}
    </tbody>
  </table>
  <div style="display:flex;justify-content:space-between;border-top:1px solid #000">
    <table style="border-collapse:collapse;font-size:11px;margin:6px">
      <tr>
        <th style="border:1px solid #000;padding:3px">GST%</th>
        <th style="border:1px solid #000;padding:3px">Taxable</th>
        <th style="border:1px solid #000;padding:3px">CGST</th>
        <th style="border:1px solid #000;padding:3px">SGST</th>
      </tr>
      {{#gst_summary}}
      <tr>
        <td style="border:1px solid #000;padding:3px;text-align:center">{{rate}}</td>
        <td style="border:1px solid #000;padding:3px;text-align:right">{{taxable}}</td>
        <td style="border:1px solid #000;padding:3px;text-align:right">{{cgst}}</td>
        <td style="border:1px solid #000;padding:3px;text-align:right">{{sgst}}</td>
      </tr>
      {{/gst_summary}}
    </table>
    <table style="font-size:12px;margin:6px">
      <tr><td>Sub Total</td><td style="text-align:right;padding-left:24px">{{subtotal}}</td></tr>
      <tr><td>Discount</td><td style="text-align:right">{{discount}}</td></tr>
      <tr><td>CGST</td><td style="text-align:right">{{cgst}}</td></tr>
      <tr><td>SGST</td><td style="text-align:right">{{sgst}}</td></tr>
      <tr><td>Round Off</td><td style="text-align:right">{{round_off}}</td></tr>
      <tr><td style="font-weight:bold;font-size:14px;border-top:1px solid #000">Grand Total</td><td style="text-align:right;font-weight:bold;font-size:14px;border-top:1px solid #000">{{total}}</td></tr>
    </table>
  </div>
  <div style="padding:5px 10px;border-top:1px solid #000"><b>Amount in words:</b> {{amount_words}}</div>
  <div style="display:flex;justify-content:space-between;padding:8px 10px;border-top:1px solid #000">
    <div style="font-size:11px;max-width:65%">
      <div><b>Bank:</b> {{bank_name}} &middot; A/c {{account_number}} &middot; IFSC {{ifsc}} &middot; UPI {{upi_id}}</div>
      <div><b>Terms:</b> {{terms}}</div>
      <div>{{footer_note}}</div>
    </div>
    <div style="text-align:center;font-size:11px">For {{seller_name}}<br><br><br>Authorised Signatory</div>
  </div>
</div>`;
