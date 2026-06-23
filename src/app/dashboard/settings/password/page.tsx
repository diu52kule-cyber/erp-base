'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function ChangePasswordPage() {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setError(null);
    setSuccess(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.current) { setError('Current password is required'); return; }
    if (form.next.length < 8) { setError('New password must be at least 8 characters'); return; }
    if (form.next !== form.confirm) { setError('New passwords do not match'); return; }
    if (form.current === form.next) { setError('New password must be different from current password'); return; }

    setLoading(true);
    setError(null);

    const supabase = createClient();

    // Get the current user's email for re-authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) { setError('Could not fetch user info'); setLoading(false); return; }

    // Re-authenticate with the current password to verify it
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: form.current,
    });

    if (signInErr) {
      setError('Current password is incorrect');
      setLoading(false);
      return;
    }

    // Current password verified — now update to the new password
    const { error: updateErr } = await supabase.auth.updateUser({ password: form.next });

    if (updateErr) {
      setError(updateErr.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setForm({ current: '', next: '', confirm: '' });
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">Change Password</h1>
        <p className="mt-1 text-sm text-neutral-500">You must enter your current password to set a new one.</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-md space-y-4">
        <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 p-6 space-y-4">

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Current password
            </label>
            <input
              type="password"
              value={form.current}
              onChange={(e) => set('current', e.target.value)}
              autoComplete="current-password"
              className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:text-white"
              placeholder="Enter current password"
            />
          </div>

          <div className="border-t border-neutral-100 dark:border-neutral-800 pt-4">
            <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              New password
            </label>
            <input
              type="password"
              value={form.next}
              onChange={(e) => set('next', e.target.value)}
              autoComplete="new-password"
              className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:text-white"
              placeholder="At least 8 characters"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Confirm new password
            </label>
            <input
              type="password"
              value={form.confirm}
              onChange={(e) => set('confirm', e.target.value)}
              autoComplete="new-password"
              className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:text-white"
              placeholder="Repeat new password"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950 border border-red-100 dark:border-red-900 px-4 py-3 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg bg-green-50 dark:bg-green-950 border border-green-100 dark:border-green-900 px-4 py-3 text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Password changed successfully.
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || !form.current || !form.next || !form.confirm}
            className="rounded-lg bg-neutral-900 px-6 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-40 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
          >
            {loading ? 'Updating…' : 'Update password'}
          </button>
        </div>
      </form>
    </div>
  );
}
