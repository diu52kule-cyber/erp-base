export const APP_NAME = "Gradia";

export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  // Gradia "G" — served from public/logo.svg (transparent, flat gradient).
  // Kept as a static asset instead of inline SVG to avoid bloating every page bundle.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo.svg" alt="Gradia" className={`${className} object-contain`} />;
}

export function Brand({ className = "", wordmark = true }: { className?: string; wordmark?: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <Logo />
      {wordmark && (
        <span className="text-[15px] font-semibold tracking-tight text-neutral-900 dark:text-white">
          {APP_NAME}
        </span>
      )}
    </div>
  );
}
