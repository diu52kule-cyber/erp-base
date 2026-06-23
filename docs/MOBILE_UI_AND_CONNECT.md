# ERP Base Mobile — UI Design & Connection Guide

Companion to `MOBILE_APP.md`. Covers screen-by-screen wireframes, the design system,
and exact steps to create and connect the Expo app to the existing Supabase backend.

---

## Design System

### Color Palette

```
Background     #F9FAFB   (neutral-50)   — screen backgrounds
Surface        #FFFFFF   (white)        — cards, bottom sheets
Border         #E5E7EB   (neutral-200)  — dividers, input outlines
Text primary   #111827   (neutral-900)  — headings, prices
Text secondary #6B7280   (neutral-500)  — labels, timestamps
Accent         #111827   (black)        — primary buttons, active states

Success        #16A34A   (green-600)    — paid, present, synced
Warning        #D97706   (amber-600)    — low stock, offline, pending
Danger         #DC2626   (red-600)      — void, reject, error
Info           #2563EB   (blue-600)     — UPI, info badges

Dark mode: invert backgrounds only — #111827 bg, #1F2937 surface, #374151 border
```

### Typography (System fonts via Expo)

```
Heading XL   — 28px, Bold     (owner KPI numbers)
Heading L    — 22px, SemiBold (screen titles)
Heading M    — 18px, SemiBold (card titles, product names)
Body         — 15px, Regular  (descriptions, list items)
Label        — 13px, Medium   (form labels, table headers)
Caption      — 12px, Regular  (timestamps, secondary info)
Mono         — 14px, Mono     (invoice numbers, codes, prices in POS)
```

### Spacing Scale

```
xs   4px    — icon-to-text gap
sm   8px    — within components
md   16px   — card padding, between items
lg   24px   — section gap
xl   32px   — screen padding top/bottom
```

### Key Components

```
PrimaryButton   — full width, black bg, white text, 14px rounded, 52px height
GhostButton     — full width, black border, black text
IconButton      — 44×44 touch target, icon centered
ProductCard     — 2-column grid, image/icon top, name + price below, +/− on tap
BottomSheet     — slides up, handle bar, 90% height max
Badge           — pill shape, colored bg, 12px text
OfflineBanner   — full width, amber, fixed to top below status bar
```

---

## Screen Wireframes

All screens shown at ~390px width (iPhone 15 / standard Android).
`[...]` = image/icon area. `█` = filled/colored element.

---

### Login Screen (shared by all roles)

```
┌─────────────────────────────────────────┐
│                                         │ ← status bar
│                                         │
│                                         │
│              ████████████               │
│              █  ERP Base █               │
│              ████████████               │  ← logo / brand
│                                         │
│         Business management             │
│         built for India                 │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  Email                          │    │
│  │  you@company.com                │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  Password                       │    │
│  │  ••••••••••                 👁  │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  █████  Sign In  █████          │    │  ← black button
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  ⬡  Sign in with Google        │    │  ← ghost button
│  └─────────────────────────────────┘    │
│                                         │
│  Forgot password?           Sign up →   │
│                                         │
│  ─────────────────────────────────────  │
│  🔒 Your data stays in your org only    │
└─────────────────────────────────────────┘
```

**After login:** App reads `membership.role` → routes to the correct surface.
No "choose your role" screen — it's automatic.

---

### Owner Surface

#### Home (default screen)

```
┌─────────────────────────────────────────┐
│  Good morning, Divyanshu  🔔  ⚙️        │
├─────────────────────────────────────────┤
│                                         │
│  Today · Tue 24 Jun                     │
│                                         │
│  ┌────────────────┐ ┌────────────────┐  │
│  │ Revenue        │ │ Orders         │  │
│  │ ₹ 18,400       │ │ 34             │  │
│  │ ↑ 12% vs Mon   │ │ ↑ 4 vs Mon    │  │
│  └────────────────┘ └────────────────┘  │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  [Revenue chart — 7-day line]   │    │
│  │   ___                  ___      │    │
│  │  /   \__          ____/   \     │    │
│  │        \__________/             │    │
│  │  Mon  Tue  Wed  Thu  Fri  Sat   │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ● Needs your attention                 │
│  ┌─────────────────────────────────┐    │
│  │ ⚠ 3 expenses pending          › │    │
│  │ ⚠ 2 leave requests            › │    │
│  │ ⚠ INV-0041 overdue 7 days     › │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Top products today                     │
│  1. Cold Coffee    ×22   ₹ 3,520        │
│  2. Pasta          ×14   ₹ 4,200        │
│  3. Masala Chai    ×31   ₹ 1,860        │
│                                         │
├─────────────────────────────────────────┤
│  🏠 Home   📊 Reports   ✓ Approvals   👤│
└─────────────────────────────────────────┘
```

#### Reports Screen

```
┌─────────────────────────────────────────┐
│  ← Reports                              │
│  [Today] [Week] [Month] [Year]          │  ← tab selector
├─────────────────────────────────────────┤
│                                         │
│  Revenue        ₹ 4,18,200             │
│  vs last month  ↑ ₹ 32,400  (+8.4%)   │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  [Bar chart: daily revenue]     │    │
│  │  Tap bar for day detail         │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Expenses       ₹ 68,000               │
│  Profit         ₹ 3,50,200   (83.7%)  │
│                                         │
│  ─────────────────────────────────────  │
│  By category                            │
│  Billing     ███████████████  ₹2.1L    │
│  POS         ████████         ₹1.4L    │
│  Inventory   ████             ₹0.6L    │
│                                         │
│  Top customers                          │
│  Rahul Sharma   ₹ 12,400   8 invoices  │
│  Priya Textiles ₹ 9,800    5 invoices  │
│                                         │
├─────────────────────────────────────────┤
│  🏠 Home   📊 Reports   ✓ Approvals   👤│
└─────────────────────────────────────────┘
```

#### Approvals Screen

```
┌─────────────────────────────────────────┐
│  Approvals                    3 pending │
├─────────────────────────────────────────┤
│  [Expenses ③]  [Leave ②]  [POs ①]      │  ← pill tabs
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  Priya Patel — Expense claim    │    │
│  │  Transport · 14 Jun · ₹ 450     │    │
│  │  "Auto to client site, Viman Nagar"  │
│  │  [📎 Receipt image]             │    │
│  │                                 │    │
│  │  [ ✕ Reject ]    [ ✓ Approve ] │    │  ← side by side
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  Rohit Kumar — Expense claim    │    │
│  │  Food · 13 Jun · ₹ 220          │    │
│  │  "Team lunch"                   │    │
│  │                                 │    │
│  │  [ ✕ Reject ]    [ ✓ Approve ] │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  Approve all 3?                 │    │
│  │  [ Approve All — ₹ 1,220 ]     │    │  ← bulk action
│  └─────────────────────────────────┘    │
│                                         │
├─────────────────────────────────────────┤
│  🏠 Home   📊 Reports   ✓ Approvals   👤│
└─────────────────────────────────────────┘
```

---

### POS Surface

#### Product Grid (main screen)

```
┌─────────────────────────────────────────┐
│  ████ OFFLINE — 2 orders queued  ████   │  ← amber banner (hidden when online)
│                                         │
│  ┌───────────────────┐  [📷 Scan]       │
│  │ 🔍 Search products│                  │
│  └───────────────────┘                  │
│                                         │
│  [All]  [Coffee]  [Food]  [Drinks]  ›  │  ← category chips, scrollable
│                                         │
│  ┌─────────────┐  ┌─────────────┐       │
│  │             │  │             │       │
│  │   ☕        │  │   🍝        │       │
│  │             │  │             │       │
│  │ Cold Coffee │  │   Pasta     │       │
│  │  ₹ 160      │  │  ₹ 220      │       │
│  │  [+ Add]    │  │  [+ Add]    │       │
│  └─────────────┘  └─────────────┘       │
│                                         │
│  ┌─────────────┐  ┌─────────────┐       │
│  │   🫖        │  │   🌯        │       │
│  │ Masala Chai │  │   Wrap      │       │
│  │  ₹ 60       │  │  ₹ 180      │       │
│  │  [+ Add]    │  │  [+ Add]    │       │
│  └─────────────┘  └─────────────┘       │
│                                         │
│  ┌─────────────┐  ┌─────────────┐       │
│  │   🧁        │  │   🥤        │       │
│  │  Muffin     │  │  Lemonade   │       │
│  │  ₹ 80       │  │  ₹ 90       │       │
│  │  [+ Add]    │  │  [+ Add]    │       │
│  └─────────────┘  └─────────────┘       │
│                                         │
├─────────────────────────────────────────┤
│  Cart  ·  3 items           ₹ 520       │
│                      [View Cart →]      │
└─────────────────────────────────────────┘
```

#### Barcode Scanner Overlay

```
┌─────────────────────────────────────────┐
│  ✕ Close                    [🔦 Flash]  │  ← over live camera feed
│                                         │
│                                         │
│    ┌────────────────────────────┐        │
│    │                            │        │
│    │      [camera viewfinder]   │        │  ← green bracket corners
│    │                            │        │
│    └────────────────────────────┘        │
│                                         │
│       Point at any barcode or QR        │
│                                         │
│  ─── or enter manually ────────────── ─ │
│  ┌─────────────────────────────────┐    │
│  │  Barcode number...              │    │
│  └─────────────────────────────────┘    │
│  ─────────────────────────────────────  │
│                                         │
│  Last scanned:  Cold Coffee  ×1  ✓      │  ← confirmation of last scan
└─────────────────────────────────────────┘
```

#### Cart Screen

```
┌─────────────────────────────────────────┐
│  ← Products                    🗑 Clear │
│                                         │
│  Cart                       3 items     │
├─────────────────────────────────────────┤
│                                         │
│  Cold Coffee                            │
│  ₹ 160 each           [−]  2  [+]      │  ← quantity controls
│                             ₹ 320       │
│  ─────────────────────────────────────  │
│  Masala Chai                            │
│  ₹ 60 each            [−]  1  [+]      │
│                              ₹ 60       │
│  ─────────────────────────────────────  │
│  Wrap                                   │
│  ₹ 180 each           [−]  1  [+]      │
│                             ₹ 180       │
│                                         │
│  [+ Add note to order]                  │
│                                         │
├─────────────────────────────────────────┤
│  Subtotal                     ₹ 560     │
│  GST (5%)                      ₹ 28     │
│  Discount         [ Enter code ]  ₹ 0   │
│  ─────────────────────────────────────  │
│  Total                        ₹ 588     │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  ████  Charge  ₹ 588  █████    │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

#### Tender Screen

```
┌─────────────────────────────────────────┐
│  ← Cart                                 │
│                                         │
│  Amount due                             │
│         ₹ 588                           │  ← large mono
│                                         │
│  Payment method                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐│
│  │  💵 Cash │ │  📱 UPI  │ │ 💳 Card  ││  ← selected = black bg
│  └──────────┘ └──────────┘ └──────────┘│
│                                         │
│  Cash received                          │
│  ┌─────────────────────────────────┐    │
│  │  ₹  600                         │    │  ← number pad input
│  └─────────────────────────────────┘    │
│                                         │
│  [500] [100] [200] [588 exact]          │  ← quick-fill buttons
│                                         │
│  Change to return                       │
│         ₹ 12                            │  ← updates live
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  ████  Collect ₹ 600  ██████   │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [1][2][3]                              │
│  [4][5][6]   ← number pad              │
│  [7][8][9]                              │
│  [.][0][⌫]                              │
└─────────────────────────────────────────┘
```

#### Receipt Screen

```
┌─────────────────────────────────────────┐
│                                         │
│            ✅  Order complete!          │
│            POS-2026-0041               │
│                                         │
│  ─── Cafe Raasta — Nagpur ──────────── │
│                                         │
│  Cold Coffee         × 2     ₹  320    │
│  Masala Chai         × 1     ₹   60    │
│  Wrap                × 1     ₹  180    │
│                                         │
│  Subtotal                    ₹  560    │
│  GST                         ₹   28    │
│  Total                       ₹  588    │
│  Cash                        ₹  600    │
│  Change                      ₹   12    │
│                                         │
│  Paid: Cash  · 24 Jun 2026  12:43 PM   │
│                                         │
│  ─────────────────────────────────────  │
│  Thank you! Visit again ☕               │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  📱 Share on WhatsApp           │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │  🖨 Print receipt               │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  ████  New Order  ████████████ │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

---

### Employee Surface

#### Home (Punch In/Out)

```
┌─────────────────────────────────────────┐
│  Hi Priya 👋                      🔔   │
│  Senior Designer · Engineering          │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  Tue, 24 Jun 2026               │    │
│  │  9:02 AM                        │    │
│  │                                 │    │
│  │       🟢  You're in             │    │
│  │      Punched in at 8:58 AM      │    │
│  │                                 │    │
│  │  ┌─────────────────────────┐    │    │
│  │  │   🔴  Punch Out         │    │    │
│  │  └─────────────────────────┘    │    │
│  │                                 │    │
│  │  📍 Location recorded           │    │
│  └─────────────────────────────────┘    │
│                                         │
│  This month                             │
│  ┌──────────┐ ┌──────────┐ ┌────────┐  │
│  │ Present  │ │ Absent   │ │ Leave  │  │
│  │   18     │ │    1     │ │   2    │  │
│  └──────────┘ └──────────┘ └────────┘  │
│                                         │
│  Leave balance                          │
│  Earned leave        12 days remaining  │
│  Sick leave           8 days remaining  │
│                                         │
│  [Apply for leave →]                    │
│                                         │
├─────────────────────────────────────────┤
│  🏠 Home   💰 Payslips   📋 Leave   👤  │
└─────────────────────────────────────────┘
```

#### Payslip Screen

```
┌─────────────────────────────────────────┐
│  ← My Payslips                          │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  May 2026               [PDF ↓] │    │
│  │  Net Pay  ₹ 42,300              │    │
│  │  Status   ✅ Paid               │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  April 2026             [PDF ↓] │    │
│  │  Net Pay  ₹ 42,300              │    │
│  │  Status   ✅ Paid               │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  March 2026             [PDF ↓] │    │
│  │  Net Pay  ₹ 41,800              │    │
│  │  Status   ✅ Paid               │    │
│  └─────────────────────────────────┘    │
│                                         │
│  — Tap to see breakdown —               │
│                                         │
│  ┌─────────────────────────────────┐    │  ← expanded detail
│  │  May 2026 — Breakdown           │    │
│  │  Basic Salary         ₹ 35,000  │    │
│  │  HRA                  ₹  8,750  │    │
│  │  ─────────────────────────────  │    │
│  │  Gross                ₹ 43,750  │    │
│  │  PF (employee)       −₹    780  │    │
│  │  Professional Tax    −₹    200  │    │
│  │  TDS                 −₹    470  │    │
│  │  ─────────────────────────────  │    │
│  │  Net Pay              ₹ 42,300  │    │
│  └─────────────────────────────────┘    │
├─────────────────────────────────────────┤
│  🏠 Home   💰 Payslips   📋 Leave   👤  │
└─────────────────────────────────────────┘
```

---

### Ops Surface (Manager)

#### Attendance Screen

```
┌─────────────────────────────────────────┐
│  Attendance — Today                 24  │
│  [◀ Yesterday]            [Tomorrow ▶]  │
├─────────────────────────────────────────┤
│                                         │
│  🟢 Present (14)   🔴 Absent (3)   ?(7)│  ← summary chips
│                                         │
│  ─────────────────────────────────────  │
│  Rahul Kumar                            │
│  Kitchen · Chef            ● Present    │
│                                         │
│  Priya Patel                            │
│  Engineering · Designer    ● Present    │
│                                         │
│  Amit Singh                             │
│  Sales                     ● Present    │
│                                         │
│  Neha Sharma                            │
│  HR                        ○ Absent     │
│                                         │
│  Rohit Verma                            │
│  Operations         ⬚  Not marked yet  │  ← tap row to mark
│  ┌──────────────────────────────────┐   │
│  │ [Present] [Absent] [Half] [Leave]│   │  ← inline action strip
│  └──────────────────────────────────┘   │
│                                         │
│  [Mark all unmarked as Present]         │  ← bulk action
├─────────────────────────────────────────┤
│  👥 Team   📋 Attend   💸 Expenses  ✓  │
└─────────────────────────────────────────┘
```

---

### Stock Surface (Warehouse)

#### Scan to Receive

```
┌─────────────────────────────────────────┐
│  Stock — Warehouse               🔔     │
├─────────────────────────────────────────┤
│  [📷 Scan to Receive]  [📋 View POs]    │
│                                         │
│  Pending deliveries today               │
│  ┌─────────────────────────────────┐    │
│  │  PO-2026-0012                   │    │
│  │  Supplier: Fresh Farms          │    │
│  │  3 items expected · Due today   │    │
│  │  [Receive →]                    │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  PO-2026-0011                   │    │
│  │  Supplier: Wholesale Foods      │    │
│  │  7 items expected · Due today   │    │
│  │  [Receive →]                    │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Low stock alerts                       │
│  ┌─────────────────────────────────┐    │
│  │  ⚠  Coffee Beans    2 kg left  │    │
│  │  ⚠  Milk            1 L left   │    │
│  │  ⚠  Paper Cups      12 left    │    │
│  └─────────────────────────────────┘    │
│  [Notify Owner]                         │
│                                         │
├─────────────────────────────────────────┤
│  📦 Receive  📊 Stock   🔍 Scan   👤   │
└─────────────────────────────────────────┘
```

---

### Surface Switcher (multi-role users)

A floating button bottom-right for users assigned multiple roles.
Example: a cafe owner who also operates the POS counter.

```
┌─────────────────────────────────────────┐
│  (Owner Surface — home screen)          │
│                                         │
│  ...                                    │
│                                         │
│                                  ┌────┐ │
│                                  │ ⇄  │ │  ← floating, always on top
│                                  └────┘ │
└─────────────────────────────────────────┘

  Tap → bottom sheet slides up:

┌─────────────────────────────────────────┐
│                  ▔▔▔▔▔                  │  ← drag handle
│  Switch surface                         │
│                                         │
│  ● Owner Dashboard      (current)       │
│  ○ POS Counter                          │
│  ○ Ops Manager                          │
│                                         │
│  [Cancel]                               │
└─────────────────────────────────────────┘
```

---

## Navigation Structure

```
App
├── (auth)
│   └── /login
│
├── (owner)           ← shown if role = owner | admin
│   ├── /home         (default)
│   ├── /reports
│   ├── /approvals
│   └── /profile
│
├── (pos)             ← shown if role = cashier | chef | store_manager
│   ├── /products     (default)
│   ├── /scanner
│   ├── /cart
│   ├── /tender
│   ├── /receipt
│   └── /session
│
├── (ops)             ← shown if role = manager | hr | operations
│   ├── /team         (default)
│   ├── /attendance
│   ├── /expenses
│   └── /leave
│
├── (employee)        ← shown if role = staff | developer | designer | support | ...
│   ├── /home         (default punch card)
│   ├── /payslips
│   ├── /leave
│   └── /tasks
│
└── (stock)           ← shown if role = warehouse | procurement
    ├── /receive       (default)
    ├── /inventory
    └── /scan
```

---

## Connection Guide — Step by Step

### Step 1 — Create the Expo project

```bash
# In a new folder outside erp-base/
npx create-expo-app erp-mobile --template blank-typescript
cd erp-mobile
```

### Step 2 — Install dependencies

```bash
# Supabase
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage

# Offline DB
npx expo install expo-sqlite

# Barcode + camera
npx expo install expo-camera expo-barcode-scanner

# Navigation
npx expo install expo-router

# Network state (for offline detection)
npx expo install @react-native-community/netinfo

# Notifications
npx expo install expo-notifications expo-device

# Secure storage (for tokens/session)
npx expo install expo-secure-store

# Icons
npm install @expo/vector-icons

# State management
npm install zustand
```

### Step 3 — Environment variables

Create `.env` in the mobile project root:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://rxpxjjjbvwqjxwvvnfhj.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
EXPO_PUBLIC_APP_URL=https://erp-base-eight.vercel.app
```

**Get the anon key:** Supabase dashboard → Project Settings → API → `anon public` key.
This is safe to include in the mobile app (RLS protects the data).
Never put `SUPABASE_SERVICE_ROLE_KEY` here.

### Step 4 — Supabase client (lib/supabase.ts)

```typescript
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: AsyncStorage,          // persists session across restarts
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,      // no URL-based OAuth in native
    },
  }
);
```

### Step 5 — Auth context (lib/AuthContext.tsx)

```typescript
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { Session, User } from '@supabase/supabase-js';

type OrgMembership = {
  org_id: string;
  org_name: string;
  role: string;
};

type AuthState = {
  user: User | null;
  membership: OrgMembership | null;
  surface: 'owner' | 'pos' | 'ops' | 'employee' | 'stock' | null;
  loading: boolean;
};

const SURFACE_MAP: Record<string, AuthState['surface']> = {
  owner: 'owner',   admin: 'owner',
  cashier: 'pos',   chef: 'pos',   store_manager: 'pos',
  manager: 'ops',   hr: 'ops',     operations: 'ops',
  warehouse: 'stock', procurement: 'stock',
  // everything else → employee
};

const AuthContext = createContext<AuthState>({
  user: null, membership: null, surface: null, loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null, membership: null, surface: null, loading: true,
  });

  useEffect(() => {
    // Listen for session changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!session) {
          setState({ user: null, membership: null, surface: null, loading: false });
          return;
        }

        // Fetch org membership + role
        const { data } = await supabase
          .from('memberships')
          .select('org_id, role, organizations(name)')
          .eq('user_id', session.user.id)
          .single();

        const role = data?.role ?? 'staff';
        const surface = SURFACE_MAP[role] ?? 'employee';

        setState({
          user: session.user,
          membership: {
            org_id: data?.org_id ?? '',
            org_name: (data?.organizations as any)?.name ?? '',
            role,
          },
          surface,
          loading: false,
        });
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
```

### Step 6 — Surface routing (app/_layout.tsx)

```typescript
import { Redirect } from 'expo-router';
import { useAuth } from '@/lib/AuthContext';

export default function RootLayout() {
  const { user, surface, loading } = useAuth();

  if (loading) return <SplashScreen />;
  if (!user)   return <Redirect href="/login" />;

  // Route to the correct surface
  const surfaceRoot = {
    owner:    '/(owner)/home',
    pos:      '/(pos)/products',
    ops:      '/(ops)/team',
    employee: '/(employee)/home',
    stock:    '/(stock)/receive',
  }[surface!] ?? '/(employee)/home';

  return <Redirect href={surfaceRoot} />;
}
```

### Step 7 — Offline SQLite database (lib/sqlite.ts)

```typescript
import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('erp_offline.db');

export function initOfflineDB() {
  db.execSync(`
    -- Products cache (synced from Supabase)
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      gst_rate REAL DEFAULT 0,
      barcode TEXT,
      stock INTEGER DEFAULT 0,
      synced_at INTEGER
    );

    -- POS orders created offline
    CREATE TABLE IF NOT EXISTS pos_orders (
      id TEXT PRIMARY KEY,           -- UUID generated locally
      org_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      total REAL NOT NULL,
      gst_amount REAL DEFAULT 0,
      payment_method TEXT NOT NULL,
      cash_received REAL,
      change_amount REAL,
      notes TEXT,
      created_at INTEGER NOT NULL,
      synced INTEGER DEFAULT 0       -- 0 = pending, 1 = uploaded
    );

    -- Order line items
    CREATE TABLE IF NOT EXISTS pos_order_lines (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      qty INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      gst_rate REAL DEFAULT 0,
      line_total REAL NOT NULL
    );

    -- Active POS session
    CREATE TABLE IF NOT EXISTS pos_session (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL,
      opening_cash REAL DEFAULT 0,
      opened_at INTEGER NOT NULL
    );
  `);
}

// Sync products from Supabase into local cache
export async function syncProducts(orgId: string, supabase: any) {
  const { data } = await supabase
    .from('products')
    .select('id, name, price, gst_rate, barcode, stock')
    .eq('org_id', orgId)
    .is('archived_at', null);

  if (!data) return;

  const now = Date.now();
  for (const p of data) {
    db.runSync(
      `INSERT OR REPLACE INTO products (id, name, price, gst_rate, barcode, stock, synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [p.id, p.name, p.price, p.gst_rate ?? 0, p.barcode ?? null, p.stock ?? 0, now]
    );
  }
}

export function getLocalProducts(): any[] {
  return db.getAllSync('SELECT * FROM products ORDER BY name');
}

export function searchLocalProducts(query: string): any[] {
  return db.getAllSync(
    'SELECT * FROM products WHERE name LIKE ? OR barcode = ? LIMIT 20',
    [`%${query}%`, query]
  );
}

export function getProductByBarcode(barcode: string): any | null {
  return db.getFirstSync('SELECT * FROM products WHERE barcode = ?', [barcode]);
}
```

### Step 8 — Sync engine (lib/sync.ts)

```typescript
import * as SQLite from 'expo-sqlite';
import { supabase } from './supabase';

const db = SQLite.openDatabaseSync('erp_offline.db');

// Call this whenever network comes back online
export async function syncPendingOrders(orgId: string) {
  const pending = db.getAllSync(
    'SELECT * FROM pos_orders WHERE synced = 0 ORDER BY created_at',
  ) as any[];

  if (pending.length === 0) return { synced: 0 };

  let synced = 0;
  for (const order of pending) {
    const lines = db.getAllSync(
      'SELECT * FROM pos_order_lines WHERE order_id = ?',
      [order.id]
    ) as any[];

    try {
      // Insert order to Supabase
      const { error } = await supabase.from('pos_orders').insert({
        id: order.id,
        org_id: orgId,
        session_id: order.session_id,
        order_number: await getNextOrderNumber(orgId),
        total: order.total,
        gst_amount: order.gst_amount,
        payment_method: order.payment_method,
        cash_received: order.cash_received,
        change_amount: order.change_amount,
        notes: order.notes,
        created_at: new Date(order.created_at).toISOString(),
      });

      if (error) continue; // leave it in queue, retry next time

      // Insert line items
      await supabase.from('pos_order_lines').insert(
        lines.map((l) => ({
          id: l.id,
          order_id: order.id,
          product_id: l.product_id,
          product_name: l.product_name,
          qty: l.qty,
          unit_price: l.unit_price,
          gst_rate: l.gst_rate,
          line_total: l.line_total,
        }))
      );

      // Deduct stock
      for (const line of lines) {
        await supabase.rpc('adjust_stock', {
          p_product_id: line.product_id,
          p_org_id: orgId,
          p_delta: -line.qty,
        });
      }

      // Mark synced locally
      db.runSync('UPDATE pos_orders SET synced = 1 WHERE id = ?', [order.id]);
      synced++;
    } catch {
      // Network still down or partial failure — leave in queue
    }
  }

  return { synced, remaining: pending.length - synced };
}

async function getNextOrderNumber(orgId: string): Promise<string> {
  const { data } = await supabase.rpc('next_pos_order_number', { p_org_id: orgId });
  return data ?? `POS-${Date.now()}`;
}

export function getPendingCount(): number {
  const row = db.getFirstSync('SELECT COUNT(*) as c FROM pos_orders WHERE synced = 0') as any;
  return row?.c ?? 0;
}
```

### Step 9 — Barcode scanner component (components/BarcodeScanner.tsx)

```typescript
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { getProductByBarcode, searchLocalProducts } from '@/lib/sqlite';

type Props = {
  onProductFound: (product: any) => void;
  onClose: () => void;
};

export default function BarcodeScanner({ onProductFound, onClose }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(false);

  if (!permission?.granted) {
    return (
      <View style={styles.center}>
        <Text>Camera access needed to scan barcodes</Text>
        <TouchableOpacity onPress={requestPermission}>
          <Text style={styles.link}>Allow camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function handleBarcode({ data }: { data: string }) {
    if (cooldown || data === lastScan) return;

    const product = getProductByBarcode(data);
    if (product) {
      setLastScan(data);
      setCooldown(true);
      onProductFound(product);
      // 1.5s cooldown prevents duplicate scans of same item
      setTimeout(() => setCooldown(false), 1500);
    }
    // If not found locally, could query Supabase here
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        onBarcodeScanned={handleBarcode}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'qr', 'code128', 'upc_a'],
        }}
      />
      {/* Viewfinder overlay */}
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeText}>✕ Close</Text>
        </TouchableOpacity>
        <View style={styles.finder} />
        <Text style={styles.hint}>Point camera at any barcode</Text>
        {lastScan && (
          <View style={styles.lastScan}>
            <Text style={styles.lastScanText}>✓ {lastScan}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  overlay: { flex: 1, padding: 24 },
  closeBtn: { alignSelf: 'flex-start', backgroundColor: 'rgba(0,0,0,0.5)',
              paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  closeText: { color: 'white', fontSize: 14 },
  finder: { flex: 1, margin: 40, borderWidth: 2, borderColor: '#22c55e',
            borderRadius: 8 },
  hint: { color: 'white', textAlign: 'center', marginBottom: 24,
          backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 8 },
  lastScan: { backgroundColor: '#16a34a', padding: 12, borderRadius: 8 },
  lastScanText: { color: 'white', textAlign: 'center' },
  link: { color: '#2563eb', textDecorationLine: 'underline' },
});
```

### Step 10 — Network monitor + offline banner (components/OfflineBanner.tsx)

```typescript
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { syncPendingOrders, getPendingCount } from '@/lib/sync';
import { useAuth } from '@/lib/AuthContext';

export default function OfflineBanner() {
  const { membership } = useAuth();
  const [isOnline, setIsOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const unsub = NetInfo.addEventListener(async (state) => {
      const online = !!state.isConnected && !!state.isInternetReachable;
      setIsOnline(online);
      setPending(getPendingCount());

      if (online && membership?.org_id) {
        setSyncing(true);
        const result = await syncPendingOrders(membership.org_id);
        setSyncing(false);
        setPending(getPendingCount());
      }
    });
    return unsub;
  }, [membership]);

  if (isOnline && pending === 0) return null;

  return (
    <View style={[styles.banner, isOnline ? styles.syncing : styles.offline]}>
      <Text style={styles.text}>
        {isOnline
          ? syncing
            ? `Syncing ${pending} orders…`
            : `✓ ${pending} orders synced`
          : `Offline — ${pending} order${pending !== 1 ? 's' : ''} queued`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { paddingVertical: 8, paddingHorizontal: 16, alignItems: 'center' },
  offline: { backgroundColor: '#D97706' },
  syncing: { backgroundColor: '#2563EB' },
  text: { color: 'white', fontSize: 13, fontWeight: '600' },
});
```

---

## Environment Variables Summary

| Variable | Where | What |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | `.env` | Supabase project URL (safe to expose) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `.env` | Supabase anon key (safe, RLS protects data) |
| `EXPO_PUBLIC_APP_URL` | `.env` | Web app URL (for deep links back to web) |

**Never in mobile app:**
- `SUPABASE_SERVICE_ROLE_KEY` — server-only, bypasses RLS
- `ADMIN_SECRET`, `CRON_SECRET` — server-only

---

## How Web + Mobile Stay in Sync

```
Web (Next.js)                Mobile (Expo)
    │                             │
    └────── Supabase ─────────────┘
              │
     ┌────────┴────────┐
     │  Same DB tables │
     │  Same auth      │
     │  Same RLS rules │
     └────────┬────────┘
              │
     Data created on mobile    →   immediately visible on web
     Data created on web       →   visible on mobile after product sync
     Auth accounts             →   same login works on both
     Roles                     →   same memberships table, same surface rules
```

Web and mobile are **the same system** — not a separate app calling a separate API.
The mobile app is a different client to the same Supabase project.

---

## First Build Checklist

```
□ npx create-expo-app erp-mobile --template blank-typescript
□ Install all deps (Step 2)
□ Add .env with Supabase URL + anon key
□ Wire up AuthContext (Step 5) — login works, role detected
□ initOfflineDB() on app start (Step 7)
□ syncProducts() on login (Step 7)
□ Build POS product grid reading from local SQLite
□ Add BarcodeScanner component (Step 9)
□ Add OfflineBanner + sync engine (Step 10)
□ Build cart + tender screen
□ Test offline: airplane mode → bill 3 items → back online → check Supabase
```

---

*Document version: June 2026*
