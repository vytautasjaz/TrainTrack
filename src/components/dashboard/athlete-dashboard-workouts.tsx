'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PlanWorkoutModal } from '@/components/plan/plan-workout-modal'
import { WorkoutModalTrigger } from '@/components/plan/workout-modal-trigger'
import { HomePrescriptionWorkoutCard } from '@/components/dashboard/home-prescription-workout-card'
import {
  AthleteWorkoutQuickActions,
  useOptimisticWorkoutStatus,
} from '@/components/plan/athlete-workout-quick-actions'
import { WorkoutSportIcon } from '@/components/plan/workout-sport-icon'
import {
  HomeMobileSectionHeader,
  MobileAccordionBody,
} from '@/components/ui/mobile-accordion-body'
import {
  athleteHasQuickLogActions,
  type PlanWorkoutDetail,
} from '@/lib/plan-workout'
import {
  getWorkoutCardEssence,
  getWorkoutCardHero,
  getWorkoutCardSubtitle,
  type WorkoutCardHero,
} from '@/lib/workout-card'
import { DEFAULT_DURATION_NOTATION } from '@/lib/workout-builder/duration-notation'
import { WorkoutCardEssenceLine } from '@/components/plan/workout-card-essence-line'
import { ListDayWeatherMini } from '@/components/weather/list-day-weather'
import { buildPlanTableDays, type PlanDay } from '@/lib/plan-week'
import {
  addDateOnlyDays,
  endOfWeekDateOnly,
  formatDateOnly,
  startOfWeekDateOnly,
  todayDateOnly,
  toDateKey,
} from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { WeatherDaySummary } from '@/lib/weather/places'

type AthleteDashboardWorkoutsProps = {
  todayWorkouts: PlanWorkoutDetail[]
  /** Workouts spanning ±4 weeks around this week (Mon–Sun). */
  weekPlanWorkouts: PlanWorkoutDetail[]
  weatherByDate?: Record<string, WeatherDaySummary>
  showWeather?: boolean
}

function isRestLike(workout: PlanWorkoutDetail): boolean {
  return workout.type === 'REST' || workout.type === 'RECOVERY'
}

function workoutsByDateMap(workouts: PlanWorkoutDetail[]) {
  const byDate = new Map<string, PlanWorkoutDetail[]>()
  for (const workout of workouts) {
    const list = byDate.get(workout.dateKey) ?? []
    list.push(workout)
    byDate.set(workout.dateKey, list)
  }
  return byDate
}

function buildWeekDays(
  weekStart: Date,
  byDate: Map<string, PlanWorkoutDetail[]>,
): PlanDay[] {
  const dates = Array.from({ length: 7 }, (_, i) => addDateOnlyDays(weekStart, i))
  return buildPlanTableDays(dates, byDate)
}

/** Subtitle under title — builder essence (S-card style), else description. */
function weekRowEssence(workout: PlanWorkoutDetail): string[] {
  if (isRestLike(workout) || workout.isRace) return []
  return getWorkoutCardEssence(workout, DEFAULT_DURATION_NOTATION, {
    includeAllBlocks: false,
  }).slice(0, 2)
}

function weekRowPrimaryMetric(workout: PlanWorkoutDetail): WorkoutCardHero | null {
  if (isRestLike(workout)) return null
  return getWorkoutCardHero(workout)
}

function HomeCalendarDate({
  date,
  isToday,
  muted,
}: {
  date: Date
  isToday?: boolean
  muted?: boolean
}) {
  return (
    <div
      className={cn(
        'flex w-9 shrink-0 flex-col items-center justify-start pt-0.5 text-center leading-none',
        muted && 'opacity-60',
      )}
      aria-label={format(date, 'EEEE d MMMM')}
    >
      <span className="text-[9px] font-medium uppercase tracking-[0.06em] text-[var(--tt-ink-soft,#6b6b6b)]">
        {format(date, 'EEE')}
      </span>
      <span
        className={cn(
          'mt-0.5 text-[1.0625rem] font-semibold tabular-nums leading-none tracking-tight',
          isToday
            ? 'text-[var(--tt-red,#da2f36)]'
            : 'text-[var(--tt-ink,#111)]',
        )}
      >
        {format(date, 'd')}
      </span>
      <span className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.06em] text-[var(--tt-ink-soft,#6b6b6b)]">
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

function WeekSessionTitle({
  title,
  metric,
}: {
  title: string
  metric: WorkoutCardHero | null
}) {
  return (
    <p className="min-w-0 truncate text-[0.9375rem] font-semibold leading-snug text-[var(--tt-ink,#111)]">
      {title}
      {metric ? (
        <>
          {metric.approximate ? (
            <span className="font-semibold"> ~ </span>
          ) : (
            <span className="font-semibold text-[var(--tt-ink-soft,#6b6b6b)]">
              {' '}
              -{' '}
            </span>
          )}
          <span className="tabular-nums">
            {metric.value}
            {metric.unit ? (
              <span className="text-[0.75rem] font-medium"> {metric.unit}</span>
            ) : null}
          </span>
        </>
      ) : null}
    </p>
  )
}

function WeekDayRows({
  days,
  onSelect,
  mobile,
  showWeather = false,
  weatherByDate = {},
}: {
  days: PlanDay[]
  onSelect: (workout: PlanWorkoutDetail) => void
  /** Tighter date rail + same-day separators (mobile web). */
  mobile?: boolean
  showWeather?: boolean
  weatherByDate?: Record<string, WeatherDaySummary>
}) {
  const todayKey = toDateKey(todayDateOnly())
  const reserveWeather = Boolean(showWeather)

  return (
    <>
      {days.map((day) => {
        const isPast = day.dateKey < todayKey
        const weather = reserveWeather ? weatherByDate[day.dateKey] : null
        const sessions = day.workouts.filter((w) => !isRestLike(w))
        const restSessions = day.workouts.filter(isRestLike)
        const isEmpty = sessions.length === 0 && restSessions.length === 0
        const isRestOnly = sessions.length === 0 && restSessions.length > 0

        if (isEmpty || isRestOnly) {
          const rest = restSessions[0]
          const label = isRestOnly
            ? rest!.title?.trim() || 'Rest day'
            : 'Nothing planned'
          const sub =
            isRestOnly && rest!.coachNotes?.trim()
              ? rest!.coachNotes.trim()
              : null

          const content = (
            <>
              <HomeCalendarDate date={day.date} isToday={day.isToday} muted />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.8125rem] font-medium text-[var(--tt-ink-soft,#6b6b6b)]">
                  {label}
                </p>
                {sub ? (
                  <p className="mt-0.5 truncate text-[11px] text-[var(--tt-ink-faint,#9a9a9a)]">
                    {sub}
                  </p>
                ) : null}
              </div>
              {reserveWeather ? (
                <div
                  className={cn(
                    'flex shrink-0 justify-end',
                    mobile ? 'w-auto' : 'w-[12rem]',
                  )}
                >
                  {weather ? (
                    <ListDayWeatherMini
                      weather={weather}
                      layout={mobile ? 'stack' : 'row'}
                    />
                  ) : null}
                </div>
              ) : null}
            </>
          )

          const rowClass = cn(
            'flex w-full min-w-0 items-center gap-3 py-2.5 text-left',
            mobile ? 'pl-2 pr-3' : 'px-4',
            'bg-[var(--tt-sidebar,#f5f5f5)]/90',
            isPast && 'opacity-70',
          )

          if (rest) {
            return (
              <button
                key={day.dateKey}
                type="button"
                onClick={() => onSelect(rest)}
                className={cn(
                  rowClass,
                  'transition hover:bg-[var(--tt-sidebar,#f5f5f5)]',
                )}
              >
                {content}
              </button>
            )
          }

          return (
            <div key={day.dateKey} className={rowClass}>
              {content}
            </div>
          )
        }

        return (
          <div
            key={day.dateKey}
            className={cn(
              'group/day flex min-w-0 items-stretch transition-colors hover:bg-[var(--tt-sidebar,#f5f5f5)]/60',
              mobile ? 'pl-2 pr-3' : 'px-4',
              isPast && 'opacity-75',
            )}
          >
            <div
              className={cn(
                'flex shrink-0 items-start',
                mobile ? 'py-2.5' : 'py-3',
              )}
            >
              <HomeCalendarDate date={day.date} isToday={day.isToday} />
            </div>

            <div
              className={cn(
                'my-3 w-px shrink-0 self-stretch bg-[var(--tt-line,#ebebeb)]',
                mobile ? 'mx-2' : 'mx-2.5',
              )}
              aria-hidden
            />

            <div className="flex min-w-0 flex-1 flex-col">
              {sessions.map((workout, index) => {
                const essenceLines = weekRowEssence(workout)
                const subtitle =
                  essenceLines.length === 0
                    ? getWorkoutCardSubtitle(workout)
                    : null
                const metric = weekRowPrimaryMetric(workout)
                const isFirst = index === 0
                const isLast = index === sessions.length - 1

                const subline =
                  essenceLines.length > 0 ? (
                    <div className="mt-0.5 flex min-w-0 flex-col gap-0 leading-snug text-[12px] text-[var(--tt-ink-soft,#6b6b6b)]">
                      {essenceLines.map((line, i) => (
                        <WorkoutCardEssenceLine
                          key={`${i}-${line}`}
                          line={line}
                          className="truncate"
                          coreClassName="text-[var(--tt-ink-soft,#6b6b6b)]"
                          detailClassName="font-normal text-[var(--tt-ink-soft,#6b6b6b)]"
                        />
                      ))}
                    </div>
                  ) : subtitle ? (
                    <p className="mt-0.5 truncate text-[12px] leading-snug text-[var(--tt-ink-soft,#6b6b6b)]">
                      {subtitle}
                    </p>
                  ) : null

                return (
                  <button
                    key={workout.id}
                    type="button"
                    onClick={() => onSelect(workout)}
                    className={cn(
                      'flex w-full min-w-0 flex-col text-left',
                      isFirst && isLast
                        ? 'py-3'
                        : isFirst
                          ? 'pt-3 pb-2'
                          : isLast
                            ? 'pt-2 pb-3'
                            : 'py-2',
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-x-2.5">
                      <WorkoutSportIcon
                        type={workout.type}
                        isRace={workout.isRace}
                        size="sm"
                        className="h-8 w-8 shrink-0 rounded-[8px]"
                      />
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <WeekSessionTitle
                          title={workout.title}
                          metric={metric}
                        />
                      </div>
                    </div>
                    {subline ? (
                      <div className="min-w-0 overflow-hidden pl-[calc(2rem+0.625rem)]">
                        {subline}
                      </div>
                    ) : null}
                  </button>
                )
              })}
            </div>

            {reserveWeather ? (
              <div
                className={cn(
                  'flex shrink-0 items-start justify-end',
                  mobile ? 'pl-2 pt-3' : 'w-[12rem] pl-2 pt-3',
                )}
              >
                {weather ? (
                  <ListDayWeatherMini
                    weather={weather}
                    layout={mobile ? 'stack' : 'row'}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        )
      })}
    </>
  )
}

export function AthleteDashboardWorkouts({
  todayWorkouts,
  weekPlanWorkouts,
  weatherByDate = {},
  showWeather = true,
}: AthleteDashboardWorkoutsProps) {
  const [selected, setSelected] = useState<PlanWorkoutDetail | null>(null)
  /** 0 = this week, -1 = previous, +1 = next, … */
  const [weekOffset, setWeekOffset] = useState(0)

  const byDate = useMemo(
    () => workoutsByDateMap(weekPlanWorkouts),
    [weekPlanWorkouts],
  )

  const thisWeekStart = useMemo(
    () => startOfWeekDateOnly(todayDateOnly()),
    [],
  )

  const viewWeekStart = useMemo(
    () => addDateOnlyDays(thisWeekStart, weekOffset * 7),
    [thisWeekStart, weekOffset],
  )

  const viewWeekDays = useMemo(
    () => buildWeekDays(viewWeekStart, byDate),
    [viewWeekStart, byDate],
  )

  const weekTitle =
    weekOffset === 0
      ? 'This week'
      : weekOffset === -1
        ? 'Last week'
        : weekOffset === 1
          ? 'Next week'
          : 'Week'

  const weekLabel = useMemo(() => {
    const end = endOfWeekDateOnly(viewWeekStart)
    return `${formatDateOnly(viewWeekStart, 'd MMM')} – ${formatDateOnly(end, 'd MMM')}`
  }, [viewWeekStart])

  const canGoPrev = weekOffset > -4
  const canGoNext = weekOffset < 4

  return (
    <div className="space-y-5 md:space-y-6">
      <section className="space-y-2.5">
        <HomeMobileSectionHeader
          title="Today"
          collapsible={false}
          className="px-4 md:px-0"
        />
        <MobileAccordionBody expanded className="space-y-2">
          {todayWorkouts.length === 0 ? (
            <p className="px-1 py-6 text-center text-[13px] text-[var(--tt-ink-soft,#6b6b6b)] md:rounded-[10px] md:border md:border-[var(--tt-line,#ebebeb)] md:px-4 md:py-8">
              Rest day — nothing scheduled.
            </p>
          ) : (
            todayWorkouts.map((workout) => (
              <TodayPrescriptionRow key={workout.id} workout={workout} />
            ))
          )}
        </MobileAccordionBody>
      </section>

      <section className="space-y-2">
        <HomeMobileSectionHeader
          title={weekTitle}
          collapsible={false}
          className="px-4 md:px-0"
          trailing={
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => setWeekOffset(0)}
                aria-hidden={weekOffset === 0}
                tabIndex={weekOffset === 0 ? -1 : undefined}
                disabled={weekOffset === 0}
                className={`mr-0.5 px-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--tt-ink-soft,#6b6b6b)] transition hover:text-[var(--tt-ink,#111)] md:text-[0.625rem] md:tracking-[0.06em] ${
                  weekOffset === 0
                    ? 'invisible pointer-events-none'
                    : ''
                }`}
              >
                <span className="md:hidden">This week</span>
                <span className="hidden md:inline">Today</span>
              </button>
              <button
                type="button"
                aria-label="Previous week"
                disabled={!canGoPrev}
                onClick={() => setWeekOffset((o) => o - 1)}
                className="inline-flex size-8 items-center justify-center rounded-[6px] text-[var(--tt-ink-soft,#6b6b6b)] transition hover:bg-[var(--tt-sidebar,#f5f5f5)] hover:text-[var(--tt-ink,#111)] disabled:pointer-events-none disabled:opacity-30 md:size-7"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="min-w-0 px-0.5 text-[11px] font-medium tabular-nums text-[var(--tt-ink-soft,#6b6b6b)] md:text-[0.6875rem]">
                {weekLabel}
              </span>
              <button
                type="button"
                aria-label="Next week"
                disabled={!canGoNext}
                onClick={() => setWeekOffset((o) => o + 1)}
                className="inline-flex size-8 items-center justify-center rounded-[6px] text-[var(--tt-ink-soft,#6b6b6b)] transition hover:bg-[var(--tt-sidebar,#f5f5f5)] hover:text-[var(--tt-ink,#111)] disabled:pointer-events-none disabled:opacity-30 md:size-7"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          }
        />

        <MobileAccordionBody expanded className="space-y-2">
          <div className="overflow-hidden divide-y divide-[var(--tt-line,#ebebeb)] border-y border-[var(--tt-line,#ebebeb)] md:hidden">
            <WeekDayRows
              days={viewWeekDays}
              onSelect={setSelected}
              mobile
              showWeather={showWeather}
              weatherByDate={weatherByDate}
            />
          </div>

          <div className="tt-surface-card hidden overflow-hidden divide-y divide-[var(--tt-line,#ebebeb)] md:block">
            <WeekDayRows
              days={viewWeekDays}
              onSelect={setSelected}
              showWeather={showWeather}
              weatherByDate={weatherByDate}
            />
          </div>

          <div className="flex justify-end px-4 md:px-0">
            <Link
              href="/training"
              className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--tt-ink-soft)] transition hover:text-[var(--tt-ink)] md:text-[0.6875rem] md:tracking-[0.08em] md:font-medium"
            >
              View plan →
            </Link>
          </div>
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
