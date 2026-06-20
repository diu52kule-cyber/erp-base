export const GST_RATES = [0, 5, 12, 18, 28] as const;
export type GstRate = (typeof GST_RATES)[number];

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'cancelled';

export type InvoiceItem = {
  id: string;
  invoice_id: string;
  org_id: string;
  description: string;
  hsn_code?: string | null;
  quantity: number;
  unit_price: number;
  gst_rate: number;
  amount: number;
  gst_amount: number;
  sort_order: number;
  created_at: string;
};

export type Invoice = {
  id: string;
  org_id: string;
  invoice_number: string;
  customer_name: string;
  customer_email: string | null;
  customer_gstin: string | null;
  billing_address: string | null;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string | null;
  notes: string | null;
  subtotal: number;
  gst_amount: number;
  total: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  invoice_items?: InvoiceItem[];
};

export type CreateInvoiceInput = {
  customer_name: string;
  customer_email?: string;
  customer_gstin?: string;
  billing_address?: string;
  issue_date: string;
  due_date?: string;
  notes?: string;
  items: {
    description: string;
    quantity: number;
    unit_price: number;
    gst_rate: number;
  }[];
};
