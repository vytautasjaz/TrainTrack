import {
  TRAINING_PHASE_SURFACE,
  type CurrentPhaseIndicator,
} from '@/lib/training-phase-context'
import { cn } from '@/lib/utils'

export function CurrentPhaseBadge({
  indicator,
  compact = false,
}: {
  indicator: CurrentPhaseIndicator
  compact?: boolean
}) {
  const surface = TRAINING_PHASE_SURFACE[indicator.phaseKey]
  return (
    <div className={cn('min-w-0 text-right', compact && 'text-left')}>
      <p
        className="text-[11px] font-semibold uppercase tracking-[0.06em] tabular-nums"
        style={{ color: surface.label }}
      >
        {indicator.phaseName} · {indicator.weekCurrent} / {indicator.weekTotal}
      </p>
      {indicator.subtitle ? (
        <p className="truncate text-[11px] text-[var(--tt-ink-faint,#9a9a9a)]">
          {indicator.subtitle}
        </p>
      ) : null}
    </div>
  )
}
