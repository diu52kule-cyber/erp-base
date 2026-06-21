-- 0029_payment_methods.sql
-- Widen the payments.method CHECK constraint to support card payments and
-- "credit / udhaar" (a sale recorded on the customer's account, not received).
-- Credit entries are NOT marked as completed receipts — they keep the invoice
-- outstanding and drive the customer's credit ledger receivable instead.

alter table payments drop constraint if exists payments_method_check;

alter table payments
  add constraint payments_method_check
  check (method in ('cash','upi','card','bank_transfer','cheque','razorpay','credit'));
