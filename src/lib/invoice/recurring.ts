import type { SupabaseClient } from '@supabase/supabase-js';
import type { CreateInvoiceInput } from '@/lib/types/billing';
import { createDocument } from './create';

export type RecurringItem = {
  description: string;
  hsn_code?: string | null;
  quantity: number;
  unit_price: number;
  gst_rate: number;
  discount_pct?: number;
};

export const FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
] as const;

export function advanceDate(iso: string, frequency: string, interval: number): string {
  const d = new Date(iso + 'T00:00:00');
  const n = Math.max(1, interval || 1);
  if (frequency === 'daily') d.setDate(d.getDate() + n);
  else if (frequency === 'weekly') d.setDate(d.getDate() + 7 * n);
  else if (frequency === 'monthly') d.setMonth(d.getMonth() + n);
  else if (frequency === 'quarterly') d.setMonth(d.getMonth() + 3 * n);
  else if (frequency === 'yearly') d.setFullYear(d.getFullYear() + n);
  return d.toISOString().split('T')[0];
}

// Build an invoice input from a recurring template row.
export function recurringToInput(r: Record<string, unknown>): CreateInvoiceInput {
  const rawItems = Array.isArray(r.items) ? (r.items as RecurringItem[]) : [];
  return {
    customer_id: (r.customer_id as string) ?? null,
    customer_name: String(r.customer_name ?? ''),
    customer_email: (r.customer_email as string) ?? undefined,
    customer_gstin: (r.customer_gstin as string) ?? undefined,
    billing_address: (r.billing_address as string) ?? undefined,
    place_of_supply: (r.place_of_supply as string) ?? undefined,
    issue_date: new Date().toISOString().split('T')[0],
    notes: (r.notes as string) ?? undefined,
    terms: (r.terms as string) ?? undefined,
    currency: String(r.currency ?? 'INR'),
    discount_type: (r.discount_type as 'percent' | 'amount' | null) ?? null,
    discount_value: Number(r.discount_value) || 0,
    round_off_enabled: true,
    items: rawItems.map((it) => ({
      description: it.description,
      hsn_code: it.hsn_code ?? null,
      quantity: Number(it.quantity) || 0,
      unit_price: Number(it.unit_price) || 0,
      gst_rate: Number(it.gst_rate) || 0,
      discount_type: (it.discount_pct ?? 0) > 0 ? 'percent' : null,
      discount_value: Number(it.discount_pct) || 0,
    })),
  };
}

// Generate one invoice from a recurring template, then roll its schedule forward.
export async function runRecurring(
  supabase: SupabaseClient,
  row: Record<string, unknown>,
  orgStateCode: string | null,
  hasLedger: boolean,
): Promise<{ id: string } | { error: string }> {
  const input = recurringToInput(row);
  const res = await createDocument(
    supabase,
    { orgId: String(row.org_id), userId: (row.created_by as string) ?? null, hasLedger, orgStateCode },
    input,
    'invoice',
  );
  if ('error' in res) return res;

  const today = new Date().toISOString().split('T')[0];
  const next = advanceDate(String(row.next_run_date ?? today), String(row.frequency), Number(row.interval_count) || 1);
  const ended = !!row.end_date && next > String(row.end_date);
  await supabase
    .from('recurring_invoices')
    .update({ last_run_date: today, next_run_date: next, status: ended ? 'ended' : 'active' })
    .eq('id', row.id as string);

  return { id: res.id };
}
