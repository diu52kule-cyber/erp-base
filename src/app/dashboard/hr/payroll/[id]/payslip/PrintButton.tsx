'use client';

export default function PrintButton() {
  return (
    <button onClick={() => window.print()}
      className="rounded-lg border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50 print:hidden">
      Print All
    </button>
  );
}
