# ERP Base — Codebase Guide for Maintainers

This document explains how the web app works, what lives where, and how the
pieces connect. Read this before touching any production code.

---

## What This Is

A **modular monolith** — one Next.js 14 application that serves both frontend
and backend. It is a multi-tenant SaaS ERP for Indian SMBs. Every customer
(tenant) is an **organization**; their data is isolated by Postgres Row-Level
Security (RLS) in Supabase. A customer subscribes to a set of modules; they
only see what their plan includes.

**Live URL:** https://erp-base-eight.vercel.app
**Repo:** `c:\Users\diu52\erp-base` (trunk-based, `master` branch)
**Deploy:** Vercel — auto-deploys from `master` on every push.

---

## Tech Stack at a Glance

| Layer | Technology |
|---|---|
| Frontend + backend | Next.js 14, App Router, TypeScript |
| Database + auth | Supabase (Postgres 17 + Supabase Auth) |
| Row-Level Security | Postgres RLS policies |
| Styling | Tailwind CSS (`darkMode: "class"`) |
| PDF generation | `@react-pdf/renderer` |
| Email | Resend |
| Payments | Razorpay |
| AI assistant | Anthropic Claude |
| Error tracking | Sentry |
| Hosting | Vercel (standalone Next.js Docker output) |

---

## Project Structure — Annotated

```
erp-base/
│
├── src/
│   ├── app/                     ← Next.js App Router root
│   │   │
│   │   ├── page.tsx             ← Public homepage (/)
│   │   ├── layout.tsx           ← Root HTML shell, ThemeProvider, ToastProvider
│   │   ├── global-error.tsx     ← Sentry React error boundary
│   │   │
│   │   ├── login/               ← /login — Supabase email+password
│   │   ├── signup/              ← /signup — creates account + goes to onboarding
│   │   ├── forgot-password/     ← /forgot-password
│   │   ├── reset-password/      ← /reset-password (after email link)
│   │   ├── onboarding/          ← /onboarding — 3-step wizard (name, type, modules)
│   │   ├── invite/[token]/      ← /invite/[token] — accept team invite
│   │   ├── locked/              ← /locked — paywall shown when trial expires
│   │   ├── pay/[id]/            ← /pay/[id] — PUBLIC invoice payment portal
│   │   ├── order/[token]/       ← /order/[token] — QR self-ordering for POS
│   │   ├── employee/[token]/    ← /employee/[token] — self-service portal (no login)
│   │   ├── station/             ← /station/pos + /station/kds — full-screen POS/KDS
│   │   ├── privacy/             ← /privacy — Privacy Policy
│   │   ├── terms/               ← /terms — Terms of Service
│   │   │
│   │   ├── admin/               ← /admin — OPERATOR admin panel (separate auth)
│   │   │   ├── login/           ← HMAC cookie login (not Supabase)
│   │   │   ├── clients/         ← list orgs, toggle modules, manage plans
│   │   │   └── settings/        ← platform billing contact
│   │   │
│   │   ├── dashboard/           ← ALL TENANT PAGES (requires Supabase session)
│   │   │   ├── layout.tsx       ← Sidebar, ThemeToggle, entitlement-filtered nav
│   │   │   ├── page.tsx         ← Dashboard home (tailored KPIs per business type)
│   │   │   │
│   │   │   ├── billing/         ← Invoicing (invoice list, new, detail, PDF)
│   │   │   ├── payments/        ← Record payments, payment list
│   │   │   ├── ledger/          ← Credit / Udhaar ledger per contact
│   │   │   ├── inventory/       ← Products, stock adjustments, BOM
│   │   │   ├── pos/             ← POS session management + order history
│   │   │   ├── purchase/        ← Purchase orders, GRN, vendor bills
│   │   │   ├── crm/             ← Contacts, deals pipeline, activity timeline
│   │   │   ├── hr/              ← Employees, attendance, payroll, leaves, loans
│   │   │   ├── subscriptions/   ← Subscription plans + customer subscriptions
│   │   │   ├── expenses/        ← Expense claims (submit → approve → reimburse)
│   │   │   ├── accounting/      ← GST returns, journal entries, TDS, P&L, trial balance
│   │   │   ├── reports/         ← Cross-module revenue / HR / inventory dashboard
│   │   │   ├── import/          ← CSV upload wizard for contacts, products, employees
│   │   │   ├── workspace/       ← My Work home (tasks assigned to me + check-in)
│   │   │   ├── projects/        ← Project kanban, time tracking, budget
│   │   │   ├── docs/            ← Knowledge base + version history
│   │   │   ├── tasks/           ← Global sprint board
│   │   │   ├── goals/           ← OKRs + key results
│   │   │   ├── features/        ← Product pipeline (ideas → shipped)
│   │   │   ├── meetings/        ← Meeting log + action items
│   │   │   ├── issues/          ← Bug / issue tracker
│   │   │   ├── releases/        ← Release log
│   │   │   ├── decisions/       ← Decision log
│   │   │   ├── checkins/        ← Daily stand-up check-ins
│   │   │   ├── assistant/       ← Claude AI chat (org-scoped context)
│   │   │   ├── teams/           ← Team workspaces, member list, kanban, calendar
│   │   │   └── settings/        ← All settings tabs (see Settings section below)
│   │   │
│   │   └── api/                 ← ALL API ROUTES (Next.js Route Handlers)
│   │       ├── auth/            ← signup, signout, forgot password
│   │       ├── admin/           ← operator admin API (HMAC auth)
│   │       ├── v1/              ← Public REST API (Bearer key auth) — invoices, contacts, products
│   │       ├── cron/            ← Vercel cron jobs (recurring invoices, backup, reminders)
│   │       └── [module]/        ← One folder per module — see API Route Map below
│   │
│   ├── components/              ← Shared UI components
│   │   ├── Sidebar.tsx          ← Dashboard sidebar (reads entitlements for nav)
│   │   ├── ThemeToggle.tsx      ← Dark/light mode toggle (localStorage)
│   │   ├── NotificationBell.tsx ← In-app notifications dropdown
│   │   ├── CommandPalette.tsx   ← ⌘K global search
│   │   ├── Comments.tsx         ← Polymorphic comment thread (entity_type + entity_id)
│   │   ├── AttachmentPanel.tsx  ← File upload/view/delete (Supabase Storage)
│   │   ├── ArchiveButton.tsx    ← Soft-delete/restore via /api/archive
│   │   ├── ToastProvider.tsx    ← App-wide toast notification system
│   │   ├── Brand.tsx            ← Logo / wordmark
│   │   └── AppOverlays.tsx      ← Keyboard shortcut overlay, global hotkeys
│   │
│   ├── lib/                     ← Shared utilities and server logic
│   │   ├── entitlements.ts      ← getOrgContext() — THE central auth + access function
│   │   ├── modules.ts           ← Module registry + business presets
│   │   ├── adminAuth.ts         ← HMAC admin cookie sign/verify
│   │   ├── apiKeyAuth.ts        ← Bearer key auth for /api/v1/*
│   │   ├── rateLimit.ts         ← DB-backed rate limiter
│   │   ├── automations.ts       ← Workflow automation engine
│   │   ├── businessConfig.ts    ← Business-type display config
│   │   ├── sms.ts               ← MSG91/Twilio SMS helpers
│   │   ├── toast.ts             ← Toast helper (client-side)
│   │   ├── orgMembers.ts        ← Helper to list org members
│   │   ├── useHotkeys.ts        ← Keyboard shortcut hook
│   │   ├── useFormDraft.ts      ← Auto-save form draft to localStorage
│   │   │
│   │   ├── supabase/
│   │   │   ├── client.ts        ← Browser Supabase client (use in 'use client' components)
│   │   │   ├── server.ts        ← Server Supabase client (use in Server Components + API routes)
│   │   │   ├── middleware.ts    ← Session refresh + route protection logic
│   │   │   └── admin.ts         ← Service-role client (BYPASSES RLS — server-only)
│   │   │
│   │   ├── invoice/             ← All invoice math and utilities
│   │   │   ├── calc.ts          ← computeInvoiceTotals() — GST split, discount, round-off
│   │   │   ├── create.ts        ← createInvoice() server helper
│   │   │   ├── docTypes.ts      ← Document type constants (invoice/quotation/credit_note/...)
│   │   │   ├── format.ts        ← Currency formatters
│   │   │   ├── govt.ts          ← e-Invoice IRN + e-Way bill JSON builders
│   │   │   ├── recurring.ts     ← Recurring invoice generation logic
│   │   │   ├── server.ts        ← Server-side invoice fetch helpers
│   │   │   ├── upi.ts           ← UPI deep-link + QR code helpers
│   │   │   └── words.ts         ← Amount in words (Indian numbering)
│   │   │
│   │   ├── pdf/
│   │   │   └── InvoicePDF.tsx   ← React PDF A4 invoice layout (@react-pdf/renderer)
│   │   │
│   │   ├── backup/
│   │   │   └── export.ts        ← Full org data export (paginated, all tables)
│   │   │
│   │   ├── crypto/
│   │   │   └── tokens.ts        ← AES-256-GCM encrypt/decrypt (for OAuth tokens)
│   │   │
│   │   └── types/               ← TypeScript interfaces per domain
│   │       ├── roles.ts         ← 25 OrgRole values, ROLE_MODULES map, ROLE_GROUPS
│   │       ├── billing.ts       ├── crm.ts  ├── hr.ts  ├── inventory.ts
│   │       ├── payments.ts      ├── payroll_compliance.ts  ├── purchase.ts
│   │       ├── accounting.ts    └── subscriptions.ts
│   │
│   ├── middleware.ts            ← Next.js middleware (runs on every request)
│   └── instrumentation.ts       ← Sentry bootstrap for server + edge runtimes
│
├── supabase/
│   └── migrations/              ← SQL migration files (0001 to 0060)
│       ├── 0001_init.sql        ← Foundation: orgs, memberships, modules, entitlements, RLS
│       └── [0002–0060]          ← One file per feature phase (never edit 0001)
│
├── docs/
│   ├── CODEBASE_GUIDE.md        ← This file
│   ├── MOBILE_APP.md            ← Mobile app architecture plan
│   └── MOBILE_UI_AND_CONNECT.md ← Mobile UI wireframes + Expo connection guide
│
├── public/                      ← Static assets
├── Dockerfile                   ← Multi-stage build (standalone Next.js)
├── next.config.js               ← Wrapped with withSentryConfig
├── vercel.json                  ← Cron job schedules
├── CLAUDE.md                    ← AI assistant instructions for this project
└── .env.example                 ← All environment variable keys (no secrets)
```

---

## The Three Auth Systems

This app has **three completely separate auth mechanisms**. Understand them clearly.

### 1. Tenant Auth (Supabase Auth) — used by everyone
- Managed by Supabase: JWT sessions stored in cookies via `@supabase/ssr`.
- All dashboard pages (`/dashboard/*`) require this session.
- **Client-side:** `createClient()` from `src/lib/supabase/client.ts`
- **Server-side:** `createClient()` from `src/lib/supabase/server.ts` (synchronous, never await it)
- **Middleware:** `src/lib/supabase/middleware.ts` refreshes the session on every request.
  If no session exists and the path starts with `/dashboard` or `/locked`, it redirects to `/login`.

### 2. Admin Panel Auth (HMAC Cookie) — used only by the operator
- Completely separate from Supabase. No user accounts in the DB.
- Credentials: `ADMIN_USERNAME` + `ADMIN_PASSWORD` env vars.
- Login POSTs to `/api/admin/auth/login` → if credentials match, signs an HMAC token
  (payload + SHA-256 sig using `ADMIN_SECRET`) and sets it as `erp_admin_session` cookie.
- Every `/admin/*` route (except `/admin/login`) checks this cookie in middleware.
- Code: `src/lib/adminAuth.ts` — `signAdminToken()` / `verifyAdminToken()` / `isAdminRequest()`.

### 3. Public API Auth (Bearer Key) — used by external integrations
- For the REST API at `/api/v1/*`.
- Keys generated by tenant in Settings → API Keys. Stored as SHA-256 hash in `api_keys` table.
- Request includes `Authorization: Bearer erpk_xxxxx` header.
- `src/lib/apiKeyAuth.ts` → `authenticateApiKey(req)` → hashes the raw key, looks up the hash,
  returns `{ orgId }` if found and active, or `null` if invalid.

---

## The Entitlement Engine — How Module Access Works

This is the heart of the system. Every protected page calls `getOrgContext()`.

**File:** `src/lib/entitlements.ts`

```
Request arrives at a dashboard page
          │
          ▼
  getOrgContext()  [wrapped in React cache() — runs once per request]
          │
          ├─ supabase.auth.getUser()         → gets the current user
          ├─ memberships table               → gets org_id + role + is_guest
          ├─ entitlements table              → gets which modules are enabled for this org
          └─ org_plans table                 → gets plan status (trial/active/locked)
          │
          ▼
  Returns OrgContext:
  {
    user:           { id, email }
    org:            { id, role, name, business_type, isGuest }
    enabledModules: Set<string>    ← intersection of: org entitlements ∩ role permissions
    plan:           { plan_name, status, amount, ... }
    access:         "active" | "trial" | "locked"
    trialDaysLeft:  number | null
  }
```

**Module visibility logic (intersection of two things):**
1. `entitlements` table — which modules the org's plan includes (set by admin or onboarding)
2. `ROLE_MODULES` map in `src/lib/types/roles.ts` — which modules each role is allowed to see

If a role is `owner` or `admin`, they see all org-entitled modules. Other roles only see the
subset their role permits.

**Page guard pattern (every dashboard page uses this):**
```typescript
const ctx = await getOrgContext();
if (!ctx?.enabledModules.has('billing') || !ctx.org) redirect('/dashboard');
```

**Sidebar** (`src/components/Sidebar.tsx`) filters `MODULES` from `src/lib/modules.ts` against
`ctx.enabledModules` to show only what this user can access.

---

## Module Registry

**File:** `src/lib/modules.ts`

Defines all 27 modules. Each has: `key`, `name`, `href`, `icon`, `category` (business/workspace).

`BUSINESS_PRESETS` maps each business type (cafe, shop, startup, etc.) to the module keys
that get enabled at onboarding. The preset is applied when `createOrganization` RPC runs.

**Business types:** cafe, shop, distributor, manufacturer, freelancer, startup, mall, general.

---

## Database — Tables by Domain

All tenant tables have `org_id uuid` FK to `organizations(id)` and RLS enabled.
Run migrations in Supabase SQL Editor in order.

### Foundation (0001_init.sql)
| Table | Purpose |
|---|---|
| `organizations` | One row per tenant. `name`, `business_type`. |
| `memberships` | Links users to orgs. `user_id`, `org_id`, `role`, `is_guest`, `guest_modules`. |
| `modules` | Catalogue of all sellable modules (`key`, `name`). |
| `entitlements` | Which modules each org has enabled (`org_id`, `module_key`, `enabled`). |
| `org_plans` | Billing plan per org (`plan_name`, `status`, `amount`, `next_billing_date`). |

### Billing / Invoicing (0002, 0030)
| Table | Purpose |
|---|---|
| `invoices` | All documents: invoice, quotation, proforma, delivery challan, credit note. `doc_type` column distinguishes them. |
| `invoice_line_items` | Line items per invoice (`product_id`, `hsn_code`, `qty`, `unit_price`, `gst_rate`). |
| `recurring_invoices` | Templates for auto-generated recurring invoices. |
| `org_invoice_settings` | Per-org: bank details, UPI, logo, signature, T&C, due days. |

### Payments (0003, 0029, 0031)
| Table | Purpose |
|---|---|
| `payments` | Payment records linked to invoices. `method`: cash/upi/card/bank/credit. |
| `payment_gateway_settings` | Razorpay key/secret per org. |

### Inventory (0003, 0032, 0047)
| Table | Purpose |
|---|---|
| `products` | Products with `sku`, `price`, `gst_rate`, `stock`, `barcode`, `archived_at`. |
| `stock_adjustments` | Manual stock in/out log. |
| `product_variants` | Size/color/flavor variants of a product. |
| `bill_of_materials` | Recipe: which components make up a product. |
| `production_orders` | Manufacturing runs using BOM. |

### CRM (0004, 0036, 0041)
| Table | Purpose |
|---|---|
| `contacts` | Lead / customer / vendor. `contact_type`, `tags`, `lead_source`, `credit_limit`, `archived_at`. |
| `deals` | Pipeline deals with `stage` and `value`. `archived_at`. |
| `contact_activities` | Timeline entries: call, email, meeting, note, task. |

### HR (0005, 0037)
| Table | Purpose |
|---|---|
| `employees` | Employee records. `user_id` FK links to auth.users for login. |
| `attendance` | Daily: `status` (present/absent/half-day/leave), `in_time`, `out_time`, `overtime_hours`. |
| `payroll_runs` | Monthly payroll run header. |
| `payroll_entries` | Per-employee per-run: gross, deductions, net. |
| `leave_types` | Org-defined leave categories. |
| `leave_requests` | Employee leave requests with approve/reject flow. |
| `holidays` | Org holiday calendar + national holidays. |
| `employee_loans` | Salary advance / loan tracking. |
| `statutory_settings` | PF, ESI, PT state, TDS regime per org. |

### Purchase (0008, 0035)
| Table | Purpose |
|---|---|
| `purchase_orders` | PO header: vendor, status (draft→sent→partial→received→billed). |
| `purchase_order_items` | PO line items with `received_qty`. |
| `purchase_returns` | Debit notes / returns to vendor. |
| `vendor_advances` | Track advance payments to vendors. |
| `landed_costs` | Allocate freight/customs across PO lines. |

### POS (0013, 0033, 0044, 0052, 0054)
| Table | Purpose |
|---|---|
| `pos_sessions` | Cash register sessions (open/close with float). |
| `pos_orders` | Orders with `order_number`, `payment_method`, totals. |
| `pos_order_lines` | Items per order. |
| `pos_tables` | Table management (open/occupied/closed). |
| `pos_qr_orders` | Customer self-orders via QR code. |

### Accounting (0007, 0038)
| Table | Purpose |
|---|---|
| `chart_of_accounts` | 29 default accounts, 5 types: asset/liability/equity/income/expense. |
| `journal_entries` | Double-entry journal header. |
| `journal_entry_lines` | Debit/credit lines (must balance). |
| `tds_entries` | TDS receivable/payable per section. |
| `account_opening_balances` | FY opening balances per account. |

### Workspace / Startup OS (0023, 0057)
| Table | Purpose |
|---|---|
| `projects` | Project with budget, progress, status. |
| `tasks` | Tasks with assignee, sprint, status kanban. |
| `time_entries` | Hours logged per task. |
| `docs` | Knowledge base docs with version history. |
| `goals` | OKR goals with key results. |
| `features` | Product pipeline items. |
| `meetings` | Meeting log + action items → tasks. |
| `issues` | Bug tracker. |
| `releases` | Release log. |
| `decisions` | Decision log. |
| `daily_checkins` | Daily stand-up check-ins. |

### Cross-cutting (various migrations)
| Table | Purpose |
|---|---|
| `comments` | Polymorphic: `entity_type` + `entity_id` — works on any record. |
| `comment_reactions` | Emoji reactions on comments. |
| `notifications` | In-app notifications per user. |
| `audit_log` | INSERT/UPDATE/DELETE events on financial tables. |
| `attachments` | File metadata (files stored in Supabase Storage bucket `attachments`). |
| `departments` | Org departments (Engineering, Kitchen, etc.). |
| `teams` | Cross-functional teams with color + focus area. |
| `team_memberships` | Who is in which team (lead/member). |
| `api_keys` | Hashed API keys for the public REST API. |
| `webhooks` | Outbound webhook subscriptions. |
| `currencies` | 10 currencies seeded (INR, USD, EUR...). |
| `org_currency_settings` | Per-org exchange rates. |
| `expense_categories` + `expense_claims` | Expense management. |
| `loyalty_accounts` | POS loyalty points per contact. |
| `outlets` | Multi-outlet locations for mall/chain businesses. |
| `outlet_stock_transfers` | Inter-outlet stock movements. |
| `announcements` | Team announcement board. |
| `task_links` | Link tasks to any entity (invoice, deal, etc.). |
| `workflow_rules` | Automation rules (trigger → action). |
| `backup_settings` | Google Drive OAuth tokens (AES-encrypted) + schedule. |
| `rate_limits` | DB-backed rate limiter (IP + action key). |
| `doc_sequences` | Atomic document number sequences (invoice, PO, etc.). |

---

## API Route Map

All API routes are in `src/app/api/`. They are Next.js Route Handlers (`route.ts`).
Every route checks `getOrgContext()` (or `authenticateApiKey()` for `/v1/*`) before doing anything.

### Auth
| Route | Method | Purpose |
|---|---|---|
| `/api/auth/signup` | POST | Create Supabase user (rate-limited: 5/10min per IP) |
| `/api/auth/signout` | POST | Clear session |
| `/api/auth/forgot` | POST | Send password reset email (rate-limited: 3/15min per IP) |

### Billing
| Route | Methods | Purpose |
|---|---|---|
| `/api/invoices` | GET, POST | List + create invoices/quotes/proformas |
| `/api/invoices/[id]` | GET, PATCH, DELETE | Get, update, void/delete |
| `/api/invoices/[id]/status` | POST | Status transition (draft→sent→paid) |
| `/api/invoices/[id]/pdf` | GET | Generate PDF via React PDF |
| `/api/invoices/[id]/email` | POST | Email PDF via Resend |
| `/api/invoices/[id]/duplicate` | POST | Clone invoice |
| `/api/invoices/[id]/convert` | POST | Quotation/proforma → invoice |
| `/api/invoices/[id]/credit-note` | POST | Create credit note (reversal) |
| `/api/invoices/[id]/e-invoice` | GET | IRN JSON export |
| `/api/invoices/[id]/e-way` | GET | e-Way bill JSON export |
| `/api/recurring` | GET, POST | Recurring invoice templates |
| `/api/recurring/[id]` | PATCH, DELETE | Update/delete template |
| `/api/cron/recurring` | GET | Daily cron — generate due recurring invoices |

### Payments
| Route | Methods | Purpose |
|---|---|---|
| `/api/payments` | GET, POST | List + record payments |
| `/api/payments/[id]/refund` | POST | Mark payment as refunded |
| `/api/payments/razorpay/create-order` | POST | Create Razorpay order from invoice |
| `/api/payments/razorpay/webhook` | POST | HMAC-verified webhook → marks invoice paid |
| `/api/pay/[id]/create-order` | POST | Public payment portal order creation |

### Inventory
| Route | Methods | Purpose |
|---|---|---|
| `/api/products` | GET, POST | List + create products |
| `/api/products/[id]` | GET, PATCH, DELETE | Product CRUD |
| `/api/products/[id]/stock` | PATCH | Stock adjustment (uses `adjust_stock` RPC) |
| `/api/products/[id]/batches` | GET, POST | Batch/lot tracking |
| `/api/inventory/bom` | GET, POST | Bill of Materials |
| `/api/inventory/production` | GET, POST | Production orders |

### CRM
| Route | Methods | Purpose |
|---|---|---|
| `/api/contacts` | GET, POST | List + create contacts |
| `/api/contacts/[id]` | GET, PATCH, DELETE | Contact CRUD |
| `/api/deals` | GET, POST | List + create deals |
| `/api/deals/[id]/stage` | PATCH | Move deal to new stage |
| `/api/contact-activities` | GET, POST | Timeline entries |

### HR
| Route | Methods | Purpose |
|---|---|---|
| `/api/employees` | GET, POST | List + create employees (POST optionally creates login) |
| `/api/hr/employees` | GET | HR-specific employee list |
| `/api/hr/employees/[id]/create-login` | POST | Create Supabase auth for existing employee |
| `/api/hr/employees/[id]/reset-password` | POST | Admin-reset employee password |
| `/api/hr/employees/[id]/self-service-token` | POST | Generate self-service portal token |
| `/api/attendance` | GET, POST | Daily attendance records |
| `/api/payroll` | GET, POST | Payroll runs |
| `/api/payroll/[id]` | GET, PATCH | Run detail + status |
| `/api/leaves` | GET, POST | Leave requests |
| `/api/leaves/[id]` | PATCH | Approve/reject leave |
| `/api/leave-types` | GET, POST | Leave type management |
| `/api/holidays` | GET, POST | Holiday calendar |
| `/api/employee-loans` | GET, POST | Employee loan management |
| `/api/hr/form16` | GET | Form 16 CSV export |
| `/api/hr/shifts` | GET, POST | Shift scheduling |

### Accounting / GST
| Route | Methods | Purpose |
|---|---|---|
| `/api/accounting/chart` | GET, POST | Chart of accounts |
| `/api/accounting/journals` | GET, POST | Journal entries |
| `/api/accounting/tds` | GET, POST | TDS entries |
| `/api/accounting/gstr1` | GET | GSTR-1 report data |
| `/api/accounting/gstr3b` | GET | GSTR-3B summary |
| `/api/accounting/export` | GET | CSV export for GST returns |
| `/api/accounting/tally-export` | GET | Tally XML export |
| `/api/accounting/settings` | GET, POST | GST settings (GSTIN, state code) |
| `/api/ledger` | GET | Credit/Udhaar ledger per contact |

### POS
| Route | Methods | Purpose |
|---|---|---|
| `/api/pos/sessions` | GET, POST | Open/close POS sessions |
| `/api/pos/orders` | GET, POST | Create + list POS orders |
| `/api/pos/orders/[id]/kds` | PATCH | Update KDS status (ready/served) |
| `/api/pos/tables` | GET, POST, PATCH | Table management |
| `/api/pos/qr-orders` | GET, POST | QR self-order submissions |
| `/api/loyalty` | GET, POST | Loyalty point earn/redeem |

### Workspace
| Route | Methods | Purpose |
|---|---|---|
| `/api/projects` | GET, POST | Projects |
| `/api/projects/[id]` | PATCH, DELETE | Project update |
| `/api/tasks` | GET, POST | Tasks |
| `/api/tasks/[id]` | PATCH, DELETE | Task update |
| `/api/sprints` | GET, POST | Sprints |
| `/api/docs` | GET, POST | Docs |
| `/api/goals` + `/api/key-results` | GET, POST | OKRs |
| `/api/meetings` | GET, POST | Meetings |
| `/api/action-items` | GET, POST | Action items from meetings |
| `/api/issues` | GET, POST | Issues |
| `/api/releases` + `/api/release-items` | GET, POST | Releases |
| `/api/decisions` | GET, POST | Decision log |
| `/api/checkins` | GET, POST | Daily check-ins |
| `/api/assistant` | POST | Claude AI chat (RLS-scoped data snapshot sent as context) |
| `/api/announcements` | GET, POST | Team announcements |
| `/api/teams` + `/api/teams/[id]` | GET, POST, PATCH | Teams + members |
| `/api/departments` | GET, POST | Departments |

### Settings
| Route | Methods | Purpose |
|---|---|---|
| `/api/settings/team` | GET, POST, DELETE | Team member management + invite |
| `/api/settings/invites` | GET | Accept invite by token |
| `/api/settings/api-keys` | GET, POST, PATCH | API key CRUD |
| `/api/settings/webhooks` | GET, POST, PATCH, DELETE | Webhook CRUD |
| `/api/settings/invoice` | GET, POST | Invoice settings (bank/UPI/logo) |
| `/api/settings/payment-gateway` | GET, POST | Razorpay keys |
| `/api/settings/currencies` | GET, POST | Exchange rate settings |
| `/api/settings/doc-numbers` | GET, POST | Document numbering customization |
| `/api/settings/automations` | GET, POST | Workflow automation rules |
| `/api/settings/sms` | GET, POST | SMS gateway settings |
| `/api/settings/business-type` | POST | Change org business type |
| `/api/settings/preferences` | GET, POST | User preferences |

### Cross-cutting
| Route | Methods | Purpose |
|---|---|---|
| `/api/archive` | POST | Soft-delete / restore any entity |
| `/api/comments` | GET, POST | Comments on any entity |
| `/api/comments/[id]` | PATCH, DELETE | Edit/delete comment |
| `/api/comments/[id]/reactions` | POST, DELETE | Emoji reactions |
| `/api/notifications` | GET, PATCH | In-app notifications |
| `/api/global-search` | GET | ⌘K search across invoices/contacts/products |
| `/api/attachments` | GET, POST | File attachment metadata |
| `/api/attachments/[id]` | DELETE | Delete attachment |
| `/api/currencies` | GET | List available currencies |
| `/api/reports` | GET | Cross-module reports |
| `/api/reports/custom` | GET, POST | Custom report builder |
| `/api/import/*` | POST | CSV import for contacts/products/employees |
| `/api/sms/send` | POST | Send SMS via configured gateway |
| `/api/backup/*` | GET, POST | Google Drive backup (create, schedule, status) |
| `/api/cron/backup` | GET | Vercel cron — nightly backup |
| `/api/cron/invoice-reminders` | GET | Vercel cron — overdue invoice emails |

### Public REST API (`/api/v1/*`)
| Route | Methods | Auth | Purpose |
|---|---|---|---|
| `/api/v1/invoices` | GET | Bearer erpk_xxx | List invoices |
| `/api/v1/contacts` | GET, POST | Bearer erpk_xxx | List + create contacts |
| `/api/v1/products` | GET | Bearer erpk_xxx | List products |

### Admin (Operator only)
| Route | Methods | Purpose |
|---|---|---|
| `/api/admin/auth/login` | POST | HMAC login → sets `erp_admin_session` cookie |
| `/api/admin/auth/logout` | POST | Clear admin cookie |
| `/api/admin/orgs` | GET | List all organizations |
| `/api/admin/orgs/[id]` | GET, PATCH | Org detail + toggle module entitlements + plan status |
| `/api/admin/settings` | GET, POST | Platform billing contact |

---

## Settings Pages

All at `/dashboard/settings/*` — visible based on role.

| Tab | Route | Min Role | Purpose |
|---|---|---|---|
| Preferences | `/settings/preferences` | all | Font, size, theme (localStorage) |
| Password | `/settings/password` | all | Change password (re-auth required) |
| Business type | `/settings/business` | owner/admin | Change org business type |
| Team Members | `/settings/team` | owner/admin/manager | Invite, change role, remove members |
| Departments | `/settings/departments` | owner/admin/manager | Department management |
| Invoice settings | `/settings/invoice` | owner/admin/manager/accountant | Bank, UPI QR, logo, T&C |
| Doc Numbering | `/settings/doc-numbers` | owner/admin | Prefix + start number per document type |
| Currencies | `/settings/currencies` | owner/admin/manager/accountant | Exchange rates |
| API Keys | `/settings/api` | owner/admin | Generate/revoke public API keys |
| Webhooks | `/settings/webhooks` | owner/admin | Outbound webhook subscriptions |
| Outlets | `/settings/outlets` | owner/admin | Multi-outlet locations |
| SMS Gateway | `/settings/sms` | owner/admin | MSG91/Twilio credentials |
| Automations | `/settings/automations` | owner/admin | Workflow automation rules |
| Backup | `/settings/backup` | owner/admin | Google Drive backup setup |
| Audit Log | `/settings/audit` | owner/admin/manager | INSERT/UPDATE/DELETE event log |

---

## Key Patterns Every Maintainer Must Know

### 1. Server Supabase client — NEVER await
```typescript
// CORRECT
const supabase = createClient();

// WRONG — will cause runtime errors
const supabase = await createClient();
```

### 2. Navigation after mutations — window.location, NOT router.push
```typescript
// CORRECT — avoids fetch-hang bug in App Router
window.location.href = '/dashboard/billing';
window.location.reload();

// WRONG
router.push('/dashboard/billing');
```

### 3. Supabase query errors — try/catch, NOT .catch()
```typescript
// CORRECT
try {
  const { data, error } = await supabase.from('invoices').select('*');
} catch (e) {
  // handle
}

// WRONG — PostgrestFilterBuilder has no .catch()
supabase.from('invoices').select('*').catch(() => {});
```

### 4. New tables from unapplied migrations — wrap in try/catch
```typescript
// If the migration hasn't run yet, the query throws.
// Wrap so the page doesn't break.
try {
  const { data } = await supabase.from('new_table').select('*');
} catch {
  // table doesn't exist yet — render without this data
}
```

### 5. Every dashboard page guard
```typescript
const ctx = await getOrgContext();
if (!ctx?.enabledModules.has('module_key') || !ctx.org) redirect('/dashboard');
// ctx.org is now guaranteed non-null below this line
```

### 6. Atomic stock — use the RPC, not read+write
```typescript
// CORRECT — atomic, no race conditions
await supabase.rpc('adjust_stock', {
  p_product_id: id, p_org_id: orgId, p_delta: -qty
});

// WRONG — two queries can race
const { data } = await supabase.from('products').select('stock').eq('id', id);
await supabase.from('products').update({ stock: data.stock - qty }).eq('id', id);
```

### 7. Atomic document numbers — use the RPC
```typescript
const { data: orderNum } = await supabase.rpc('next_document_number', {
  p_org_id: orgId, p_type: 'invoice'
});
// Returns e.g. "INV-2026-0042"
```

### 8. RLS — every tenant table needs these three things
```sql
-- 1. org_id column
org_id uuid NOT NULL REFERENCES organizations(id),

-- 2. RLS enabled
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;

-- 3. Policies
CREATE POLICY "org members can read" ON my_table
  FOR SELECT USING (is_org_member(org_id));
CREATE POLICY "org members can write" ON my_table
  FOR ALL USING (is_org_member(org_id));
```

### 9. Client components vs Server Components
- Default in App Router = **Server Component** (can use `createClient()` from server.ts, `getOrgContext()`)
- Add `'use client'` at top for: interactive state, event handlers, browser APIs
- Don't mix — a Server Component cannot import a Client Component that uses server-only code

### 10. Public env vars
- `NEXT_PUBLIC_*` — baked into the client bundle at build time. Safe for Supabase URL and anon key.
- Never put service role key or secrets as `NEXT_PUBLIC_*`.

---

## Environment Variables

| Variable | Where used | Required |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + server Supabase clients | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + server Supabase clients | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | `admin.ts` only — bypasses RLS. **Server-only. Never in .env.example.** | Yes |
| `NEXT_PUBLIC_APP_URL` | OAuth redirect URIs, email links | Yes |
| `ADMIN_USERNAME` | Admin panel login | Yes |
| `ADMIN_PASSWORD` | Admin panel login | Yes |
| `ADMIN_SECRET` | HMAC signing key for admin cookie | Yes |
| `CRON_SECRET` | Vercel cron authentication header | Yes |
| `RESEND_API_KEY` | Email sending via Resend | For email features |
| `RESEND_FROM_EMAIL` | Sender address for Resend | For email features |
| `RAZORPAY_KEY_ID` | Razorpay payment link creation | For payments |
| `RAZORPAY_KEY_SECRET` | Razorpay order signing | For payments |
| `RAZORPAY_WEBHOOK_SECRET` | HMAC verify Razorpay webhooks | For payments |
| `ANTHROPIC_API_KEY` | Claude AI assistant | For AI features |
| `BACKUP_ENCRYPTION_KEY` | AES-256-GCM key for OAuth token encryption (64 hex chars) | For Google Drive backup |
| `GOOGLE_CLIENT_ID` | Google Drive OAuth | For backup |
| `GOOGLE_CLIENT_SECRET` | Google Drive OAuth | For backup |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry error reporting | For error tracking |
| `MSG91_API_KEY` + `MSG91_SENDER_ID` | SMS via MSG91 | For SMS features |

---

## How to Add a New Module (the pattern)

1. **Migration** — new SQL file `supabase/migrations/00NN_module_name.sql`:
   ```sql
   INSERT INTO modules (key, name, description) VALUES ('mymodule', 'My Module', '...');
   CREATE TABLE mymodule_items (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     org_id uuid NOT NULL REFERENCES organizations(id),
     name text NOT NULL,
     created_at timestamptz DEFAULT now()
   );
   ALTER TABLE mymodule_items ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "read" ON mymodule_items FOR SELECT USING (is_org_member(org_id));
   CREATE POLICY "write" ON mymodule_items FOR ALL USING (is_org_member(org_id));
   ```

2. **Module registry** — add to `MODULES` array in `src/lib/modules.ts`:
   ```typescript
   { key: 'mymodule', name: 'My Module', href: '/dashboard/mymodule', icon: '🔧', category: 'business' }
   ```

3. **Entitle it** — add `'mymodule'` to relevant presets in `BUSINESS_PRESETS`.

4. **Roles** — add `'mymodule'` to the allowed modules for each role in
   `ROLE_MODULES` in `src/lib/types/roles.ts`.

5. **Dashboard page** — `src/app/dashboard/mymodule/page.tsx`:
   ```typescript
   import { getOrgContext } from '@/lib/entitlements';
   import { redirect } from 'next/navigation';

   export default async function MyModulePage() {
     const ctx = await getOrgContext();
     if (!ctx?.enabledModules.has('mymodule') || !ctx.org) redirect('/dashboard');
     // fetch data and render
   }
   ```

6. **API routes** — `src/app/api/mymodule/route.ts`:
   ```typescript
   import { NextRequest, NextResponse } from 'next/server';
   import { getOrgContext } from '@/lib/entitlements';
   import { createClient } from '@/lib/supabase/server';

   export async function GET(req: NextRequest) {
     const ctx = await getOrgContext();
     if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
     const supabase = createClient();
     const { data } = await supabase.from('mymodule_items').select('*').eq('org_id', ctx.org.id);
     return NextResponse.json(data);
   }
   ```

7. **Run migration** in Supabase SQL Editor.

8. **Grant to existing orgs** if needed — add a migration that inserts into `entitlements`:
   ```sql
   INSERT INTO entitlements (org_id, module_key, enabled)
   SELECT id, 'mymodule', true FROM organizations;
   ```

---

## How Onboarding Works

`/onboarding` → `POST /api/onboarding` → calls the `create_organization(name, business_type)` RPC.

The RPC (defined in `0001_init.sql`) does atomically:
1. Inserts a row in `organizations`
2. Inserts the current user as `owner` in `memberships`
3. Inserts entitlement rows from `BUSINESS_PRESETS[business_type]` into `entitlements`
4. Inserts a trial `org_plans` row with `next_billing_date = now() + 7 days`

After RPC returns, app redirects to `/dashboard`.

---

## How the Admin Panel Works

The operator admin at `/admin` is for the platform owner (you, Divyanshu) — not for
tenant users. It:
- Lists all organizations with their plan status
- Allows toggling individual module entitlements per org (writes to `entitlements` table)
- Allows changing plan status (active/trial/locked) and billing dates
- Allows updating platform billing contact

It uses its own HMAC cookie auth (`ADMIN_USERNAME` / `ADMIN_PASSWORD` / `ADMIN_SECRET`)
completely separate from Supabase. There is no DB user for admin accounts.

**The admin cannot see tenant data** — it only manages plan/module records. Tenant data
is protected by RLS with the service-role client never being used in admin routes.

---

## Cron Jobs

Configured in `vercel.json`. Vercel calls these on schedule. All check `CRON_SECRET` header.

| Schedule | Route | Purpose |
|---|---|---|
| Daily midnight | `/api/cron/recurring` | Generate invoices from recurring templates |
| Daily 3am | `/api/cron/backup` | Upload org data to Google Drive |
| Daily 9am | `/api/cron/invoice-reminders` | Email reminder for overdue invoices |

---

## Deployment

**Vercel** deploys automatically from every push to `master` branch.

Manual deploy: `npx vercel --prod --yes`

**No branching** — trunk-based development on `master` only. Dokploy is also configured
to deploy from `master`; a different branch name will cause "Branch Not Match" error.

**Build:** `npm run build` — must pass (TypeScript clean) before declaring work done.

---

## Known Gaps (Do Before Scaling)

| Gap | Risk | Fix |
|---|---|---|
| Trial lock is UI-only | API routes work even when org is locked | Run `0026_rls_by_role.sql` + add RLS condition `org_is_active(org_id)` |
| RLS by role not enforced at DB level | Leaked data if app code bypassed | `0026_rls_by_role.sql` replaces permissive policies |
| Invite links have no email-match guard | Anyone with the link can join | Add check: logged-in email must match invite email |
| AI assistant has no metering | Unbounded Claude API spend | Add `ai_usage` table + per-org token cap |
| Comments `@mentions` stored but no notification | Mentions are silent | Add trigger: parse `@name` → insert notification |
| Archive not universal | Employees, tasks, POs have no `archived_at` | Add column + soft-delete UI to remaining entities |
| `CRON_SECRET` validation has a bug | Missing env var = unprotected cron endpoint | Change `if (secret && auth !== ...)` to `if (!secret \|\| auth !== ...)` |

---

## Quick Reference — Finding Things

| "Where is X?" | Look here |
|---|---|
| Invoice total calculation | `src/lib/invoice/calc.ts` |
| GST split (IGST/CGST/SGST) | `src/lib/invoice/calc.ts` → `computeGST()` |
| PDF invoice layout | `src/lib/pdf/InvoicePDF.tsx` |
| Amount in words | `src/lib/invoice/words.ts` |
| UPI deep link + QR | `src/lib/invoice/upi.ts` |
| Who can see which module | `src/lib/types/roles.ts` → `ROLE_MODULES` |
| Business type → modules | `src/lib/modules.ts` → `BUSINESS_PRESETS` |
| Admin auth logic | `src/lib/adminAuth.ts` |
| API key auth logic | `src/lib/apiKeyAuth.ts` |
| Supabase clients | `src/lib/supabase/{client,server,admin}.ts` |
| Rate limiter | `src/lib/rateLimit.ts` |
| Token encryption | `src/lib/crypto/tokens.ts` |
| Database schema foundation | `supabase/migrations/0001_init.sql` |
| All DB migrations in order | `supabase/migrations/` (0001–0060) |
| Sidebar nav logic | `src/components/Sidebar.tsx` |
| Notification bell | `src/components/NotificationBell.tsx` |
| ⌘K search | `src/components/CommandPalette.tsx` |
| File uploads | `src/components/AttachmentPanel.tsx` |

---

*Document version: June 2026. Supabase project: `rxpxjjjbvwqjxwvvnfhj` (ap-south-1).*
