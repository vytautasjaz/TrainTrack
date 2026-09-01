'use client'

import { useLayoutEffect, useRef } from 'react'
import { StravaWordmark } from '@/components/plan/strava-mark'
import { SportIcon } from './mock-ui'
import { DayWeatherMini, TodayWeatherStrip } from './today-weather-strip'
import { sportRailColor, toPrescriptionWorkout } from './prescription-workout-card'
import {
  TRAINING_DAYS,
  workoutsForDay,
  type TrainingStatus,
  type TrainingWorkout,
} from './training-mock-data'

function StatusMark({
  status,
  strava,
}: {
  status: TrainingStatus
  strava?: boolean
}) {
  if (status === 'done' && strava) {
    return (
      <span
        className="inline-flex items-center text-[var(--tt-ink-faint)]"
        title="Synced from Strava"
        aria-label="Synced from Strava"
      >
        <StravaWordmark className="h-2 w-auto" />
      </span>
    )
  }
  if (status === 'done') {
    return <span className="tt-mock-overline !text-[var(--tt-good)]">Done</span>
  }
  if (status === 'skipped') {
    return <span className="tt-mock-overline !text-[var(--tt-ink-faint)]">Skipped</span>
  }
  return <span className="tt-mock-overline !text-[var(--tt-ink-faint)]">Planned</span>
}

/** Dense agenda row — same prescription language, list density (not a full card). */
function WorkoutRow({
  workout,
  today,
  athleteActions,
  compact,
  last,
}: {
  workout: TrainingWorkout
  today: boolean
  athleteActions?: boolean
  compact?: boolean
  last?: boolean
}) {
  const rx = toPrescriptionWorkout(workout)
  const done = workout.status === 'done'
  const skipped = workout.status === 'skipped'
  const pct = Math.min(100, Math.max(0, workout.completionPercent ?? (done ? 100 : 0)))
  const rail = done ? 'var(--tt-good)' : sportRailColor(workout.sport)
  const subtitle = rx.prescription

  return (
    <div
      className={`relative flex items-center gap-3 ${compact ? 'px-3 py-2.5 pl-3.5' : 'px-3.5 py-3 pl-4'} ${
        last
          ? ''
          : done
            ? 'border-b border-[#86d39a]'
            : 'border-b border-[var(--tt-line)]'
      } ${done ? 'bg-[var(--tt-good-soft)]' : ''} ${skipped ? 'opacity-60' : ''}`}
    >
      <div
        className="absolute inset-y-0 left-0 w-[3px] bg-[var(--tt-line)]"
        aria-hidden
      >
        <div
          className="absolute bottom-0 left-0 w-full"
          style={{
            height: done ? `${pct}%` : '100%',
            background: skipped ? 'var(--tt-ink-faint)' : rail,
          }}
        />
      </div>
      <SportIcon
        sport={workout.sport}
        className="h-4 w-4 shrink-0"
        color={done ? 'var(--tt-good)' : skipped ? 'var(--tt-ink-faint)' : undefined}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p
            className={`tt-mock-h3 truncate !font-semibold !leading-snug ${
              compact ? '!text-[0.875rem]' : ''
            } ${
              done
                ? '!text-[var(--tt-good)]'
                : skipped
                  ? '!text-[var(--tt-ink-faint)]'
                  : ''
            }`}
          >
            {workout.race ? `⚑ ${workout.title}` : workout.title}
          </p>
          {workout.reschedule ? (
            <span className="tt-mock-overline !text-[var(--tt-ink-faint)]">Reschedule</span>
          ) : null}
        </div>
        <p
          className={`tt-mock-caption mt-0.5 truncate ${
            done ? '!text-[var(--tt-good)]/80' : ''
          }`}
        >
          {done && rx.actualMetric
            ? [rx.actualMetric, rx.actualSecondary].filter(Boolean).join(' · ')
            : subtitle}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <StatusMark status={workout.status} strava={workout.strava} />
        {athleteActions && today && workout.status === 'planned' ? (
          <>
            <button
              type="button"
              className="tt-mock-overline rounded-[6px] border border-[var(--tt-line)] bg-white px-2 py-1 !text-[var(--tt-ink-soft)]"
            >
              Skip
            </button>
            <button
              type="button"
              className="tt-mock-overline rounded-[6px] bg-[var(--tt-ink)] px-2.5 py-1 !text-white"
            >
              Done
            </button>
          </>
        ) : null}
      </div>
    </div>
  )
}

export function TrainingListBody({
  athleteActions = false,
  compact = false,
}: {
  athleteActions?: boolean
  compact?: boolean
}) {
  const todayRef = useRef<HTMLElement | null>(null)

  useLayoutEffect(() => {
    const scrollToToday = () => {
      const el =
        todayRef.current ?? document.getElementById('training-list-today')
      if (!el) return
      el.scrollIntoView({ behavior: 'auto', block: 'start' })
    }

    scrollToToday()
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(scrollToToday)
    })
    const t = window.setTimeout(scrollToToday, 80)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(t)
    }
  }, [])

  return (
    <div className={compact ? 'space-y-5' : 'mr-auto max-w-[52rem] space-y-7'}>
      {TRAINING_DAYS.map((day) => {
        const items = workoutsForDay(day.dayIndex)
        return (
          <section
            key={day.dayIndex}
            id={day.today ? 'training-list-today' : undefined}
            ref={day.today ? todayRef : undefined}
            className={day.today ? 'scroll-mt-14' : undefined}
          >
            <div
              className={`mb-2.5 flex flex-wrap items-center justify-between gap-2 ${
                compact ? 'gap-1.5' : 'gap-3'
              }`}
            >
              <p className="tt-mock-section-title">
                {day.today ? 'Today' : day.label}
              </p>
              {day.weather ? (
                day.today ? (
                  <TodayWeatherStrip compact={compact} {...day.weather} />
                ) : (
                  <DayWeatherMini {...day.weather} />
                )
              ) : null}
            </div>

            <div
              className={`overflow-hidden rounded-[10px] border border-[var(--tt-line)] bg-white shadow-[var(--tt-shadow)] ${
                day.today ? 'shadow-[inset_3px_0_0_0_var(--tt-red),var(--tt-shadow)]' : ''
              }`}
            >
              {day.recovery ? (
                <div
                  className={`border-b border-[var(--tt-line)] bg-[var(--tt-sidebar)] ${
                    compact ? 'px-3 py-2' : 'px-3.5 py-2.5'
                  }`}
                >
                  <p className="tt-mock-caption !font-medium !text-[var(--tt-sport-recovery)]">
                    Recovery day
                  </p>
                </div>
              ) : null}

              {items.length === 0 && !day.event && !day.note ? (
                <p className="tt-mock-caption px-3 py-4 text-center !text-[var(--tt-ink-faint)]">
                  Rest / empty
                </p>
              ) : (
                items.map((w, i) => (
                  <WorkoutRow
                    key={w.id}
                    workout={w}
                    today={Boolean(day.today)}
                    athleteActions={athleteActions}
                    compact={compact}
                    last={
                      i === items.length - 1 && !day.event && !day.note
                    }
                  />
                ))
              )}

              {day.event ? (
                <div
                  className={`bg-amber-50 ${
                    items.length > 0 ? 'border-t border-amber-200/80' : ''
                  } ${compact ? 'px-3 py-2' : 'px-3.5 py-2.5'}`}
                >
                  <p className="tt-mock-caption !font-medium !text-amber-950">
                    Event · {day.event}
                  </p>
                </div>
              ) : null}

              {day.note ? (
                <div
                  className={`border-t border-amber-200/80 bg-amber-50 ${
                    compact ? 'px-3 py-2' : 'px-3.5 py-2.5'
                  }`}
                >
                  <p className="tt-mock-caption !text-amber-950/80">
                    <span className="font-semibold text-amber-800/90">Note · </span>
                    {day.note}
                  </p>
                </div>
              ) : null}
            </div>
          </section>
        )
      })}
    </div>
  )
}
