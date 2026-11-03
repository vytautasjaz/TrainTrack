import { Activity, Clock, Route } from 'lucide-react'
import type { WeekSportMetric, WeekSportStatMode } from '@/lib/week-sport-stats'
import { cn } from '@/lib/utils'

/** Label + single metric value (right-aligned). */
export const WEEK_SPORT_STATS_GRID =
  'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3'

function MetricPair({
  icon: Icon,
  actual,
  planned,
  unit,
  className,
}: {
  icon: typeof Route
  actual: string
  planned: string
  unit?: string
  className?: string
}) {
  const unitSuffix = unit ? ` ${unit}` : ''
  return (
    <span
      className={cn(
        'inline-flex min-w-0 items-center gap-1 text-[11px] tabular-nums leading-tight',
        className,
      )}
    >
      <Icon
        className="h-3 w-3 shrink-0 text-[var(--tt-ink-faint,#9a9a9a)]"
        strokeWidth={1.75}
        aria-hidden
      />
      <span className="min-w-0 truncate">
        <span className="font-semibold text-[var(--tt-ink,#111)]">
          {actual}
          {unitSuffix}
        </span>
        <span className="text-[var(--tt-ink-faint,#9a9a9a)]">
          {' '}
          / {planned}
          {unitSuffix}
        </span>
      </span>
    </span>
  )
}

function metricIcon(kind: WeekSportMetric['kind']) {
  if (kind === 'time') return Clock
  if (kind === 'tss') return Activity
  return Route
}

/** One metric cell for the active Distance / Time / TSS mode. */
export function WeekSportMetricValue({ metric }: { metric: WeekSportMetric }) {
  if (metric.kind === 'count') {
    return (
      <div className="justify-self-end text-right">
        <span className="text-[11px] tabular-nums leading-tight text-[var(--tt-ink,#111)]">
          <span className="font-semibold">{metric.actualLabel}</span>
          <span className="text-[var(--tt-ink-faint,#9a9a9a)]">
            /{metric.plannedLabel}
            {metric.unit ? ` ${metric.unit}` : ''}
          </span>
        </span>
      </div>
    )
  }

  return (
    <div className="justify-self-end text-right">
      <MetricPair
        icon={metricIcon(metric.kind)}
        actual={metric.actualLabel}
        planned={metric.plannedLabel}
        unit={metric.unit || undefined}
      />
    </div>
  )
}

export function WeekSportStatModeToggle({
  mode,
  onChange,
  className,
}: {
  mode: WeekSportStatMode
  onChange: (mode: WeekSportStatMode) => void
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center gap-1 text-[10px] font-medium tracking-[0.02em]',
        className,
      )}
      role="group"
      aria-label="Week overview metric"
    >
      {(
        [
          { id: 'distance' as const, label: 'Distance' },
          { id: 'time' as const, label: 'Time' },
          { id: 'tss' as const, label: 'TSS' },
        ] as const
      ).map((option, index) => (
        <span key={option.id} className="inline-flex items-center gap-1">
          {index > 0 ? (
            <span className="text-[var(--tt-ink-faint,#9a9a9a)]" aria-hidden>
              ·
            </span>
          ) : null}
          <button
            type="button"
            aria-pressed={mode === option.id}
            onClick={() => onChange(option.id)}
            className={cn(
              'transition',
              mode === option.id
                ? option.id === 'time'
                  ? 'text-[var(--tt-ink,#111)]'
                  : 'text-[var(--tt-v2-accent,#f0440a)]'
                : 'text-[var(--tt-ink-faint,#9a9a9a)] hover:text-[var(--tt-ink-soft,#6b6b6b)]',
            )}
          >
            {option.label}
          </button>
        </span>
      ))}
    </div>
  )
}

export function WeekVolumeMetric({
  actual,
  planned,
  mode = 'time',
  className,
}: {
  actual: string
  planned: string
  mode?: WeekSportStatMode
  className?: string
}) {
  const Icon = mode === 'tss' ? Activity : mode === 'distance' ? Route : Clock
  const unit = mode === 'tss' ? 'TSS' : mode === 'distance' ? 'km' : undefined
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2',
        className,
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--tt-ink,#111)]">
        Volume
      </p>
      <MetricPair
        icon={Icon}
        actual={actual}
        planned={planned}
        unit={unit}
      />
    </div>
  )
}
