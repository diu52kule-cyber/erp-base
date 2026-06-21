import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { fmtMoney } from '@/lib/invoice/format';
import { amountInWords } from '@/lib/invoice/words';
import { DOC_TYPES, isDocType, type DocType } from '@/lib/invoice/docTypes';

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 9, fontFamily: 'Helvetica', color: '#1a1a1a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  logo: { width: 48, height: 48, marginRight: 10, objectFit: 'contain' },
  orgName: { fontSize: 16, fontFamily: 'Helvetica-Bold', marginBottom: 3 },
  orgSub: { fontSize: 8, color: '#666' },
  invLabel: { fontSize: 8, color: '#666', textAlign: 'right' },
  invTitle: { fontSize: 15, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  invNumber: { fontSize: 10, textAlign: 'right', marginTop: 2, color: '#444' },
  sectionLabel: { fontSize: 7, textTransform: 'uppercase', letterSpacing: 1, color: '#999', marginBottom: 3 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  divider: { borderBottomWidth: 1, borderBottomColor: '#eee', marginVertical: 12 },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#ddd', paddingBottom: 5, marginBottom: 3 },
  tableRow: { flexDirection: 'row', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#f2f2f2' },
  colDesc: { flex: 3 },
  colNum: { flex: 1, textAlign: 'right' },
  thText: { fontSize: 7, color: '#888', fontFamily: 'Helvetica-Bold' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  totalLabel: { color: '#555' },
  grandRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#171717', color: '#fff', paddingVertical: 5, paddingHorizontal: 6, borderRadius: 3, marginTop: 2 },
  grandText: { color: '#fff', fontFamily: 'Helvetica-Bold', fontSize: 11 },
  words: { marginTop: 10, fontSize: 8, fontStyle: 'italic', color: '#555' },
  block: { marginTop: 16, fontSize: 8, color: '#555' },
  footer: { position: 'absolute', bottom: 28, left: 40, right: 40, fontSize: 7, color: '#aaa', textAlign: 'center' },
});

type Item = { description: string; quantity: number; unit_price: number; gst_rate: number; gst_amount: number; amount: number; discount_amount?: number; hsn_code?: string };
type Bank = { show_bank?: boolean; bank_name?: string; account_name?: string; account_number?: string; ifsc?: string; branch?: string; upi_id?: string; logo_url?: string; signature_url?: string };
type InvoiceData = {
  doc_type?: string;
  currency?: string;
  invoice_number: string;
  reference_no?: string;
  status: string;
  issue_date: string;
  due_date?: string;
  customer_name: string;
  customer_email?: string;
  customer_gstin?: string;
  billing_address?: string;
  subtotal: number;
  discount_amount?: number;
  discount_type?: string;
  discount_value?: number;
  round_off?: number;
  amount_paid?: number;
  gst_amount: number;
  total: number;
  notes?: string;
  terms?: string;
  place_of_supply?: string;
  igst_amount?: number;
  cgst_amount?: number;
  sgst_amount?: number;
  items: Item[];
  org: { name: string; gstin?: string; state_code?: string };
  bank?: Bank | null;
  upiQr?: string | null;
};

export default function InvoicePDF({ inv }: { inv: InvoiceData }) {
  const docType: DocType = isDocType(inv.doc_type) ? inv.doc_type : 'invoice';
  const cfg = DOC_TYPES[docType];
  const currency = inv.currency ?? 'INR';
  const m = (n: number) => fmtMoney(n, currency);
  const isIGST = (inv.igst_amount ?? 0) > 0;
  const discountAmt = inv.discount_amount ?? 0;
  const displaySubtotal = (inv.subtotal ?? 0) + discountAmt;
  const roundOff = inv.round_off ?? 0;
  const amountPaid = inv.amount_paid ?? 0;
  const balanceDue = Math.max(0, (inv.total ?? 0) - amountPaid);
  const showDisc = inv.items.some((i) => (i.discount_amount ?? 0) > 0);
  const bank = inv.bank;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row' }}>
            {bank?.logo_url ? <Image src={bank.logo_url} style={styles.logo} /> : null}
            <View>
              <Text style={styles.orgName}>{inv.org.name}</Text>
              {inv.org.gstin ? <Text style={styles.orgSub}>GSTIN: {inv.org.gstin}</Text> : null}
            </View>
          </View>
          <View>
            <Text style={styles.invLabel}>{cfg.title}</Text>
            <Text style={styles.invTitle}>{cfg.short}</Text>
            <Text style={styles.invNumber}>{inv.invoice_number}</Text>
            {inv.reference_no ? <Text style={[styles.invLabel, { marginTop: 2 }]}>Ref: {inv.reference_no}</Text> : null}
          </View>
        </View>

        {/* Bill to + meta */}
        <View style={{ flexDirection: 'row', marginBottom: 16, gap: 24 }}>
          <View style={{ flex: 2 }}>
            <Text style={styles.sectionLabel}>{docType === 'credit_note' ? 'Credit To' : 'Bill To'}</Text>
            <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 2 }}>{inv.customer_name}</Text>
            {inv.customer_email ? <Text style={{ color: '#555', marginBottom: 1 }}>{inv.customer_email}</Text> : null}
            {inv.customer_gstin ? <Text style={{ color: '#555', marginBottom: 1 }}>GSTIN: {inv.customer_gstin}</Text> : null}
            {inv.billing_address ? <Text style={{ color: '#555' }}>{inv.billing_address}</Text> : null}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionLabel}>Details</Text>
            <View style={styles.row}><Text style={{ color: '#666' }}>Date</Text><Text>{new Date(inv.issue_date).toLocaleDateString('en-IN')}</Text></View>
            {inv.due_date ? <View style={styles.row}><Text style={{ color: '#666' }}>{docType === 'quotation' ? 'Valid Until' : 'Due'}</Text><Text>{new Date(inv.due_date).toLocaleDateString('en-IN')}</Text></View> : null}
            {inv.place_of_supply ? <View style={styles.row}><Text style={{ color: '#666' }}>Place of Supply</Text><Text>{inv.place_of_supply}</Text></View> : null}
            {currency !== 'INR' ? <View style={styles.row}><Text style={{ color: '#666' }}>Currency</Text><Text>{currency}</Text></View> : null}
          </View>
        </View>

        {/* Items */}
        <View style={styles.tableHeader}>
          <Text style={[styles.thText, styles.colDesc]}>Description</Text>
          <Text style={[styles.thText, styles.colNum]}>HSN</Text>
          <Text style={[styles.thText, styles.colNum]}>Qty</Text>
          <Text style={[styles.thText, styles.colNum]}>Rate</Text>
          {showDisc ? <Text style={[styles.thText, styles.colNum]}>Disc</Text> : null}
          <Text style={[styles.thText, styles.colNum]}>GST%</Text>
          <Text style={[styles.thText, styles.colNum]}>GST</Text>
          <Text style={[styles.thText, styles.colNum]}>Amount</Text>
        </View>
        {inv.items.map((item, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={styles.colDesc}>{item.description}</Text>
            <Text style={styles.colNum}>{item.hsn_code ?? '—'}</Text>
            <Text style={styles.colNum}>{item.quantity}</Text>
            <Text style={styles.colNum}>{m(item.unit_price)}</Text>
            {showDisc ? <Text style={styles.colNum}>{(item.discount_amount ?? 0) > 0 ? m(item.discount_amount ?? 0) : '—'}</Text> : null}
            <Text style={styles.colNum}>{item.gst_rate}%</Text>
            <Text style={styles.colNum}>{m(item.gst_amount)}</Text>
            <Text style={styles.colNum}>{m(item.amount + item.gst_amount)}</Text>
          </View>
        ))}

        <View style={styles.divider} />

        {/* Totals */}
        <View style={{ alignItems: 'flex-end' }}>
          <View style={{ width: 240 }}>
            <View style={styles.totalRow}><Text style={styles.totalLabel}>Subtotal</Text><Text>{m(displaySubtotal)}</Text></View>
            {discountAmt > 0 ? <View style={styles.totalRow}><Text style={styles.totalLabel}>Discount{inv.discount_type === 'percent' ? ` (${inv.discount_value}%)` : ''}</Text><Text>- {m(discountAmt)}</Text></View> : null}
            {isIGST ? (
              <View style={styles.totalRow}><Text style={styles.totalLabel}>IGST</Text><Text>{m(inv.igst_amount ?? 0)}</Text></View>
            ) : (
              <>
                <View style={styles.totalRow}><Text style={styles.totalLabel}>CGST</Text><Text>{m(inv.cgst_amount ?? inv.gst_amount / 2)}</Text></View>
                <View style={styles.totalRow}><Text style={styles.totalLabel}>SGST</Text><Text>{m(inv.sgst_amount ?? inv.gst_amount / 2)}</Text></View>
              </>
            )}
            {roundOff !== 0 ? <View style={styles.totalRow}><Text style={styles.totalLabel}>Round Off</Text><Text>{roundOff >= 0 ? '+' : '-'} {m(Math.abs(roundOff))}</Text></View> : null}
            <View style={styles.grandRow}><Text style={styles.grandText}>Total</Text><Text style={styles.grandText}>{m(inv.total)}</Text></View>
            {docType === 'invoice' && amountPaid > 0 ? (
              <>
                <View style={[styles.totalRow, { marginTop: 4 }]}><Text style={{ color: '#15803d' }}>Paid</Text><Text style={{ color: '#15803d' }}>- {m(amountPaid)}</Text></View>
                <View style={styles.totalRow}><Text style={{ color: '#b45309', fontFamily: 'Helvetica-Bold' }}>Balance Due</Text><Text style={{ color: '#b45309', fontFamily: 'Helvetica-Bold' }}>{m(balanceDue)}</Text></View>
              </>
            ) : null}
          </View>
        </View>

        <Text style={styles.words}>Amount in words: {amountInWords(inv.total, currency)}</Text>

        {/* Bank + UPI + Notes/Terms */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, gap: 24 }}>
          <View style={{ flex: 2 }}>
            {docType === 'invoice' && bank?.show_bank && (bank.account_number || bank.bank_name) ? (
              <View style={styles.block}>
                <Text style={styles.sectionLabel}>Bank Details</Text>
                {bank.bank_name ? <Text>{bank.bank_name}{bank.branch ? ` · ${bank.branch}` : ''}</Text> : null}
                {bank.account_name ? <Text>A/c Name: {bank.account_name}</Text> : null}
                {bank.account_number ? <Text>A/c No: {bank.account_number}</Text> : null}
                {bank.ifsc ? <Text>IFSC: {bank.ifsc}</Text> : null}
                {bank.upi_id ? <Text>UPI: {bank.upi_id}</Text> : null}
              </View>
            ) : null}
            {inv.notes ? <View style={styles.block}><Text style={styles.sectionLabel}>Notes</Text><Text>{inv.notes}</Text></View> : null}
            {inv.terms ? <View style={styles.block}><Text style={styles.sectionLabel}>Terms & Conditions</Text><Text>{inv.terms}</Text></View> : null}
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            {inv.upiQr ? <Image src={inv.upiQr} style={{ width: 90, height: 90 }} /> : null}
            {inv.upiQr ? <Text style={{ fontSize: 7, color: '#999', marginTop: 2 }}>Scan to pay via UPI</Text> : null}
            {bank?.signature_url ? <Image src={bank.signature_url} style={{ width: 90, height: 44, marginTop: 12, objectFit: 'contain' }} /> : null}
            {bank?.signature_url ? <Text style={{ fontSize: 7, color: '#999' }}>Authorised Signatory</Text> : null}
          </View>
        </View>

        <Text style={styles.footer}>{inv.invoice_number} · {inv.org.name}</Text>
      </Page>
    </Document>
  );
}
