'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ChevronRight } from 'lucide-react'
import { PlanWorkoutModal } from '@/components/plan/plan-workout-modal'
import { WorkoutModalTrigger } from '@/components/plan/workout-modal-trigger'
import { HomePrescriptionWorkoutCard } from '@/components/dashboard/home-prescription-workout-card'
import {
  AthleteWorkoutQuickActions,
  useOptimisticWorkoutStatus,
} from '@/components/plan/athlete-workout-quick-actions'
import { WorkoutSportIcon } from '@/components/plan/workout-sport-icon'
import {
  ListDayWeatherMini,
} from '@/components/weather/list-day-weather'
import {
  athleteHasQuickLogActions,
  type PlanWorkoutDetail,
} from '@/lib/plan-workout'
import { getWorkoutCardSubtitle } from '@/lib/workout-card'
import { getWorkoutPlanMetrics } from '@/lib/workout-plan-metrics'
import { buildPlanTableDays } from '@/lib/plan-week'
import { parseDateOnly } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { WeatherDaySummary } from '@/lib/weather/places'

type AthleteDashboardWorkoutsProps = {
  todayWorkouts: PlanWorkoutDetail[]
  upcomingWorkouts: PlanWorkoutDetail[]
  weatherByDate?: Record<string, WeatherDaySummary>
  showWeather?: boolean
}

function workoutsToPlanDays(workouts: PlanWorkoutDetail[]) {
  const byDate = new Map<string, PlanWorkoutDetail[]>()
  for (const workout of workouts) {
    if (workout.type === 'REST' || workout.type === 'RECOVERY') continue
    const list = byDate.get(workout.dateKey) ?? []
    list.push(workout)
    byDate.set(workout.dateKey, list)
  }
  const dates = [...byDate.keys()]
    .sort()
    .map((dateKey) => parseDateOnly(dateKey))
  return buildPlanTableDays(dates, byDate)
}

function prescriptionLine(workout: PlanWorkoutDetail): string {
  const subtitle = getWorkoutCardSubtitle(workout)
  if (subtitle) return subtitle
  const metrics = getWorkoutPlanMetrics(workout)
  return [metrics.distance, metrics.duration].filter(Boolean).join(' · ') || '—'
}

function HomeCalendarDate({
  date,
  isToday,
}: {
  date: Date
  isToday?: boolean
}) {
  return (
    <div
      className="flex w-9 shrink-0 flex-col items-center justify-center text-center leading-none"
      aria-label={format(date, 'EEEE d MMMM')}
    >
      <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--tt-ink,#111)]">
        {format(date, 'EEE')}
      </span>
      <span
        className={cn(
          'mt-0.5 text-[1.1rem] font-semibold tabular-nums leading-none text-[var(--tt-ink,#111)]',
          isToday && 'text-[var(--tt-red,#da2f36)]',
        )}
      >
        {format(date, 'd')}
      </span>
      <span className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.04em] text-[var(--tt-ink-faint,#9a9a9a)]">
        {format(date, 'MMM')}
      </span>
    </div>
  )
}

function TodayPrescriptionRow({ workout }: { workout: PlanWorkoutDetail }) {
  const { status, setOptimisticStatus } = useOptimisticWorkoutStatus(workout)
  const showQuickActions = athleteHasQuickLogActions(workout, false)
  const displayWorkout =
    status === workout.status ? workout : { ...workout, status }

  return (
    <div className="group/card relative min-w-0">
      <WorkoutModalTrigger
        workout={displayWorkout}
        isCoach={false}
        className="block w-full min-w-0 text-left"
      >
        <HomePrescriptionWorkoutCard workout={displayWorkout} />
      </WorkoutModalTrigger>
      {showQuickActions ? (
        <div className="absolute right-2.5 top-2.5 z-10 flex items-center gap-1 opacity-80 transition group-hover/card:opacity-100">
          <AthleteWorkoutQuickActions
            workout={workout}
            isCoach={false}
            size="sm"
            displayStatus={status}
            onDisplayStatusChange={setOptimisticStatus}
          />
        </div>
      ) : null}
    </div>
  )
}

export function AthleteDashboardWorkouts({
  todayWorkouts,
  upcomingWorkouts,
  weatherByDate = {},
  showWeather = true,
}: AthleteDashboardWorkoutsProps) {
  const upcomingDays = workoutsToPlanDays(upcomingWorkouts)
  const [selected, setSelected] = useState<PlanWorkoutDetail | null>(null)

  return (
    <div className="space-y-7">
      <section>
        <div className="mb-3">
          <p className="text-[0.6875rem] font-medium uppercase leading-none tracking-[0.08em] text-[var(--tt-ink,#111)]">
            Today
          </p>
        </div>
        {todayWorkouts.length === 0 ? (
          <div className="tt-surface-card px-4 py-10 text-center">
            <p className="text-[13px] text-[var(--tt-ink-soft,#6b6b6b)]">
              Rest day — nothing scheduled.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {todayWorkouts.map((workout) => (
              <TodayPrescriptionRow key={workout.id} workout={workout} />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-[var(--tt-ink,#111)]">
            Upcoming
          </p>
          <Link
            href="/training"
            className="text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-[var(--tt-ink-soft,#6b6b6b)] transition hover:text-[var(--tt-ink,#111)]"
          >
            View plan →
          </Link>
        </div>
        {upcomingDays.length === 0 ? (
          <div className="tt-surface-card px-4 py-8 text-center">
            <p className="text-[13px] text-[var(--tt-ink-soft,#6b6b6b)]">
              No upcoming workouts.
            </p>
          </div>
        ) : (
          <div className="tt-surface-card overflow-hidden divide-y divide-[var(--tt-line,#ebebeb)]">
            {upcomingDays.flatMap((day) =>
              day.workouts.map((workout, index) => (
                <button
                  key={workout.id}
                  type="button"
                  onClick={() => setSelected(workout)}
                  className="flex w-full min-w-0 items-center gap-2.5 px-3 py-3 text-left transition hover:bg-[var(--tt-sidebar,#f5f5f5)]/60 sm:gap-3 sm:px-4 sm:py-3.5"
                >
                  {index === 0 ? (
                    <HomeCalendarDate date={day.date} isToday={day.isToday} />
                  ) : (
                    <div className="w-9 shrink-0" aria-hidden />
                  )}
                  <div className="flex min-w-0 flex-1 items-center gap-2 pl-0.5 sm:gap-3 sm:pl-1">
                    <WorkoutSportIcon
                      type={workout.type}
                      isRace={workout.isRace}
                      size="xs"
                      appearance="outline"
                    />
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <p className="truncate text-[0.9375rem] font-semibold leading-snug text-[var(--tt-ink,#111)] sm:text-[1rem]">
                        {workout.title}
                      </p>
                      <p className="mt-0.5 truncate text-[12px] text-[var(--tt-ink-soft,#6b6b6b)]">
                        {prescriptionLine(workout)}
                      </p>
                    </div>
                  </div>
                  {showWeather && weatherByDate[day.dateKey] && index === 0 ? (
                    <ListDayWeatherMini
                      weather={weatherByDate[day.dateKey]!}
                      className="hidden sm:flex"
                    />
                  ) : null}
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-[var(--tt-ink-faint,#9a9a9a)]"
                    aria-hidden
                  />
                </button>
              )),
            )}
          </div>
        )}
      </section>

      {selected ? (
        <PlanWorkoutModal
          workout={selected}
          isCoach={false}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null)
          }}
        />
      ) : null}
    </div>
  )
}
