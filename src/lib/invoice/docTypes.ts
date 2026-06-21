export type DocType = 'invoice' | 'quotation' | 'proforma' | 'delivery_challan' | 'credit_note';

export const DOC_TYPES: Record<DocType, { label: string; title: string; prefix: string; short: string }> = {
  invoice:          { label: 'Invoice',          title: 'TAX INVOICE',      prefix: 'INV', short: 'Invoice' },
  quotation:        { label: 'Quotation',        title: 'QUOTATION',        prefix: 'QUO', short: 'Quote' },
  proforma:         { label: 'Proforma Invoice', title: 'PROFORMA INVOICE', prefix: 'PI',  short: 'Proforma' },
  delivery_challan: { label: 'Delivery Challan',  title: 'DELIVERY CHALLAN', prefix: 'DC',  short: 'Challan' },
  credit_note:      { label: 'Credit Note',      title: 'CREDIT NOTE',      prefix: 'CN',  short: 'Credit Note' },
};

export function isDocType(v: string | null | undefined): v is DocType {
  return !!v && v in DOC_TYPES;
}

// Net payment-term presets for the due-date helper.
export const PAYMENT_TERMS = [
  { days: 0, label: 'Due on receipt' },
  { days: 7, label: 'Net 7' },
  { days: 15, label: 'Net 15' },
  { days: 30, label: 'Net 30' },
  { days: 45, label: 'Net 45' },
  { days: 60, label: 'Net 60' },
] as const;

export function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}
