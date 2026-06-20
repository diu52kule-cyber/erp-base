# Professional Gap Audit

Benchmarked against category leaders: **Zoho** (Books/Inventory/CRM/People), **Tally / Busy / Marg / Vyapar**
(Indian accounting), **QuickBooks**, **Petpooja / Posist** (cafe POS), **Odoo / NetSuite / Dynamics** (ERP),
**Linear / Notion / Asana** (workspace), **Productboard**. Goal: serve agencies, distributors, shops,
manufacturers, cafes — at a professional bar.

Legend: ✅ have · 🟡 partial · ❌ missing

---

## A. Cross-cutting — table stakes pros have on *every* screen

These are the details that make software feel professional. Right now most of our list/detail
screens are plain.

**List views (pros: Zoho/Odoo have all of these on every list):**
- 🟡 Search (some) · ❌ column **sort** · ❌ multi-**filter** · ❌ **saved views/segments**
- ❌ **pagination** (we load all rows) · ❌ **bulk select + bulk actions** (delete/status/export)
- ❌ **export** (CSV/Excel/PDF) per list · ❌ column chooser · ❌ density/compact toggle

**Detail views:**
- ❌ **activity timeline / audit history** on the record · ❌ comments · 🟡 attachments (only invoices/employees/PO)
- ❌ **related records** panel · ❌ duplicate/clone · ❌ status-change history · ✅ print/PDF (invoices only)

**Global / platform:**
- 🟡 global search (⌘K navigates pages, not **data**) · 🟡 notifications · ❌ scheduled report emails
- ❌ **audit trail surfaced** (table exists, no UI) · 🟡 keyboard shortcuts (POS only)
- ❌ multi-branch / location switching · ❌ document-number **customization** (prefix/series per branch)
- ❌ fiscal-year handling · 🟡 multi-currency (settings exist; not applied per-transaction end-to-end)
- ❌ undo · ❌ inline validation everywhere · ❌ data backup/export-all

---

## B. Module-by-module deep comparison

### 1. Billing / Invoicing
✅ invoice create (line items, IGST/CGST/SGST, HSN), statuses, numbering, PDF, email, Razorpay, print.
❌ **Estimates/Quotations → convert to invoice** · ❌ **Proforma** · ❌ **Recurring/subscription invoices**
❌ **Credit notes / Debit notes** · ❌ **line & invoice discounts** · ❌ **partial payments + allocation**
❌ **e-Invoice (IRN + signed QR via IRP)** — legally required >₹5cr turnover · ❌ **e-Way bill**
❌ TDS/TCS, cess · ❌ payment terms / late fees · ❌ multiple invoice **templates/branding + logo**
❌ customer **statement / ledger** · ❌ **AR aging** · ❌ multi-currency invoices

### 2. Payments
✅ manual + Razorpay, payment record.
❌ allocate one payment across invoices · ❌ advances/credit balance · ❌ **refunds** · ❌ receipts PDF
❌ **payment reminders** (auto) · ❌ bank reconciliation · ❌ payment links per invoice (have gateway, not link)

### 3. Inventory
✅ products, stock qty, low-stock, stock movements, **barcode + label print**.
❌ **multi-warehouse / locations** · ❌ **batch/lot + expiry** (critical: distributor, pharma, cafe perishables)
❌ **serial numbers** · ❌ **variants** (size/color) · ❌ **bundles/composite/kits**
❌ **stock transfers** between locations · ❌ valuation (FIFO/avg) · ❌ **price lists / tiered pricing**
❌ reorder point → **auto-PO** · ❌ stock audit / cycle count · ❌ UoM conversions · ❌ landed cost

### 4. POS (cafe / shop)
✅ session open/close + float, cart, tender (cash/UPI/card), scanner (Enter & non-Enter), receipt, stock deduct.
❌ **KOT / Kitchen Display (KDS)** · ❌ **table management / floor plan** · ❌ **modifiers/add-ons** (extra cheese)
❌ **combos/meals** · ❌ **split / merge bill** · ❌ hold/park orders · ❌ **discounts/coupons/offers**
❌ happy-hour / time pricing · ❌ **loyalty** · ❌ **Swiggy/Zomato** aggregator orders · ❌ multi-printer routing
❌ customer-facing display · ❌ void/refund with reason + manager PIN · ❌ **Z-report (day-end)** · ❌ **offline mode**

### 5. Purchasing (distributor / manufacturer)
✅ PO (numbered), GRN with stock increment, vendor bill from PO.
❌ PR → **RFQ** → PO flow · ❌ **3-way match** (PO/GRN/bill) · ❌ **vendor ledger + AP aging**
❌ purchase **returns / debit notes** · ❌ landed cost · ❌ batch/expiry on receipt · ❌ vendor price lists

### 6. Manufacturing (manufacturers) — **entire module missing**
❌ **BOM** · ❌ **work / production orders** · ❌ routing / work centers · ❌ **MRP** · ❌ raw-material consumption
❌ finished-goods, scrap, by-products · ❌ **costing** · ❌ subcontracting/job work · ❌ capacity planning

### 7. CRM (agency / distributor / shops)
✅ contacts (lead/customer/vendor), deals (6-stage pipeline), contact→deals.
❌ **activity timeline** (calls/emails/notes/tasks logged) · ❌ **email integration + templates + sequences**
❌ multiple pipelines · ❌ lead **source + scoring** · ❌ **web-to-lead** forms · ❌ **automation/workflows**
❌ quotes from CRM · ❌ territories / assignment rules · ❌ price books · ❌ funnel / win-loss **reports** · ❌ customer 360

### 8. HR / Payroll
✅ employees, attendance sheet, payroll runs, **PF/ESI/PT/TDS compliance**, payslips, Form-16 CSV.
❌ **leave management** (policies, balances, requests, approvals) · ❌ **employee self-service portal**
❌ **shift/roster + overtime** · ❌ loans/advances · ❌ reimbursements · ❌ full-&-final settlement
❌ appraisals/KRA · ❌ recruitment/ATS · ❌ biometric/geo attendance · ❌ holiday calendar

### 9. Accounting — **biggest gap for "real" accounting**
✅ GSTR-1 (B2B/B2CS/B2CL/HSN + CSV), GSTR-3B summary, GST settings, tax split, HSN.
❌ **Double-entry general ledger** · ❌ **chart of accounts** · ❌ **journal entries** · ❌ ledgers per account
❌ **Trial Balance · P&L · Balance Sheet · Cash Flow** · ❌ **bank reconciliation**
❌ **GSTR-2A/2B reconciliation** (purchase matching) · ❌ GSTR-9 · ❌ TDS/TCS returns
❌ cost centers · ❌ fixed assets + depreciation · ❌ **audit trail/edit log** (now mandatory in India)
❌ financial-year close/carry-forward
> We have GST *reporting* but not *accounting*. Tally/Zoho/Busy users expect ledgers + P&L + Balance Sheet.

### 10. Analytics / BI (your explicit ask)
✅ cross-module Reports (revenue chart, HR headcount, CRM pipeline, inventory value, low-stock) + home KPIs.
❌ **date-range / period filters** · ❌ **drill-down** · ❌ **comparison periods** (MoM/YoY)
❌ **custom report builder** · ❌ **scheduled report emails** · ❌ export
❌ **profitability** (by product/customer/project) · ❌ **AR/AP aging** · ❌ **inventory turnover/ageing**
❌ sales **trends/forecasting** · ❌ GST liability dashboard · ❌ cohort/retention · ❌ role-based dashboards
❌ best-seller / dead-stock / rush-hour (in ROADMAP as analytics engine)

### 11. Workspace / Startup OS (where we're actually strong)
✅ Docs, Tasks & Sprints, OKRs, Meetings→tasks, Issues, Releases, Decisions, Check-ins, AI Assistant.
🟡 vs Notion/Linear: ❌ rich block editor · ❌ @mentions/comments/notifications · ❌ list/calendar/timeline views
❌ task dependencies · ❌ recurring tasks · ❌ automation · ❌ read receipts.
> This is a genuine differentiator vs accounting-only competitors — keep investing.

---

## C. Vertical readiness scorecard

| Vertical | Critical needs | Readiness | Top 3 missing |
|---|---|---|---|
| **Cafe / Restaurant** | POS, KOT/KDS, tables, modifiers, aggregators | **~40%** | KDS, table mgmt, modifiers/combos |
| **Retail Shop** | Barcode billing, variants, pricing, loyalty | **~55%** | Variants, price tiers, loyalty |
| **Distributor / Wholesale** | Multi-warehouse, batch/expiry, ledgers, e-way, credit limits, beat/route | **~30%** | Batch/expiry, customer/vendor ledgers, e-way |
| **Manufacturer** | BOM, work orders, MRP, costing | **~10%** | Whole manufacturing module |
| **Agency / Services** | Projects, timesheets, retainers, quotes→invoice, client portal, profitability | **~55%** | Quotes/retainers, client portal, project profitability |

Cross-vertical blocker for all of them: **double-entry accounting + ledgers/P&L/BS** and **list-view UX**.

---

## D. Prioritized path to "fully professional"

**Phase A — Foundations pros assume (do first; unblocks all verticals)**
1. **Double-entry accounting**: chart of accounts, journals, ledgers, Trial Balance, P&L, Balance Sheet, audit trail.
2. **Standard list UX** (one reusable table): search + sort + filter + pagination + bulk actions + export.
3. **Billing depth**: estimates→invoice, recurring, credit/debit notes, discounts, partial payments + allocation.
4. **Ledgers & aging**: customer/vendor statements + AR/AP aging.

**Phase B — Vertical depth**
5. **Inventory**: multi-warehouse, **batch/expiry**, variants, price lists, transfers, valuation.
6. **POS**: KDS, table management, modifiers/combos, discounts, Z-report (+ offline from ROADMAP).
7. **Purchasing**: RFQ + 3-way match + vendor ledger + returns.

**Phase C — Differentiators & compliance**
8. **Analytics/BI**: date filters, drill-down, profitability, aging, custom reports, scheduled emails.
9. **e-Invoice (IRN/QR) + e-Way bill** (compliance for scale).
10. **Manufacturing**: BOM + work orders + costing.
11. **CRM**: activities timeline + email + automation + quotes.

**Phase D — Polish**
12. HR depth (leave, self-service, shifts), multi-branch, customer/vendor portals, audit-trail UI.

> Honest take: we have **broad module coverage and a strong workspace**, but to be "fully professional"
> for accountants/distributors/manufacturers the must-fix is **real double-entry accounting**, **list-view UX**,
> and **inventory depth (batch/multi-warehouse)** — then vertical POS/manufacturing depth and proper analytics.
