'use client';

export default function PrintButton({ label = 'Print' }: { label?: string }) {
  return (
    <button onClick={() => window.print()}
      className="flex items-center gap-1.5 rounded-md border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-4 w-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 9V3h12v6M6 18H4a2 2 0 01-2-2v-4a2 2 0 012-2h16a2 2 0 012 2v4a2 2 0 01-2 2h-2M6 14h12v7H6z" />
      </svg>
      {label}
    </button>
  );
}
