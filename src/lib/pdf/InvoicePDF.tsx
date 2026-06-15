import {
  Document, Page, Text, View, StyleSheet, Font,
} from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page:        { padding: 48, fontSize: 10, fontFamily: 'Helvetica', color: '#1a1a1a' },
  header:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
  orgName:     { fontSize: 18, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  orgSub:      { fontSize: 9, color: '#666' },
  invLabel:    { fontSize: 9, color: '#666', textAlign: 'right' },
  invNumber:   { fontSize: 16, fontFamily: 'Helvetica-Bold', textAlign: 'right', marginTop: 4 },
  badge:       { alignSelf: 'flex-end', marginTop: 6, backgroundColor: '#f5f5f5', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText:   { fontSize: 8, textTransform: 'uppercase', color: '#555' },
  section:     { marginBottom: 24 },
  sectionLabel:{ fontSize: 8, textTransform: 'uppercase', letterSpacing: 1, color: '#999', marginBottom: 4 },
  row:         { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  divider:     { borderBottomWidth: 1, borderBottomColor: '#eee', marginVertical: 16 },
  // Table
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#ddd', paddingBottom: 6, marginBottom: 4 },
  tableRow:    { flexDirection: 'row', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  colDesc:     { flex: 3 },
  colNum:      { flex: 1, textAlign: 'right' },
  thText:      { fontSize: 8, color: '#888', fontFamily: 'Helvetica-Bold' },
  // Totals
  totalRow:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  totalLabel:  { color: '#555' },
  grandLabel:  { fontFamily: 'Helvetica-Bold', fontSize: 12 },
  grandValue:  { fontFamily: 'Helvetica-Bold', fontSize: 12 },
  notes:       { marginTop: 32, fontSize: 9, color: '#666' },
  footer:      { position: 'absolute', bottom: 32, left: 48, right: 48, fontSize: 8, color: '#aaa', textAlign: 'center' },
});

function fmt(n: number) {
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type Item = { description: string; quantity: number; unit_price: number; gst_rate: number; gst_amount: number; amount: number; hsn_code?: string };
type InvoiceData = {
  invoice_number: string;
  status: string;
  issue_date: string;
  due_date?: string;
  customer_name: string;
  customer_email?: string;
  customer_gstin?: string;
  billing_address?: string;
  subtotal: number;
  gst_amount: number;
  total: number;
  notes?: string;
  place_of_supply?: string;
  igst_amount?: number;
  cgst_amount?: number;
  sgst_amount?: number;
  items: Item[];
  org: { name: string; gstin?: string; state_code?: string };
};

export default function InvoicePDF({ inv }: { inv: InvoiceData }) {
  const isIGST = (inv.igst_amount ?? 0) > 0;
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.orgName}>{inv.org.name}</Text>
            {inv.org.gstin && <Text style={styles.orgSub}>GSTIN: {inv.org.gstin}</Text>}
          </View>
          <View>
            <Text style={styles.invLabel}>TAX INVOICE</Text>
            <Text style={styles.invNumber}>{inv.invoice_number}</Text>
            <View style={styles.badge}><Text style={styles.badgeText}>{inv.status}</Text></View>
          </View>
        </View>

        {/* Dates + Bill To */}
        <View style={{ flexDirection: 'row', marginBottom: 24, gap: 32 }}>
          <View style={{ flex: 2 }}>
            <Text style={styles.sectionLabel}>Bill To</Text>
            <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 2 }}>{inv.customer_name}</Text>
            {inv.customer_email && <Text style={{ color: '#555', marginBottom: 2 }}>{inv.customer_email}</Text>}
            {inv.customer_gstin && <Text style={{ color: '#555', marginBottom: 2 }}>GSTIN: {inv.customer_gstin}</Text>}
            {inv.billing_address && <Text style={{ color: '#555' }}>{inv.billing_address}</Text>}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionLabel}>Invoice Details</Text>
            <View style={styles.row}>
              <Text style={{ color: '#666' }}>Issue Date</Text>
              <Text>{new Date(inv.issue_date).toLocaleDateString('en-IN')}</Text>
            </View>
            {inv.due_date && (
              <View style={styles.row}>
                <Text style={{ color: '#666' }}>Due Date</Text>
                <Text>{new Date(inv.due_date).toLocaleDateString('en-IN')}</Text>
              </View>
            )}
            {inv.place_of_supply && (
              <View style={styles.row}>
                <Text style={{ color: '#666' }}>Place of Supply</Text>
                <Text>{inv.place_of_supply}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.divider} />

        {/* Line items table */}
        <View style={styles.tableHeader}>
          <Text style={[styles.thText, styles.colDesc]}>Description</Text>
          <Text style={[styles.thText, styles.colNum]}>HSN</Text>
          <Text style={[styles.thText, styles.colNum]}>Qty</Text>
          <Text style={[styles.thText, styles.colNum]}>Rate</Text>
          <Text style={[styles.thText, styles.colNum]}>GST%</Text>
          <Text style={[styles.thText, styles.colNum]}>GST</Text>
          <Text style={[styles.thText, styles.colNum]}>Amount</Text>
        </View>
        {inv.items.map((item, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={styles.colDesc}>{item.description}</Text>
            <Text style={styles.colNum}>{item.hsn_code ?? '—'}</Text>
            <Text style={styles.colNum}>{item.quantity}</Text>
            <Text style={styles.colNum}>{fmt(item.unit_price)}</Text>
            <Text style={styles.colNum}>{item.gst_rate}%</Text>
            <Text style={styles.colNum}>{fmt(item.gst_amount)}</Text>
            <Text style={styles.colNum}>{fmt(item.amount + item.gst_amount)}</Text>
          </View>
        ))}

        <View style={styles.divider} />

        {/* Totals */}
        <View style={{ alignItems: 'flex-end' }}>
          <View style={{ width: 240 }}>
            <View style={styles.totalRow}><Text style={styles.totalLabel}>Subtotal</Text><Text>{fmt(inv.subtotal)}</Text></View>
            {isIGST ? (
              <View style={styles.totalRow}><Text style={styles.totalLabel}>IGST</Text><Text>{fmt(inv.igst_amount ?? 0)}</Text></View>
            ) : (
              <>
                <View style={styles.totalRow}><Text style={styles.totalLabel}>CGST</Text><Text>{fmt(inv.cgst_amount ?? inv.gst_amount / 2)}</Text></View>
                <View style={styles.totalRow}><Text style={styles.totalLabel}>SGST</Text><Text>{fmt(inv.sgst_amount ?? inv.gst_amount / 2)}</Text></View>
              </>
            )}
            <View style={[styles.divider, { marginVertical: 8 }]} />
            <View style={styles.totalRow}><Text style={styles.grandLabel}>Total</Text><Text style={styles.grandValue}>{fmt(inv.total)}</Text></View>
          </View>
        </View>

        {/* Notes */}
        {inv.notes && (
          <View style={styles.notes}>
            <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 4 }}>Notes</Text>
            <Text>{inv.notes}</Text>
          </View>
        )}

        <Text style={styles.footer}>
          {inv.invoice_number} · {inv.org.name} · Generated by ERP Base
        </Text>
      </Page>
    </Document>
  );
}
