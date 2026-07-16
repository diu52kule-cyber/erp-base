export const APP_NAME = "Gradia";

const SIZES = {
  sm: { logo: "h-7 w-7", text: "text-sm" },
  md: { logo: "h-8 w-8", text: "text-[15px]" },
  lg: { logo: "h-10 w-10", text: "text-xl" },
} as const;

export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  // Gradia "G" — served from public/logo.svg (transparent, flat gradient).
  // Kept as a static asset instead of inline SVG to avoid bloating every page bundle.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo.svg" alt="Gradia" className={`${className} object-contain`} />;
}

export function Brand({
  className = "",
  wordmark = true,
  size = "md",
}: {
  className?: string;
  wordmark?: boolean;
  size?: keyof typeof SIZES;
}) {
  const s = SIZES[size];
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <Logo className={s.logo} />
      {wordmark && (
        <span className={`${s.text} font-semibold tracking-tight text-neutral-900 dark:text-white`}>
          {APP_NAME}
        </span>
      )}
    </div>
  );
}
