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
import { PlanWorkoutModal } from '@/components/plan/plan-workout-modal'
import { DayDropSection } from '@/components/plan/day-drop-section'
import { usePlanWeekDnd } from '@/components/plan/plan-week-dnd'
import { TrainingListWorkoutRow } from '@/components/training/training-list-workout-row'
import type { PlanDay } from '@/lib/plan-week'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { useFilteredPlanDays } from '@/components/training/use-plan-sport-filter-data'
import { collapseTriathlonRaceWorkouts } from '@/lib/triathlon-race-summary'
import { addDateOnlyDays, parseDateOnly, toDateKey } from '@/lib/dates'
import { yesterdayKey } from '@/lib/training-timeline'
import { cn } from '@/lib/utils'

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
    const timeoutId = window.setTimeout(() => {
      setDays(initialDays)
      setFromKey(initialFromKey)
      setToKey(initialToKey)
    }, 0)
    userScrolledRef.current = false
    wantsPastRef.current = false
    emptyPastStreakRef.current = 0
    emptyFutureStreakRef.current = 0
    hasScrolledToInitial.current = false
    return () => window.clearTimeout(timeoutId)
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
  const dnd = usePlanWeekDnd()
  const showEmptyDropDays =
    isCoach && dnd?.dragItem?.kind === 'plan'

  const displayDays = useMemo(() => {
    const mapped = filteredDays.map((day) => ({
      ...day,
      workouts: collapseTriathlonRaceWorkouts(
        day.workouts.filter((w) => w.type !== 'REST' && w.type !== 'RECOVERY'),
      ),
    }))
    if (!showEmptyDropDays) {
      return mapped.filter((day) => day.workouts.length > 0)
    }
    // While dragging, fill empty days between first/last workout days so
    // coaches can drop onto rest days without exploding the list.
    const withWorkouts = mapped.filter((day) => day.workouts.length > 0)
    if (withWorkouts.length === 0) return mapped
    const firstKey = withWorkouts[0]!.dateKey
    const lastKey = withWorkouts[withWorkouts.length - 1]!.dateKey
    return mapped.filter(
      (day) => day.dateKey >= firstKey && day.dateKey <= lastKey,
    )
  }, [filteredDays, showEmptyDropDays])

  useLayoutEffect(() => {
    if (hasScrolledToInitial.current || listHeight == null) return
    const yesterday = yesterdayKey()
    const targetKey = displayDays.some((d) => d.dateKey === yesterday)
      ? yesterday
      : displayDays.find((d) => d.isToday)?.dateKey
    if (!targetKey) return

    const container = scrollRef.current
    const target = document.getElementById(`${DAY_SECTION_ID}-${targetKey}`)
    if (!container || !target) return

    const top =
      container.scrollTop +
      (target.getBoundingClientRect().top - container.getBoundingClientRect().top)
    container.scrollTop = Math.max(0, top)
    hasScrolledToInitial.current = true
  }, [listHeight, displayDays])

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

          {displayDays.length === 0 ? (
            <p className="rounded-[6px] border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
              No workouts from today onward yet. Scroll down for later days, or
              pull up for earlier ones.
            </p>
          ) : (
            displayDays.map((day) => (
              <DayDropSection
                key={day.dateKey}
                id={`${DAY_SECTION_ID}-${day.dateKey}`}
                dateKey={day.dateKey}
                enabled={isCoach}
                className="space-y-2 rounded-[8px]"
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
                  {day.workouts.length === 0 ? (
                    <div className="rounded-[6px] border border-dashed border-brand/30 bg-brand/[0.03] px-3 py-5 text-center text-xs text-muted-foreground">
                      Drop workout here
                    </div>
                  ) : (
                    day.workouts.map((workout) => (
                      <TrainingListWorkoutRow
                        key={workout.id}
                        workout={workout}
                        isCoach={isCoach}
                        onOpen={() => setSelected(workout)}
                      />
                    ))
                  )}
                </div>
              </DayDropSection>
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

      {selected ? (
        <PlanWorkoutModal
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
