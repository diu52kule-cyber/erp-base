export const APP_NAME = "ERP Base";

export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <div className={`relative inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm ${className}`}>
      <svg viewBox="0 0 24 24" fill="none" className="h-1/2 w-1/2" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 7h16M4 12h16M4 17h10" />
      </svg>
    </div>
  );
}

export function Brand({ className = "", wordmark = true }: { className?: string; wordmark?: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <Logo />
      {wordmark && <span className="text-[15px] font-semibold tracking-tight text-neutral-900">{APP_NAME}</span>}
    </div>
  );
}
