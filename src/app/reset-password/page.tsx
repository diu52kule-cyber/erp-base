'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Brand } from '@/components/Brand';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // The Supabase browser client picks up the recovery token from the URL automatically.
  useEffect(() => {
    const supabase = createClient();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {});
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit() {
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true); setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { setError(error.message + ' — the link may have expired, request a new one.'); return; }
    setDone(true);
    setTimeout(() => { window.location.href = '/dashboard'; }, 1500);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center"><Brand /></div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-7 shadow-sm">
          {done ? (
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-2xl">✓</div>
              <h1 className="text-lg font-semibold">Password updated</h1>
              <p className="mt-1 text-sm text-neutral-500">Redirecting to your dashboard…</p>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-semibold">Set a new password</h1>
              <div className="mt-6 space-y-3">
                <input className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-neutral-900 focus:outline-none"
                  type="password" placeholder="New password (min 6 chars)" autoFocus value={password}
                  onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
                {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
                <button onClick={submit} disabled={loading || !password}
                  className="w-full rounded-lg bg-neutral-900 py-2.5 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-50">
                  {loading ? 'Updating…' : 'Update password'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
