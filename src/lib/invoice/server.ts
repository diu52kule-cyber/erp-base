import { deriveSupplyType, splitGst } from '@/lib/types/accounting';
import { computeInvoiceTotals } from './calc';
import type { CreateInvoiceInput } from '@/lib/types/billing';

// Turns validated invoice input + the org's home state code into the exact
// header columns and line rows to persist. Shared by create / edit / convert /
// duplicate / credit-note so every write path computes identical numbers.
export function buildInvoiceComputation(input: CreateInvoiceInput, orgStateCode: string | null) {
  const totals = computeInvoiceTotals(
    input.items.map((i) => ({
      quantity: i.quantity,
      unit_price: i.unit_price,
      gst_rate: i.gst_rate,
      discount_type: i.discount_type,
      discount_value: i.discount_value,
    })),
    {
      discountType: input.discount_type,
      discountValue: input.discount_value,
      roundOffEnabled: input.round_off_enabled,
    },
  );

  const supply_type = deriveSupplyType(input.customer_gstin ?? null, totals.total);
  const placeOfSupply = input.place_of_supply || null;
  const isInterState = !!(orgStateCode && placeOfSupply && orgStateCode !== placeOfSupply);
  const { igst, cgst, sgst } = splitGst(totals.gstTotal, isInterState);

  const header = {
    customer_id: input.customer_id || null,
    customer_name: input.customer_name.trim(),
    customer_email: input.customer_email?.trim() || null,
    customer_gstin: input.customer_gstin?.trim() || null,
    billing_address: input.billing_address?.trim() || null,
    place_of_supply: placeOfSupply,
    supply_type,
    issue_date: input.issue_date,
    due_date: input.due_date || null,
    reference_no: input.reference_no?.trim() || null,
    notes: input.notes?.trim() || null,
    terms: input.terms?.trim() || null,
    currency: input.currency || 'INR',
    exchange_rate: Number(input.exchange_rate) || 1,
    discount_type: input.discount_type || null,
    discount_value: Number(input.discount_value) || 0,
    discount_amount: totals.billDiscountAmount,
    round_off: totals.roundOff,
    subtotal: totals.taxableTotal, // GST taxable base (post line + bill discount)
    gst_amount: totals.gstTotal,
    igst_amount: igst,
    cgst_amount: cgst,
    sgst_amount: sgst,
    total: totals.total,
  };

  const items = input.items.map((it, index) => ({
    description: it.description.trim(),
    hsn_code: it.hsn_code?.toString().trim() || null,
    quantity: it.quantity,
    unit_price: it.unit_price,
    gst_rate: it.gst_rate,
    discount_type: it.discount_type || null,
    discount_value: Number(it.discount_value) || 0,
    discount_amount: totals.lines[index].discount_amount,
    amount: totals.lines[index].amount,
    gst_amount: totals.lines[index].gst_amount,
    sort_order: index,
  }));

  return { header, items, totals };
}

// Re-hydrate a stored invoice row (+ items) back into CreateInvoiceInput,
// used by convert / duplicate / credit-note so they reuse createDocument.
type AnyRow = Record<string, unknown>;
export function invoiceRowToInput(inv: AnyRow, items: AnyRow[]): CreateInvoiceInput {
  const n = (v: unknown) => (v == null ? 0 : Number(v));
  const s = (v: unknown) => (v == null ? undefined : String(v));
  return {
    customer_id: (inv.customer_id as string) ?? null,
    customer_name: String(inv.customer_name ?? ''),
    customer_email: s(inv.customer_email),
    customer_gstin: s(inv.customer_gstin),
    billing_address: s(inv.billing_address),
    place_of_supply: s(inv.place_of_supply),
    issue_date: String(inv.issue_date),
    due_date: s(inv.due_date),
    reference_no: s(inv.reference_no),
    notes: s(inv.notes),
    terms: s(inv.terms),
    currency: String(inv.currency ?? 'INR'),
    exchange_rate: n(inv.exchange_rate) || 1,
    discount_type: (inv.discount_type as 'percent' | 'amount' | null) ?? null,
    discount_value: n(inv.discount_value),
    round_off_enabled: n(inv.round_off) !== 0,
    items: [...items]
      .sort((a, b) => n(a.sort_order) - n(b.sort_order))
      .map((it) => ({
        description: String(it.description ?? ''),
        hsn_code: (it.hsn_code as string) ?? null,
        quantity: n(it.quantity),
        unit_price: n(it.unit_price),
        gst_rate: n(it.gst_rate),
        discount_type: (it.discount_type as 'percent' | 'amount' | null) ?? null,
        discount_value: n(it.discount_value),
      })),
  };
}

export function validateInvoiceInput(input: CreateInvoiceInput): string | null {
  if (!input.customer_name?.trim()) return 'Customer name is required';
  if (!input.items?.length || input.items.some((i) => !i.description.trim())) {
    return 'All line items must have a description';
  }
  return null;
}
