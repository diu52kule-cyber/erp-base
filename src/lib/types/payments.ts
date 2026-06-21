export type PaymentMethod = 'cash' | 'upi' | 'card' | 'bank_transfer' | 'cheque' | 'razorpay' | 'credit';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type PaymentType = 'invoice' | 'advance' | 'refund';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  upi: 'UPI',
  card: 'Card',
  bank_transfer: 'Bank Transfer',
  cheque: 'Cheque',
  razorpay: 'Online (Razorpay)',
  credit: 'Credit / Udhaar',
};

export type PaymentAllocation = {
  invoiceId: string;
  amount: number;
};

export type Payment = {
  id: string;
  org_id: string;
  invoice_id: string | null;
  contact_id: string | null;
  payment_type: PaymentType;
  refund_of_payment_id: string | null;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  gateway_order_id: string | null;
  gateway_payment_id: string | null;
  reference_number: string | null;
  notes: string | null;
  paid_at: string;
  created_by: string | null;
  created_at: string;
};

export type RecordPaymentInput = {
  paymentType?: PaymentType;
  invoiceId?: string;
  contactId?: string;
  allocations?: PaymentAllocation[];
  refundOfPaymentId?: string;
  amount: number;
  method: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
  paidAt: string;
};
