# ARCHITECTURE — Visual structure of the ERP platform

> Living reference. All future structural changes must fit this map.
> Legend:  ✅ built  ·  🔜 planned  ·  ⚙️ convention/pattern  ·  🚧 partial

---

## 1. System overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                  │
│  Browser (back-office)  ·  Counter tablet 🔜  ·  Kitchen TV 🔜        │
│  Mobile (Expo, separate project) 🔜  ·  PWA (installable) 🔜          │
└───────────────────────────────┬──────────────────────────────────────┘
                                 │  HTTPS
┌───────────────────────────────▼──────────────────────────────────────┐
│              NEXT.JS 14 APP (App Router, TypeScript, one repo)        │
│                                                                        │
│  middleware.ts ──► session refresh + /dashboard protection             │
│       │                                                                │
│       ├─ Server Components (pages)  ── getOrgContext() gate ✅         │
│       ├─ API routes (/api/**)       ── all mutations live here ⚙️      │
│       └─ Client Components          ── forms, POS, team workspace ✅   │
│                                                                        │
│  lib/  modules.ts · entitlements.ts · adminAuth.ts · supabase/*        │
│        types/roles.ts (25 roles) · invoice/* · types/crm,billing…     │
└───────────────────────────────┬──────────────────────────────────────┘
                                 │  @supabase/ssr  +  service-role admin
┌───────────────────────────────▼──────────────────────────────────────┐
│                       SUPABASE (Postgres + Auth + Storage)            │
│  Auth (users)  ·  Row-Level Security (tenant isolation)  ·  Storage   │
│  RLS keyed on is_org_member(org_id) for EVERY tenant table ⚙️          │
│  Realtime subscriptions for team activity feed 🔜                     │
└────────────────────────────────────────────────────────────────────────┘

Deploy: Vercel (Dockerfile, Next.js standalone) → erp-base-eight.vercel.app ✅
```

---

## 2. The access model — THREE planes

Access = intersection of three independent gates. This is the spine of every page guard.

```
  PLANE 1: TENANT / PLAN           PLANE 2: ROLE                PLANE 3: SCREEN
  "What did the business buy?"     "What is this person?"       "What UI are they on?"
  ──────────────────────────       ──────────────────           ────────────────────
  entitlements (per-org modules) ∩ memberships.role      =     dashboard page / station 🔜
  org_plans.status                 ROLE_MODULES map ✅
  (trial / active / locked)

       ✅ ENFORCED                   ✅ UI + 🔜 DB-level          ✅ dashboard
```

### Plane 1 — Tenant / Plan ✅
`getOrgContext()` ([src/lib/entitlements.ts](src/lib/entitlements.ts)) returns:
```typescript
{
  user:           { id, email }
  org:            { id, role, name, business_type } | null
  enabledModules: Set<string>   // from entitlements table
  plan:           { plan_name, status, amount, billing_period, next_billing_date }
  access:         'active' | 'trial' | 'locked'
  trialDaysLeft:  number | null
}
```
- `enabledModules` seeded from `BUSINESS_PRESETS[business_type]` at onboarding.
- `access = 'locked'` → every dashboard page redirects to `/locked` paywall.
- Wrapped in `React cache()` — one DB round-trip per server render.

### Plane 2 — Role ✅ (UI) · 🔜 (DB-level via 0026)
25 roles across 7 groups ([src/lib/types/roles.ts](src/lib/types/roles.ts)):

| Group | Roles |
|-------|-------|
| Leadership | owner, admin, manager |
| Business | accountant, hr, sales, marketing, operations, support |
| Product & Tech | product_manager, developer, designer, qa, devops, data_analyst |
| Growth | customer_success, business_dev, content_creator |
| Retail & Ops | store_manager, cashier, warehouse, procurement |
| Food & Beverage | chef |
| Access | staff, viewer |

- **Permission logic:** Effective modules = `org.enabledModules ∩ ROLE_MODULES[role]`. Owner/admin/manager = unrestricted.
- **Job title:** Free-text `memberships.job_title` field for display ("Head Chef", "Senior DevOps"). Separate from permission role.
- **DB-level RLS (run 0026):** `has_module_access(org_id, module)` replaces permissive policies. Until 0026 runs, UI hiding is the only gate.

### Plane 3 — Screen ✅ (dashboard) · 🔜 (station)
- **Dashboard pages** — back-office, full sidebar chrome, one per module.
- **Station screens** 🔜 — full-screen, no sidebar, per device role (POS counter, KDS kitchen).
- **Guest access** 🔜 — `is_guest=true` on membership + per-guest module whitelist.

---

## 3. Route map

```
PUBLIC (no auth)
  /                        landing page
  /login  /signup          Supabase auth (signup via admin client, email auto-confirmed) ✅
  /invite/[token]          accept team invite (7-day, single-use token) ✅
  /pay/[invoice_id]        client payment portal (Razorpay, no login) 🔜 Wave D1
  /employee/[token]        employee self-service (view payslip, submit leave) 🔜 Wave D14

ONBOARDING (auth, no org yet)
  /onboarding              3-step wizard → org + 7-day trial + preset entitlements ✅

PAYWALL (auth, org locked)
  /locked                  trial expired → Razorpay pay + WhatsApp/QR contact ✅

DASHBOARD — gated by getOrgContext() (enabledModules ∩ ROLE_MODULES[role])

  BUSINESS GROUP ✅
  /dashboard                          tailored home (KPIs + quick actions by business type)
  /dashboard/billing      /[id] /new  invoices, quotations, proformas, delivery challans,
                                      credit notes, recurring, edit/void/duplicate/convert ✅
  /dashboard/billing/[id]/credit-note credit note creation ✅
  /dashboard/billing/recurring        recurring invoice list + new ✅
  /dashboard/payments     /new        payments (manual + Razorpay) ✅
  /dashboard/ledger       /[id]       credit/udhaar ledger per contact ✅
  /dashboard/inventory    /[id] /new  products, batch tracking, barcode labels,
                                      stock adjuster with negative-stock warning ✅
  /dashboard/pos          /sessions/[id]  POS (session, cart, tender, receipt) ✅
  /dashboard/purchase     /[id] /new  purchase orders (full status flow, GRN, vendor bill) ✅
  /dashboard/purchase/advances        vendor advances ✅
  /dashboard/crm                      contacts (tags, lead source, duplicate detection,
                                      activity timeline, WhatsApp/email quick actions) ✅
  /dashboard/crm/contacts/[id]        contact detail + linked deals + activity + archive ✅
  /dashboard/crm/deals    /[id] /new  deal pipeline (6 stages, comments) ✅
  /dashboard/hr                       HR hub ✅
  /dashboard/hr/employees /[id] /new  employee profiles + attachments + archive ✅
  /dashboard/hr/attendance            daily attendance sheet + punch times + overtime ✅
  /dashboard/hr/payroll   /[id] /new  payroll runs + PF/ESI/PT/TDS breakdown + payslips ✅
  /dashboard/hr/payroll/compliance    statutory settings (PF/ESI/PT/TDS) ✅
  /dashboard/hr/payroll/[id]/payslip  printable payslip ✅
  /dashboard/hr/leaves                leave management (types, requests, approve/reject) ✅
  /dashboard/hr/holidays              holiday calendar ✅
  /dashboard/hr/loans                 employee loans/advances ✅
  /dashboard/subscriptions /[id] /new subscription plans + customer subscriptions + MRR ✅
  /dashboard/expenses                 expense claims (submit/approve/reject/reimburse) ✅
  /dashboard/accounting               GST & accounting hub ✅
  /dashboard/accounting/gstr1         GSTR-1 (B2B/B2CS/B2CL/HSN + CSV export) ✅
  /dashboard/accounting/gstr3b        GSTR-3B summary ✅
  /dashboard/accounting/settings      GST settings (GSTIN, state code, filing period) ✅
  /dashboard/accounting/trial-balance Trial Balance (derived + journal adjustments) ✅
  /dashboard/accounting/pnl           P&L Statement (FY selector) ✅
  /dashboard/accounting/balance-sheet Balance Sheet (Assets / Liabilities / Equity) ✅
  /dashboard/accounting/journals      Journal Entries (Chart of Accounts, double-entry) ✅
  /dashboard/accounting/tds           TDS payable/receivable ledger ✅
  /dashboard/reports                  cross-module dashboard ✅
  /dashboard/import                   CSV wizard (contacts, products, employees) ✅

  WORKSPACE GROUP ✅
  /dashboard/projects     /[id] /new  projects (kanban, time tracking, budget) ✅
  /dashboard/docs         /[id]       docs & KB (templates, version history) ✅
  /dashboard/tasks                    tasks & sprints (kanban, sprint board) ✅
  /dashboard/goals                    goals & OKRs (key results) ✅
  /dashboard/features                 product pipeline (feature backlog) ✅
  /dashboard/meetings     /[id]       meeting notes + action items → tasks ✅
  /dashboard/issues                   issue tracker (bug reports) ✅
  /dashboard/releases                 release log ✅
  /dashboard/decisions                decision log ✅
  /dashboard/checkins                 daily check-ins / standups ✅
  /dashboard/assistant                AI assistant (ANTHROPIC_API_KEY) ✅
  /dashboard/teams                    team directory (grouped by department) ✅
  /dashboard/teams/[id]               team workspace (members, roles, quick links) ✅
  /dashboard/teams/[id]/board         team kanban 🔜 Wave C6
  /dashboard/teams/[id]/calendar      team calendar 🔜 Wave C7

  SETTINGS ✅ (role-gated tabs)
  /dashboard/settings/preferences     font/size/theme (localStorage, future: synced)
  /dashboard/settings/business        business type switcher
  /dashboard/settings/team            team members (invite, role, remove)
  /dashboard/settings/departments     departments + teams (create, manage, link)  ✅
  /dashboard/settings/invoice         invoice settings (logo/bank/UPI/signature/T&C)
  /dashboard/settings/currencies      exchange rate settings
  /dashboard/settings/api             API key management
  /dashboard/settings/webhooks        outbound webhook subscriptions
  /dashboard/settings/audit           audit log viewer (50/page, table filter, diffs) ✅
  /dashboard/settings/automations     workflow rules (trigger → action) 🔜 Wave C5

STATION SCREENS 🔜 Wave G5 (auth + role, full-screen, no sidebar)
  /station/pos             cashier (move existing POS here)
  /station/kds             kitchen display (Supabase Realtime order queue)
  /station/display         customer "order ready" board

ADMIN — operator only (HMAC cookie erp_admin_session, separate from Supabase auth)
  /admin/login             username + password, rate-limited, timing-safe ✅
  /admin/clients /[id]     manage orgs: plan, status, modules, MRR ✅
  /admin/settings          platform billing contact (WhatsApp / UPI / QR) ✅

PUBLIC PAY / EMPLOYEE SELF-SERVICE 🔜
  /pay/[invoice_id]        customer pay invoice (no login, Razorpay) Wave D1
  /employee/[token]        employee portal (payslip, leave, attendance) Wave D14

API  /api/**  (⚙️ all mutations; Bearer for /api/v1/*; admin cookie for /api/admin/*)
  AUTH       /api/auth/signup  /signout  /forgot
  BILLING    /api/invoices  /[id]  /[id]/status  /[id]/email  /[id]/pdf
             /[id]/duplicate  /[id]/convert  /[id]/credit-note
             /api/recurring  /[id]  /[id]/generate
             /api/cron/recurring  (Vercel cron, CRON_SECRET)
  PAYMENTS   /api/payments  /[id]/refund
             /api/payments/razorpay/create-order  /webhook
  INVENTORY  /api/products  /[id]  /[id]/stock  /[id]/batches
  POS        /api/pos/sessions  /[id]  /[id]/cash  /api/pos/orders
  PURCHASE   /api/purchase-orders  /[id]  /[id]/receive  /[id]/bill
             /api/purchase-returns  /api/vendor-advances  /api/landed-costs
  CRM        /api/contacts  /[id]  /api/deals  /[id]/stage
             /api/contact-activities  /[id]
  HR         /api/employees  /api/attendance
             /api/payroll  /[id]  /api/hr/form16  /api/hr/statutory-settings
             /api/leaves  /[id]  /api/leave-types  /api/holidays
             /api/employee-loans
  SUBSCRIPT  /api/subscriptions  /[id]  /api/subscription-plans
             /api/billing/subscription/create-order
  EXPENSES   /api/expenses  /[id]
  ACCOUNTING /api/accounting/journals  /gstr1  /gstr2  /gstr3b
             /api/accounting/settings  /tds  /export
  WORKSPACE  /api/projects  /[id]  /[id]/tasks  /[id]/time
             /api/tasks  /[id]  /api/docs  /[id]  /api/goals  /api/key-results
             /api/features  /api/meetings  /[id]  /api/action-items
             /api/issues  /[id]  /api/releases  /api/decisions  /api/checkins
             /api/sprints  /api/assistant
  TEAMS      /api/departments  /[id]              ✅
             /api/teams  /[id]  /[id]/members     ✅
             /api/comments  /[id]                 ✅
  CROSS-CUT  /api/global-search  /api/archive  /api/attachments  /[id]
             /api/notifications  /api/ledger
  SETTINGS   /api/settings/team  /[userId]  /api/settings/invites/[token]
             /api/settings/api-keys  /api/settings/webhooks
             /api/settings/invoice  /api/settings/payment-gateway
             /api/settings/business-type  /api/currencies
  REST v1    /api/v1/invoices  /contacts  /products  (Bearer auth)
  ADMIN API  /api/admin/auth/login  /logout
             /api/admin/orgs  /[id]  /api/admin/settings
  ONBOARDING /api/onboarding
```

---

## 4. Two separate auth systems ⚙️

```
         USER AUTH (tenants)                      ADMIN AUTH (operator)
         ──────────────────                       ─────────────────────
  who    business owners + employees              platform operator (you)
  store  Supabase Auth (cookie via @supabase/ssr) erp_admin_session (HMAC cookie)
  creds  email + password                         ADMIN_USERNAME/PASSWORD/SECRET (env)
  guard  middleware → /dashboard, /locked          middleware → /admin/* (not /admin/login)
  code   lib/supabase/*                            lib/adminAuth.ts
  hard.  rate-limit 🔜                              rate-limit + timing-safe compare ✅
```
They never mix: admin needs no Supabase account; tenant never sees /admin.

---

## 5. Trial & billing lifecycle ✅

```
  signup ──► onboarding ──► TRIAL (7 days, full access)
                                │
             trialDaysLeft≤3  warning banner in dashboard
                                │ next_billing_date passes
                                ▼
                            LOCKED ──redirect──► /locked (paywall)
                                                    │
                       ┌────────────────────────────┼────────────────┐
                       ▼                             ▼                 ▼
             Razorpay "Pay & reactivate"   WhatsApp button + QR  UPI / email
                       │ payment.captured webhook (kind=subscription)
                       ▼
                    ACTIVE  (next_billing_date = today + billing_period)
                       ▲
       Admin sets amount/status/next_billing_date in /admin/clients/[id]
       (suspended / cancelled → also LOCKED)
```

---

## 6. Screen strategy — station vs dashboard 🔜 Wave G5

```
                   ┌──────── pos_orders / pos_order_lines ────────┐
                   │             (shared data)                      │
      WRITES ▼                                             ▼ READS + updates
 ┌──────────────────────┐  order events (Realtime)  ┌──────────────────────────┐
 │  /station/pos         │ ──────────────────────►   │  /station/kds            │
 │  cashier · counter    │                            │  kitchen · marks ready   │
 │  grid + cart + tender │                            │  new → preparing → ready │
 └──────────────────────┘                            └──────────────────────────┘
      role: cashier / staff                               role: chef / kitchen
 needs: kitchen_status column on pos_orders (migration)

Device sign-in options 🔜:
  • kiosk login (device pinned to one screen)
  • staff 4-digit PIN (fast switching + attribution)
```

---

## 7. Module + entitlement pattern ⚙️

```
modules table (catalog)  ──FK──  entitlements (org_id, module_key, enabled)
       ▲                                   ▲
  MODULES registry               BUSINESS_PRESETS[business_type]
  (src/lib/modules.ts)           seeded at onboarding; admin can override
  26 modules total:
  BUSINESS: billing, payments, ledger, inventory, pos, purchase,
            crm, hr, subscriptions, expenses, accounting, reports, import
  WORKSPACE: projects, docs, tasks, goals, features, meetings,
             issues, releases, decisions, checkins, assistant, teams

To add a module:
  ① INSERT INTO modules (key, name, description)   (migration)
  ② Add to MODULES[] in src/lib/modules.ts
  ③ Add to BUSINESS_PRESETS for relevant business types
  ④ Add to ROLE_MODULES for roles that should access it
  ⑤ Create /dashboard/<key>/page.tsx with getOrgContext guard
  ⑥ Tenant tables WITH RLS via is_org_member(org_id)
```

---

## 8. Data model (grouped by domain)

```
TENANCY / ACCESS
  organizations          id, name, business_type, gstin, state_code
  memberships            org_id, user_id, role (25 choices), job_title, department_id, invited_by, accepted_at
  org_invites            org_id, email, token, role, expires_at, used_at
  modules                key PK, name, description
  entitlements           org_id, module_key, enabled
  org_plans              org_id, plan_name, status, amount, billing_period, next_billing_date
  platform_settings      key PK, value (admin-configurable: WhatsApp, UPI, QR)

PEOPLE / TEAMS (new ✅)
  departments            id, org_id, name, description, color
  teams                  id, org_id, department_id?, name, description, color, focus_area
  team_memberships       id, team_id, user_id, org_id, is_lead, joined_at

COLLABORATION (new ✅)
  comments               id, org_id, entity_type, entity_id, body, mentions[], created_by, created_at
  announcements          id, team_id, body, pinned, created_by  🔜 Wave C8

BILLING / DOCUMENTS
  invoices               id, org_id, doc_type (invoice/quotation/proforma/delivery_challan/credit_note),
                         customer_name, contact_id?, invoice_number, issue_date, due_date,
                         currency, subtotal, discount_amount, gst_amount, round_off, total,
                         amount_paid, status, recurring_invoice_id?, igst/cgst/sgst, terms,
                         reference_no, amount_in_words, linked_invoice_id (for credit notes)
  invoice_items          id, invoice_id, description, hsn_code, qty, unit_price, discount_pct,
                         gst_rate, igst/cgst/sgst_amount, amount, sort_order
  recurring_invoices     id, org_id, template (invoice snapshot), frequency, next_run_date, active
  org_invoice_settings   org_id (PK), bank_name, account_no, ifsc, upi_id, logo_url, signature_url,
                         terms, round_off, due_days

PAYMENTS
  payments               id, org_id, invoice_id?, amount, payment_method, payment_date, reference_no,
                         contact_id?, notes
  payment_methods        (enum on payments): cash, upi, card, bank_transfer, cheque, credit/udhaar

CREDIT / LEDGER
  ledger_entries         id, org_id, contact_id, type (debit/credit), amount, description, ref_id, ref_type

INVENTORY
  products               id, org_id, name, sku, barcode, category, brand, unit, selling_price,
                         cost_price, gst_rate, tax_inclusive, stock_qty, low_stock_threshold,
                         reorder_qty, is_active, archived_at
  stock_movements        id, org_id, product_id, type (in/out/adjustment), quantity, notes
  product_batches        id, org_id, product_id, batch_no, expiry_date, qty, cost_price

POS
  pos_sessions           id, org_id, opened_at, closed_at, opening_float, closing_float, status
  pos_orders             id, org_id, session_id, order_number, total, payment_method, created_at
                         kitchen_status (new→preparing→ready) 🔜 Wave G5
  pos_order_lines        id, order_id, product_id, product_name, qty, unit_price, total
  pos_qr_orders          🔜 Wave D10

PURCHASE
  purchase_orders        id, org_id, po_number, vendor_id, status (draft→sent→partial→received→billed),
                         order_date, expected_date, total_amount, notes
  po_items               id, po_id, product_id, description, qty, unit_price, received_qty, gst_rate, amount
  purchase_returns       id, org_id, po_id, return_date, reason, items (jsonb), total  ✅
  vendor_advances        id, org_id, vendor_id (contact), amount, date, notes, adjusted_on_bill_id?  ✅
  landed_costs           id, org_id, po_id, cost_type, amount, allocated_to (jsonb)  ✅

CRM
  contacts               id, org_id, name, company, email, phone, type (lead/customer/vendor),
                         tags[], lead_source, opening_balance, archived_at
  deals                  id, org_id, contact_id, title, value, stage (6 stages), notes, archived_at
  contact_activities     id, org_id, contact_id, type (call/email/meeting/note/task),
                         summary, linked_id?, created_by, created_at  ✅

HR / PAYROLL
  employees              id, org_id, name, email, phone, designation, department, joining_date,
                         basic_salary, uan, pan, pf_applicable, esi_applicable, status, archived_at
  attendance             id, org_id, employee_id, date, status (present/absent/half-day/leave/holiday),
                         in_time, out_time, hours_worked, overtime_hours  ✅
  payroll_runs           id, org_id, month, status, total_gross, total_deductions, total_net
  payroll_entries        id, run_id, employee_id, basic, hra, allowances, gross, pf_employee,
                         pf_employer, esi_employee, esi_employer, pt, tds, total_deductions, net_pay
  statutory_settings     org_id PK, pt_state, pf_applicable, esi_applicable
  leave_types            id, org_id, name, days_per_year, carry_forward  ✅
  leave_requests         id, org_id, employee_id, leave_type_id, from_date, to_date, days,
                         status (pending/approved/rejected/cancelled), reason, approved_by  ✅
  holidays               id, org_id, name, date, type (national/regional/optional)  ✅
  employee_loans         id, org_id, employee_id, amount, issued_date, emi_amount,
                         outstanding_balance, status  ✅

SUBSCRIPTIONS
  subscription_plans     id, org_id, name, amount, billing_period, features (jsonb)
  customer_subscriptions id, org_id, contact_id, plan_id, status, start_date, next_billing_date, mrr

EXPENSES
  expense_categories     id, org_id, name
  expense_claims         id, org_id, employee_id, category_id, amount, description, claim_date,
                         status (submitted/approved/rejected/reimbursed), receipt_url

MULTI-CURRENCY
  currencies             code PK, name, symbol, decimal_places (10 seeded)
  org_currency_settings  org_id, currency_code, exchange_rate, is_default

ACCOUNTING (new ✅)
  chart_of_accounts      id, org_id, code, name, type (asset/liability/equity/income/expense),
                         is_default, parent_id?  (29 defaults seeded)
  journal_entries        id, org_id, ref_number, description, entry_date, created_by
  journal_entry_lines    id, entry_id, account_id, description, debit, credit
                         CONSTRAINT: debit>0 OR credit>0; entry must balance (sum debit = sum credit)
  tds_entries            id, org_id, party_name, section (194A/C/H/I/J/192/B/D/EE/G),
                         gross_amount, tds_amount, type (payable/receivable), status (pending/deposited),
                         challan_no?, deposited_date?

WORKSPACE (Startup OS)
  docs                   id, org_id, title, content, template_id?, created_by
  doc_versions           id, doc_id, content, created_by, created_at
  sprints                id, org_id, name, goal, start_date, end_date, status
  tasks                  id, org_id, title, description, status, priority, assignee_id?,
                         sprint_id?, project_id?, feature_id?, labels[], due_date
  task_links             🔜 Wave C4 (id, task_id, entity_type, entity_id)
  time_entries           id, org_id, project_id, task_id?, user_id, hours, minutes, billable, date
  features               id, org_id, title, description, status, priority, votes
  goals                  id, org_id, title, description, owner_id, period, status
  key_results            id, goal_id, title, target_value, current_value, unit
  meetings               id, org_id, title, date, attendees[], notes, created_by
  action_items           id, meeting_id, task_id (linked), description, assignee_id, due_date
  issues                 id, org_id, title, description, status, severity, assignee_id, reporter_id
  releases               id, org_id, version, title, description, release_date, status
  decisions              id, org_id, title, context, decision, owner_id, date
  checkins               id, org_id, user_id, date, did, doing, blockers

PLATFORM / INTEGRATIONS
  api_keys               id, org_id, name, key_hash (SHA-256), prefix, last_used_at, revoked_at
  webhooks               id, org_id, url, events[], signing_secret, active
  notifications          id, org_id, user_id, title, body, href?, read_at, created_at
  audit_log              id, org_id, user_id, table_name, record_id, action, old_data, new_data, created_at
  attachments            id, org_id, entity_type, entity_id, file_name, file_path, file_size, created_by

AUTOMATIONS 🔜 Wave C5
  workflow_rules         id, org_id, name, trigger_type, trigger_condition jsonb,
                         action_type, action_config jsonb, active

LOYALTY 🔜 Wave D11 / F4
  loyalty_accounts       id, org_id, contact_id, points_balance
  loyalty_transactions   id, org_id, account_id, points, type (earn/redeem), ref_id, ref_type

BOM / RECIPE 🔜 Wave D7 / F1
  bill_of_materials      id, org_id, product_id (finished), component_id (raw material), qty, unit

MULTI-OUTLET 🔜 Wave F2
  outlets                id, org_id, name, address, gst_state_code
  outlet_memberships     outlet_id, user_id, is_manager

⚙️  Every tenant table: org_id uuid → organizations(id), RLS ON, policy via is_org_member(org_id)
```

---

## 9. The Grand Plan — build waves

See CLAUDE.md for the full detailed plan. Summary:

```
Wave A — Security & Hardening (NOW — blocks scale)
  A1 Run 0026_rls_by_role.sql  (DB-level role enforcement)
  A2 Trial-lock in RLS
  A3 Invite email-match guard
  A4 AI usage metering + per-org caps
  A5 Preferences sync (DB, not localStorage)

Wave B — Cross-cutting UX (highest daily-use impact, every screen)
  B1 Bulk actions (select → delete/status/export) on all list pages
  B2 Column sorting on every table header
  B3 CSV/Excel export on every list
  B4 Archive/restore on ALL entities (add archived_at to employees, tasks, POs, meetings)
  B5 Dashboard date-range filter
  B6 Document number customization (prefix, start, per-FY reset)
  B7 Per-org date/number/currency formatting
  B8 Credit limit warning at invoice/POS entry
  B9 Stock availability warning on invoice line items
  B10 Undo last action (30-second toast)
  B11 Inline editing on list rows
  B12 Expand global search (tasks, POs, docs, meetings)

Wave C — Workspace Richness (beat Notion/Linear/Slack for SMBs)
  C1 @mentions → notifications (parse @name in comments → bell)
  C2 Comments on PO, task, meeting, expense, project detail
  C3 Team activity feed (audit_log filtered to team members, Realtime)
  C4 Linked records (task → invoice/deal/PO card preview)
  C5 Simple automations (workflow_rules: trigger → action)
  C6 Team kanban board per team workspace
  C7 Shared team calendar (meetings + leave + deadlines)
  C8 Announcement board (pinned posts per team)
  C9 Guest access (is_guest + per-guest module whitelist)
  C10 Comment reactions (👍 ✅ 👀)

Wave D — Business Module Depth (close the gap vs Zoho/Tally/Petpooja)
  D1 Client payment portal (/pay/[invoice_id], Razorpay, no login)
  D2 Auto overdue invoice reminders (Resend + cron)
  D3 Product variants (size/colour/flavour without cloning)
  D4 Bank reconciliation (import CSV → match payments)
  D5 Opening balances + FY close
  D6 Outstanding ageing report (0-30/31-60/61-90/90+ days)
  D7 BOM / recipe management
  D8 POS table management (cafe/restaurant)
  D9 POS offline mode (PWA + IndexedDB + sync)
  D10 QR code ordering (customer scans → order → KDS)
  D11 Customer loyalty points
  D12 Sales forecasting (weighted pipeline)
  D13 Shift scheduling / roster
  D14 Employee self-service portal

Wave E — Integrations (Indian business ecosystem)
  E1 Tally XML export (biggest adoption blocker for SMBs)
  E2 WhatsApp Business API (2-way, Meta WABA)
  E3 SMS gateway (MSG91/Gupshup)
  E4 Google Calendar sync
  E5 Shopify/WooCommerce order sync
  E6 Shiprocket/Delhivery shipping
  E7 GSP auto-IRN filing
  E8 Bank statement auto-import
  E9 ONDC seller integration

Wave F — Vertical Depth (sector-specific modules)
  F1 Manufacturing: BOM, production orders, QC, subcontracting
  F2 Multi-outlet: outlet P&L, inter-outlet stock transfer, central purchasing
  F3 Cafe enhanced: tables + KDS + QR (D8/D9/D10 packaged)
  F4 Retail loyalty: loyalty + gift cards + price books + promotions
  F5-F7 Education, Healthcare, Real estate (deferred verticals)

Wave G — Platform & Analytics
  G1 Custom report builder (drag-and-drop columns, schedule email)
  G2 Analytics upgrade (drill-down, MoM/YoY, cohort, LTV, cash flow forecast)
  G3 PWA (installable, offline check-ins + tasks + POS)
  G4 AI upgrades (per-org context, weekly digest, suggested actions)
  G5 Station screens (/station/pos, /station/kds, staff PIN)
  G6 Mobile app (Expo, separate project)
  G7 Pricing tiers (Starter/Growth/Business/Enterprise)
```

---

## 10. Key invariants (never break these)

```
1. getOrgContext() is the single source of truth for auth + access.
   Every server page and API route must call it and check the result.

2. Every tenant table has org_id + RLS. No exceptions.
   Effective access = DB RLS (is_org_member) ∩ UI (ROLE_MODULES) ∩ entitlements.

3. SUPABASE_SERVICE_ROLE_KEY is server-only. Never in env.example. Never in client code.

4. All mutations go through API routes (/api/**). No server actions.
   Navigation after mutation: window.location.href, never router.push().

5. createClient() (server Supabase client) is synchronous. Do NOT await it.
   Supabase PostgrestFilterBuilder has no .catch() — use try/catch.

6. Modules are additive. New verticals plug in via the 6-step module pattern.
   Never hardcode business-type assumptions in core tables or shared logic.

7. Migration files are append-only. Never edit 0001_init.sql.
   Each new migration is sequentially numbered: 0041_, 0042_, …

8. Role permission = ROLE_MODULES[role] in code (UI gate) + RLS policy (DB gate, run 0026).
   The code gate protects the UI. The DB gate protects the data. Both must agree.
```
