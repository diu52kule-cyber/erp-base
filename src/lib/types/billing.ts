import type { DocType } from '@/lib/invoice/docTypes';
import type { DiscountType } from '@/lib/invoice/calc';

export const GST_RATES = [0, 5, 12, 18, 28] as const;
export type GstRate = (typeof GST_RATES)[number];

export type InvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'refunded' | 'cancelled';

export type InvoiceItem = {
  id: string;
  invoice_id: string;
  org_id: string;
  description: string;
  hsn_code?: string | null;
  quantity: number;
  unit_price: number;
  gst_rate: number;
  discount_type?: DiscountType;
  discount_value?: number;
  discount_amount?: number;
  amount: number;
  gst_amount: number;
  sort_order: number;
  created_at: string;
};

export type Invoice = {
  id: string;
  org_id: string;
  invoice_number: string;
  doc_type: DocType;
  customer_id?: string | null;
  customer_name: string;
  customer_email: string | null;
  customer_gstin: string | null;
  billing_address: string | null;
  place_of_supply?: string | null;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string | null;
  reference_no?: string | null;
  notes: string | null;
  terms?: string | null;
  currency: string;
  exchange_rate?: number;
  discount_type?: DiscountType;
  discount_value?: number;
  discount_amount?: number;
  round_off?: number;
  amount_paid?: number;
  subtotal: number;
  gst_amount: number;
  igst_amount?: number;
  cgst_amount?: number;
  sgst_amount?: number;
  total: number;
  source_doc_id?: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  invoice_items?: InvoiceItem[];
};

export type CreateInvoiceItemInput = {
  description: string;
  hsn_code?: string | null;
  quantity: number;
  unit_price: number;
  gst_rate: number;
  discount_type?: DiscountType;
  discount_value?: number;
};

export type CreateInvoiceInput = {
  doc_type?: DocType;
  customer_id?: string | null;
  customer_name: string;
  customer_email?: string;
  customer_gstin?: string;
  billing_address?: string;
  place_of_supply?: string;
  issue_date: string;
  due_date?: string;
  reference_no?: string;
  notes?: string;
  terms?: string;
  currency?: string;
  exchange_rate?: number;
  discount_type?: DiscountType;
  discount_value?: number;
  round_off_enabled?: boolean;
  source_doc_id?: string | null;
  items: CreateInvoiceItemInput[];
  payment?: { method: string; amount: number; reference?: string } | null;
};
