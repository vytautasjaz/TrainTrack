import type { WorkoutType } from '@prisma/client'
import { cn } from '@/lib/utils'

const SPORT_COLOR: Partial<Record<WorkoutType, string>> = {
  RUN: 'text-[var(--color-sport-run)]',
  BIKE: 'text-[var(--color-sport-bike)]',
  SWIM: 'text-[var(--color-sport-swim)]',
  STRENGTH: 'text-[var(--color-sport-strength)]',
  HYROX: 'text-[var(--color-sport-hyrox)]',
  TRIATHLON: 'text-[var(--color-sport-tri)]',
  RECOVERY: 'text-[var(--color-sport-recovery)]',
  REST: 'text-[var(--color-sport-rest)]',
}

type SportDotProps = {
  sport?: WorkoutType | null
  label?: string
  className?: string
  /** Hide label — dot only. */
  dotOnly?: boolean
}

/** Subtle sport marker: colored dot + optional label. */
export function SportDot({ sport, label, className, dotOnly = false }: SportDotProps) {
  const color = (sport && SPORT_COLOR[sport]) || 'text-text-tertiary'
  return (
    <span className={cn('inline-flex items-center gap-2', color, className)}>
      <span className="tt-sport-dot" aria-hidden />
      {dotOnly ? null : (
        <span className="tt-data-cell-secondary text-[inherit]">{label ?? sport ?? '—'}</span>
      )}
    </span>
  )
}
