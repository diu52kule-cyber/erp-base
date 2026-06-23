# ERP Base — Mobile App Design Document

**Problem:** A cashier, a cafe owner, and a warehouse staff member all need completely different
things from a mobile app. One cluttered app with everything overwhelms everyone. Three separate
apps is a maintenance nightmare. This document defines how to solve it with **one app,
multiple surfaces**.

---

## Core Principle: Role-Based Surfaces

When an employee logs in, the app reads their role from Supabase and shows them
**only their surface** — a purpose-built UI for their job. The underlying app is one
codebase. The experience feels purpose-built for each person.

```
Same app, same install
     │
     ├─ Owner/Admin login     → Owner Surface (analytics, approvals, KPIs)
     ├─ Cashier login         → POS Surface (offline billing, barcode, receipts)
     ├─ Manager login         → Ops Surface (team, attendance, expenses)
     ├─ Staff/Employee login  → Employee Surface (payslips, leave, punch-in)
     └─ Warehouse login       → Stock Surface (scan to receive, low-stock, POs)
```

A user with multiple roles (e.g., the cafe owner who also runs the counter) gets a
**surface switcher** — a small toggle in the corner to flip between their modes without
re-logging.

---

## The Five Surfaces

### 1. Owner Surface — "The Dashboard"
Designed for: Owner, Admin, Business Dev

Goal: See the health of the business at a glance. Approve things on the go.

**Home screen:**
```
┌─────────────────────────────────────────┐
│  Good morning, Divyanshu  ⚙             │
│                                         │
│  Today so far                           │
│  ₹ 18,400   revenue   14 orders         │
│                                         │
│  [Revenue chart — 7-day sparkline]      │
│                                         │
│  Needs attention                        │
│  ⚠ 3 expenses pending approval          │
│  ⚠ 2 leave requests                     │
│  ⚠ Invoice INV-0041 overdue 7 days      │
│                                         │
│  Top products today                     │
│  Cold coffee  ×22   Pasta  ×14          │
└─────────────────────────────────────────┘
```

**Screens:**
- Home: KPIs + alerts
- Revenue: chart (day/week/month/year), compare MoM
- Approvals: expenses, leaves, POs — one-tap approve/reject
- Alerts: overdue invoices, low stock, payroll due
- Quick actions: send invoice, record expense, message team

---

### 2. POS Surface — "The Counter"
Designed for: Cashier, Chef, Store Manager

Goal: Fast billing with or without internet. Camera barcode scanning.

**Home screen:**
```
┌─────────────────────────────────────────┐
│  [🔴 OFFLINE — 3 orders queued]         │
│                                         │
│  [📷 Scan]  [🔍 Search]  [Fav ☆]       │
│                                         │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  │
│  │Coffee│ │Pasta │ │Chai  │ │Wrap  │  │
│  │ ₹120 │ │ ₹220 │ │ ₹60  │ │ ₹180 │  │
│  └──────┘ └──────┘ └──────┘ └──────┘  │
│                                         │
│  Cart  (3 items)            ₹ 780       │
│  └─ Coffee ×2, Wrap ×1                  │
│                             [Charge →]  │
└─────────────────────────────────────────┘
```

**Screens:**
- Product grid (favourites tab + categories)
- Barcode scanner (camera, opens product directly)
- Cart with qty, discount, notes per line
- Tender screen (cash / UPI / card + change calculator)
- Receipt: share via WhatsApp, print via Bluetooth
- Session: open/close with cash float
- Offline queue: shows pending syncs, retry button

**Offline-first:** All products, prices, and open POS session cached locally (SQLite).
Orders created locally → synced to Supabase when internet returns. Works for hours offline.

---

### 3. Ops Surface — "The Manager View"
Designed for: Manager, HR, Operations

Goal: Run the team. Track attendance, approve leave, manage expenses.

**Screens:**
- Team: today's attendance at a glance (present/absent/late)
- Quick mark: tap employee → present/absent/half-day
- Leave requests: approve/reject with one tap
- Expense claims: review receipts (image), approve/reject
- Shift roster: weekly view of who's working when
- Announcements: post to team

---

### 4. Employee Surface — "My Work"
Designed for: Staff, Developer, Designer (any non-manager role)

Goal: My own information only. Minimal, fast.

**Screens:**
- Home: punch in/out (GPS recorded), today's status
- My payslips: view + download PDF
- Leave: apply, check balance, see history
- My tasks: assigned tasks, update status
- Attendance: my own history + overtime
- Settings: change password, notification prefs

---

### 5. Stock Surface — "The Warehouse"
Designed for: Warehouse, Procurement

Goal: Receive stock, scan to confirm, report low stock.

**Screens:**
- Scan to receive: scan PO barcode → auto-match PO → confirm quantities → GRN created
- Inventory list: current stock levels, filter low stock
- Stock adjustment: scan product barcode → +/− quantity
- Pending POs: what's expected to arrive
- Raise alert: tap low-stock product → notify owner

---

## Offline Billing — How It Works

The biggest value unlock. Cafes have spotty internet. The POS cannot go down at peak hours.

### Architecture

```
Phone (Expo)
│
├── expo-sqlite (local DB)
│     ├── products (synced on startup + every 15 min)
│     ├── pos_sessions (current session)
│     ├── pos_orders (created locally)
│     └── sync_queue (orders pending upload)
│
├── Network monitor (NetInfo)
│     ├── ONLINE → write locally + sync immediately
│     └── OFFLINE → write to sync_queue, show banner
│
└── Sync engine (background task)
      ├── Runs when network restored
      ├── Uploads sync_queue orders to Supabase
      ├── Resolves conflicts by timestamp
      └── Clears synced rows from queue
```

### User flow offline

1. Network drops → orange "Offline — orders will sync" banner appears
2. Cashier bills normally — barcode, cart, charge
3. Order saved locally with `synced: false`
4. Tender screen shows "Saved offline" instead of "Order complete"
5. Network returns → background task uploads all queued orders
6. Banner turns green "3 orders synced", then disappears
7. Inventory deducted, audit log written, receipt re-sendable

### What works offline

| Feature | Offline? |
|---|---|
| Scan barcode → add to cart | ✅ (products cached) |
| Create order + calculate totals | ✅ |
| Cash / UPI tender | ✅ |
| Print receipt (Bluetooth printer) | ✅ |
| View session total | ✅ (local sum) |
| New product added from web → appears in POS | ❌ (needs sync) |
| Stock deduction reflected on web instantly | ❌ (delayed until sync) |
| Payment gateway (Razorpay) | ❌ (needs internet) |

---

## Barcode Scanning

### Camera-based (no hardware required)

Uses `expo-camera` + `expo-barcode-scanner`. The cashier taps the scan button,
camera opens, points at product barcode (EAN-13, QR, Code-128) → product added to cart instantly.

### Flow

```
[Scan button]
    │
    ▼
Camera opens (full screen, auto-focus)
    │
    ▼
Barcode detected
    │
    ├── Found in local products cache → add to cart, play beep, camera stays open
    ├── Not found locally, online → search Supabase → add or show "Unknown product"
    └── Not found anywhere → "Product not found — add manually?" prompt
```

### Supported barcode formats
EAN-13 (grocery), EAN-8, UPC-A, Code-128 (shelf labels), QR code (UPI, custom).

### Rapid scan mode
After adding a product, camera stays open (doesn't close). The cashier can scan
5 items in 3 seconds. Cart updates in real time behind the camera overlay.

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Expo (React Native) | Same JS skills as Next.js, OTA updates, single codebase for iOS + Android |
| Local DB | expo-sqlite | Structured offline storage, survives app restart |
| Sync | Supabase JS client + Realtime | Same backend as web, no new API needed |
| Barcode | expo-barcode-scanner | Native camera access, works on all Android/iOS |
| Bluetooth print | react-native-bluetooth-printer | ESC/POS receipt printers (Epson, Bixolon) |
| State | Zustand | Lightweight, works offline |
| Navigation | Expo Router | File-based, similar to Next.js App Router |
| Push notifications | Expo Notifications + Supabase Realtime | Owner alerts, leave approvals |
| Auth | Supabase Auth (same project) | Same accounts as web — employees log in with their ERP credentials |

---

## How Surfaces Are Assigned

```typescript
// On login, role is fetched from memberships table
const role = membership.role; // 'cashier' | 'owner' | 'manager' | 'staff' | 'warehouse' ...

// Surface map
const SURFACE: Record<OrgRole, Surface> = {
  owner:      'owner',
  admin:      'owner',
  manager:    'ops',
  hr:         'ops',
  cashier:    'pos',
  chef:       'pos',
  store_manager: 'pos',
  warehouse:  'stock',
  procurement: 'stock',
  staff:      'employee',
  developer:  'employee',
  designer:   'employee',
  // ... etc
};

// App renders only the surface for this role
<Surface type={SURFACE[role]} />
```

Multi-role users (owner who also cashiers) get a floating mode icon bottom-right:
tap it to flip surfaces without re-authenticating.

---

## Build Order (Waves)

### Wave 1 — Core (Ship this first)
- [ ] Auth: login with ERP credentials, surface routing
- [ ] Owner Surface: revenue KPI home, 7-day chart, top products
- [ ] POS Surface: product grid, cart, cash tender, receipt
- [ ] Offline: SQLite product cache, sync queue, network banner
- [ ] Barcode: camera scan → add to cart

### Wave 2 — Employee & Operations
- [ ] Employee Surface: punch in/out (GPS), payslips PDF, leave apply
- [ ] Ops Surface: attendance mark, leave approve/reject
- [ ] Push notifications: owner alerts, approval requests

### Wave 3 — Stock & Advanced
- [ ] Stock Surface: scan to receive GRN, inventory list
- [ ] Bluetooth receipt printing
- [ ] Owner approvals: one-tap expense + leave from notification
- [ ] POS: UPI QR generation, Razorpay card payment

### Wave 4 — Polish
- [ ] Biometric login (Face ID / fingerprint)
- [ ] 4-digit PIN for fast cashier device switching (shared counter device)
- [ ] Offline analytics (owner can view last-synced data offline)
- [ ] Dark mode, Indian language support (Hindi UI strings)

---

## Key Design Decisions

| Decision | Choice | Reason |
|---|---|---|
| Separate apps vs one app | One app, role surfaces | Single install, single update, shared auth |
| Native vs web | Expo (React Native) | Camera, Bluetooth, offline SQLite — web can't do these reliably |
| Offline DB | SQLite (expo-sqlite) | Persists across restarts, relational, fast |
| Sync strategy | Queue + replay | Simple, no CRDT complexity needed for POS orders |
| Barcode hardware | Camera only (no scanner gun) | Zero hardware cost, every phone has a camera |
| Shared device (POS) | PIN switch, no re-login | A counter shared by 2 cashiers should not require full re-auth |
| Auth | Same Supabase project | No separate auth system — employees use the same credentials as the web ERP |

---

## What This Is Not

- **Not a separate backend.** Connects to the same Supabase project as the web app.
  Zero new API code needed for most features.
- **Not a separate codebase forever.** Types, business logic (GST calc, invoice math),
  and constants can be shared via an npm workspace or copy-paste initially.
- **Not a PWA.** PWAs can't do camera-based barcode scanning reliably on Android
  or access Bluetooth printers. A native app is the right call.

---

## Repo Structure (new `mobile/` project)

```
erp-mobile/           ← separate Expo project (new repo or monorepo package)
├── app/
│   ├── (auth)/login.tsx
│   ├── (owner)/         ← Owner Surface screens
│   ├── (pos)/           ← POS Surface screens
│   ├── (ops)/           ← Ops Surface screens
│   ├── (employee)/      ← Employee Surface screens
│   └── (stock)/         ← Stock Surface screens
├── lib/
│   ├── supabase.ts      ← same Supabase URL/anon key as web
│   ├── sqlite.ts        ← local DB schema + migrations
│   ├── sync.ts          ← sync queue engine
│   └── surface.ts       ← role → surface mapping
├── components/
│   ├── BarcodeScanner.tsx
│   ├── Cart.tsx
│   ├── OfflineBanner.tsx
│   └── SurfaceSwitcher.tsx
└── app.json
```

---

*Document version: June 2026. Update when Wave 1 scope is finalized.*
