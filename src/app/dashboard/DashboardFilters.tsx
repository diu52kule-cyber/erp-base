'use client';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

export default function DashboardFilters({ fromDate, toDate }: { fromDate: string; toDate: string }) {
  const router = useRouter();
  const [from, setFrom] = useState(fromDate);
  const [to, setTo]     = useState(toDate);

  const apply = useCallback((f: string, t: string) => {
    const params = new URLSearchParams({ from_date: f, to_date: t });
    router.push(`/dashboard?${params}`);
  }, [router]);

  function preset(days: number) {
    const t = new Date().toISOString().split('T')[0];
    const f = new Date(Date.now() - days * 86400_000).toISOString().split('T')[0];
    setFrom(f); setTo(t);
    apply(f, t);
  }

  const inputCls = 'rounded-lg border border-neutral-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-white';

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-neutral-400 text-xs">Period:</span>
      {[['7d', 7], ['30d', 30], ['90d', 90], ['YTD', -1]] .map(([label, days]) => (
        <button key={label} type="button"
          onClick={() => {
            if (days === -1) {
              const now = new Date();
              const f = `${now.getFullYear()}-04-01`;
              const t = now.toISOString().split('T')[0];
              setFrom(f); setTo(t); apply(f, t);
            } else {
              preset(days as number);
            }
          }}
          className="rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs hover:bg-neutral-50 transition-colors"
        >
          {label}
        </button>
      ))}
      <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
      <span className="text-neutral-400">→</span>
      <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} />
      <button type="button" onClick={() => apply(from, to)}
        className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs text-white hover:bg-neutral-700">
        Apply
      </button>
      <button type="button" onClick={() => { setFrom(''); setTo(''); router.push('/dashboard'); }}
        className="text-xs text-neutral-400 hover:text-neutral-700">
        All time
      </button>
    </div>
  );
}
