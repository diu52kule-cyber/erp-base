"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Brand } from "@/components/Brand";

const gridBg = "radial-gradient(circle at center, rgba(120,140,160,0.35) 1px, transparent 1px)";
const inputCls =
  "mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 transition-colors placeholder:text-neutral-400 focus:border-[#00adbe] focus:outline-none focus:ring-2 focus:ring-[#00adbe]/25 dark:border-white/15 dark:bg-white/5 dark:text-white";

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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white px-4 dark:bg-neutral-950">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-18%] h-[520px] w-[840px] -translate-x-1/2 rounded-full opacity-70"
          style={{ background: "radial-gradient(50% 50% at 50% 50%, rgba(0,173,190,0.16), rgba(0,113,201,0.08) 45%, transparent 72%)" }} />
        <div className="absolute inset-0 opacity-40 dark:opacity-25"
          style={{ backgroundImage: gridBg, backgroundSize: "26px 26px", maskImage: "radial-gradient(ellipse 70% 60% at 50% 32%, #000 30%, transparent 75%)", WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 32%, #000 30%, transparent 75%)" }} />
      </div>

      <div className="w-full max-w-sm">
        <Link href="/" className="mb-6 flex justify-center"><Brand size="lg" /></Link>
        <div className="rounded-2xl border border-neutral-200/80 bg-white/90 p-7 shadow-xl shadow-neutral-900/5 backdrop-blur-sm dark:border-white/10 dark:bg-neutral-900/80 dark:shadow-black/40">
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-white">Welcome back</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Log in to your workspace.</p>

          <div className="mt-6 space-y-3.5">
            <div>
              <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Email</label>
              <input className={inputCls} placeholder="you@company.com" type="email" autoFocus value={email}
                onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Password</label>
              <input className={inputCls} placeholder="••••••••" type="password" value={password}
                onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
            </div>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">{error}</p>}
            <div className="text-right">
              <Link href="/forgot-password" className="text-xs text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">Forgot password?</Link>
            </div>
            <button onClick={handleLogin} disabled={loading}
              className="w-full rounded-xl bg-neutral-900 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-px hover:shadow-md disabled:opacity-50 disabled:hover:translate-y-0 dark:bg-white dark:text-neutral-900">
              {loading ? "Logging in…" : "Log in"}
            </button>
          </div>
        </div>
        <p className="mt-5 text-center text-sm text-neutral-500 dark:text-neutral-400">
          No account? <Link href="/signup" className="font-medium text-neutral-900 underline-offset-2 hover:underline dark:text-white">Sign up</Link>
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
