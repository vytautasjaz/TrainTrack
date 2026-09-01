'use client'

import { Check, MapPin, Target } from 'lucide-react'
import { SportIcon } from './mock-ui'
import type { TrainingSport, TrainingStatus, TrainingWorkout } from './training-mock-data'

export type CardSize = 'xl' | 'l' | 'm' | 's' | 'xs'

export type PrescriptionWorkout = {
  id: string
  sport: TrainingSport
  title: string
  /** Primary prescription line(s) */
  prescription: string
  /** Secondary e.g. recovery */
  recovery?: string
  /** Main scale metric on card footer */
  metric: string
  zone?: string
  include?: string
  status: TrainingStatus
  /** 0–100+ for green rail fill when done */
  completionPercent?: number
  /** Actuals shown on completed card */
  actualMetric?: string
  actualSecondary?: string
  race?: boolean
}

export function sportRailColor(sport: TrainingSport) {
  if (sport === 'run') return 'var(--tt-sport-run)'
  if (sport === 'bike') return 'var(--tt-sport-bike)'
  if (sport === 'swim') return 'var(--tt-sport-swim)'
  if (sport === 'strength') return 'var(--tt-sport-strength)'
  return 'var(--tt-sport-recovery)'
}

/** Map training-week/list mock rows → prescription card model */
export function toPrescriptionWorkout(w: TrainingWorkout): PrescriptionWorkout {
  const done = w.status === 'done'
  const metric = w.prescriptionMetric ?? w.meta.split('·')[0]?.trim() ?? w.meta
  return {
    id: w.id,
    sport: w.sport,
    title: w.race ? `⚑ ${w.title}` : w.title,
    prescription: w.prescription ?? w.meta,
    recovery: w.recoveryLine,
    metric,
    zone: w.zone,
    include: w.include,
    status: w.status,
    completionPercent: w.completionPercent,
    actualMetric: done ? w.actualMetric ?? metric : undefined,
    actualSecondary: done ? w.actualSecondary : undefined,
    race: w.race,
  }
}

/** Prescription card — sizes reduce info, not redesign. Type = mock tokens only. */
export function PrescriptionWorkoutCard({
  workout,
  size = 'l',
  onOpen,
  className = '',
}: {
  workout: PrescriptionWorkout
  size?: CardSize
  onOpen?: () => void
  className?: string
}) {
  const done = workout.status === 'done'
  const skipped = workout.status === 'skipped'
  const pct = Math.min(120, Math.max(0, workout.completionPercent ?? (done ? 100 : 0)))
  const rail = done ? 'var(--tt-good)' : sportRailColor(workout.sport)
  const showInclude = Boolean(workout.include) && (size === 'xl' || size === 'l')
  const showRecovery = Boolean(workout.recovery) && size !== 'xs' && size !== 's'
  const showZone = Boolean(workout.zone) && (size === 'xl' || size === 'l' || size === 'm')
  const showMetric = size !== 'xs'
  const pad =
    size === 'xl'
      ? 'p-4 pl-4'
      : size === 'l'
        ? 'p-3.5 pl-3.5'
        : size === 'm'
          ? 'p-3 pl-3'
          : size === 's'
            ? 'p-2.5 pl-2.5'
            : 'p-2 pl-2'
  const rx = size === 'xs' || size === 's' ? 'rounded-[6px]' : 'rounded-[10px]'

  const titleTone = done
    ? '!text-[var(--tt-good)]'
    : skipped
      ? '!text-[var(--tt-ink-faint)] line-through'
      : ''

  const rxTone = done
    ? '!text-[var(--tt-good)]/85'
    : skipped
      ? '!text-[var(--tt-ink-faint)]'
      : '!text-[var(--tt-ink)]'

  const body = (
    <>
      <div
        className={`absolute inset-y-0 left-0 w-[3px] ${done ? 'bg-[var(--tt-line)]' : ''}`}
        aria-hidden
      >
        <div
          className="absolute bottom-0 left-0 w-full"
          style={{
            height: done ? `${Math.min(100, pct)}%` : '100%',
            background: skipped ? 'var(--tt-ink-faint)' : rail,
          }}
        />
      </div>

      <div className={`relative ${pad}`}>
        <div className="flex items-start gap-2">
          {size === 'xs' ? (
            <SportIcon
              sport={workout.sport}
              className="mt-0.5 h-3 w-3 shrink-0"
              color={
                done
                  ? 'var(--tt-good)'
                  : skipped
                    ? 'var(--tt-ink-faint)'
                    : sportRailColor(workout.sport)
              }
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              {size === 'xl' || size === 'l' ? (
                <p
                  className={`tt-mock-workout-title min-w-0 truncate ${titleTone}`}
                  data-size={size}
                >
                  {workout.title}
                </p>
              ) : (
                <p
                  className={`tt-mock-h3 min-w-0 truncate !font-semibold !leading-snug ${
                    size === 'xs' ? '!text-[0.8125rem]' : size === 's' ? '!text-[0.875rem]' : ''
                  } ${titleTone}`}
                >
                  {workout.title}
                </p>
              )}
              {done && pct >= 100 ? (
                <Check className="h-3.5 w-3.5 shrink-0 text-[var(--tt-good)]" strokeWidth={2.5} />
              ) : null}
            </div>

            {size === 'xs' ? (
              <p className={`tt-mock-caption mt-0.5 truncate ${rxTone}`}>{workout.prescription}</p>
            ) : (
              <>
                <p
                  className={`${size === 's' ? 'tt-mock-caption' : 'tt-mock-body'} mt-1 ${rxTone}`}
                >
                  {workout.prescription}
                </p>
                {showRecovery ? (
                  <p className="tt-mock-caption mt-0.5">{workout.recovery}</p>
                ) : null}
              </>
            )}

            {showInclude ? (
              <p className="tt-mock-caption mt-2 !text-[var(--tt-ink-faint)]">
                <span className="tt-mock-overline !inline !text-[var(--tt-ink-faint)]">Include</span>
                {' · '}
                {workout.include}
              </p>
            ) : null}

            {showMetric ? (
              <div className="tt-mock-caption mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                {done && workout.actualMetric ? (
                  <>
                    <span className="font-semibold tabular-nums !text-[var(--tt-good)]">
                      {workout.actualMetric}
                    </span>
                    {workout.actualSecondary ? (
                      <span className="tabular-nums !text-[var(--tt-good)]/80">
                        {workout.actualSecondary}
                      </span>
                    ) : null}
                    {size !== 's' && pct ? (
                      <span className="!text-[var(--tt-ink-faint)]">{pct}% of plan</span>
                    ) : null}
                  </>
                ) : skipped ? (
                  <span className="tt-mock-overline !text-[var(--tt-ink-faint)]">Skipped</span>
                ) : (
                  <>
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <MapPin className="h-3 w-3 text-[var(--tt-ink-faint)]" strokeWidth={1.75} />
                      {workout.metric}
                    </span>
                    {showZone && workout.zone ? (
                      <span className="inline-flex items-center gap-1">
                        <Target className="h-3 w-3 text-[var(--tt-ink-faint)]" strokeWidth={1.75} />
                        {workout.zone}
                      </span>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  )

  const shellClass = `relative overflow-hidden border border-[var(--tt-line)] bg-white text-left ${rx} ${
    size === 'xs' || size === 's' ? '' : 'shadow-[var(--tt-shadow)]'
  } ${done ? 'bg-[var(--tt-good-soft)]/40' : ''} ${skipped ? 'opacity-75' : ''} ${className}`

  if (onOpen) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className={`w-full transition hover:border-[var(--tt-line-strong)] ${shellClass}`}
      >
        {body}
      </button>
    )
  }
  return <div className={shellClass}>{body}</div>
}
