"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Brand } from "@/components/Brand";

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setError(error.message);
    window.location.href = searchParams.get("next") ?? "/dashboard";
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center"><Brand /></div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-7 shadow-sm">
          <h1 className="text-xl font-semibold text-neutral-900">Welcome back</h1>
          <p className="mt-1 text-sm text-neutral-500">Log in to your workspace.</p>

          <div className="mt-6 space-y-3">
            <div>
              <label className="text-xs font-medium text-neutral-500">Email</label>
              <input
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-neutral-900 focus:outline-none"
                placeholder="you@company.com" type="email" autoFocus value={email}
                onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500">Password</label>
              <input
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-neutral-900 focus:outline-none"
                placeholder="••••••••" type="password" value={password}
                onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
            </div>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <div className="text-right">
              <Link href="/forgot-password" className="text-xs text-neutral-500 hover:text-neutral-900">Forgot password?</Link>
            </div>
            <button onClick={handleLogin} disabled={loading}
              className="w-full rounded-lg bg-neutral-900 py-2.5 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-50">
              {loading ? "Logging in…" : "Log in"}
            </button>
          </div>
        </div>
        <p className="mt-5 text-center text-sm text-neutral-500">
          No account? <Link href="/signup" className="font-medium text-neutral-900 underline-offset-2 hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
