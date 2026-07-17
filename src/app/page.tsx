import Link from "next/link";
import { Brand } from "@/components/Brand";
import ThemeToggle from "@/components/ThemeToggle";

const FEATURES = [
  { icon: "🧾", title: "Billing & GST", desc: "GST invoices, IGST/CGST/SGST split, GSTR‑1/3B, e‑invoice & e‑way, PDF + email." },
  { icon: "🛒", title: "Point of Sale", desc: "Fast cashier screen, barcode scan, split tender, auto stock deduction, day‑close." },
  { icon: "📦", title: "Inventory", desc: "Products, batches & expiry, low‑stock alerts, purchase orders, GRN & landed cost." },
  { icon: "🤝", title: "CRM", desc: "Leads, customers & vendors, a 6‑stage pipeline, activity timeline and udhaar." },
  { icon: "👥", title: "HR & Payroll", desc: "Attendance, payroll with PF/ESI/PT/TDS, payslips, leave and Form 16." },
  { icon: "📊", title: "Accounting", desc: "Double‑entry ledgers, journals, Trial Balance, P&L and Balance Sheet." },
];

const BUSINESS_TYPES = [
  { icon: "☕", label: "Cafés & Restaurants" },
  { icon: "🛍️", label: "Retail Shops" },
  { icon: "💻", label: "Freelancers & Agencies" },
  { icon: "🚀", label: "Startups" },
  { icon: "🏪", label: "Malls & Multi‑outlet" },
  { icon: "🏢", label: "General Business" },
];

const STATS = [
  { value: "30+", label: "modules, one login" },
  { value: "GST‑ready", label: "GSTR‑1/3B, e‑invoice" },
  { value: "5 min", label: "to your first invoice" },
];

const gridBg =
  "radial-gradient(circle at center, rgba(120,140,160,0.35) 1px, transparent 1px)";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-100">
      {/* ── Nav ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-neutral-200/60 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-neutral-950/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <Brand size="lg" />
          <div className="flex items-center gap-1.5 sm:gap-3">
            <ThemeToggle />
            <Link href="/login" className="hidden rounded-xl px-4 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-white/10 dark:hover:text-white sm:inline-flex">
              Log in
            </Link>
            <Link href="/signup" className="inline-flex items-center gap-1.5 rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-px hover:shadow-md dark:bg-white dark:text-neutral-900">
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* ambient brand background */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-[-30%] h-[620px] w-[980px] -translate-x-1/2 rounded-full opacity-70"
            style={{ background: "radial-gradient(50% 50% at 50% 50%, rgba(0,173,190,0.20), rgba(0,113,201,0.10) 45%, transparent 72%)" }} />
          <div className="absolute right-[6%] top-[12%] h-64 w-64 rounded-full blur-3xl"
            style={{ background: "radial-gradient(50% 50% at 50% 50%, rgba(1,228,197,0.22), transparent 70%)" }} />
          <div className="absolute inset-0 opacity-[0.5] dark:opacity-[0.35]"
            style={{ backgroundImage: gridBg, backgroundSize: "26px 26px", maskImage: "radial-gradient(ellipse 80% 55% at 50% 0%, #000 40%, transparent 75%)", WebkitMaskImage: "radial-gradient(ellipse 80% 55% at 50% 0%, #000 40%, transparent 75%)" }} />
        </div>

        <div className="mx-auto max-w-3xl px-5 pt-20 pb-4 text-center sm:pt-28">
          <Link href="/signup" className="group inline-flex items-center gap-2 rounded-full border border-neutral-200/80 bg-white/70 py-1 pl-1.5 pr-3 text-xs font-medium text-neutral-600 shadow-sm backdrop-blur transition-colors hover:border-neutral-300 dark:border-white/10 dark:bg-white/5 dark:text-neutral-300">
            <span className="rounded-full bg-gradient-to-r from-[#0071c9] to-[#01e4c5] px-2 py-0.5 text-[11px] font-semibold text-white">New</span>
            The operating system for Indian SMBs
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>

          <h1 className="mx-auto mt-7 max-w-2xl text-4xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-6xl sm:leading-[1.05]">
            Run your whole business —{" "}
            <span className="bg-gradient-to-r from-[#0071c9] via-[#00adbe] to-[#01e4c5] bg-clip-text text-transparent">and your whole team</span>{" "}
            — in one place.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-neutral-500 dark:text-neutral-400">
            Billing, GST, POS, inventory, CRM, HR and accounting — plus a startup workspace. Switch on only what you need. A modern alternative to Tally, Zoho and Vyapar.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/signup" className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-neutral-900/15 transition-all hover:-translate-y-0.5 hover:shadow-xl dark:bg-white dark:text-neutral-900 dark:shadow-black/40 sm:w-auto">
              Start free — 7 days
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
            <Link href="/login" className="inline-flex w-full items-center justify-center rounded-xl border border-neutral-300 bg-white/60 px-7 py-3.5 text-base font-semibold text-neutral-700 backdrop-blur transition-colors hover:bg-white dark:border-white/15 dark:bg-white/5 dark:text-neutral-200 dark:hover:bg-white/10 sm:w-auto">
              Log in
            </Link>
          </div>
          <p className="mt-4 text-xs text-neutral-400 dark:text-neutral-500">No credit card required · Cancel anytime · Made for GST</p>
        </div>

        {/* ── Product preview ── */}
        <div className="relative mx-auto mt-14 max-w-4xl px-5 pb-8">
          <div aria-hidden className="absolute inset-x-6 -top-6 bottom-8 -z-10 rounded-[2rem] bg-gradient-to-tr from-[#0071c9]/25 via-[#00adbe]/20 to-transparent blur-2xl" />
          <div className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-2xl shadow-neutral-900/10 dark:border-white/10 dark:bg-neutral-900 dark:shadow-black/50">
            <div className="flex items-center gap-2 border-b border-neutral-100 px-4 py-3 dark:border-white/10">
              <span className="h-3 w-3 rounded-full bg-red-400/80" />
              <span className="h-3 w-3 rounded-full bg-amber-400/80" />
              <span className="h-3 w-3 rounded-full bg-green-400/80" />
              <div className="ml-3 hidden rounded-md bg-neutral-100 px-3 py-1 text-xs text-neutral-400 dark:bg-white/5 sm:block">app.gradia.solutions/dashboard</div>
              <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-500/10 dark:text-green-400">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> GST ready
              </span>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-5">
              {[
                { k: "This month", v: "₹4,28,600", s: "+18%", up: true },
                { k: "Invoices", v: "128", s: "12 unpaid", up: false },
                { k: "Low stock", v: "3 items", s: "reorder", up: false },
              ].map((t) => (
                <div key={t.k} className="rounded-xl border border-neutral-100 bg-neutral-50/60 p-4 dark:border-white/5 dark:bg-white/5">
                  <p className="text-xs text-neutral-400">{t.k}</p>
                  <p className="mt-1 text-xl font-semibold tracking-tight text-neutral-900 dark:text-white">{t.v}</p>
                  <p className={`mt-0.5 text-xs font-medium ${t.up ? "text-green-600" : "text-neutral-400"}`}>{t.s}</p>
                </div>
              ))}
            </div>
            <div className="px-4 pb-5 sm:px-5">
              <div className="overflow-hidden rounded-xl border border-neutral-100 dark:border-white/5">
                {[
                  { n: "INV‑2026‑0128", c: "Ambai Traders", a: "₹2,941", st: "Paid", stc: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400" },
                  { n: "INV‑2026‑0127", c: "Jay Kisan Tradas", a: "₹784", st: "Partial", stc: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400" },
                  { n: "INV‑2026‑0126", c: "Green Leaf Cafe", a: "₹12,050", st: "Udhaar", stc: "bg-neutral-100 text-neutral-500 dark:bg-white/10 dark:text-neutral-400" },
                ].map((r, i) => (
                  <div key={r.n} className={`flex items-center gap-3 px-4 py-2.5 text-sm ${i > 0 ? "border-t border-neutral-100 dark:border-white/5" : ""}`}>
                    <span className="font-mono text-xs text-neutral-400">{r.n}</span>
                    <span className="truncate text-neutral-700 dark:text-neutral-300">{r.c}</span>
                    <span className="ml-auto font-medium text-neutral-900 dark:text-white">{r.a}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.stc}`}>{r.st}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* stats strip */}
        <div className="mx-auto grid max-w-3xl grid-cols-3 gap-4 px-5 pb-16 pt-2">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <div className="bg-gradient-to-r from-[#0071c9] to-[#00adbe] bg-clip-text text-2xl font-bold text-transparent sm:text-3xl">{s.value}</div>
              <div className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-3xl">Everything you run, together</h2>
          <p className="mt-3 text-neutral-500 dark:text-neutral-400">No more juggling ten apps and a WhatsApp group. One workspace for the whole team.</p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="group rounded-2xl border border-neutral-200/70 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-lg hover:shadow-neutral-900/5 dark:border-white/10 dark:bg-neutral-900 dark:hover:border-white/20">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-sky-100 to-teal-100 text-xl ring-1 ring-inset ring-sky-200/50 dark:from-sky-500/15 dark:to-teal-500/15 dark:ring-white/10">
                {f.icon}
              </div>
              <h3 className="mt-4 font-semibold text-neutral-900 dark:text-white">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Business types ──────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-500">Tailored for your business</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
          {BUSINESS_TYPES.map((b) => (
            <div key={b.label} className="flex items-center gap-2 rounded-full border border-neutral-200/80 bg-white px-4 py-2 text-sm text-neutral-700 shadow-sm transition-colors hover:border-neutral-300 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-300">
              <span>{b.icon}</span> {b.label}
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="relative overflow-hidden rounded-3xl px-8 py-16 text-center"
          style={{ background: "linear-gradient(120deg,#04263f 0%,#00516b 45%,#017a86 100%)" }}>
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-30"
            style={{ backgroundImage: gridBg, backgroundSize: "24px 24px", maskImage: "radial-gradient(ellipse 70% 100% at 50% 0%, #000, transparent 70%)" }} />
          <h2 className="relative text-3xl font-bold tracking-tight text-white">Ready in minutes.</h2>
          <p className="relative mx-auto mt-3 max-w-md text-teal-50/80">Set up your workspace, pick your modules, and start your free trial today.</p>
          <Link href="/signup" className="relative mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-base font-semibold text-neutral-900 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl">
            Create your workspace <span>→</span>
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="border-t border-neutral-200/70 dark:border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-10 text-sm text-neutral-400 dark:text-neutral-500 sm:flex-row">
          <Brand />
          <div className="flex items-center gap-5">
            <Link href="/privacy" className="transition-colors hover:text-neutral-700 dark:hover:text-neutral-300">Privacy</Link>
            <Link href="/terms" className="transition-colors hover:text-neutral-700 dark:hover:text-neutral-300">Terms</Link>
            <Link href="/login" className="transition-colors hover:text-neutral-700 dark:hover:text-neutral-300">Log in</Link>
          </div>
          <p>© {new Date().getFullYear()} Gradia. Built for Indian SMBs.</p>
        </div>
      </footer>
    </div>
  );
}
