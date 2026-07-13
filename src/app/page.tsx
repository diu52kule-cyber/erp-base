import Link from "next/link";
import { Brand } from "@/components/Brand";
import ThemeToggle from "@/components/ThemeToggle";

const FEATURES = [
  { icon: "🧾", title: "Billing & GST", desc: "GST-compliant invoices, IGST/CGST/SGST split, GSTR-1/3B, PDF & email." },
  { icon: "🛒", title: "Point of Sale", desc: "Fast cashier screen, cart, tender, auto stock deduction, sessions." },
  { icon: "📦", title: "Inventory", desc: "Products, stock movements, low-stock alerts, purchase orders & GRN." },
  { icon: "🤝", title: "CRM", desc: "Leads, customers, vendors and a 6-stage deals pipeline." },
  { icon: "👥", title: "HR & Payroll", desc: "Attendance, payroll with PF/ESI/PT/TDS, payslips, Form 16." },
  { icon: "🚀", title: "Startup OS", desc: "Docs, tasks & sprints, OKRs, meetings, issues, releases, check-ins." },
];

const BUSINESS_TYPES = [
  { icon: "☕", label: "Cafés & Restaurants" },
  { icon: "🛍️", label: "Retail Shops" },
  { icon: "💻", label: "Freelancers & Agencies" },
  { icon: "🚀", label: "Startups" },
  { icon: "🏪", label: "Malls & Multi-outlet" },
  { icon: "🏢", label: "General Business" },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-neutral-200/70 bg-neutral-50/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <Brand />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900">Log in</Link>
            <Link href="/signup" className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700">Get started</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-[-10%] h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-gradient-to-br from-indigo-200/50 via-violet-200/40 to-transparent blur-3xl" />
        </div>
        <div className="mx-auto max-w-3xl px-5 py-20 text-center sm:py-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-600">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> The operating system for Indian SMBs
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl">
            Run your whole business —<br className="hidden sm:block" /> and your whole team — in one place.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-neutral-500">
            Billing, POS, inventory, CRM, HR and a full startup workspace. Switch on only what you need.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link href="/signup" className="rounded-xl bg-neutral-900 px-6 py-3 text-base font-semibold text-white hover:bg-neutral-700">
              Start 7-day free trial →
            </Link>
            <Link href="/login" className="rounded-xl border border-neutral-300 bg-white px-6 py-3 text-base font-semibold text-neutral-700 hover:bg-neutral-50">
              Log in
            </Link>
          </div>
          <p className="mt-4 text-xs text-neutral-400">No credit card required · Cancel anytime</p>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-5 pb-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-neutral-200 bg-white p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-xl">{f.icon}</div>
              <h3 className="mt-4 font-semibold text-neutral-900">{f.title}</h3>
              <p className="mt-1 text-sm text-neutral-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Business types */}
      <section className="mx-auto max-w-6xl px-5 py-14">
        <p className="text-center text-sm font-medium uppercase tracking-wider text-neutral-400">Tailored for your business</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {BUSINESS_TYPES.map((b) => (
            <div key={b.label} className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-700">
              <span>{b.icon}</span> {b.label}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="overflow-hidden rounded-3xl bg-neutral-900 px-8 py-14 text-center">
          <h2 className="text-3xl font-bold text-white">Ready in minutes.</h2>
          <p className="mx-auto mt-3 max-w-md text-neutral-300">Set up your workspace, pick your modules, and start your free trial today.</p>
          <Link href="/signup" className="mt-7 inline-block rounded-xl bg-white px-6 py-3 text-base font-semibold text-neutral-900 hover:bg-neutral-100">
            Create your workspace
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 text-sm text-neutral-400 sm:flex-row">
          <Brand />
          <p>© {new Date().getFullYear()} Gradia. Built for Indian SMBs.</p>
        </div>
      </footer>
    </div>
  );
}
