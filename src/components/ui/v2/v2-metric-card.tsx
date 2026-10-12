import { cn } from '@/lib/utils'
import { v2 } from '@/lib/design-tokens'
import { V2Progress } from '@/components/ui/v2/v2-progress'

export function V2MetricCard({
  label,
  value,
  hint,
  delta,
  deltaCompareLabel = 'vs last week',
  progress,
  className,
  children,
  compactDelta = false,
}: {
  label: React.ReactNode
  value?: React.ReactNode
  hint?: string
  /** Percent change vs prior period; null hides delta. */
  delta?: number | null
  /** Suffix after “+12%” (e.g. “vs last 4 weeks”). */
  deltaCompareLabel?: string
  /** Optional thin progress under value (e.g. next race). */
  progress?: number | null
  className?: string
  /** Right-side chart / ring — mockup layout. */
  children?: React.ReactNode
  /** Phone: show “+12%” only (drop compare label). */
  compactDelta?: boolean
}) {
  const compareSuffix = ` ${deltaCompareLabel}`
  return (
    <div className={cn(v2.surfaces.metric, className)}>
      <p className="tt-v2-eyebrow text-white/45">{label}</p>
      {value != null ? (
        <div className="tt-v2-metric__row mt-2 flex items-end justify-between gap-2">
          <div className="tt-v2-metric__copy min-w-0 flex-1">
            <p className="tt-v2-metric__value whitespace-nowrap text-[1.5rem] font-bold leading-tight tracking-tight text-white tabular-nums sm:text-[1.65rem] lg:text-[1.75rem]">
              {value}
            </p>
            {delta != null ? (
              <p className="tt-v2-metric__delta mt-1.5 text-[12px] font-medium text-white/50">
                {delta >= 0 ? '+' : ''}
                {delta}%
                {compactDelta ? (
                  <span className="hidden sm:inline">{compareSuffix}</span>
                ) : (
                  compareSuffix
                )}
              </p>
            ) : hint ? (
              <p className="tt-v2-metric__hint mt-1.5 line-clamp-2 text-[12px] leading-snug text-white/50">
                {hint}
              </p>
            ) : null}
            {progress != null ? (
              <V2Progress
                className="mt-2.5 max-w-[7rem]"
                heightClassName="h-1"
                value={progress}
              />
            ) : null}
          </div>
          {children ? (
            <div className="tt-v2-metric__chart mb-0.5 shrink-0 self-end">
              {children}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-2">{children}</div>
      )}
    </div>
  )
}
