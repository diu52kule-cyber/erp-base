"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

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
    const next = searchParams.get('next') ?? '/dashboard';
    window.location.href = next;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">Log in</h1>
      <input className="rounded-lg border border-neutral-300 px-3 py-2" placeholder="Email"
        value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className="rounded-lg border border-neutral-300 px-3 py-2" placeholder="Password" type="password"
        value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button onClick={handleLogin} disabled={loading}
        className="rounded-lg bg-neutral-900 px-4 py-2.5 text-white disabled:opacity-50">
        {loading ? "..." : "Log in"}
      </button>
      <p className="text-sm text-neutral-600">
        No account? <Link href="/signup" className="underline">Sign up</Link>
      </p>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
