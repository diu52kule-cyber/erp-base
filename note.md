A. Sales & Invoicing (most-used screen, most gaps)
The Invoice type today has only: customer fields, dates, notes, subtotal, gst, total. That's thin. Missing:

No Edit invoice. There's only a status route — once saved, you cannot fix a typo, wrong price, or wrong customer. Scenario: you fat-finger ₹500 as ₹5000 — your only option is leave it wrong.
No Delete / Void / Cancel. Status enum has cancelled but no UI/route to set it, and no reversal of stock/ledger. Scenario: customer cancels order after invoicing.
No line-item or bill-level discount. No discount field anywhere. Scenario: "give 10% off" or "₹50 off" — impossible without faking the unit price.
No partial-payment tracking on the invoice. We now mark it sent if partial, but there's no amount_paid / balance_due column — so the detail page can't show "₹2,000 of ₹5,900 paid, ₹3,900 due." (This is the exact follow-up I offered.)
No "Amount in words." Indian invoices conventionally print "Rupees Five Thousand Nine Hundred only."
No round-off line. GST math leaves paise; real invoices round to nearest ₹1 with a round-off line.
No bank details / UPI QR on the invoice. Customer gets a PDF with no way to pay. Scenario: "how do I pay you?" → no account number, no UPI QR.
No company logo / letterhead / signature / Terms & Conditions block.
No quotation / estimate → convert to invoice. Distributors and agencies quote first. Scenario: send a quote, client approves, re-type everything as an invoice.
No recurring invoices. Subscriptions module exists but normal "bill this client ₹X every month" auto-invoice doesn't.
No credit note / sales return. Scenario: customer returns goods — no way to issue a credit note and reverse GST + stock + ledger.
No delivery challan / proforma / e-way bill / e-invoice (IRN). Distributors moving goods >₹50k legally need e-way bills.
No currency on the invoice. You have a Currencies module, but Invoice has no currency field — every invoice is implicitly INR. Scenario: agency billing a US client in USD.
No "Save & New" / "Save & Print" / duplicate-invoice buttons (re-billing a repeat customer means full re-entry).
No default due-date terms (Net 15/30) or place-of-supply auto-filled from the customer's state.
B. Payments & Receivables
No refund recording. Status enum has refunded but no flow.
No advance / on-account payment. Record Payment needs an invoice to tie to a customer/ledger (no contact picker). Scenario: customer pays ₹10k advance before any invoice.
No allocation across invoices. Customer pays ₹15k against 3 bills — can't split one payment across them.
No overpayment / change handling outside POS.
No automatic payment reminders for overdue invoices (no due/overdue email or WhatsApp nudge).
C. Inventory / Products
The Product has only selling_price, stock_qty, unit, gst_rate. Missing:

No Edit product, no Delete, no product detail page. Only Add + a +/− stock adjuster. Scenario: price changes — you can't update it.
No cost / purchase price. Only selling price exists → no profit/margin anywhere. Scenario: "how much did I make on this?" is unanswerable.
No category / brand / tax-inclusive pricing toggle. Cafes price MRP-inclusive; can't represent it.
No reorder quantity (only a low-stock threshold) and no purchase suggestion from it.
No batch / lot / expiry. Critical for cafes, pharma, FMCG distributors. Scenario: milk expiring tomorrow — no FEFO, no expiry alert.
No serial numbers, no variants (size/color/flavour), no multi-unit (buy in box, sell in pcs).
No multi-warehouse / stock transfer, no negative-stock guard, no stock valuation (FIFO/avg), no opening-stock value (only qty).
D. POS
No hold / park bill. Scenario: customer steps away to grab one more item, next customer waits — can't park the cart.
No returns / refund at POS.
No per-item or bill discount, no split tender (₹200 cash + ₹300 UPI on one bill).
No customer attach to a POS sale → POS sales don't reach CRM, ledger, or loyalty.
No reprint last receipt, no cash in/out during a session, no variance reason on close.
No KOT/KDS, no table/dine-in (cafe-specific).
E. Purchases / Vendors
(Migration 0008 still un-run, so the whole module is dark in production.)
No purchase return / debit note, no vendor advance, no landed cost (freight/duty into item cost).
F. CRM
Contacts have edit/delete, deals have a pipeline — but: no follow-up reminders / activity timeline / notes log, no tasks on a contact, no tags / lead source, no "email/WhatsApp this contact" button, no duplicate detection, no opening balance when creating a customer (so historical udhaar can't be entered).
G. HR / Payroll
No leave management, no holiday calendar, no shifts, no overtime, no in/out punch times (attendance is a single present/absent), no employee loans/advances, no link from approved expense → payroll reimbursement.
H. Accounting / Tax
GSTR-1/2/3B exist, but no double-entry core → no Trial Balance, P&L, or Balance Sheet (this is the big AUDIT Phase A). No TDS payable/receivable ledger, no financial-year close, no opening balances.
I. Cross-cutting — the "every screen" small things
These show up on every list and are what makes it feel like real software:

No search box / filters / sorting / pagination on most lists (they silently cap at 100 rows).
No bulk actions (select many → delete / change status / export).
No export to CSV/Excel on lists (import exists; export barely).
Inconsistent Edit/Delete — many entities are create-only.
No archive / soft-delete + restore, no undo.
No audit-trail UI — the audit_log table exists but nothing surfaces "who changed what."
No document-number customization (prefix, starting number, per-FY reset).
No per-org number/date/currency formatting actually applied to documents.
No global search (⌘K searches nav, not your invoices/customers/products).
No dashboard date-range filter; no negative-stock or over-credit-limit warnings at point of entry.