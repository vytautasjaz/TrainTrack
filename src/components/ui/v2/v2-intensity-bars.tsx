import { cn } from '@/lib/utils'

/** Geometric ascending intensity bars (design system). Levels 1–5. */
export function V2IntensityBars({
  level = 3,
  max = 5,
  tone = 'light',
  className,
}: {
  /** Active bars from the left (1–max). */
  level?: number
  max?: number
  /** `dark` = bars on charcoal/inverted session cards. */
  tone?: 'light' | 'dark'
  className?: string
}) {
  const active = Math.max(0, Math.min(max, Math.round(level)))
  return (
    <div
      className={cn('inline-flex items-end gap-0.5', className)}
      role="img"
      aria-label={`Intensity ${active} of ${max}`}
    >
      {Array.from({ length: max }, (_, i) => {
        const on = i < active
        const h = 4 + i * 3
        return (
          <span
            key={i}
            className={cn(
              'w-[3px] rounded-[var(--radius-xs)]',
              on
                ? 'bg-[var(--tt-v2-accent)]'
                : tone === 'dark'
                  ? 'bg-white/20'
                  : 'bg-[var(--tt-line-strong,#d1d5db)]',
            )}
            style={{ height: h }}
          />
        )
      })}
    </div>
  )
}
