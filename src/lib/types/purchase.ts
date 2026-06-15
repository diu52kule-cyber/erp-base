export type POStatus = 'draft' | 'sent' | 'partial' | 'received' | 'billed' | 'cancelled';
export type VendorBillStatus = 'received' | 'paid' | 'cancelled';

export const PO_STATUS_LABELS: Record<POStatus, string> = {
  draft:     'Draft',
  sent:      'Sent to Vendor',
  partial:   'Partially Received',
  received:  'Fully Received',
  billed:    'Billed',
  cancelled: 'Cancelled',
};

export const PO_STATUS_COLORS: Record<POStatus, string> = {
  draft:     'bg-neutral-100 text-neutral-600',
  sent:      'bg-blue-50 text-blue-700',
  partial:   'bg-amber-50 text-amber-700',
  received:  'bg-green-50 text-green-700',
  billed:    'bg-purple-50 text-purple-700',
  cancelled: 'bg-red-50 text-red-600',
};

export const PO_STATUS_TRANSITIONS: Record<POStatus, POStatus[]> = {
  draft:     ['sent', 'cancelled'],
  sent:      ['cancelled'],
  partial:   ['cancelled'],
  received:  [],
  billed:    [],
  cancelled: [],
};

export const BILL_STATUS_LABELS: Record<VendorBillStatus, string> = {
  received:  'Received',
  paid:      'Paid',
  cancelled: 'Cancelled',
};

export const BILL_STATUS_COLORS: Record<VendorBillStatus, string> = {
  received:  'bg-amber-50 text-amber-700',
  paid:      'bg-green-50 text-green-700',
  cancelled: 'bg-neutral-100 text-neutral-500',
};

export type POLine = {
  id: string;
  po_id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  received_qty: number;
  unit_price: number;
  gst_rate: number;
  amount: number;
  gst_amount: number;
  sort_order: number;
};

export type PurchaseOrder = {
  id: string;
  org_id: string;
  po_number: string;
  vendor_id: string | null;
  vendor_name: string;
  vendor_gstin: string | null;
  billing_address: string | null;
  status: POStatus;
  issue_date: string;
  expected_delivery: string | null;
  notes: string | null;
  subtotal: number;
  gst_amount: number;
  total: number;
  created_at: string;
};

export type VendorBill = {
  id: string;
  org_id: string;
  po_id: string | null;
  bill_number: string | null;
  vendor_name: string;
  vendor_gstin: string | null;
  bill_date: string;
  due_date: string | null;
  subtotal: number;
  gst_amount: number;
  total: number;
  status: VendorBillStatus;
  notes: string | null;
};
