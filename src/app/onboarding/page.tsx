"use client";
import { useState } from "react";
import { MODULES } from "@/lib/modules";

const BUSINESS_TYPES = [
  { key: "cafe",       label: "Cafe / Restaurant", icon: "☕", desc: "Billing, POS, inventory" },
  { key: "shop",       label: "Retail Shop",        icon: "🛍️", desc: "Inventory, POS, billing" },
  { key: "freelancer", label: "Freelancer / Agency", icon: "💻", desc: "Projects, invoicing, expenses" },
  { key: "startup",    label: "Startup",            icon: "🚀", desc: "CRM, HR, subscriptions" },
  { key: "mall",       label: "Mall / Multi-outlet", icon: "🏪", desc: "Multi-location POS & inventory" },
  { key: "general",    label: "General Business",   icon: "🏢", desc: "Full ERP suite" },
];

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab",
  "Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand",
  "West Bengal","Delhi","Chandigarh","Jammu & Kashmir","Ladakh","Puducherry",
];

const STATE_CODES: Record<string, string> = {
  "Andhra Pradesh":"37","Telangana":"36","Tamil Nadu":"33","Karnataka":"29",
  "Maharashtra":"27","Gujarat":"24","Rajasthan":"08","Uttar Pradesh":"09",
  "West Bengal":"19","Delhi":"07","Haryana":"06","Punjab":"03","Kerala":"32",
  "Madhya Pradesh":"23","Bihar":"10","Odisha":"21","Assam":"18",
};

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "", business_type: "general",
    city: "", state: "", phone: "", gstin: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trialEnd, setTrialEnd] = useState<string | null>(null);

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function finish() {
    setLoading(true); setError(null);
    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name, business_type: form.business_type,
        city: form.city, phone: form.phone,
        gstin: form.gstin || null,
        state_code: STATE_CODES[form.state] || null,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.error) { setError(data.error); return; }
    setTrialEnd(data.trial_end);
    setStep(4);
  }

  const selectedType = BUSINESS_TYPES.find((t) => t.key === form.business_type);
  const trialEndDate = trialEnd
    ? new Date(trialEnd).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : "";

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white px-8 py-4">
        <div className="mx-auto max-w-2xl flex items-center justify-between">
          <span className="text-lg font-semibold">ERP Platform</span>
          {step < 4 && (
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all ${
                    s < step ? "bg-neutral-900 text-white" : s === step ? "bg-neutral-900 text-white ring-4 ring-neutral-200" : "bg-neutral-200 text-neutral-400"
                  }`}>{s < step ? "✓" : s}</div>
                  {s < 3 && <div className={`h-0.5 w-8 transition-all ${s < step ? "bg-neutral-900" : "bg-neutral-200"}`} />}
                </div>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-12">
        <div className="w-full max-w-2xl">

          {/* ── Step 1: Business Type ── */}
          {step === 1 && (
            <div className="space-y-8">
              <div>
                <p className="text-sm font-medium text-neutral-400 uppercase tracking-wider">Step 1 of 3</p>
                <h1 className="mt-2 text-3xl font-bold text-neutral-900">Tell us about your business</h1>
                <p className="mt-2 text-neutral-500">We'll personalise your ERP setup based on your business type.</p>
              </div>

              <div>
                <label className="text-sm font-medium text-neutral-700">Business name</label>
                <input autoFocus value={form.name} onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. Raasta Cafe, Sharma Textiles, TechVentures"
                  className="mt-2 w-full rounded-xl border border-neutral-300 px-4 py-3 text-base focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10" />
              </div>

              <div>
                <label className="text-sm font-medium text-neutral-700">What kind of business is this?</label>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {BUSINESS_TYPES.map((t) => (
                    <button key={t.key} onClick={() => set("business_type", t.key)}
                      className={`rounded-xl border-2 p-4 text-left transition-all ${form.business_type === t.key
                        ? "border-neutral-900 bg-neutral-900 text-white"
                        : "border-neutral-200 bg-white hover:border-neutral-400"}`}>
                      <div className="text-2xl">{t.icon}</div>
                      <div className={`mt-2 text-sm font-semibold ${form.business_type === t.key ? "text-white" : "text-neutral-800"}`}>{t.label}</div>
                      <div className={`mt-0.5 text-xs ${form.business_type === t.key ? "text-neutral-300" : "text-neutral-400"}`}>{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <button disabled={!form.name.trim()} onClick={() => setStep(2)}
                className="w-full rounded-xl bg-neutral-900 py-3.5 text-base font-semibold text-white disabled:opacity-40 hover:bg-neutral-700 transition-colors">
                Continue →
              </button>
            </div>
          )}

          {/* ── Step 2: Location & GST ── */}
          {step === 2 && (
            <div className="space-y-8">
              <div>
                <p className="text-sm font-medium text-neutral-400 uppercase tracking-wider">Step 2 of 3</p>
                <h1 className="mt-2 text-3xl font-bold text-neutral-900">Location & contact</h1>
                <p className="mt-2 text-neutral-500">Used for GST invoices and your business profile. All optional — you can fill this later.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-neutral-700">City</label>
                  <input value={form.city} onChange={(e) => set("city", e.target.value)}
                    placeholder="e.g. Mumbai, Nagpur, Bangalore"
                    className="mt-2 w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm focus:border-neutral-900 focus:outline-none" />
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-700">State</label>
                  <select value={form.state} onChange={(e) => set("state", e.target.value)}
                    className="mt-2 w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm focus:border-neutral-900 focus:outline-none">
                    <option value="">Select state</option>
                    {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-neutral-700">Phone number <span className="text-neutral-400 font-normal">(optional)</span></label>
                <input value={form.phone} onChange={(e) => set("phone", e.target.value)}
                  placeholder="+91 98765 43210"
                  className="mt-2 w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm focus:border-neutral-900 focus:outline-none" />
              </div>

              <div>
                <label className="text-sm font-medium text-neutral-700">GSTIN <span className="text-neutral-400 font-normal">(optional — you can add this later)</span></label>
                <input value={form.gstin} onChange={(e) => set("gstin", e.target.value.toUpperCase())}
                  placeholder="22AAAAA0000A1Z5" maxLength={15}
                  className="mt-2 w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm font-mono tracking-wider focus:border-neutral-900 focus:outline-none" />
                <p className="mt-1.5 text-xs text-neutral-400">Required for GST-compliant invoicing to business customers.</p>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="rounded-xl border border-neutral-300 px-6 py-3.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">
                  ← Back
                </button>
                <button onClick={() => setStep(3)} className="flex-1 rounded-xl bg-neutral-900 py-3.5 text-base font-semibold text-white hover:bg-neutral-700 transition-colors">
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Trial Summary ── */}
          {step === 3 && (
            <div className="space-y-8">
              <div>
                <p className="text-sm font-medium text-neutral-400 uppercase tracking-wider">Step 3 of 3</p>
                <h1 className="mt-2 text-3xl font-bold text-neutral-900">Your 7-day free trial</h1>
                <p className="mt-2 text-neutral-500">Full access to everything. No credit card required.</p>
              </div>

              {/* Summary card */}
              <div className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{selectedType?.icon}</div>
                  <div>
                    <div className="font-semibold text-lg">{form.name}</div>
                    <div className="text-sm text-neutral-400 capitalize">{selectedType?.label}{form.city ? ` · ${form.city}` : ""}</div>
                  </div>
                  <span className="ml-auto rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">7-day trial</span>
                </div>

                <div className="border-t border-neutral-100 pt-4">
                  <p className="text-sm font-medium text-neutral-700 mb-3">Everything included in your trial:</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {MODULES.map((m) => (
                      <div key={m.key} className="flex items-center gap-2 text-sm text-neutral-600">
                        <span className="text-green-500 text-xs">✓</span> {m.name}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* What happens after */}
              <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-4 text-sm text-neutral-500 space-y-1">
                <p>✦ <strong className="text-neutral-700">7 days free</strong> — full access, no limits</p>
                <p>✦ <strong className="text-neutral-700">No credit card</strong> required to start</p>
                <p>✦ <strong className="text-neutral-700">After trial</strong> — choose a plan or we'll reach out to you</p>
                <p>✦ <strong className="text-neutral-700">Your data stays</strong> even if you pause</p>
              </div>

              {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="rounded-xl border border-neutral-300 px-6 py-3.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">
                  ← Back
                </button>
                <button onClick={finish} disabled={loading}
                  className="flex-1 rounded-xl bg-neutral-900 py-3.5 text-base font-semibold text-white hover:bg-neutral-700 disabled:opacity-50 transition-colors">
                  {loading ? "Setting up your account…" : "Start my free trial →"}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 4: Success ── */}
          {step === 4 && (
            <div className="space-y-8 text-center">
              <div className="space-y-4">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-50 text-4xl">✓</div>
                <h1 className="text-3xl font-bold text-neutral-900">You're all set, {form.name.split(" ")[0]}!</h1>
                <p className="text-neutral-500 max-w-md mx-auto">
                  Your 7-day free trial is active until <strong>{trialEndDate}</strong>. Explore everything — all {MODULES.length} modules are unlocked.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 text-sm">
                {[
                  { icon: "🧾", label: "Create your first invoice", href: "/dashboard/billing/new" },
                  { icon: "📦", label: "Add your products", href: "/dashboard/inventory/new" },
                  { icon: "👥", label: "Invite your team", href: "/dashboard/settings/team" },
                ].map((item) => (
                  <a key={item.href} href={item.href}
                    className="flex flex-col items-center gap-2 rounded-xl border border-neutral-200 bg-white p-4 hover:border-neutral-400 hover:bg-neutral-50 transition-all">
                    <span className="text-2xl">{item.icon}</span>
                    <span className="text-neutral-600 text-center">{item.label}</span>
                  </a>
                ))}
              </div>

              <a href="/dashboard"
                className="inline-block w-full rounded-xl bg-neutral-900 py-3.5 text-base font-semibold text-white hover:bg-neutral-700 transition-colors">
                Go to dashboard →
              </a>

              <p className="text-xs text-neutral-400">Your trial ends {trialEndDate} · No card needed</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
