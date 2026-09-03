'use client'

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { format } from 'date-fns'
import {
  fetchTrainingTableDays,
  type TrainingTableDayDto,
} from '@/app/actions/training-table'
import { PlanWorkoutModal } from '@/components/plan/plan-workout-modal'
import {
  planWorkoutUsesListDetailPanel,
  WorkoutDetailView,
} from '@/components/plan/workout-detail-view'
import { DayDropSection } from '@/components/plan/day-drop-section'
import { DayNoteSection } from '@/components/plan/day-note-section'
import { SeasonEventChips } from '@/components/plan/season-event-chips'
import { usePlanWeekDnd } from '@/components/plan/plan-week-dnd'
import { TrainingListWorkoutRow } from '@/components/training/training-list-workout-row'
import { ListDayWeatherMini } from '@/components/weather/list-day-weather'
import type { PlanDay } from '@/lib/plan-week'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { useFilteredPlanDays } from '@/components/training/use-plan-sport-filter-data'
import { collapseTriathlonRaceWorkouts } from '@/lib/triathlon-race-summary'
import { dayNoteHasVisibleContent } from '@/lib/day-notes'
import { addDateOnlyDays, parseDateOnly, toDateKey } from '@/lib/dates'
import { yesterdayKey } from '@/lib/training-timeline'
import {
  SHOW_EVENTS_STORAGE_KEY,
  SHOW_NOTES_STORAGE_KEY,
} from '@/lib/plan-calendar-layers'
import { useStoredFlag } from '@/hooks/use-stored-flag'
import { getMobileBottomChromeInset } from '@/lib/mobile-chrome'
import { cn } from '@/lib/utils'

const CHUNK_DAYS = 14
const DAY_SECTION_ID = 'training-table-day'
/** Ignore repeated top/bottom loads while content settles. */
const LOAD_COOLDOWN_MS = 450
const LG_QUERY = '(min-width: 1024px)'

function subscribeLg(onChange: () => void) {
  const mq = window.matchMedia(LG_QUERY)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

function getLgSnapshot() {
  return window.matchMedia(LG_QUERY).matches
}

function useIsLg() {
  // Server + hydration snapshot must match; prefer no panel until client knows.
  return useSyncExternalStore(subscribeLg, getLgSnapshot, () => false)
}

type TrainingTableViewProps = {
  initialDays: TrainingTableDayDto[]
  initialFromKey: string
  initialToKey: string
  isCoach: boolean
  canEditDayNotes?: boolean
  athleteId?: string
}

function toPlanDays(days: TrainingTableDayDto[]): PlanDay[] {
  return days.map((day) => ({
    date: parseDateOnly(day.dateKey),
    dateKey: day.dateKey,
    dayLabel: day.dayLabel,
    dateLabel: day.dateLabel,
    isToday: day.isToday,
    workouts: day.workouts,
    dayNote: day.dayNote ?? null,
    seasonEvents: day.seasonEvents ?? [],
    weather: day.weather ?? null,
  }))
}

function dayHasListContent(
  day: {
    workouts: PlanWorkoutDetail[]
    dayNote?: PlanDay['dayNote']
    seasonEvents?: PlanDay['seasonEvents']
  },
  opts: { showNotes: boolean; showEvents: boolean },
) {
  return (
    day.workouts.length > 0 ||
    (opts.showNotes && dayNoteHasVisibleContent(day.dayNote)) ||
    (opts.showEvents && (day.seasonEvents?.length ?? 0) > 0)
  )
}

function mergeDays(
  existing: TrainingTableDayDto[],
  incoming: TrainingTableDayDto[],
): TrainingTableDayDto[] {
  const byKey = new Map(existing.map((d) => [d.dateKey, d]))
  for (const day of incoming) byKey.set(day.dateKey, day)
  return [...byKey.values()].sort((a, b) => a.dateKey.localeCompare(b.dateKey))
}

function getBottomInset() {
  return getMobileBottomChromeInset()
}

function daySectionEl(dateKey: string) {
  return document.getElementById(`${DAY_SECTION_ID}-${dateKey}`)
}

export function TrainingTableView({
  initialDays,
  initialFromKey,
  initialToKey,
  isCoach,
  canEditDayNotes = false,
  athleteId,
}: TrainingTableViewProps) {
  const [days, setDays] = useState(initialDays)
  const [fromKey, setFromKey] = useState(initialFromKey)
  const [toKey, setToKey] = useState(initialToKey)
  const [loadingPast, setLoadingPast] = useState(false)
  const [loadingFuture, setLoadingFuture] = useState(false)
  const [selected, setSelected] = useState<PlanWorkoutDetail | null>(null)
  const [listHeight, setListHeight] = useState<number | null>(null)
  const [showNotes] = useStoredFlag(SHOW_NOTES_STORAGE_KEY, true)
  const [showEvents] = useStoredFlag(SHOW_EVENTS_STORAGE_KEY, true)
  const isLg = useIsLg()

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
  const pastCooldownUntilRef = useRef(0)
  const futureCooldownUntilRef = useRef(0)
  /** Restore this day's viewport offset after prepending past days. */
  const pendingPastAnchorRef = useRef<{
    dateKey: string
    offsetTop: number
  } | null>(null)

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
    pendingPastAnchorRef.current = null
    pastCooldownUntilRef.current = 0
    futureCooldownUntilRef.current = 0
    return () => window.clearTimeout(timeoutId)
  }, [initialDays, initialFromKey, initialToKey])

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const updateHeight = () => {
      const frame = el.closest('[data-training-list-frame="fixed"]')
      if (frame) {
        // Parent frame already sizes to the viewport chrome — fill it.
        setListHeight(null)
        el.style.height = '100%'
        return
      }
      el.style.height = ''
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
    const bottomNav = document.querySelector('[data-mobile-bottom-nav]')
    if (bottomNav) observer.observe(bottomNav)

    // Tab bar is portaled after first paint — recalc once it appears.
    const bodyObserver = new MutationObserver(() => updateHeight())
    bodyObserver.observe(document.body, { childList: true, subtree: true })
    const retryId = window.setTimeout(updateHeight, 120)

    return () => {
      window.removeEventListener('resize', updateHeight)
      observer.disconnect()
      bodyObserver.disconnect()
      window.clearTimeout(retryId)
    }
  }, [])

  const loadPast = useCallback(async () => {
    if (loadingPastRef.current) return
    if (!wantsPastRef.current) return
    if (Date.now() < pastCooldownUntilRef.current) return
    if (emptyPastStreakRef.current >= 4) return

    const container = scrollRef.current
    if (!container) return

    // Anchor to the first on-screen day section so prepends don't jump.
    const sections = container.querySelectorAll<HTMLElement>(
      `[id^="${DAY_SECTION_ID}-"]`,
    )
    let anchor: { dateKey: string; offsetTop: number } | null = null
    const containerTop = container.getBoundingClientRect().top
    for (const section of sections) {
      const rect = section.getBoundingClientRect()
      if (rect.bottom > containerTop + 8) {
        const dateKey = section.id.slice(`${DAY_SECTION_ID}-`.length)
        anchor = {
          dateKey,
          offsetTop: rect.top - containerTop,
        }
        break
      }
    }

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

      if (anchor) pendingPastAnchorRef.current = anchor
      setDays((prev) => mergeDays(prev, chunk))
      setFromKey(toDateKey(start))
    } catch {
      pendingPastAnchorRef.current = null
    } finally {
      loadingPastRef.current = false
      setLoadingPast(false)
      pastCooldownUntilRef.current = Date.now() + LOAD_COOLDOWN_MS
    }
  }, [fromKey])

  const loadFuture = useCallback(async () => {
    if (loadingFutureRef.current) return
    if (Date.now() < futureCooldownUntilRef.current) return
    const container = scrollRef.current
    const shortPage = container
      ? container.scrollHeight <= container.clientHeight + 40
      : false
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
      setDays((prev) => mergeDays(prev, chunk))
      setToKey(toDateKey(end))
    } catch {
      // keep existing window
    } finally {
      loadingFutureRef.current = false
      setLoadingFuture(false)
      futureCooldownUntilRef.current = Date.now() + LOAD_COOLDOWN_MS
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
      if (y < lastY && y < 80) wantsPastRef.current = true
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
          if (loadingPastRef.current) continue
          if (Date.now() < pastCooldownUntilRef.current) continue
          void loadPast()
        }
      },
      { root, rootMargin: '0px', threshold: 0 },
    )
    const bottomObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          if (loadingFutureRef.current) continue
          if (Date.now() < futureCooldownUntilRef.current) continue
          void loadFuture()
        }
      },
      { root, rootMargin: '240px 0px', threshold: 0 },
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

  const layerOpts = useMemo(
    () => ({ showNotes, showEvents }),
    [showNotes, showEvents],
  )

  const displayDays = useMemo(() => {
    const mapped = filteredDays.map((day) => ({
      ...day,
      workouts: collapseTriathlonRaceWorkouts(
        day.workouts.filter((w) => w.type !== 'REST' && w.type !== 'RECOVERY'),
      ),
    }))
    if (!showEmptyDropDays) {
      return mapped.filter((day) => dayHasListContent(day, layerOpts))
    }
    // While dragging, fill empty days between first/last content days so
    // coaches can drop onto rest days without exploding the list.
    const withContent = mapped.filter((day) =>
      dayHasListContent(day, layerOpts),
    )
    if (withContent.length === 0) return mapped
    const firstKey = withContent[0]!.dateKey
    const lastKey = withContent[withContent.length - 1]!.dateKey
    return mapped.filter(
      (day) => day.dateKey >= firstKey && day.dateKey <= lastKey,
    )
  }, [filteredDays, showEmptyDropDays, layerOpts])

  useLayoutEffect(() => {
    const pending = pendingPastAnchorRef.current
    if (!pending) return
    pendingPastAnchorRef.current = null

    const container = scrollRef.current
    const target = daySectionEl(pending.dateKey)
    if (!container || !target) return

    const containerTop = container.getBoundingClientRect().top
    const nextOffset = target.getBoundingClientRect().top - containerTop
    container.scrollTop += nextOffset - pending.offsetTop
  }, [displayDays])

  useLayoutEffect(() => {
    if (hasScrolledToInitial.current || listHeight == null) return
    const yesterday = yesterdayKey()
    const targetKey = displayDays.some((d) => d.dateKey === yesterday)
      ? yesterday
      : displayDays.find((d) => d.isToday)?.dateKey
    if (!targetKey) return

    const container = scrollRef.current
    const target = daySectionEl(targetKey)
    if (!container || !target) return

    const top =
      container.scrollTop +
      (target.getBoundingClientRect().top - container.getBoundingClientRect().top)
    container.scrollTop = Math.max(0, top)
    hasScrolledToInitial.current = true
  }, [listHeight, displayDays])

  // Keep selection in sync when list data refreshes; clear if workout is gone.
  useEffect(() => {
    setSelected((prev) => {
      if (!prev) return prev
      return (
        days.flatMap((d) => d.workouts).find((w) => w.id === prev.id) ?? null
      )
    })
  }, [days])

  const panelWorkout =
    selected && planWorkoutUsesListDetailPanel(isCoach, selected)
      ? selected
      : null
  const showDesktopPanel = isLg
  const showModal =
    selected != null &&
    (!isLg || !planWorkoutUsesListDetailPanel(isCoach, selected))

  return (
    <>
      <div
        className="flex min-h-0 max-lg:h-full max-lg:min-h-0 max-lg:flex-1 items-stretch gap-8"
        style={listHeight != null ? { height: listHeight } : undefined}
      >
        <div
          ref={scrollRef}
          className="relative min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-y-contain [overflow-anchor:none] [scrollbar-gutter:stable] max-lg:h-full"
          aria-busy={loadingPast || loadingFuture}
        >
          {/* Zero-height sticky overlays — load labels must not shift scroll height */}
          <div className="pointer-events-none sticky top-0 z-10 h-0 overflow-visible">
            {loadingPast ? (
              <p className="bg-background/80 py-1.5 text-center text-[10px] text-muted-foreground/80 backdrop-blur-[1px]">
                Loading earlier…
              </p>
            ) : null}
          </div>

          {/* Column headers — sticky, desktop only */}
          <div className="sticky top-0 z-10 hidden w-full items-center border-b border-[var(--tt-line,#ebebeb)] bg-background/98 backdrop-blur-[2px] lg:flex">
            <div className="w-[4.5rem] shrink-0 border-r border-[var(--tt-line,#ebebeb)] px-3 py-2.5 sm:w-[5.5rem]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--tt-ink-faint,#9a9a9a)]">Day</p>
            </div>
            <div className="flex min-w-0 flex-1 items-center gap-0 pl-4 pr-3">
              <p className="flex-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--tt-ink-faint,#9a9a9a)]">Workout / Event</p>
              <p className="hidden w-[4.5rem] shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--tt-ink-faint,#9a9a9a)] lg:block">Details</p>
              <p className="w-[4.25rem] shrink-0 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--tt-ink-faint,#9a9a9a)]">Dur / Dist</p>
              <p className="w-8 shrink-0 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--tt-ink-faint,#9a9a9a)]">Status</p>
            </div>
          </div>

          {/* Flat table — mobile: no wrapper; desktop: rounded card */}
          <div className="w-full pb-2 max-lg:pb-0">
            <div ref={topSentinelRef} className="h-px w-full" aria-hidden />

            {displayDays.length === 0 ? (
              <p className="mt-4 rounded-[10px] border border-dashed border-[var(--tt-line,#ebebeb)] bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
                No workouts from today onward yet. Scroll down for later days, or
                pull up for earlier ones.
              </p>
            ) : (
              <div className="lg:overflow-hidden lg:rounded-[10px] lg:border lg:border-[var(--tt-line,#ebebeb)] lg:bg-white lg:shadow-[0_1px_2px_rgb(0_0_0_/0.04),0_2px_8px_rgb(0_0_0_/0.04)]">
                {displayDays.map((day, dayIdx) => {
                  const hasContent =
                    day.workouts.length > 0 ||
                    (showNotes && dayNoteHasVisibleContent(day.dayNote)) ||
                    (showEvents && (day.seasonEvents?.length ?? 0) > 0)
                  const isFirst = dayIdx === 0

                  // All rows for this day (workouts + events + notes)
                  const totalRows =
                    day.workouts.length +
                    (showEvents && (day.seasonEvents?.length ?? 0) > 0 ? 1 : 0) +
                    (showNotes && dayNoteHasVisibleContent(day.dayNote) ? 1 : 0) +
                    (!hasContent ? 1 : 0)

                  return (
                    <DayDropSection
                      key={day.dateKey}
                      id={`${DAY_SECTION_ID}-${day.dateKey}`}
                      dateKey={day.dateKey}
                      enabled={isCoach}
                      className={cn(
                        'scroll-mt-14',
                        day.isToday && 'scroll-mt-16',
                        !isFirst && 'border-t border-[var(--tt-line,#ebebeb)]',
                        day.isToday && 'bg-[var(--tt-today-wash,rgb(218_47_54/0.025))]',
                      )}
                    >
                      <div className="flex">
                        {/* DAY column */}
                        <div
                          className={cn(
                            'flex w-[3.75rem] shrink-0 flex-col items-center justify-start px-1 text-center sm:w-[5.5rem] sm:items-start sm:px-2.5 sm:text-left',
                            totalRows > 1 ? 'pt-3' : 'py-3',
                          )}
                        >
                          {day.isToday ? (
                            <>
                              <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--color-brand,#da2f36)]">
                                Today
                              </span>
                              <span className="mt-0.5 text-[15px] font-bold leading-none text-[var(--tt-ink,#111)]">
                                {format(day.date, 'd')}
                              </span>
                              <span className="text-[9px] font-medium uppercase tracking-[0.04em] text-[var(--tt-ink-soft,#6b6b6b)]">
                                {format(day.date, 'MMM')}
                              </span>
                            </>
                          ) : (
                            <>
                              <span
                                className={cn(
                                  'text-[9px] font-semibold uppercase tracking-[0.08em]',
                                  day.date < new Date(new Date().setHours(0,0,0,0))
                                    ? 'text-[var(--tt-ink-faint,#9a9a9a)]'
                                    : 'text-[var(--tt-ink-soft,#6b6b6b)]',
                                )}
                              >
                                {format(day.date, 'EEE')}
                              </span>
                              <span
                                className={cn(
                                  'mt-0.5 text-[15px] font-bold leading-none',
                                  day.date < new Date(new Date().setHours(0,0,0,0))
                                    ? 'text-[var(--tt-ink-faint,#9a9a9a)]'
                                    : 'text-[var(--tt-ink,#111)]',
                                )}
                              >
                                {format(day.date, 'd')}
                              </span>
                              <span
                                className={cn(
                                  'text-[9px] font-medium uppercase tracking-[0.04em]',
                                  day.date < new Date(new Date().setHours(0,0,0,0))
                                    ? 'text-[var(--tt-ink-faint,#9a9a9a)]'
                                    : 'text-[var(--tt-ink-soft,#6b6b6b)]',
                                )}
                              >
                                {format(day.date, 'MMM')}
                              </span>
                            </>
                          )}
                          {day.weather ? (
                            <div className="mt-1.5 hidden lg:block">
                              <ListDayWeatherMini weather={day.weather} />
                            </div>
                          ) : null}
                        </div>

                        {/* CONTENT column */}
                        <div className="min-w-0 flex-1">
                          {/* Empty day */}
                          {!hasContent ? (
                            <div className="flex items-center py-3.5 pl-4 pr-3.5 text-[11px] text-[var(--tt-ink-faint,#9a9a9a)]">
                              {isCoach ? 'Drop workout here' : 'Rest / empty'}
                            </div>
                          ) : null}

                          {/* Workout rows */}
                          {day.workouts.map((workout, i) => (
                              <TrainingListWorkoutRow
                                key={workout.id}
                                workout={workout}
                                isCoach={isCoach}
                                last={i === day.workouts.length - 1}
                                selected={showDesktopPanel && panelWorkout?.id === workout.id}
                                onOpen={() => setSelected(workout)}
                              />
                          ))}

                          {/* Events strip */}
                          {showEvents && (day.seasonEvents?.length ?? 0) > 0 ? (
                            <div
                              className={cn(
                                'bg-amber-50/90 px-4 py-3',
                                day.workouts.length > 0 &&
                                  'border-t border-[var(--tt-line,#ebebeb)]',
                              )}
                            >
                              <SeasonEventChips
                                events={day.seasonEvents ?? []}
                                variant="strip"
                                editable={isCoach}
                                dateKey={day.dateKey}
                              />
                            </div>
                          ) : null}

                          {/* Notes strip */}
                          {showNotes && dayNoteHasVisibleContent(day.dayNote) ? (
                            <div
                              className={cn(
                                'bg-amber-50/90 px-4 py-3',
                                (day.workouts.length > 0 ||
                                  (showEvents &&
                                    (day.seasonEvents?.length ?? 0) > 0)) &&
                                  'border-t border-[var(--tt-line,#ebebeb)]',
                              )}
                            >
                              <DayNoteSection
                                dateKey={day.dateKey}
                                note={day.dayNote}
                                canEdit={canEditDayNotes}
                                noteKind={isCoach ? 'coach' : 'athlete'}
                                athleteId={athleteId}
                                compact
                                showFullText
                                hideEmptyAdd
                                variant="strip"
                              />
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </DayDropSection>
                  )
                })}
              </div>
            )}

            <div ref={bottomSentinelRef} className="h-px w-full" aria-hidden />
          </div>

          <div className="pointer-events-none sticky bottom-0 z-10 h-0 overflow-visible">
            {loadingFuture ? (
              <p className="absolute inset-x-0 bottom-0 bg-background/80 py-1.5 text-center text-[10px] text-muted-foreground/80 backdrop-blur-[1px]">
                Loading later…
              </p>
            ) : null}
          </div>
        </div>

        {showDesktopPanel ? (
          <aside
            className="hidden min-h-0 w-[28rem] shrink-0 flex-col lg:flex xl:w-[30rem]"
            aria-label="Workout detail"
          >
            <div
              className={cn(
                'flex h-full min-h-0 flex-col overflow-hidden rounded-[10px] border border-[var(--tt-line,#ebebeb)] bg-white',
                'shadow-[0_1px_2px_rgb(0_0_0_/0.03),0_2px_8px_rgb(0_0_0_/0.03)]',
              )}
            >
              {panelWorkout ? (
                <WorkoutDetailView
                  key={panelWorkout.id}
                  workout={panelWorkout}
                  isCoach={isCoach}
                  active
                  heroTone="light"
                  onClose={() => setSelected(null)}
                />
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-1 px-6 py-10 text-center">
                  <p className="text-sm font-medium text-foreground">
                    Workout detail
                  </p>
                  <p className="max-w-[16rem] text-[13px] leading-snug text-muted-foreground">
                    Select a workout from the list to open it here.
                  </p>
                </div>
              )}
            </div>
          </aside>
        ) : null}
      </div>

      {showModal && selected ? (
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
