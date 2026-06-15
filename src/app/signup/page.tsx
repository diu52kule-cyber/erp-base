"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        router.push("/onboarding");
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">Create your account</h1>
      <input
        className="rounded-lg border border-neutral-300 px-3 py-2"
        placeholder="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSignup()}
      />
      <input
        className="rounded-lg border border-neutral-300 px-3 py-2"
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSignup()}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        onClick={handleSignup}
        disabled={loading}
        className="rounded-lg bg-neutral-900 px-4 py-2.5 text-white disabled:opacity-50"
      >
        {loading ? "Creating account…" : "Sign up"}
      </button>
      <p className="text-sm text-neutral-600">
        Have an account? <Link href="/login" className="underline">Log in</Link>
      </p>
    </main>
  );
}
