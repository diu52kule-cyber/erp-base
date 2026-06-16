'use client';
import { useState } from 'react';

export default function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function login() {
    setLoading(true); setError(null);
    const res = await fetch('/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    window.location.href = '/admin/clients';
  }

  return (
    <div className="admin-dark min-h-screen bg-neutral-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-800">
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-white">Admin Panel</h1>
          <p className="mt-1 text-sm text-neutral-400">ERP Platform · Operator Access</p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-950 border border-red-800 px-4 py-3 text-sm text-red-400">{error}</div>
          )}
          <div>
            <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Username</label>
            <input
              type="text" value={username} onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && login()}
              autoFocus autoComplete="username"
              className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:border-neutral-500 focus:outline-none"
              placeholder="admin" />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Password</label>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && login()}
              autoComplete="current-password"
              className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:border-neutral-500 focus:outline-none"
              placeholder="••••••••" />
          </div>
          <button onClick={login} disabled={loading || !username || !password}
            className="w-full rounded-lg bg-white py-2.5 text-sm font-semibold text-neutral-900 hover:bg-neutral-100 disabled:opacity-40 transition-colors">
            {loading ? 'Signing in…' : 'Sign in to Admin'}
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-neutral-600">
          This is a restricted area. Unauthorised access is prohibited.
        </p>
      </div>
    </div>
  );
}
