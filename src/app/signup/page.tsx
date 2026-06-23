"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Brand } from "@/components/Brand";

function SignupForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  async function handleSignup() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setLoading(false);
      } else {
        const next = searchParams.get("next");
        window.location.href = next || "/onboarding";
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center"><Brand /></div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-7 shadow-sm">
          <h1 className="text-xl font-semibold text-neutral-900">Create your account</h1>
          <p className="mt-1 text-sm text-neutral-500">Start your 7-day free trial. No card needed.</p>

          <div className="mt-6 space-y-3">
            <div>
              <label className="text-xs font-medium text-neutral-500">Email</label>
              <input
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-neutral-900 focus:outline-none"
                placeholder="you@company.com" type="email" autoFocus value={email}
                onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSignup()} />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500">Password</label>
              <input
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-neutral-900 focus:outline-none"
                placeholder="At least 6 characters" type="password" value={password}
                onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSignup()} />
            </div>
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-neutral-300 accent-neutral-900 cursor-pointer"
              />
              <span className="text-xs text-neutral-500 leading-relaxed">
                I agree to the{' '}
                <Link href="/terms" target="_blank" className="font-medium text-neutral-900 underline underline-offset-2">Terms of Service</Link>
                {' '}and{' '}
                <Link href="/privacy" target="_blank" className="font-medium text-neutral-900 underline underline-offset-2">Privacy Policy</Link>
              </span>
            </label>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <button onClick={handleSignup} disabled={loading || !agreed}
              className="w-full rounded-lg bg-neutral-900 py-2.5 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-50">
              {loading ? "Creating account…" : "Create account"}
            </button>
          </div>
        </div>
        <p className="mt-5 text-center text-sm text-neutral-500">
          Have an account? <Link href="/login" className="font-medium text-neutral-900 underline-offset-2 hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
