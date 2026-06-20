'use client';
import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Brand } from '@/components/Brand';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true); setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setSent(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center"><Brand /></div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-7 shadow-sm">
          {sent ? (
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-2xl">✓</div>
              <h1 className="text-lg font-semibold">Check your email</h1>
              <p className="mt-1 text-sm text-neutral-500">If an account exists for <strong>{email}</strong>, we sent a reset link.</p>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-semibold">Reset your password</h1>
              <p className="mt-1 text-sm text-neutral-500">Enter your email and we&apos;ll send a reset link.</p>
              <div className="mt-6 space-y-3">
                <input className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-neutral-900 focus:outline-none"
                  type="email" placeholder="you@company.com" autoFocus value={email}
                  onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
                {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
                <button onClick={submit} disabled={loading || !email}
                  className="w-full rounded-lg bg-neutral-900 py-2.5 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-50">
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </div>
            </>
          )}
        </div>
        <p className="mt-5 text-center text-sm text-neutral-500">
          <Link href="/login" className="font-medium text-neutral-900 underline-offset-2 hover:underline">Back to login</Link>
        </p>
      </div>
    </div>
  );
}
