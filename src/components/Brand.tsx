export const APP_NAME = "Gradia";

export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 100" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* Main front-face gradient: deep blue → teal → bright green */}
        <linearGradient id="grm" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#1338BE"/>
          <stop offset="28%"  stopColor="#0771C8"/>
          <stop offset="60%"  stopColor="#079E8C"/>
          <stop offset="100%" stopColor="#0DC87A"/>
        </linearGradient>
        {/* Top-face gradient: lighter version for 3-D depth */}
        <linearGradient id="grt" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#4A6FE8"/>
          <stop offset="28%"  stopColor="#19AAEF"/>
          <stop offset="60%"  stopColor="#1DCFB5"/>
          <stop offset="100%" stopColor="#3DEBA4"/>
        </linearGradient>
        {/* Clip to staircase front-face only (keeps white stripe inside) */}
        <clipPath id="grc">
          <path d="M0 100 L0 75 L30 75 L30 50 L60 50 L60 25 L90 25 L90 0 L120 0 L120 100 Z"/>
        </clipPath>
      </defs>

      {/* ── Main front faces (4 ascending blocks) ── */}
      <path d="M0 100 L0 75 L30 75 L30 50 L60 50 L60 25 L90 25 L90 0 L120 0 L120 100 Z"
            fill="url(#grm)"/>

      {/* ── Top faces: lighter parallelograms for 3-D depth ── */}
      {/* Block 1 — tread at y=75 */}
      <polygon points="0,75 30,75 30,67 8,67"   fill="url(#grt)" opacity="0.80"/>
      {/* Block 2 — tread at y=50 */}
      <polygon points="30,50 60,50 60,42 38,42"  fill="url(#grt)" opacity="0.80"/>
      {/* Block 3 — tread at y=25 */}
      <polygon points="60,25 90,25 90,17 68,17"  fill="url(#grt)" opacity="0.80"/>

      {/* ── White diagonal arrow stripe, clipped to staircase ── */}
      <polygon points="0,85 15,100 120,15 105,0"
               fill="white" opacity="0.93" clipPath="url(#grc)"/>
    </svg>
  );
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
