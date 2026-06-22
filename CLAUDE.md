# CLAUDE.md — Project context for Claude Code

This file orients Claude Code on this project. Read it before making changes.

## What this is
A modular, multi-tenant business-management SaaS — a focused, best-in-class alternative to
Odoo/Zoho/Tally for Indian SMBs: cafes, shops, malls, startups, freelancers, and general
businesses. Customers subscribe to a tailored set of modules; the platform enables only what
each customer's plan includes. The goal is to be the **best ERP for Indian SMBs** — not just
feature-complete, but genuinely better than competitors in UX, Indian compliance, and
integrated workspace collaboration.

## Hard constraints (do not violate)
- **Single system / modular monolith.** One repo, one app. Do NOT split into
  microservices or separate frontend/backend repos.
- **No branching.** Trunk-based development on `main` only. Dokploy deploys from
  `main` (a mismatch throws "Branch Not Match"). Do not create long-lived branches.
- **Deploy target is Vercel** via the root `Dockerfile` (Next.js standalone output).
- **Multi-tenancy is enforced by Postgres RLS in Supabase**, never only in app code.
  Every tenant-scoped table must have RLS policies keyed on org membership.
- **No hardcoded business-type assumptions in the core.** New verticals (e.g. a
  future education/school module) must slot in via the module + entitlement
  pattern without changing the foundation.
- **SUPABASE_SERVICE_ROLE_KEY** must NEVER go in `.env.example` — only in `.env.local`
  (gitignored) and Vercel environment variables. It is server-only.

## Stack
- Next.js 14 (App Router, TypeScript) — frontend + server in one system
- Supabase: Postgres + Auth + Row-Level Security
- Tailwind CSS + dark mode (`darkMode: "class"`)
- Docker (multi-stage, `output: 'standalone'`)

## Commands
- `npm install` — install deps
- `npm run dev` — local dev at http://localhost:3000
- `npm run build` — production build (must pass before considering work done)
- Env: copy `.env.example` to `.env.local`; needs `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
- DB migrations: SQL files in `supabase/migrations/`, run in the Supabase SQL Editor.

## Architecture (key files)
- `ARCHITECTURE.md` — **visual structure of the whole app** (access planes, route map,
  auth systems, billing lifecycle, screen strategy, data model, grand plan build waves).
  Read it first; all structural changes should fit this map.
- `supabase/migrations/0001_init.sql` — tenants (`organizations`), `memberships`,
  the sellable-feature catalog (`modules`), per-tenant `entitlements`, RLS policies,
  and the `create_organization` RPC.
- `src/lib/supabase/{client,server,middleware}.ts` — Supabase clients (browser,
  server component, middleware) using `@supabase/ssr`.
- `src/lib/supabase/admin.ts` — service-role admin client for server-only operations.
- `src/middleware.ts` — refreshes session, protects `/dashboard`.
- `src/lib/modules.ts` — registry mapping module keys to dashboard nav entries + presets.
- `src/lib/entitlements.ts` — `getOrgContext()` returns the current user, their org,
  the set of enabled module keys, plan, access state, and trial days left.
- `src/lib/types/roles.ts` — 25 roles, ROLE_MODULES map, ROLE_GROUPS, color/label/description.
- `src/lib/invoice/*` — shared invoice math (totals, GST split, words, UPI, doc types).
- `src/app/dashboard/layout.tsx` — sidebar with ThemeToggle; shows only entitled modules.
- `src/components/ThemeToggle.tsx` — dark/light mode toggle, persists to localStorage.
- `src/components/Comments.tsx` — reusable polymorphic comment thread (entityType + entityId).
- `src/components/ArchiveButton.tsx` — archive/restore any entity via `/api/archive`.
- `src/app/api/auth/signup/route.ts` — server-side signup via admin client.
- `src/app/api/global-search/route.ts` — debounced ⌘K search across invoices/contacts/products.
- `src/app/api/comments/route.ts` — GET/POST comments by entity_type + entity_id.
- `src/app/api/departments/route.ts` — CRUD for org departments.
- `src/app/api/teams/route.ts` + `/[id]/members/route.ts` — CRUD for teams + membership.

## How to add a module (the core pattern)
1. Add a row to the `modules` table (new migration): `INSERT INTO modules (key, name, description) VALUES (...)`.
2. Add an entry to `MODULES` in `src/lib/modules.ts` and update `BUSINESS_PRESETS` as needed.
3. Create `src/app/dashboard/<key>/page.tsx` and guard it:
   `const ctx = await getOrgContext(); if (!ctx?.enabledModules.has("<key>") || !ctx.org) redirect("/dashboard");`
4. Add tenant-scoped tables WITH RLS policies keyed on `is_org_member(org_id)`.
5. Add the module key to `ROLE_MODULES` entries in `src/lib/types/roles.ts` for every role that should see it.

## Conventions
- New DB changes go in a new numbered file in `supabase/migrations/` (never edit 0001).
- Every tenant table: `org_id uuid references organizations(id)`, RLS enabled,
  select/insert/update/delete policies via `is_org_member(org_id)`.
- API routes (`route.ts`) not server actions — avoids RSC streaming issues.
- Navigation after mutations: `window.location.href` or `window.location.reload()`,
  NOT `router.push()` (causes fetch-hang in some contexts).
- Keep public env vars prefixed `NEXT_PUBLIC_` (baked at build; also set as Vercel build args).
- Run `npm run build` and fix all type errors before finishing a task.
- Page entitlement guard must also check `!ctx.org` to satisfy TypeScript null checks.
- Supabase `PostgrestFilterBuilder` does NOT have `.catch()` — always use `try/catch` wrappers.
- New tables from not-yet-run migrations: wrap queries in `try/catch` so the app doesn't break.
- `createClient()` (server) — do NOT `await` it; call synchronously.

---

## Completed phases

- [x] **Phase 0** — Foundation: auth, multi-tenant + RLS, entitlement engine, dashboard
  shell, Docker/Vercel deploy, dark mode toggle.
- [x] **Phase 1** — Billing: invoice create/list/detail, GST line items, status flow
  (draft → sent → paid), invoice numbering (INV-YYYY-NNNN).
- [x] **Phase 2** — Payments (bypass/manual mode) + Inventory (products, stock
  adjustments, low-stock alerts).
- [x] **Phase 3** — CRM: contacts (lead/customer/vendor), deals pipeline (6 stages),
  contact detail with linked deals.
- [x] **Phase 4** — HR: employees, daily attendance sheet, payroll runs with
  pro-rated salary calculation.
- [x] **Phase 5** — Subscription Manager: plan builder, customer subscriptions,
  MRR tracking, status transitions.
- [x] **Phase 6** — Data Import: CSV wizard for contacts, products, employees.
- [x] **Phase 7** — Reports: cross-module dashboard (revenue chart, HR headcount,
  CRM pipeline, inventory value + low-stock alerts).
- [x] **Phase 8** — GST & Accounting: GSTR-1 (B2B/B2CS/B2CL/HSN tabs + CSV export),
  GSTR-3B summary, org GST settings (GSTIN, state code, filing period), HSN codes
  on invoice line items, IGST/CGST/SGST auto-split.
- [x] **Phase 9** — Purchase Orders: PO create (PO-YYYY-NNNN), status flow
  (draft→sent→partial→received→billed), GRN recording with auto inventory increment,
  vendor bill creation from received PO.
- [x] **Phase 10** — User Roles & Team Invites: roles (owner/manager/staff/accountant/hr),
  invite link flow (7-day token, single-use), Settings → Team page (list, invite, change role,
  remove), role badge in sidebar, `/invite/[token]` public acceptance page.
  Migration: `0009_roles.sql`. All modules granted to all orgs via `0010_grant_all_modules.sql`.
- [x] **Phase 11** — Payroll Compliance: PF (12%+12% capped at ₹15k basic), ESI (0.75%+3.25%
  on gross ≤₹21k), Professional Tax (state-wise slabs: MH/KA/TS/AP/TN/WB/MP), TDS on salary
  (new regime slabs + 87A rebate + 4% cess). Statutory settings page, per-run deduction
  breakdown table, printable payslips (earnings/deductions/employer cost), Form 16 CSV export.
  Migration: `0011_payroll_compliance.sql`.
- [x] **Phase 12** — Document Attachments & PDF Export: PDF invoice generation via
  `@react-pdf/renderer` (A4, GST-compliant layout with IGST/CGST/SGST split), email invoice
  PDF via Resend, file attachments (Supabase Storage) on invoices/employees/purchase orders
  with upload/view/delete panel. New env vars: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`.
  Migration: `0012_attachments.sql` + create Supabase Storage bucket `attachments` (private).
- [x] **Phase 13** — Point of Sale (POS): session-based (open/close with cash float), product
  grid + cart, tender screen (cash/UPI/card + change calc), receipt summary, auto stock deduction,
  session history. Migration: `0013_pos.sql` — `pos_sessions`, `pos_orders`, `pos_order_lines`,
  `next_pos_order_number` RPC.
- [x] **Phase 14** — Razorpay Payment Gateway: create Razorpay order from invoice detail,
  HMAC-verified webhook marks invoice paid + creates payment record. Settings → Payment Gateway
  page to store key/secret. Env vars: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`,
  `RAZORPAY_WEBHOOK_SECRET`.
- [x] **Phase 15** — Notifications & Audit Log: in-app notification bell with unread badge,
  mark-all-read, notification dropdown. `notifications` + `audit_log` tables with RLS.
  Migration: `0014_notifications.sql`.
- [x] **Phase 16** — Projects & Timesheet: project list with progress bars, Kanban board
  (todo/in_progress/review/done), time logging panel (hours+minutes, billable flag), project
  detail with budget tracker. Migration: `0015_projects.sql` — `projects`, `tasks`,
  `time_entries`.
- [x] **Phase 17** — Expense Management: expense claims (submit/approve/reject/reimburse),
  category picker, stats tiles (total / pending / approved / pending amount), manager approval
  actions. Migration: `0016_expenses.sql` — `expense_categories`, `expense_claims`.
- [x] **Phase 18** — Multi-currency: 10 currencies seeded (INR, USD, EUR, GBP, AED, SGD, AUD,
  CAD, JPY, CNY), per-org exchange rate settings, Settings → Currencies page.
  Migration: `0017_currencies.sql` — `currencies`, `org_currency_settings`.
- [x] **Phase 19** — API & Webhooks: API key generation (SHA-256 hashed, `erpk_` prefix),
  revoke/list UI, `/api/v1/{invoices,contacts,products}` REST endpoints with Bearer auth,
  webhook subscriptions (url + events + signing secret). Settings sub-nav (Team / Currencies /
  API Keys / Webhooks). Migration: `0018_api_keys.sql` — `api_keys`, `webhooks`.
- [x] **Phase 20** — Admin panel & onboarding: separate operator admin auth (HMAC cookie
  `erp_admin_session`, `ADMIN_USERNAME/PASSWORD/SECRET`, rate-limited + timing-safe), `/admin`
  clients list + per-client plan/module management, 3-step onboarding wizard with 7-day trial.
  Migrations: `0019_admin_plans.sql` (`org_plans`), `0020_onboarding.sql`.
- [x] **Phase 21** — Business presets, trial paywall & subscription billing: per-business-type
  module presets seeded at onboarding; entitlements read from DB; `getOrgContext` returns
  `plan`/`access` (active/trial/locked) and is wrapped in React `cache()`; hard-lock paywall at
  `/locked` with Razorpay "pay & reactivate" + WhatsApp/QR contact; subscription webhook
  reactivates the org; Admin → Settings platform billing contact. Tailored dashboard home.
  Migrations: `0021_platform_billing.sql` (`platform_settings`), `0022_modules_sync.sql`.
- [x] **Phase 22** — Startup OS (Workspace modules): Docs & KB (templates + version history),
  Tasks & Sprints (kanban), Goals/OKRs, Product Pipeline (`features`), Meetings (+ action items →
  tasks), Issues, Releases, Decision Log, Daily Check-ins, AI Assistant (`/api/assistant`,
  RLS-scoped snapshot → Claude, needs `ANTHROPIC_API_KEY`). Nav grouped Business/Workspace.
  Migration: `0023_startup_os.sql`.
- [x] **Phase 23** — RBAC, settings & preferences: 14 roles (`owner/admin/manager/accountant/
  hr/sales/marketing/developer/designer/support/operations/cashier/staff/viewer`); `ROLE_MODULES`
  map intersected with org entitlements in `getOrgContext` (UI-level gating); role-gated Settings
  tabs + owner/admin enforcement on API-key/webhook routes; app Preferences (font/size/theme via
  localStorage). Migration: `0024_more_roles.sql` (widen role CHECK constraints).
- [x] **Phase 24** — Credit/Udhaar payments + professional invoicing overhaul (AUDIT section A).
  Payment methods gained Card + Credit/Udhaar; "record payment while invoicing" on the New Invoice
  form; full document engine on the `invoices` table via `doc_type`
  (`invoice/quotation/proforma/delivery_challan/credit_note`) with per-line + bill discounts,
  round-off, partial-payment tracking (`amount_paid`/balance due), multi-currency, terms, reference
  no., amount-in-words; **Edit / Void-Delete** (ledger re-synced), **Duplicate**, **Convert
  quote/proforma → invoice**, **Credit Note** (sales return, reverses receivable); **Recurring
  invoices** (`recurring_invoices` + daily Vercel cron `/api/cron/recurring`, needs `CRON_SECRET`);
  Settings → **Invoice settings** (`org_invoice_settings`: bank/UPI/logo/signature/T&C/round-off/
  due-days) shown on detail + PDF incl. **UPI QR** (new dep `qrcode`); **e-Invoice (IRN)** + **e-Way
  bill** portal JSON export (offline; auto-IRN still needs a GSP API). Shared math in
  `src/lib/invoice/*`. All sales/GST/revenue queries now filter `doc_type='invoice'`.
  Migrations: `0029_payment_methods.sql`, `0030_invoicing_pro.sql`.
- [x] **Phase 25** — Purchase Pro (AUDIT section E): purchase returns / debit notes, vendor
  advances (track advance paid → adjust on vendor bill), landed costs (allocate freight/customs
  across PO lines). Migration: `0035_purchase_pro.sql`.
- [x] **Phase 26** — CRM Pro (AUDIT section F): contact activity timeline (call/email/meeting/
  note/task entries with timestamps), WhatsApp quick-action (click-to-chat), email quick-action,
  contact tags (multi-select), lead source tracking, contact opening balance, duplicate detection
  (same name+phone or email flagged on create). Migration: `0036_crm_pro.sql`.
- [x] **Phase 27** — HR/Payroll Pro (AUDIT section G): leave management (leave types, leave
  requests, approve/reject/cancel, balance tracking), holiday calendar (org-specific + national
  holidays, counts excluded from leave calc), in/out punch times on attendance (in_time/out_time,
  hours worked, overtime), employee loans/advances (issue → deduct from payroll). Migration:
  `0037_hr_pro.sql` — `leave_types`, `leave_requests`, `holidays`, `employee_loans`.
- [x] **Phase 28** — Accounting Core (AUDIT section H): Chart of Accounts (29 default accounts,
  5 types: asset/liability/equity/income/expense), Journal Entries (double-entry, balance-validated),
  TDS payable/receivable ledger (10 sections: 194A/C/H/I/J/192/B/D/EE/G, mark deposited with
  challan), Trial Balance (derived from transactional data + manual journal adjustments), P&L
  (Revenue - COGS - Expenses = Net Profit), Balance Sheet (Assets = Liabilities + Equity), FY
  selector on all financial statements. Migration: `0038_accounting_core.sql` — `chart_of_accounts`,
  `journal_entries`, `journal_entry_lines`, `tds_entries`, `financial_reports` module.
- [x] **Phase 29** — Cross-cutting UX (AUDIT section I): Global ⌘K search with live data
  (invoices, contacts, products via `/api/global-search`); search + filter + pagination (50/page)
  on Billing list and CRM contacts list; CSV export on both; archive/soft-delete + restore on
  contacts, products, deals (`archived_at timestamptz`, partial indexes); Audit Log UI in
  Settings (50/page, table filter, INSERT/UPDATE/DELETE badges, diff collapsible); negative-stock
  warning in StockAdjuster (red button, warning text); `Comments` polymorphic table for entity
  discussion threads. Migration: `0039_soft_delete.sql` — `archived_at` on contacts/products/deals.
- [x] **Phase 30** — Departments, Teams & Roles (workspace structure): 25 permission roles
  covering all sectors (product_manager, qa, devops, data_analyst, content_creator,
  customer_success, business_dev, warehouse, procurement, chef, store_manager added to existing 14);
  `job_title` free-text field on memberships (display name separate from permission role);
  `departments` table (org-level groupings: Engineering, Kitchen, Sales…); `teams` table
  (cross-functional or dept-specific, with color + focus_area); `team_memberships` (lead/member);
  `comments` polymorphic table (entity_type + entity_id covers any record); Comments component
  wired to invoice detail + deal detail; Settings → Departments page; `/dashboard/teams` directory;
  `/dashboard/teams/[id]` workspace (member management, role/title display, quick links to shared
  tools); ROLE_GROUPS for grouped role picker. Migration: `0040_departments_teams.sql`.

---

## Known gaps / hardening backlog (run before scaling users)

- **RLS by role (0026_rls_by_role.sql):** DB-level write protection keyed on role — `has_module_access(org_id, module)` replaces permissive "org members" policies on tenant tables. Owner/admin/manager always full access. **Run 0026 to activate.**
- **Trial-lock is UI-level only** (redirect to `/locked`); not yet enforced in RLS.
- **Invites are bearer links** — no email-match guard. Add check if invites must be locked to recipient.
- **AI Assistant has no metering** — gate behind paid tier + per-org token limits before enabling `ANTHROPIC_API_KEY`.
- **Preferences are per-device** (localStorage) — not synced to account.
- **Comments @mentions** — `mentions text[]` stored but no notification trigger yet.
- **Archive not universal** — only contacts/products/deals. Tasks, employees, POs, meetings still create-only.

---

## THE GRAND PLAN — Road to "best level"

This is the ordered build plan to take every module from "functional" to "best in class".
Waves are roughly ordered by impact/dependency. Each item becomes a numbered phase when started.

### Wave A — Security & Hardening (do first, blocks scale)
- **A1** Run `0026_rls_by_role.sql` — DB-level role enforcement on all tenant tables.
- **A2** Trial-lock in RLS — add `org_is_active(org_id)` RLS condition alongside `is_org_member`.
- **A3** Invite email-match guard — `/api/settings/invites/[token]` verify logged-in email = invited email.
- **A4** AI metering — `ai_usage` table (org_id, tokens_in, tokens_out, model, created_at), per-org cap enforced in `/api/assistant`.
- **A5** Preferences sync — `user_preferences` table (user_id, key, value), loaded server-side, replaces localStorage for font/theme/size.

### Wave B — Cross-cutting UX (every screen, highest daily-use impact)
- **B1** Bulk actions on all major list pages (invoices, contacts, products, deals, employees, POs, expenses) — checkbox select → delete / change status / export.
- **B2** Column sorting on every table header — `?sort=column&dir=asc` query param pattern.
- **B3** CSV/Excel export on every list — generalise the `exportCsv()` pattern from billing/CRM to all modules.
- **B4** Archive/restore on ALL entities — add `archived_at` to employees, tasks, projects, meetings, POs, deals. Show/hide archived toggle on each list.
- **B5** Dashboard date-range filter — date picker on the main `/dashboard` page affecting all KPI tiles and charts.
- **B6** Document number customization — `org_doc_settings` table (module, prefix, start_number, fy_reset boolean). Applied in all sequence generators.
- **B7** Per-org date/number/currency formatting — `org_locale_settings` (date_format, number_format, currency_display). Applied in all `fmt()` helpers.
- **B8** Credit limit warnings — `contacts.credit_limit numeric` field; warn (red banner) when creating an invoice for a contact already over limit.
- **B9** Stock availability warnings — on invoice line item, show low-stock / out-of-stock badge when product stock < qty entered.
- **B10** Undo last action — 5-second toast with "Undo" after delete/archive operations (soft-delete pattern makes this possible).
- **B11** Inline editing — click a table cell to edit name/amount/status in-place (invoices list, contacts list, tasks list).
- **B12** Expand global search — add tasks, purchase orders, docs, meetings, projects to `/api/global-search`.

### Wave C — Workspace Richness (collaboration that beats Notion/Linear for SMBs)
- **C1** @mentions → notifications — parse `@name` in comment body, lookup user, insert notification, show autocomplete dropdown on `@`.
- **C2** Comments on more entities — add `<Comments>` to PO detail, task detail, meeting detail, expense claim detail, project detail (one-line addition each).
- **C3** Team activity feed — on `/dashboard/teams/[id]`, live feed of `audit_log` rows where `user_id IN (team_member_ids)`, showing "Priya created invoice INV-2026-0034 · 2h ago". Supabase Realtime subscription.
- **C4** Linked records — `task_links` table (task_id, entity_type, entity_id) + UI card preview showing invoice status or deal stage. Makes "this task is blocking invoice INV-0041" a real link.
- **C5** Simple automations / workflow rules — `workflow_rules` table (trigger_type, trigger_condition jsonb, action_type, action_config jsonb). MVP rules: deal Won → create invoice draft; invoice overdue → create task; stock below threshold → create PO. UI in Settings → Automations.
- **C6** Team kanban board — `/dashboard/teams/[id]/board` — tasks assigned to team members on a shared kanban, filter by assignee. Different from project kanban.
- **C7** Shared team calendar — `/dashboard/teams/[id]/calendar` — meetings + holidays + leave + task due dates for the team. Monthly/weekly view, iCal export.
- **C8** Announcement board — `announcements` table (team_id, body, pinned, created_by); pinned post at top of team workspace. Replaces "IMPORTANT" WhatsApp messages.
- **C9** Guest access — `memberships.is_guest boolean` + per-guest module whitelist. Invite a client to see project status and their invoices without accessing HR/accounting.
- **C10** Reactions on comments — `comment_reactions` table (comment_id, user_id, emoji). 👍 ✅ 👀 displayed below each comment.

### Wave D — Business Module Depth (close the gap vs Zoho/Tally/Petpooja)
- **D1** Client payment portal — `/pay/[invoice_id]` public page showing invoice + Razorpay button. Customer pays without logging in. Shareable link in invoice email.
- **D2** Auto-reminder emails — cron job + Resend: "Your invoice INV-0034 for ₹12,000 is 7 days overdue." Opt-in per org with reminder schedule.
- **D3** Product variants — `product_variants` table (product_id, attributes jsonb, sku, price, stock). Size/colour/flavour without cloning products.
- **D4** Bank reconciliation — import bank CSV (HDFC/ICICI format), auto-match to payments by amount+date, flag unmatched rows.
- **D5** Opening balances + FY close — `account_opening_balances` table (org_id, account_id, fy, amount); FY-close wizard that posts retained earnings journal and resets income/expense accounts.
- **D6** Outstanding ageing report — `/dashboard/accounting/ageing` — receivables bucketed 0-30/31-60/61-90/90+ days per customer.
- **D7** BOM / recipe management — `bill_of_materials` table (product_id, component_id, qty); raw material auto-deducted on production. Essential for cafe/restaurant and manufacturer.
- **D8** POS table management — `pos_tables` table (org_id, name, status: open/occupied/closed); POS grid switches between table view and product grid; orders linked to table.
- **D9** POS offline mode — service worker + IndexedDB; POS works without internet, syncs when reconnected. Critical for cafe/retail with poor connectivity.
- **D10** QR code ordering — `pos_qr_orders` table; customer scans table QR → order page → submits → appears in POS/KDS. No cashier needed.
- **D11** Customer loyalty program — `loyalty_accounts` (contact_id, points); earn points at POS/invoice; redeem as discount; history view on contact detail.
- **D12** Sales forecasting — weighted deal pipeline (deal.value × stage_probability) shown on CRM dashboard; historical win rate per stage auto-calculated.
- **D13** Shift scheduling / roster — HR module: `shifts` table (employee_id, date, start_time, end_time); weekly roster view; alerts for overtime/conflicts.
- **D14** Employee self-service — `/employee/[token]` public page: view own payslips, submit leave request, see attendance history. Token-based, no Supabase login needed.

### Wave E — Integrations (connect to the Indian business ecosystem)
- **E1** Tally XML export — generate Tally-compatible XML from invoices/payments/journal entries. Most Indian CAs and bookkeepers use Tally; this removes the biggest adoption blocker.
- **E2** WhatsApp Business API (2-way) — official Meta WABA integration: send invoice PDF, payment reminders, order confirmations. Receive replies. Conversation linked to CRM contact.
- **E3** SMS gateway — MSG91/Gupshup/Twilio: OTP fallback, payment reminders, POS receipts via SMS.
- **E4** Google Calendar sync — meetings module: OAuth2 flow, create/update Google Calendar events from ERP meetings.
- **E5** Shopify / WooCommerce sync — orders → invoices, product catalog sync, inventory decrement on e-commerce sale.
- **E6** Shiprocket / Delhivery — generate shipping order from invoice, track status, update delivery_challan.
- **E7** GSP integration (auto-IRN) — connect to a GSP (e.g. Masters India) for live e-invoice IRN generation, replacing the current offline JSON export.
- **E8** Bank statement auto-import — detect HDFC/ICICI/SBI CSV format, parse, create payment records, flag unmatched for manual reconciliation.
- **E9** ONDC seller integration — list products and receive orders from the ONDC network (govt-backed open commerce protocol).

### Wave F — Vertical Depth (sector-specific modules, all plugged in via module pattern)
- **F1** Manufacturing vertical: Bill of Materials, production orders, work orders, shop floor tracking, QC inspection, raw material consumption, subcontracting (job work). Module key: `manufacturing`.
- **F2** Multi-outlet / mall: outlet-level P&L (filter all modules by outlet_id), inter-outlet stock transfer, central purchasing with outlet allocation, outlet dashboards for branch managers. Module key: `outlets`.
- **F3** Cafe enhanced: table management + KDS + QR ordering (D8/D9/D10 packaged as a preset). Module key: `cafe_ops`.
- **F4** Retail loyalty: loyalty program (D11) + gift cards + price books + promotional rules. Module key: `loyalty`.
- **F5** Education (deferred): fee collection, timetable, student records, attendance, report cards.
- **F6** Healthcare (deferred): patient records, appointment scheduling, prescription, billing with ICD codes.
- **F7** Real estate (deferred): property listings, rent collection, maintenance tickets.

### Wave G — Platform & Analytics (scale the platform itself)
- **G1** Custom report builder — drag-and-drop columns from any module, filters, grouping, calculated fields. Save as named report. Schedule email delivery.
- **G2** Analytics upgrade — drill-down from dashboard tiles; comparison mode (MoM/YoY); cohort analysis; customer LTV; product profitability; cash flow forecast.
- **G3** PWA (Progressive Web App) — `manifest.json` + service worker for installable app. Offline check-ins, offline task updates, offline POS (D9). Critical for low-connectivity India.
- **G4** AI layer upgrades — per-org context (business type, recent transactions, team size) improves AI answers; weekly "business digest" email from audit_log + financials; AI-suggested next actions (follow up with X, reorder Y, approve Z payroll).
- **G5** Station screens — `/station/pos` (full-screen cashier UI, no sidebar), `/station/kds` (kitchen display, Supabase Realtime order queue). Staff 4-digit PIN for fast device switching.
- **G6** Mobile app (Expo, **separate project**) — invoice create/view, attendance GPS check-in, POS lite (barcode scan → cart → charge), push notifications. Connects to same Supabase project, no backend changes needed.
- **G7** Pricing tiers — Starter (billing+payments+basic POS), Growth (+ CRM + HR + inventory), Business (+ accounting + subscriptions), Enterprise (all + custom roles + white-label). Enforced via entitlements + `org_plans.plan_name`.

---

## Phase 20 — Mobile App (React Native / Expo) — SEPARATE PROJECT
Cannot be built inside this monorepo. Start a new Expo project connecting to the same Supabase.
- Invoice create + view on mobile
- Attendance mark (GPS check-in) for field employees
- POS lite (scan barcode → add to cart → charge)
- Push notifications via Expo + Supabase Realtime

---

## Deferred verticals (add as modules later, do not build into core)
- Education / school: fee collection, timetable, student records (Wave F5)
- Healthcare: patient records, appointment scheduling, billing with ICD codes (Wave F6)
- Real estate: property listings, rent collection, maintenance tickets (Wave F7)
