export type PaymentMethod = 'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'razorpay';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  upi: 'UPI',
  bank_transfer: 'Bank Transfer',
  cheque: 'Cheque',
  razorpay: 'Online (Razorpay)',
};

export type Payment = {
  id: string;
  org_id: string;
  invoice_id: string | null;
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
  invoiceId?: string;
  amount: number;
  method: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
  paidAt: string;
};
