'use client'

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { format } from 'date-fns'
import {
  fetchTrainingTableDays,
  type TrainingTableDayDto,
} from '@/app/actions/training-table'
import { WorkoutStatusIcon } from '@/components/ui/workout-status-icon'
import { StravaSyncedIndicator } from '@/components/plan/strava-synced-indicator'
import { WorkoutSportIcon } from '@/components/plan/workout-sport-icon'
import { WorkoutCardDiagram } from '@/components/plan/workout-card-diagram'
import { WorkoutDetailModal } from '@/components/plan/workout-detail-modal'
import { RaceDetailModal } from '@/components/plan/race-detail-modal'
import {
  AthleteWorkoutQuickActions,
  useOptimisticWorkoutStatus,
} from '@/components/plan/athlete-workout-quick-actions'
import type { PlanDay } from '@/lib/plan-week'
import {
  athleteHasQuickLogActions,
  isStravaSynced,
  type PlanWorkoutDetail,
} from '@/lib/plan-workout'
import { getWorkoutPlanMetrics } from '@/lib/workout-plan-metrics'
import { getSessionTypeLabel } from '@/lib/workout-builder/session-modes'
import { getSessionIntensity } from '@/lib/workout-builder/session-intensity'
import { WORKOUT_TYPE_LABELS } from '@/lib/constants'
import { useFilteredPlanDays } from '@/components/training/use-plan-sport-filter-data'
import { addDateOnlyDays, parseDateOnly, toDateKey } from '@/lib/dates'
import { yesterdayKey } from '@/lib/training-timeline'
import { cn } from '@/lib/utils'
import {
  isWorkoutCardCompleted,
  isWorkoutCardSkipped,
} from '@/lib/workout-card'

const CHUNK_DAYS = 14
const DAY_SECTION_ID = 'training-table-day'

type TrainingTableViewProps = {
  initialDays: TrainingTableDayDto[]
  initialFromKey: string
  initialToKey: string
  isCoach: boolean
}

function toPlanDays(days: TrainingTableDayDto[]): PlanDay[] {
  return days.map((day) => ({
    date: parseDateOnly(day.dateKey),
    dateKey: day.dateKey,
    dayLabel: day.dayLabel,
    dateLabel: day.dateLabel,
    isToday: day.isToday,
    workouts: day.workouts,
    dayNote: null,
  }))
}

function workoutSubtitle(workout: PlanWorkoutDetail): string {
  if (workout.isRace) return 'Race'
  const sport = WORKOUT_TYPE_LABELS[workout.type]
  const intensity = getSessionIntensity(workout.sessionType)?.label
  if (intensity) return `${sport} · ${intensity}`
  const session = getSessionTypeLabel(workout.sessionType, workout.type)
  if (session.toLowerCase().includes(sport.toLowerCase())) return session
  return `${sport} · ${session}`
}

function mergeDays(
  existing: TrainingTableDayDto[],
  incoming: TrainingTableDayDto[],
  direction: 'past' | 'future',
): TrainingTableDayDto[] {
  const byKey = new Map(existing.map((d) => [d.dateKey, d]))
  for (const day of incoming) byKey.set(day.dateKey, day)
  const merged = [...byKey.values()].sort((a, b) => a.dateKey.localeCompare(b.dateKey))
  void direction
  return merged
}

function getBottomInset() {
  const bottomNav = document.querySelector('nav.fixed')
  if (!bottomNav) return 16
  const rect = bottomNav.getBoundingClientRect()
  if (rect.height === 0 || rect.bottom <= 0) return 16
  return window.innerHeight - rect.top + 8
}

function TableWorkoutRow({
  workout,
  isCoach,
  onOpen,
}: {
  workout: PlanWorkoutDetail
  isCoach: boolean
  onOpen: () => void
}) {
  const { status, setOptimisticStatus } = useOptimisticWorkoutStatus(workout)
  const metrics = getWorkoutPlanMetrics(workout, status)
  const completed = isWorkoutCardCompleted(status)
  const skipped = isWorkoutCardSkipped(status)
  const isRace = Boolean(workout.isRace)
  const showQuickActions = athleteHasQuickLogActions(workout, isCoach)
  const stravaSynced = isStravaSynced(workout)

  return (
    <div
      className={cn(
        'flex w-full items-center gap-2 rounded-[6px] border px-3 py-2.5 transition sm:gap-3 sm:px-3.5 sm:py-3',
        isRace
          ? 'border-amber-300/70 bg-amber-50/70'
          : completed
            ? 'border-[#86D39A]/70 bg-[#F3FAF5]'
            : skipped
              ? 'border-[#F5A3A3]/70 bg-[#FDF2F2]'
              : 'border-border/70 bg-card',
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-left sm:grid-cols-[minmax(0,1.35fr)_minmax(4.5rem,0.55fr)_auto] sm:gap-4"
      >
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <WorkoutSportIcon type={workout.type} isRace={isRace} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold leading-snug text-[#111827]">
              {workout.title}
            </p>
            <p className="mt-0.5 truncate text-[12px] leading-snug text-[#6B7280]">
              {workoutSubtitle(workout)}
            </p>
          </div>
        </div>

        <div className="hidden min-w-0 justify-center sm:flex">
          <WorkoutCardDiagram
            workout={workout}
            completed={completed}
            skipped={skipped}
            density="week"
            className="max-w-[7.5rem]"
          />
        </div>

        <div className="flex shrink-0 items-center gap-3 sm:gap-5">
          <div className="flex flex-col items-end sm:hidden">
            <p className="text-[12px] font-semibold tabular-nums text-[#111827]">
              {metrics.distance ?? '—'}
            </p>
            <p className="text-[11px] tabular-nums text-muted-foreground">
              {metrics.duration ?? '—'}
            </p>
          </div>
          <div className="hidden w-[5.25rem] text-right sm:block">
            <p className="text-[13px] font-semibold tabular-nums text-[#111827]">
              {metrics.distance ?? '—'}
            </p>
          </div>
          <div className="hidden w-[4.75rem] text-right sm:block">
            <p className="text-[13px] font-semibold tabular-nums text-[#111827]">
              {metrics.duration ?? '—'}
            </p>
          </div>
        </div>
      </button>

      <div className="flex w-[4.75rem] shrink-0 items-center justify-end sm:w-[5.75rem] sm:justify-center">
        {showQuickActions ? (
          <AthleteWorkoutQuickActions
            workout={workout}
            isCoach={isCoach}
            size="sm"
            displayStatus={status}
            onDisplayStatusChange={setOptimisticStatus}
          />
        ) : stravaSynced ? (
          <StravaSyncedIndicator workout={workout} variant="wordmark" size="sm" />
        ) : (
          <span className="inline-flex rounded-md p-1">
            <WorkoutStatusIcon status={status} size="sm" />
          </span>
        )}
      </div>
    </div>
  )
}

export function TrainingTableView({
  initialDays,
  initialFromKey,
  initialToKey,
  isCoach,
}: TrainingTableViewProps) {
  const [days, setDays] = useState(initialDays)
  const [fromKey, setFromKey] = useState(initialFromKey)
  const [toKey, setToKey] = useState(initialToKey)
  const [loadingPast, setLoadingPast] = useState(false)
  const [loadingFuture, setLoadingFuture] = useState(false)
  const [selected, setSelected] = useState<PlanWorkoutDetail | null>(null)
  const [listHeight, setListHeight] = useState<number | null>(null)

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const topSentinelRef = useRef<HTMLDivElement | null>(null)
  const bottomSentinelRef = useRef<HTMLDivElement | null>(null)
  const loadingPastRef = useRef(false)
  const loadingFutureRef = useRef(false)
  const userScrolledRef = useRef(false)
  /** Past chunks only after the user scrolls upward near the top of the list. */
  const wantsPastRef = useRef(false)
  const emptyPastStreakRef = useRef(0)
  const emptyFutureStreakRef = useRef(0)
  const hasScrolledToInitial = useRef(false)

  // Reset when athlete/server initial window changes
  useEffect(() => {
    setDays(initialDays)
    setFromKey(initialFromKey)
    setToKey(initialToKey)
    userScrolledRef.current = false
    wantsPastRef.current = false
    emptyPastStreakRef.current = 0
    emptyFutureStreakRef.current = 0
    hasScrolledToInitial.current = false
  }, [initialDays, initialFromKey, initialToKey])

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const updateHeight = () => {
      const top = el.getBoundingClientRect().top
      const bottom = getBottomInset()
      setListHeight(Math.max(180, Math.round(window.innerHeight - top - bottom)))
    }

    updateHeight()
    window.addEventListener('resize', updateHeight)
    const observer = new ResizeObserver(updateHeight)
    observer.observe(document.documentElement)
    const headerEl = document.querySelector('header')
    if (headerEl) observer.observe(headerEl)

    return () => {
      window.removeEventListener('resize', updateHeight)
      observer.disconnect()
    }
  }, [])

  const loadPast = useCallback(async () => {
    if (loadingPastRef.current) return
    if (!wantsPastRef.current) return
    if (emptyPastStreakRef.current >= 4) return
    loadingPastRef.current = true
    setLoadingPast(true)
    try {
      const end = addDateOnlyDays(parseDateOnly(fromKey), -1)
      const start = addDateOnlyDays(end, -(CHUNK_DAYS - 1))
      const chunk = await fetchTrainingTableDays(toDateKey(start), toDateKey(end))
      const hadWorkouts = chunk.some((d) =>
        d.workouts.some((w) => w.type !== 'REST' && w.type !== 'RECOVERY'),
      )
      emptyPastStreakRef.current = hadWorkouts ? 0 : emptyPastStreakRef.current + 1
      const container = scrollRef.current
      const prevHeight = container?.scrollHeight ?? 0
      const prevTop = container?.scrollTop ?? 0
      setDays((prev) => mergeDays(prev, chunk, 'past'))
      setFromKey(toDateKey(start))
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const next = scrollRef.current
          if (!next) return
          const delta = next.scrollHeight - prevHeight
          next.scrollTop = prevTop + delta
        })
      })
    } catch {
      // keep existing window
    } finally {
      loadingPastRef.current = false
      setLoadingPast(false)
    }
  }, [fromKey])

  const loadFuture = useCallback(async () => {
    if (loadingFutureRef.current) return
    const container = scrollRef.current
    const shortPage = container
      ? container.scrollHeight <= container.clientHeight + 40
      : document.documentElement.scrollHeight <= window.innerHeight + 40
    if (!userScrolledRef.current && !shortPage) return
    if (emptyFutureStreakRef.current >= 4) return
    loadingFutureRef.current = true
    setLoadingFuture(true)
    try {
      const start = addDateOnlyDays(parseDateOnly(toKey), 1)
      const end = addDateOnlyDays(start, CHUNK_DAYS - 1)
      const chunk = await fetchTrainingTableDays(toDateKey(start), toDateKey(end))
      const hadWorkouts = chunk.some((d) =>
        d.workouts.some((w) => w.type !== 'REST' && w.type !== 'RECOVERY'),
      )
      emptyFutureStreakRef.current = hadWorkouts ? 0 : emptyFutureStreakRef.current + 1
      setDays((prev) => mergeDays(prev, chunk, 'future'))
      setToKey(toDateKey(end))
    } catch {
      // keep existing window
    } finally {
      loadingFutureRef.current = false
      setLoadingFuture(false)
    }
  }, [toKey])

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    let lastY = container.scrollTop
    let touchStartY = 0
    const onScroll = () => {
      const y = container.scrollTop
      userScrolledRef.current = true
      if (y < lastY && y < 64) wantsPastRef.current = true
      lastY = y
    }
    const onWheel = (event: WheelEvent) => {
      if (event.deltaY < 0 && container.scrollTop <= 2) {
        wantsPastRef.current = true
        void loadPast()
      }
    }
    const onTouchStart = (event: TouchEvent) => {
      touchStartY = event.touches[0]?.clientY ?? 0
    }
    const onTouchMove = (event: TouchEvent) => {
      const y = event.touches[0]?.clientY ?? 0
      if (container.scrollTop <= 2 && y - touchStartY > 28) {
        wantsPastRef.current = true
        void loadPast()
      }
    }
    container.addEventListener('scroll', onScroll, { passive: true })
    container.addEventListener('wheel', onWheel, { passive: true })
    container.addEventListener('touchstart', onTouchStart, { passive: true })
    container.addEventListener('touchmove', onTouchMove, { passive: true })
    return () => {
      container.removeEventListener('scroll', onScroll)
      container.removeEventListener('wheel', onWheel)
      container.removeEventListener('touchstart', onTouchStart)
      container.removeEventListener('touchmove', onTouchMove)
    }
  }, [loadPast, listHeight])

  useEffect(() => {
    const top = topSentinelRef.current
    const bottom = bottomSentinelRef.current
    const root = scrollRef.current
    if (!top || !bottom || !root) return

    const topObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          void loadPast()
        }
      },
      { root, rootMargin: '0px', threshold: 0 },
    )
    const bottomObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          void loadFuture()
        }
      },
      { root, rootMargin: '320px 0px', threshold: 0 },
    )

    topObserver.observe(top)
    bottomObserver.observe(bottom)
    return () => {
      topObserver.disconnect()
      bottomObserver.disconnect()
    }
  }, [loadPast, loadFuture, listHeight])

  const planDays = useMemo(() => toPlanDays(days), [days])
  const filteredDays = useFilteredPlanDays(planDays)

  const daysWithWorkouts = filteredDays
    .map((day) => ({
      ...day,
      workouts: day.workouts.filter((w) => w.type !== 'REST' && w.type !== 'RECOVERY'),
    }))
    .filter((day) => day.workouts.length > 0)

  useLayoutEffect(() => {
    if (hasScrolledToInitial.current || listHeight == null) return
    const yesterday = yesterdayKey()
    const targetKey = daysWithWorkouts.some((d) => d.dateKey === yesterday)
      ? yesterday
      : daysWithWorkouts.find((d) => d.isToday)?.dateKey
    if (!targetKey) return

    const container = scrollRef.current
    const target = document.getElementById(`${DAY_SECTION_ID}-${targetKey}`)
    if (!container || !target) return

    const top =
      container.scrollTop +
      (target.getBoundingClientRect().top - container.getBoundingClientRect().top)
    container.scrollTop = Math.max(0, top)
    hasScrolledToInitial.current = true
  }, [listHeight, daysWithWorkouts])

  return (
    <>
      <div
        ref={scrollRef}
        className="min-h-0 overflow-y-auto overscroll-y-contain [overflow-anchor:none] [scrollbar-gutter:stable]"
        style={listHeight != null ? { height: listHeight } : undefined}
      >
        <div className="w-full space-y-5 pb-2">
          <div ref={topSentinelRef} className="h-1 w-full" aria-hidden />
          {loadingPast ? (
            <p className="py-2 text-center text-xs text-muted-foreground">
              Loading earlier days…
            </p>
          ) : null}

          {daysWithWorkouts.length === 0 ? (
            <p className="rounded-[6px] border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
              No workouts from today onward yet. Scroll down for later days, or
              pull up for earlier ones.
            </p>
          ) : (
            daysWithWorkouts.map((day) => (
              <section
                key={day.dateKey}
                id={`${DAY_SECTION_ID}-${day.dateKey}`}
                className="space-y-2"
              >
                {day.isToday ? (
                  <div
                    className="mb-1 flex items-center gap-3 pt-1"
                    role="separator"
                    aria-label="Today"
                  >
                    <div className="h-px flex-1 bg-foreground/20" />
                    <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Today
                    </span>
                    <div className="h-px flex-1 bg-foreground/20" />
                  </div>
                ) : null}
                <div className="flex items-center gap-2 px-0.5">
                  <p
                    className={cn(
                      'text-[11px] font-semibold uppercase tracking-wide text-muted-foreground',
                      day.isToday && 'text-foreground',
                    )}
                  >
                    {format(day.date, 'EEEE d MMM')}
                  </p>
                </div>

                <div className="space-y-1.5">
                  {day.workouts.map((workout) => (
                    <TableWorkoutRow
                      key={workout.id}
                      workout={workout}
                      isCoach={isCoach}
                      onOpen={() => setSelected(workout)}
                    />
                  ))}
                </div>
              </section>
            ))
          )}

          {loadingFuture ? (
            <p className="py-2 text-center text-xs text-muted-foreground">
              Loading later days…
            </p>
          ) : null}
          <div ref={bottomSentinelRef} className="h-1 w-full" aria-hidden />
        </div>
      </div>

      {selected?.isRace ? (
        <RaceDetailModal
          workout={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null)
          }}
        />
      ) : selected ? (
        <WorkoutDetailModal
          workout={selected}
          isCoach={isCoach}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null)
          }}
        />
      ) : null}
    </>
  )
}
