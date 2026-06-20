# CLAUDE.md — Project context for Claude Code

This file orients Claude Code on this project. Read it before making changes.

## What this is
A modular, multi-tenant business-management SaaS (think a focused, lighter
alternative to Odoo/Zoho) for Indian SMBs: cafes, shops, malls, startups,
freelancers, and general businesses. Customers subscribe to a tailored set of
modules; the platform enables only what each customer's plan includes.

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
  auth systems, billing lifecycle, screen strategy, data model). Read it first; all
  structural changes should fit this map.
- `ROADMAP.md` — **plan of action**: prioritized future initiatives (offline POS, QR
  ordering, WhatsApp ops, analytics, AI layer, hardware, loyalty CRM, team/startup tools,
  pricing tiers) with dependencies and build waves.
- `supabase/migrations/0001_init.sql` — tenants (`organizations`), `memberships`,
  the sellable-feature catalog (`modules`), per-tenant `entitlements`, RLS policies,
  and the `create_organization` RPC.
- `src/lib/supabase/{client,server,middleware}.ts` — Supabase clients (browser,
  server component, middleware) using `@supabase/ssr`.
- `src/lib/supabase/admin.ts` — service-role admin client for server-only operations.
- `src/middleware.ts` — refreshes session, protects `/dashboard`.
- `src/lib/modules.ts` — registry mapping module keys to dashboard nav entries.
- `src/lib/entitlements.ts` — `getOrgContext()` returns the current user, their org,
  and the set of enabled module keys. Use this to gate everything.
- `src/app/dashboard/layout.tsx` — sidebar with ThemeToggle; shows only entitled modules.
- `src/components/ThemeToggle.tsx` — dark/light mode toggle, persists to localStorage.
- `src/app/api/auth/signup/route.ts` — server-side signup via admin client (bypasses
  email rate limits; sets `email_confirm: true`).

## How to add a module (the core pattern)
1. Add a row to the `modules` table (new migration).
2. Add an entry to `MODULES` in `src/lib/modules.ts`.
3. Create `src/app/dashboard/<key>/page.tsx` and guard it:
   `const ctx = await getOrgContext(); if (!ctx?.enabledModules.has("<key>") || !ctx.org) redirect("/dashboard");`
4. Add tenant-scoped tables WITH RLS policies keyed on `is_org_member(org_id)`.

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

> See `ROADMAP.md` for what's next (offline POS, QR ordering, WhatsApp, analytics, AI metering,
> loyalty CRM, hardware) and the security hardening backlog (RLS-by-role, API-level guards).

### Known gaps / hardening backlog (do before scaling users)
- **Role enforcement:** UI via `getOrgContext`, AND **DB-level via RLS** — `role_modules` map +
  `has_module_access(org_id, module)` replace the permissive "org members" policies on tenant
  tables (migration `0026_rls_by_role.sql`; owner/admin/manager always full access). Since API
  routes query with the user session, this enforces role for both browser-direct queries and the
  app's APIs. **Run 0026 to activate.**
- **Trial-lock is still UI-level only** (dashboard redirect to `/locked`); not enforced in RLS yet.
- **Invites are bearer links** — acceptance doesn't verify the logged-in email matches the invited
  email. Add an email match check if invites should be locked to the recipient.
- **AI Assistant** has no usage metering/caps — gate behind a paid tier + per-org limits before
  enabling `ANTHROPIC_API_KEY` (one key = all clients spend your tokens).
- **Preferences are per-device** (localStorage), not synced to the account.

---

## Phase 20 — Mobile App (React Native / Expo) — SEPARATE PROJECT
This cannot be built inside this monorepo. Start a new Expo project that connects to the same
Supabase project (same auth + RLS — no backend changes needed).
- Invoice create + view on mobile
- Attendance mark (GPS check-in) for field employees
- POS lite (scan barcode → add to cart → charge)
- Push notifications via Expo + Supabase Realtime

---

## Deferred / future phases

## Deferred verticals (add as modules later, do not build into core)
- Education / school: fee collection, timetable, student records
- Healthcare: patient records, appointment scheduling, billing (add ICD codes)
- Real estate: property listings, rent collection, maintenance tickets
