'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Check } from 'lucide-react'
import { SameDayWorkoutStack } from '@/components/plan/same-day-workout-stack'
import { useDayDropTarget } from '@/components/plan/use-day-drop-target'
import { WorkoutModalTrigger } from '@/components/plan/workout-modal-trigger'
import { WorkoutSportIcon } from '@/components/plan/workout-sport-icon'
import { ListDayWeatherMini } from '@/components/weather/list-day-weather'
import { WeatherDayHoursTrigger } from '@/components/weather/weather-day-hours-panel'
import {
  HomeWeekRestCard,
  HomeWeekSessionCard,
} from '@/components/dashboard/v2/home-week-session-card'
import { isRestLike } from '@/components/dashboard/v2/home-week-utils'
import { SectionTitle } from '@/components/ui/typography'
import {
  useSwimDistanceUnit,
  useUnitSystem,
} from '@/components/units/units-context'
import { formatDateOnly, todayDateOnly, toDateKey } from '@/lib/dates'
import type { PlanDay } from '@/lib/plan-week'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import {
  getWorkoutCardHero,
  isWorkoutCardCompleted,
  isWorkoutCardSkipped,
} from '@/lib/workout-card'
import { getWorkoutPlanMetrics } from '@/lib/workout-plan-metrics'
import {
  formatWeatherPrecip,
  type WeatherDaySummary,
} from '@/lib/weather/places'
import { cn } from '@/lib/utils'

function dayHasWeatherData(weather?: WeatherDaySummary | null) {
  return Boolean(
    weather?.slots.some(
      (slot) => slot.temperatureC != null || Boolean(formatWeatherPrecip(slot)),
    ),
  )
}

/** Today — full v2 workout cards (same chrome as desktop day cards). */
function TodayCards({
  day,
  weatherLocationName = null,
}: {
  day: PlanDay
  weatherLocationName?: string | null
}) {
  const sessions = day.workouts.filter((w) => !w.isRescheduleGhost)
  const hasWeather = dayHasWeatherData(day.weather)
  const { dropHighlightClass, dropProps } = useDayDropTarget({
    dateKey: day.dateKey,
  })

  if (sessions.length === 0) return null

  return (
    <div
      className={cn('flex flex-col gap-2', dropHighlightClass)}
      data-today="true"
      data-plan-day-section={day.dateKey}
      {...dropProps}
    >
      {hasWeather && day.weather ? (
        <WeatherDayHoursTrigger
          weather={day.weather}
          locationName={weatherLocationName}
        >
          <ListDayWeatherMini weather={day.weather} layout="row" />
        </WeatherDayHoursTrigger>
      ) : null}

      <SameDayWorkoutStack
        dateKey={day.dateKey}
        workouts={sessions}
        enabled
        className="flex flex-col gap-2"
        renderItem={(workout, meta) =>
          isRestLike(workout) ? (
            <HomeWeekRestCard
              note={
                workout.coachNotes?.trim() ||
                workout.description?.trim() ||
                workout.title ||
                'Recovery, mobility and good sleep.'
              }
              density="list"
              isToday
            />
          ) : (
            <HomeWeekSessionCard
              workout={workout}
              stackDragging={meta.isDragging}
              density="list"
              isToday
            />
          )
        }
      />
    </div>
  )
}

function ListDayRail({ date }: { date: Date }) {
  return (
    <div
      className="flex w-9 shrink-0 flex-col items-center justify-start pt-0.5 text-center leading-none"
      aria-label={format(date, 'EEEE d MMMM')}
    >
      <span className="title-day text-[var(--tt-v2-light-ink-faint)]">
        {format(date, 'EEE')}
      </span>
      <span className="mt-0.5 text-[1.0625rem] font-semibold tabular-nums leading-none tracking-tight text-[var(--tt-v2-light-ink)]">
        {format(date, 'd')}
      </span>
      <span className="title-day mt-0.5 text-[var(--tt-v2-light-ink-faint)]">
        {format(date, 'MMM')}
      </span>
    </div>
  )
}

function UpcomingRowTitle({
  workout,
}: {
  workout: PlanWorkoutDetail
}) {
  const unitSystem = useUnitSystem()
  const swimUnit = useSwimDistanceUnit()
  const skipped = isWorkoutCardSkipped(workout.status)
  const hero = isRestLike(workout) ? null : getWorkoutCardHero(workout)
  const metrics = getWorkoutPlanMetrics(
    workout,
    workout.status,
    unitSystem,
    swimUnit,
  )
  const metric =
    hero?.value != null
      ? `${hero.value}${hero.unit ? ` ${hero.unit}` : ''}`
      : [metrics.distance, metrics.duration].filter(Boolean).join(' · ') || null

  return (
    <p
      className={cn(
        'min-w-0 text-[0.9375rem] font-semibold leading-snug break-words',
        skipped
          ? 'text-[var(--tt-v2-light-ink-faint)] line-through'
          : 'text-[var(--tt-v2-light-ink)]',
      )}
    >
      <span>{workout.title}</span>
      {metric ? (
        <span
          className={cn(
            'tabular-nums',
            skipped
              ? 'text-[var(--tt-v2-light-ink-faint)]'
              : 'text-[var(--tt-v2-light-ink-soft)]',
          )}
        >
          {' · '}
          {metric}
        </span>
      ) : null}
    </p>
  )
}

/** Upcoming — compact day rows (list), not full workout cards. */
function UpcomingList({
  days,
  weatherLocationName = null,
}: {
  days: PlanDay[]
  weatherLocationName?: string | null
}) {
  return (
    <div className="overflow-hidden divide-y divide-[var(--tt-v2-light-panel-line)] border-y border-[var(--tt-v2-light-panel-line)]">
      {days.map((day) => {
        const sessions = day.workouts.filter(
          (w) => !w.isRescheduleGhost && !isRestLike(w),
        )
        const restSessions = day.workouts.filter(
          (w) => !w.isRescheduleGhost && isRestLike(w),
        )
        const weather = dayHasWeatherData(day.weather) ? day.weather : null

        if (sessions.length === 0) {
          const rest = restSessions[0]
          const label = rest
            ? rest.title?.trim() || 'Rest day'
            : 'Nothing planned'
          return (
            <div
              key={day.dateKey}
              className="flex min-w-0 items-stretch gap-3 pl-1 pr-2"
            >
              <div className="flex shrink-0 items-start pt-3">
                <ListDayRail date={day.date} />
              </div>
              <div className="my-3 w-px shrink-0 self-stretch bg-[var(--tt-v2-light-panel-line)]" />
              <p className="min-w-0 flex-1 self-center truncate py-3 text-[13px] font-medium text-[var(--tt-v2-light-ink-soft)]">
                {label}
              </p>
              {weather ? (
                <div className="flex shrink-0 items-start pt-3">
                  <WeatherDayHoursTrigger
                    weather={weather}
                    locationName={weatherLocationName}
                  >
                    <ListDayWeatherMini weather={weather} layout="stack" />
                  </WeatherDayHoursTrigger>
                </div>
              ) : null}
            </div>
          )
        }

        return (
          <div
            key={day.dateKey}
            className="flex min-w-0 items-stretch gap-3 pl-1 pr-2"
          >
            <div className="flex shrink-0 items-start pt-3">
              <ListDayRail date={day.date} />
            </div>

            <div className="my-3 w-px shrink-0 self-stretch bg-[var(--tt-v2-light-panel-line)]" />

            <div className="flex min-w-0 flex-1 flex-col">
              {sessions.map((workout, index) => {
                const completed = isWorkoutCardCompleted(workout.status)
                const skipped = isWorkoutCardSkipped(workout.status)
                const isFirst = index === 0
                const isLast = index === sessions.length - 1

                return (
                  <WorkoutModalTrigger
                    key={workout.id}
                    workout={workout}
                    isCoach={false}
                    className={cn(
                      'flex w-full min-w-0 items-start gap-2.5 text-left',
                      isFirst && isLast
                        ? 'py-3'
                        : isFirst
                          ? 'pt-3 pb-2'
                          : isLast
                            ? 'pt-2 pb-3'
                            : 'py-2',
                    )}
                  >
                    <WorkoutSportIcon
                      type={workout.type}
                      isRace={workout.isRace}
                      size="sm"
                      className={cn(
                        'mt-0.5 h-8 w-8 shrink-0 rounded-[var(--radius-sm)]',
                        skipped && 'opacity-50',
                      )}
                    />
                    <div className="flex min-w-0 flex-1 items-start gap-1.5">
                      <div className="min-w-0 flex-1">
                        <UpcomingRowTitle workout={workout} />
                      </div>
                      {completed ? (
                        <Check
                          className="h-4 w-4 shrink-0 text-[var(--tt-good,#16a34a)]"
                          strokeWidth={2.5}
                          aria-label="Completed"
                        />
                      ) : null}
                    </div>
                  </WorkoutModalTrigger>
                )
              })}
            </div>

            {weather ? (
              <div className="flex shrink-0 items-start pt-3">
                <WeatherDayHoursTrigger
                  weather={weather}
                  locationName={weatherLocationName}
                >
                  <ListDayWeatherMini weather={weather} layout="stack" />
                </WeatherDayHoursTrigger>
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

export function HomeWeekMobile({
  days,
  listOnly = false,
  weatherLocationName = null,
}: {
  days: PlanDay[]
  /** Extra / non-current weeks: skip Today and list every day. */
  listOnly?: boolean
  weatherLocationName?: string | null
}) {
  const todayKey = toDateKey(todayDateOnly())
  const includesToday = !listOnly && days.some((day) => day.isToday)

  const todayDay = useMemo(() => {
    if (!includesToday) return null
    return days.find((day) => day.isToday) ?? null
  }, [days, includesToday])

  // This week only: days after Today (past days live on Plan).
  const upcomingDays = useMemo(() => {
    if (includesToday) {
      return days.filter((day) => day.dateKey > todayKey)
    }
    return days
  }, [days, includesToday, todayKey])

  const upcomingLabel = useMemo(() => {
    if (listOnly || upcomingDays.length === 0) return null
    const first = upcomingDays[0]!
    const last = upcomingDays[upcomingDays.length - 1]!
    if (first.dateKey === last.dateKey) {
      return formatDateOnly(first.date, 'd MMM')
    }
    return `${formatDateOnly(first.date, 'd MMM')} – ${formatDateOnly(last.date, 'd MMM')}`
  }, [upcomingDays, listOnly])

  const todaySessions = todayDay
    ? todayDay.workouts.filter((w) => !w.isRescheduleGhost)
    : []

  return (
    <div className="tt-space-section flex flex-col px-3">
      {includesToday ? (
        <section className="tt-space-tight flex flex-col">
          <SectionTitle className="!font-semibold">Today</SectionTitle>
          {todayDay && todaySessions.length > 0 ? (
            <div className="tt-space-after-title">
              <TodayCards
                day={todayDay}
                weatherLocationName={weatherLocationName}
              />
            </div>
          ) : (
            <p className="tt-space-after-title py-4 text-center text-[13px] text-[var(--tt-v2-light-ink-soft)]">
              Rest day — nothing scheduled.
            </p>
          )}
        </section>
      ) : null}

      <section className="tt-space-tight flex flex-col">
        <div className="flex items-baseline justify-between gap-2">
          <SectionTitle className="!font-semibold">
            {includesToday ? 'Upcoming' : 'Workouts'}
          </SectionTitle>
          {upcomingLabel ? (
            <span className="title-eyebrow tabular-nums text-[var(--tt-v2-light-ink-faint)]">
              {upcomingLabel}
            </span>
          ) : null}
        </div>

        {upcomingDays.length === 0 ? (
          <p className="tt-space-after-title py-4 text-center text-[13px] text-[var(--tt-v2-light-ink-soft)]">
            {includesToday
              ? 'Nothing else planned this week.'
              : 'Nothing planned this week.'}
          </p>
        ) : (
          <div className="tt-space-after-title">
            <UpcomingList
              days={upcomingDays}
              weatherLocationName={weatherLocationName}
            />
          </div>
        )}

        <div className="mt-[var(--tt-space-snug)] flex justify-end">
          <Link
            href="/training"
            className="title-eyebrow text-[var(--tt-v2-light-ink-faint)] transition hover:text-[var(--tt-v2-light-ink)]"
          >
            View plan →
          </Link>
        </div>
      </section>
    </div>
  )
}
