import { cn } from '@/lib/utils'
import { v2 } from '@/lib/design-tokens'

export function V2Progress({
  value,
  tone = 'dark',
  className,
  heightClassName = 'h-2',
}: {
  /** 0–1 */
  value: number
  tone?: 'dark' | 'light'
  className?: string
  heightClassName?: string
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  return (
    <div
      className={cn(
        tone === 'light' ? v2.surfaces.progressLight : v2.surfaces.progress,
        heightClassName,
        className,
      )}
    >
      <span style={{ width: `${pct}%` }} />
    </div>
  )
}

export function V2ProgressRow({
  label,
  valueLabel,
  ratio,
  tone = 'dark',
}: {
  label: string
  valueLabel: string
  ratio: number
  tone?: 'dark' | 'light'
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span
          className={cn(
            'text-[13px]',
            tone === 'light' ? 'text-[var(--tt-v2-light-ink)]' : 'text-white/85',
          )}
        >
          {label}
        </span>
        <span
          className={cn(
            'text-[12px] tabular-nums',
            tone === 'light'
              ? 'text-[var(--tt-v2-light-ink-soft)]'
              : 'text-[var(--tt-v2-ink-soft)]',
          )}
        >
          {valueLabel}
        </span>
      </div>
      <V2Progress value={ratio} tone={tone} />
    </div>
  )
}
