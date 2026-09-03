'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { PlanWorkoutModal } from '@/components/plan/plan-workout-modal'
import { WorkoutModalTrigger } from '@/components/plan/workout-modal-trigger'
import { HomePrescriptionWorkoutCard } from '@/components/dashboard/home-prescription-workout-card'
import {
  AthleteWorkoutQuickActions,
  useOptimisticWorkoutStatus,
} from '@/components/plan/athlete-workout-quick-actions'
import { WorkoutSportIcon } from '@/components/plan/workout-sport-icon'
import { ListDayWeatherMini } from '@/components/weather/list-day-weather'
import { MobileAccordionBody } from '@/components/ui/mobile-accordion-body'
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

function SectionTitleButton({
  title,
  expanded,
  onToggle,
  trailing,
}: {
  title: string
  expanded: boolean
  onToggle: () => void
  trailing?: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'mb-0 flex items-center justify-between gap-3 px-4 md:mb-3 md:px-0',
        !expanded && 'border-b border-[var(--tt-line)] pb-3 md:border-b-0 md:pb-0',
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left md:pointer-events-none"
      >
        <h2 className="font-[family-name:var(--font-display)] text-[1.35rem] font-normal uppercase leading-none tracking-tight text-[var(--tt-ink)]">
          {title}
        </h2>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-[var(--tt-ink-faint)] transition-transform duration-300 md:hidden',
            expanded && 'rotate-180',
          )}
          strokeWidth={1.75}
          aria-hidden
        />
      </button>
      {trailing}
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
  const [upcomingOpen, setUpcomingOpen] = useState(true)

  return (
    <div className="space-y-4 md:space-y-7">
      {/* Today: title + cards only — no shared bubble / accordion shell */}
      <section className="space-y-3">
        <h2 className="px-4 font-[family-name:var(--font-display)] text-[1.35rem] font-normal uppercase leading-none tracking-tight text-[var(--tt-ink)] md:px-0">
          Today
        </h2>
        <div className="space-y-2.5">
          {todayWorkouts.length === 0 ? (
            <p className="px-1 py-8 text-center text-[13px] text-[var(--tt-ink-soft,#6b6b6b)] md:rounded-[10px] md:border md:border-[var(--tt-line,#ebebeb)] md:px-4 md:py-10">
              Rest day — nothing scheduled.
            </p>
          ) : (
            todayWorkouts.map((workout) => (
              <TodayPrescriptionRow key={workout.id} workout={workout} />
            ))
          )}
        </div>
      </section>

      <section className="tt-home-mobile-card">
        <SectionTitleButton
          title="Upcoming"
          expanded={upcomingOpen}
          onToggle={() => setUpcomingOpen((open) => !open)}
          trailing={
            <Link
              href="/training"
              className="hidden text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-[var(--tt-ink-soft,#6b6b6b)] transition hover:text-[var(--tt-ink,#111)] md:inline"
            >
              View plan →
            </Link>
          }
        />
        <MobileAccordionBody expanded={upcomingOpen} className="px-4 md:px-0">
          {upcomingDays.length === 0 ? (
            <p className="px-1 py-8 text-center text-[13px] text-[var(--tt-ink-soft,#6b6b6b)] md:rounded-[10px] md:border md:border-[var(--tt-line,#ebebeb)] md:px-4">
              No upcoming workouts.
            </p>
          ) : (
            <>
              {/* Mobile — flush list */}
              <ul className="-mx-4 divide-y divide-[var(--tt-line,#ebebeb)] border-y border-[var(--tt-line,#ebebeb)] md:hidden">
                {upcomingDays.flatMap((day) =>
                  day.workouts.map((workout, index) => (
                    <li key={workout.id}>
                      <button
                        type="button"
                        onClick={() => setSelected(workout)}
                        className="flex w-full min-w-0 items-center gap-2.5 px-4 py-3 text-left transition active:bg-[var(--tt-sidebar,#f5f5f5)]/60"
                      >
                        {index === 0 ? (
                          <HomeCalendarDate date={day.date} isToday={day.isToday} />
                        ) : (
                          <div className="w-9 shrink-0" aria-hidden />
                        )}
                        <div className="flex min-w-0 flex-1 items-center gap-2 pl-0.5">
                          <WorkoutSportIcon
                            type={workout.type}
                            isRace={workout.isRace}
                            size="xs"
                            appearance="outline"
                          />
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <p className="truncate text-[0.9375rem] font-semibold leading-snug text-[var(--tt-ink,#111)]">
                              {workout.title}
                            </p>
                            <p className="mt-0.5 truncate text-[12px] text-[var(--tt-ink-soft,#6b6b6b)]">
                              {prescriptionLine(workout)}
                            </p>
                          </div>
                        </div>
                        <ChevronRight
                          className="h-4 w-4 shrink-0 text-[var(--tt-ink-faint,#9a9a9a)]"
                          aria-hidden
                        />
                      </button>
                    </li>
                  )),
                )}
              </ul>

              {/* Desktop — card shell */}
              <div className="tt-surface-card hidden overflow-hidden divide-y divide-[var(--tt-line,#ebebeb)] md:block">
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

              <div className="mt-3 md:hidden">
                <Link
                  href="/training"
                  className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--tt-ink-soft)] transition hover:text-[var(--tt-ink)]"
                >
                  View plan →
                </Link>
              </div>
            </>
          )}
        </MobileAccordionBody>
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
