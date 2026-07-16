import type { SupabaseClient } from '@supabase/supabase-js';
import type { DocType } from './docTypes';

type StockItem = { product_id?: string | null; quantity: number };

// Applies the inventory side-effect of a billing document:
//   invoice      -> a sale, reduces stock
//   credit_note  -> a sales return, increases stock
//   quote / proforma / delivery_challan -> never touch inventory
//
// `direction: 'apply'` performs the effect; `'reverse'` undoes it (used when a
// document is edited, voided or deleted so stock stays consistent). Only lines
// linked to a product (product_id) move stock; free-text lines are ignored.
// Failures are swallowed — inventory is an optional module and a product may
// have been removed; billing must never break because of a stock write.
export async function applyStockForDoc(
  supabase: SupabaseClient,
  orgId: string,
  userId: string | null,
  docType: DocType,
  docNumber: string,
  items: StockItem[],
  direction: 'apply' | 'reverse' = 'apply',
): Promise<void> {
  const base = docType === 'invoice' ? -1 : docType === 'credit_note' ? 1 : 0;
  if (base === 0) return;
  const sign = direction === 'reverse' ? -base : base;
  const label = docType === 'credit_note' ? 'Credit Note' : 'Invoice';

  for (const it of items) {
    const pid = it.product_id;
    const qty = Number(it.quantity) || 0;
    if (!pid || qty <= 0) continue;
    const delta = sign * qty;
    if (delta === 0) continue;
    try {
      await supabase.rpc('adjust_stock', { p_product_id: pid, p_org_id: orgId, p_delta: delta });
      await supabase.from('stock_movements').insert({
        org_id: orgId,
        product_id: pid,
        type: delta < 0 ? 'out' : 'in',
        quantity: Math.abs(delta),
        notes: `${label} ${docNumber}${direction === 'reverse' ? ' (reversed)' : ''}`,
        created_by: userId,
      });
    } catch { /* inventory optional — never block billing */ }
  }
}
