'use client'

import { MapPin, Target } from 'lucide-react'
import { WorkoutStatus, WorkoutType } from '@prisma/client'
import {
  getRescheduleBadgeLabel,
  RescheduleBadge,
} from '@/components/plan/reschedule-badge'
import {
  getWorkoutCardDuration,
  getWorkoutCardHero,
  getWorkoutCardSubtitle,
  getWorkoutCompletionPercent,
  isWorkoutCardCompleted,
  isWorkoutCardSkipped,
  workoutHasLoggedActuals,
} from '@/lib/workout-card'
import { getWorkoutPlanMetrics } from '@/lib/workout-plan-metrics'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { cn } from '@/lib/utils'

function sportRailColor(type: WorkoutType): string {
  switch (type) {
    case WorkoutType.BIKE:
      return 'var(--color-sport-bike)'
    case WorkoutType.SWIM:
      return 'var(--color-sport-swim)'
    case WorkoutType.STRENGTH:
      return 'var(--color-sport-strength)'
    case WorkoutType.RECOVERY:
    case WorkoutType.REST:
      return 'var(--color-sport-strength)'
    case WorkoutType.HYROX:
      return 'var(--color-sport-hyrox)'
    case WorkoutType.TRIATHLON:
      return 'var(--color-sport-tri)'
    default:
      return 'var(--color-sport-run)'
  }
}

function formatHeroLabel(
  value: string,
  unit: string | null | undefined,
  approximate?: boolean,
): string {
  const core = unit ? `${value} ${unit}` : value
  return approximate ? `~ ${core}` : core
}

function extractZone(text: string | null | undefined): string | null {
  if (!text) return null
  const match = text.match(/\b(Z[1-5]|CSS|FTP|Threshold|Tempo|VO2)\b/i)
  return match?.[1] ?? null
}

function includeLine(workout: PlanWorkoutDetail): string | null {
  const items = workout.structure?.includeItems
  if (!items?.length) return null
  return items
    .map((item) => {
      const reps = item.repetitions > 1 ? `${item.repetitions}× ` : ''
      return `${reps}${item.title}`.trim()
    })
    .filter(Boolean)
    .join(' · ')
}

function recoveryLine(workout: PlanWorkoutDetail): string | null {
  const description = workout.description?.trim()
  if (!description) return null
  const lines = description
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  // Second line often holds recovery / notes in simple prescriptions
  if (lines.length < 2) return null
  const second = lines[1]!
  if (/^recover/i.test(second) || /^cd\b/i.test(second)) return second
  return null
}

function prescriptionText(workout: PlanWorkoutDetail): string {
  const subtitle = getWorkoutCardSubtitle(workout)
  if (subtitle) {
    // Drop trailing " · Z2" when zone is shown separately
    return subtitle.replace(/\s*·\s*Z[1-5]\s*$/i, '').trim() || subtitle
  }
  const metrics = getWorkoutPlanMetrics(workout)
  const parts = [metrics.distance, metrics.duration].filter(Boolean)
  if (parts.length) return parts.join(' · ')
  return '—'
}

/**
 * Athlete Home Today card — unique vs week/list.
 * Matches `/design-mockups` PrescriptionWorkoutCard: Bebas title, prescription body,
 * optional recovery / INCLUDE, metric + zone footer, completion rail.
 */
export function HomePrescriptionWorkoutCard({
  workout,
  className,
}: {
  workout: PlanWorkoutDetail
  className?: string
}) {
  const status = workout.status
  const done = isWorkoutCardCompleted(status)
  const skipped = isWorkoutCardSkipped(status)
  const ghost = Boolean(workout.isRescheduleGhost)
  const pctRaw = getWorkoutCompletionPercent(workout, status)
  const pct = Math.min(
    120,
    Math.max(0, pctRaw ?? (done ? 100 : 0)),
  )
  const rail = ghost
    ? 'var(--tt-ink-faint, #9a9a9a)'
    : done
      ? 'var(--tt-good, #1a9f5c)'
      : skipped
        ? 'var(--color-tt-skipped-border, #f5a3a3)'
        : sportRailColor(workout.type)

  const title = workout.isRace ? `⚑ ${workout.title}` : workout.title
  const prescription = prescriptionText(workout)
  const recovery = recoveryLine(workout)
  const include = includeLine(workout)
  const zone =
    extractZone(workout.description) ??
    extractZone(prescription) ??
    null

  const hero = getWorkoutCardHero(workout, status)
  const secondary = getWorkoutCardDuration(workout, status)
  const showLogged = done && workoutHasLoggedActuals(workout)

  const plannedMetric = hero
    ? formatHeroLabel(hero.value, hero.unit, hero.approximate)
    : getWorkoutPlanMetrics(workout).distance ??
      getWorkoutPlanMetrics(workout).duration ??
      '—'

  const actualMetric =
    showLogged && hero
      ? formatHeroLabel(hero.value, hero.unit, hero.approximate)
      : null
  const actualSecondary =
    showLogged && secondary?.actual ? secondary.actual : null
  const showRescheduleBadge = Boolean(getRescheduleBadgeLabel(workout))

  return (
    <div
      className={cn(
        'tt-home-prescription-card relative overflow-hidden text-left',
        ghost && 'tt-workout-block-ghost',
        className,
      )}
      data-ghost={ghost ? 'true' : undefined}
      data-status={
        ghost ? 'ghost' : skipped ? 'skipped' : done ? 'completed' : 'planned'
      }
    >
      <div
        className={cn(
          'absolute inset-y-0 left-0 w-[3px]',
          done && 'bg-[var(--tt-line,#ebebeb)]',
        )}
        aria-hidden
      >
        <div
          className="absolute bottom-0 left-0 w-full"
          style={{
            height: done ? `${Math.min(100, pct)}%` : '100%',
            background: rail,
          }}
        />
      </div>

      <div className="relative p-3.5 pl-3.5">
        <div className="flex items-center gap-1.5">
          <p
            className={cn(
              'tt-home-workout-title min-w-0 truncate',
              done && !ghost && 'text-[var(--tt-good,#1a9f5c)]',
              skipped && !ghost && 'text-[var(--tt-red,#da2f36)]',
              ghost && 'text-[var(--tt-ink-faint,#9a9a9a)]',
            )}
          >
            {title}
          </p>
        </div>

        {showRescheduleBadge ? (
          <div className="mt-1">
            <RescheduleBadge workout={workout} />
          </div>
        ) : null}

        <p
          className={cn(
            'mt-1 text-[0.9375rem] leading-snug text-[var(--tt-ink,#111)]',
            done && !ghost && 'text-[var(--tt-good,#1a9f5c)]/85',
            skipped && !ghost && 'text-[var(--tt-red,#da2f36)]/80',
            ghost && 'text-[var(--tt-ink-faint,#9a9a9a)]',
          )}
        >
          {prescription}
        </p>

        {recovery ? (
          <p className="mt-0.5 text-[12px] leading-snug text-[var(--tt-ink-soft,#6b6b6b)]">
            {recovery}
          </p>
        ) : null}

        {include ? (
          <p className="mt-2 text-[12px] leading-snug text-[var(--tt-ink-faint,#9a9a9a)]">
            <span className="text-[0.6875rem] font-medium uppercase tracking-[0.08em]">
              Include
            </span>
            {' · '}
            {include}
          </p>
        ) : null}

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] leading-snug text-[var(--tt-ink-soft,#6b6b6b)]">
          {done && actualMetric ? (
            <>
              <span className="font-semibold tabular-nums text-[var(--tt-good,#1a9f5c)]">
                {actualMetric}
              </span>
              {actualSecondary ? (
                <span className="tabular-nums text-[var(--tt-good,#1a9f5c)]/80">
                  {actualSecondary}
                </span>
              ) : null}
              {pct > 0 ? (
                <span className="text-[var(--tt-ink-faint,#9a9a9a)]">
                  {pct}% of plan
                </span>
              ) : null}
            </>
          ) : skipped ? (
            <span className="text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-[var(--tt-red,#da2f36)]">
              Skipped
            </span>
          ) : status === WorkoutStatus.PLANNED ? (
            <>
              <span className="inline-flex items-center gap-1 tabular-nums">
                <MapPin
                  className="h-3 w-3 text-[var(--tt-ink-faint,#9a9a9a)]"
                  strokeWidth={1.75}
                />
                {plannedMetric}
              </span>
              {zone ? (
                <span className="inline-flex items-center gap-1">
                  <Target
                    className="h-3 w-3 text-[var(--tt-ink-faint,#9a9a9a)]"
                    strokeWidth={1.75}
                  />
                  {zone}
                </span>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
