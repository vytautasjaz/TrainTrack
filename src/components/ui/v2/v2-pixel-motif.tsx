/** Diagonal pixel / stepped streak behind hero titles (design system identity). */
export function V2PixelMotif({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 280 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <g fill="var(--tt-v2-accent)">
        {/* Rising stepped blocks — large geometric, not tiny pixels */}
        <rect x="40" y="120" width="28" height="28" opacity="0.35" />
        <rect x="68" y="92" width="28" height="56" opacity="0.45" />
        <rect x="96" y="64" width="28" height="84" opacity="0.55" />
        <rect x="124" y="40" width="28" height="108" opacity="0.7" />
        <rect x="152" y="24" width="28" height="124" opacity="0.85" />
        <rect x="180" y="8" width="28" height="140" opacity="1" />
        <rect x="208" y="0" width="28" height="56" opacity="0.9" />
        <rect x="236" y="0" width="28" height="28" opacity="0.55" />
        {/* Secondary offset cluster */}
        <rect x="152" y="132" width="20" height="20" opacity="0.4" />
        <rect x="172" y="112" width="20" height="40" opacity="0.5" />
        <rect x="192" y="92" width="20" height="28" opacity="0.35" />
      </g>
    </svg>
  )
}
