# ARCHITECTURE — Visual structure of the ERP platform

> Living reference. All future structural changes should fit this map.
> Legend:  ✅ built today   ·   🔜 planned / not enforced yet   ·   ⚙️ pattern/convention

---

## 1. System overview (one modular monolith)

```
┌──────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                    │
│   Browser (back-office)   ·   Counter tablet 🔜   ·   Kitchen TV 🔜     │
└───────────────────────────────┬──────────────────────────────────────┘
                                 │  HTTPS
┌───────────────────────────────▼──────────────────────────────────────┐
│                  NEXT.JS 14 APP (App Router, one repo)                  │
│                                                                        │
│   middleware.ts ──► session refresh + route protection                 │
│        │                                                               │
│        ├─ Server Components (pages)  ── getOrgContext() gate           │
│        ├─ API routes (/api/**)       ── all mutations live here ⚙️     │
│        └─ Client Components          ── forms, POS, realtime 🔜        │
│                                                                        │
│   lib/  modules.ts · entitlements.ts · adminAuth.ts · supabase/*       │
└───────────────────────────────┬──────────────────────────────────────┘
                                 │  @supabase/ssr  +  service-role admin
┌───────────────────────────────▼──────────────────────────────────────┐
│                          SUPABASE (Postgres)                           │
│   Auth (users)  ·  Row-Level Security (tenant isolation)  ·  Storage   │
│   RLS keyed on is_org_member(org_id) for EVERY tenant table ⚙️         │
└────────────────────────────────────────────────────────────────────────┘

Deploy: Git push → Vercel (Dockerfile, standalone) → erp-base-eight.vercel.app
```

---

## 2. The access model — THREE planes

Access = intersection of three independent questions. This is the spine of the app.

```
   PLANE 1: TENANT / PLAN            PLANE 2: ROLE                PLANE 3: SCREEN
   "What did the business buy?"      "What is this person?"       "What UI are they using?"
   ────────────────────────         ────────────────────         ──────────────────────
   entitlements table        ∩      memberships.role       =      dashboard module page
   (per-org module set)             owner/manager/...             or station screen 🔜
   org_plans.status                 ROLE_MODULES map 🔜
   (trial/active/locked)

        ✅ ENFORCED                    🔜 cosmetic only             ✅ dashboard / 🔜 station
```

### Plane 1 — Tenant / Plan ✅
`getOrgContext()` ([src/lib/entitlements.ts](src/lib/entitlements.ts)) returns:
```
{ user, org, enabledModules (Set from DB), plan, access, trialDaysLeft }
   access = 'active' | 'trial' | 'locked'
```
- `enabledModules` ← `entitlements` table (seeded by business-type preset on signup).
- `access` ← `org_plans.status` + `next_billing_date`.  `locked` → redirect to `/locked`.

### Plane 2 — Role  ✅ (enforced for visibility) · 🔜 (RLS layer pending)
`memberships.role` ∈ `owner · manager · accountant · hr · staff` ([src/lib/types/roles.ts](src/lib/types/roles.ts)).
- ✅ `ROLE_MODULES` map is intersected with org `enabledModules` in `getOrgContext()`,
  so each member only sees their role's modules in the sidebar, dashboard, and page guards.
- ✅ Effective access = **org's enabled modules ∩ role's allowed modules** (owner/manager = all).
- ✅ Gates team-management actions (invite / change role / remove).
- 🔜 Still UI-level only — needs **RLS policies keyed on role** for true write protection,
  and per-member overrides for custom cases.

Role → module access (edit `ROLE_MODULES`):
| Role | Modules |
|---|---|
| owner / manager | everything |
| accountant | billing, payments, accounting, reports, expenses, purchase, subscriptions, import + docs, tasks, check-ins, decisions, AI |
| hr | hr, reports, expenses, import + docs, tasks, goals, meetings, check-ins, decisions, AI |
| staff | pos, inventory + projects, tasks, issues, features, docs, meetings, check-ins, AI |

### Plane 3 — Screen  (dashboard ✅ · station 🔜)
- ✅ **Dashboard pages** — back-office, full chrome (sidebar), one per module.
- 🔜 **Station screens** — full-screen, no sidebar, per device/job (POS, KDS). See §6.

---

## 3. Route map

```
PUBLIC (no auth)
  /                      landing
  /login  /signup        Supabase auth
  /invite/[token]        accept team invite ✅

ONBOARDING (auth, no org yet)
  /onboarding            3-step wizard → creates org + 7-day trial + preset entitlements ✅

PAYWALL (auth, org locked)
  /locked                trial expired → Razorpay pay + WhatsApp/QR contact ✅

DASHBOARD (auth + org + access≠locked)        ← gated by getOrgContext()
  /dashboard                         tailored home (KPIs, quick actions) ✅
  /dashboard/billing      + /[id] /new        invoices ✅
  /dashboard/payments     + /new              payments ✅
  /dashboard/inventory    + /new              products, stock ✅
  /dashboard/pos          + /sessions         POS  ✅ (⚠️ lives in dashboard chrome → move to /station 🔜)
  /dashboard/purchase     + /[id] /new        purchase orders ✅
  /dashboard/crm          contacts / deals    ✅
  /dashboard/hr           attendance/payroll  ✅
  /dashboard/subscriptions plans/customers    ✅
  /dashboard/projects     + /[id] /new        projects, tasks, time ✅
  /dashboard/expenses                         expense claims ✅
  /dashboard/accounting   gstr1/gstr3b/settings ✅
  /dashboard/reports                          cross-module ✅
  /dashboard/import                           CSV wizard ✅
  /dashboard/settings     team/currencies/api/webhooks ✅

STATION SCREENS 🔜 (auth + role + entitlement, full-screen, no sidebar)
  /station/pos            cashier   (move existing POS here)
  /station/kds            kitchen display + Supabase Realtime
  /station/display        customer "order ready" board (optional)

ADMIN — operator only (SEPARATE auth, erp_admin_session cookie)
  /admin/login                       username+password, rate-limited ✅
  /admin/clients   + /[id]           manage orgs: plan, status, modules, MRR ✅
  /admin/settings                    platform billing contact (WhatsApp/UPI/QR) ✅

API  /api/**  ⚙️ all writes; Bearer for /api/v1/*; admin cookie for /api/admin/*
```

---

## 4. Two separate auth systems  ⚙️

```
            USER AUTH (tenants)                     ADMIN AUTH (operator = you)
            ───────────────────                     ──────────────────────────
  who       business owners + employees             platform operator
  store     Supabase Auth (cookie via ssr)          erp_admin_session (HMAC cookie)
  creds     email + password                        ADMIN_USERNAME/PASSWORD/SECRET (env)
  guards    middleware → /dashboard, /locked         middleware → /admin/* (not /admin/login)
  code      lib/supabase/*                            lib/adminAuth.ts
  hardening rate-limit on login 🔜                    rate-limit + timing-safe compare ✅
```
They never mix: an admin needs no Supabase account; a tenant never sees `/admin`.

---

## 5. Trial & billing lifecycle  ✅

```
  signup ──► onboarding ──► TRIAL (7 days, full access)
                                │
              trialDaysLeft≤? banner in dashboard
                                │ next_billing_date passes
                                ▼
                            LOCKED  ──redirect──►  /locked (paywall)
                                                     │
                        ┌────────────────────────────┼───────────────────────┐
                        ▼                             ▼                        ▼
              Razorpay "Pay & reactivate"   WhatsApp button + QR        UPI / email
                        │ payment.captured webhook (kind=subscription)
                        ▼
                     ACTIVE  (next_billing_date = today + period)
                        ▲
        Admin sets amount/status/next_billing_date in /admin/clients/[id]
        (suspended / cancelled → also LOCKED)
```

---

## 6. Screen strategy for retail/cafe (the "different screens" plan) 🔜

```
                       ┌──────────── pos_orders / pos_order_lines ────────────┐
                       │                  (one data set)                       │
        WRITES new ▼                                                  ▼ READS+updates
   ┌──────────────────────┐   order flows live    ┌──────────────────────────┐
   │  /station/pos         │ ───────────────────►  │  /station/kds            │
   │  cashier · counter    │  Supabase Realtime    │  kitchen · marks ready   │
   │  grid+cart+tender     │                       │  new→preparing→ready     │
   └──────────────────────┘                       └──────────────────────────┘
        role: cashier/staff                            role: kitchen/staff
   needs: kitchen_status column on pos_orders (migration) 🔜

  Device sign-in for shared screens 🔜:
    • kiosk login (device pinned to one screen)  OR
    • staff 4-digit PIN (fast switching + attribution)
```

---

## 7. Module + entitlement pattern  ⚙️ (how every feature plugs in)

```
  modules table (catalog)  ──FK──  entitlements (org_id, module_key, enabled)
        ▲                                   ▲
  MODULES registry          BUSINESS_PRESETS[type] → which modules on at signup
  (src/lib/modules.ts)      cafe/shop/freelancer/startup/mall/general

  To add a module:  ① modules row (migration)  ② MODULES entry
                    ③ /dashboard/<key>/page.tsx + getOrgContext guard
                    ④ tenant tables WITH RLS via is_org_member(org_id)
```

---

## 8. Data model (grouped by domain)

```
TENANCY / ACCESS    organizations · memberships · modules · entitlements
                    org_plans · org_invites · platform_settings
BILLING             invoices · invoice_items · payments · accounting_settings
INVENTORY           products · stock_movements
POS                 pos_sessions · pos_orders · pos_order_lines   (+ kitchen_status 🔜)
CRM                 contacts · deals
HR / PAYROLL        employees · attendance · payroll_runs · payroll_entries · statutory_settings
SUBSCRIPTIONS       subscription_plans · customer_subscriptions
PROJECTS            projects · tasks · time_entries
EXPENSES            expense_categories · expense_claims
MULTI-CURRENCY      currencies · org_currency_settings
PLATFORM/INTEG.     api_keys · webhooks · notifications · audit_log · attachments
ACCESS (planned)    member_permissions 🔜 (per-user overrides)  · custom_roles 🔜

Every tenant table: org_id uuid → organizations(id), RLS ON, policies via is_org_member(org_id) ⚙️
```

---

## 9. Build order for the planned layers (🔜)

```
  1. Role → module gating      (ROLE_MODULES ∩ enabledModules in getOrgContext + guards)
  2. RLS role enforcement      (DB-level write protection per role)         ← security-critical
  3. Station shell + move POS  (/station full-screen layout)
  4. KDS screen + Realtime     (kitchen_status migration)
  5. Staff PIN / kiosk login   (shared-device sign-in)
  6. Per-user permission overrides + custom roles (enterprise scale)
```
Rule of thumb: **UI hiding is not security — every access rule must also exist in RLS.**
