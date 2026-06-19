# PLAN OF ACTION — Roadmap

> Companion to [ARCHITECTURE.md](ARCHITECTURE.md). That doc = **how it's built today**.
> This doc = **what to build next and why**. Everything here is 🔜 planned.
> Priority: **P0 = very high / land deals** · **P1 = high / stickiness** · **P2 = moat / differentiation**

---

## Strategic thesis

Beat Petpooja-style incumbents on the Indian SMB/cafe market by being **software + hardware + AI + WhatsApp-native** in one modular platform.

```
   LAND               EXPAND                 LOCK-IN
   ────               ──────                 ───────
   POS that works     Analytics + CRM        AI insights + Hardware
   offline + QR       that make owners        ecosystem + custom
   ordering           depend on us            workflows = high switching cost
```

---

## Priority snapshot

| # | Initiative | Priority | Why it matters |
|---|---|---|---|
| R1 | **Offline-first POS** | 🔴 P0 | Cafes reject POS that dies with internet. Petpooja's main edge. |
| R2 | **QR ordering** (scan → order → pay → split → call waiter) | 🔴 P0 | Must-have for Raasta-style cafes. |
| R3 | **WhatsApp-native operations** | 🔴 P0 | Highest-ROI channel in India. |
| R4 | **Analytics engine** | 🟠 P1 | Best-seller / dead stock / rush hour / repeat %. Data foundation for AI. |
| R5 | **Restaurant CRM + loyalty** | 🟠 P1 | Loyalty, birthdays, visit history, favorites — beats generic CRM. |
| R6 | **Mobile owner app** | 🟠 P1 | Today's sales, live orders, alerts, cash — in the owner's pocket. |
| R7 | **AI layer** (assistant + insights) | 🟡 P2 | "Why did sales drop?" Nobody does this well for SME India. |
| R8 | **Hardware ecosystem** | 🟡 P2 | Printer/scanner/soundbox/KDS/scale. Hardware = moat + revenue. |
| R9 | **Team collaboration & startup tools** | 🟠 P1 | Docs, task assignment, accountability — broadens beyond cafes. |
| R0 | **Pricing tiers (Starter/Growth/Enterprise)** | 🟠 P1 | Packages the above into sellable plans. |

**Foundation first (from ARCHITECTURE §9):** role→module gating + RLS, and the `/station` full-screen shell. R1, R2, R8(KDS) all sit on the station shell.

---

## R1 · Offline-first POS  🔴 P0
**Why:** internet dies → orders must continue. Without this, many cafes won't buy.
**Needs:** local cache · offline order queue · sync-on-reconnect · offline-safe receipt numbering.
**Architecture fit:**
- `/station/pos` becomes a **PWA** (service worker + IndexedDB).
- Orders write to a local queue → sync to `pos_orders` when online.
- Server stays authoritative: **reserve order-number ranges per device** so offline receipts don't collide.
- Idempotent sync (client-generated UUID per order) to avoid duplicates.
**Depends on:** `/station` shell.
**Risks:** sync conflicts, stock-decrement races, clock skew. Resolve server-side at sync.

## R2 · QR ordering  🔴 P0
**Flow:** scan table QR → menu → order → pay → split bill → call waiter.
**Architecture fit:**
- New **public** per-table route `/t/[org]/[table]` (no login — guest session).
- New `tables` entity + table sessions; reuses `pos_orders`/`pos_order_lines`.
- Pay → Razorpay (existing). "Call waiter" → `notifications` + KDS ping.
**Depends on:** public menu data, payments (✅), KDS (R8) for waiter pings.

## R3 · WhatsApp-native operations  🔴 P0
**Features:** order confirmation · bill PDF · promotions · reservation confirmation · abandoned-cart reminder.
**Architecture fit:**
- ⚠️ Today "WhatsApp" is only a `wa.me` link on the paywall. This is a **full Business API** integration (provider: Interakt / Gupshup / Twilio / Meta Cloud API).
- Outbound = approved templates; inbound = webhook. Reuses invoice **PDF** (Phase 12).
- New `whatsapp_templates`, `message_log`; opt-in tracking for compliance.
**Depends on:** provider account + template approval (lead time).

## R4 · Analytics engine  🟠 P1
**Metrics:** best seller · dead inventory · rush hour · repeat-customer % · staff performance.
**Architecture fit:**
- New `/dashboard/analytics`; aggregation via SQL views / scheduled rollups into an `analytics_daily` table.
- Time-series over `pos_orders`, `invoices`, `stock_movements`, `memberships`.
- This is the **data foundation the AI layer (R7) reads.**

## R5 · Restaurant CRM + loyalty  🟠 P1
**Features:** loyalty points · birthday offers · visit history · favorite dishes · WhatsApp campaigns.
**Architecture fit:**
- Extend `contacts`; add `loyalty_accounts`, `loyalty_transactions`, `customer_visits`.
- Favorites derived from `pos_order_lines`. Campaigns ride on R3 (WhatsApp).

## R6 · Mobile owner app  🟠 P1
**Screens:** today's sales · live orders · alerts · cash balance · push.
**Architecture fit:** = **Phase 20** (Expo, separate repo, same Supabase + RLS). Live orders via Supabase Realtime; push via Expo. No backend changes needed.

## R7 · AI layer  🟡 P2  (key differentiator)
**Assistant:** "Show low stock", "Why did sales drop?", "Predict tomorrow's inventory".
**Insights:** auto cards like *"Mojito sales up 18% on weekends."*
**Architecture fit:**
- Server route → Claude (latest Sonnet/Opus) with **tool-use over the org's data, read-only and RLS-scoped**.
- Insight generation = scheduled job writing to an `insights` table → shown on dashboard/notifications.
**Depends on:** R4 (analytics data). **Guardrails:** strict tenant isolation, cost caps, never expose service-role.

## R8 · Hardware ecosystem  🟡 P2  (moat)
**Devices:** thermal printer · barcode scanner · soundbox · **KDS** · weight scale · QR scanner.
**Architecture fit:**
- **KDS** = `/station/kds` + Realtime + `pos_orders.kitchen_status` (already in ARCHITECTURE §6).
- Printer via **ESC/POS** (WebUSB/Bluetooth) or a small **local print-agent**; scanner/scale via WebHID/Serial.
- Soundbox: payment webhook → device announces amount.
- Define a **Hardware/Device API** so partners can integrate.

## R9 · Team collaboration & startup tools  🟠 P1
**(Broadens the platform beyond cafes — for startups/agencies.)**
- **Docs / wiki:** `/dashboard/docs` — pages, folders, sharing. New `docs`, `doc_versions`.
- **Task assignment:** extend existing `tasks` (Projects module already has Kanban) with `assignee_id`, due dates, priority, **@mentions**, comments.
- **Accountability:** activity feed built on `audit_log` (✅) + task ownership + status SLAs.
- **Collaboration:** comments + mentions → `notifications` (✅).
**Architecture fit:** mostly extends the **Projects** module + a new **Docs** module (follows the standard module pattern).

## R0 · Pricing tiers  🟠 P1
Package modules into sellable bundles; admin picks a tier → entitlements auto-set.

```
 STARTER            GROWTH                 ENTERPRISE
 ───────            ──────                 ──────────
 POS                + CRM                  + AI layer
 Inventory          + QR ordering          + Custom workflows
 Billing            + Analytics            + Hardware APIs
```

**Architecture fit:** map `plan_name` → a **module bundle**; selecting a tier in `/admin/clients/[id]`
auto-toggles `entitlements`. Add a `plan_modules` map (or `plan_bundles` table) so tiers stay in sync.

---

## Suggested sequencing (waves)

```
 FOUNDATION   role→module gating + RLS  ·  /station shell  ·  pricing-tier entitlements
     │
     ▼
 WAVE 1  (land cafes)     KDS → Offline POS (R1) → QR ordering (R2) → WhatsApp confirms (R3)
     │
     ▼
 WAVE 2  (stickiness)     Analytics (R4) → Restaurant CRM/loyalty (R5) → Mobile owner app (R6)
     │
     ▼
 WAVE 3  (moat)           AI assistant + insights (R7) → Hardware ecosystem (R8) → Custom workflows
     │
     ▼
 PARALLEL TRACK           Team collab & startup tools (R9) — independent of the cafe waves
```

## Dependency map

```
 /station shell ──┬──► Offline POS (R1)
                  ├──► QR ordering (R2) ──► payments ✅
                  └──► KDS (R8) ──► QR "call waiter" (R2)

 WhatsApp API (R3) ──► CRM campaigns (R5) ──► loyalty
 Analytics (R4) ─────► AI layer (R7)
 audit_log ✅ ───────► accountability (R9)
 Projects/tasks ✅ ──► task assignment + docs (R9)
```

---

## Open decisions (resolve before each wave)
- **WhatsApp provider** (Interakt vs Gupshup vs Meta Cloud API) — affects R3/R5 cost + template flow.
- **Offline sync model** — per-device number ranges vs central reservation on reconnect (R1).
- **AI hosting/cost** — per-org token budgets, which queries are live vs scheduled (R7).
- **Print path** — local agent vs browser WebUSB (R8) — agent is more reliable on Windows tablets.
- **Pricing numbers** — actual ₹ per tier (R0) and what's metered (orders? users? outlets?).
