'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import {
  AthleteRaceFollowUp,
  type PendingRaceFollowUp,
} from '@/components/dashboard/athlete-race-follow-up'
import { HomeWeekBoard } from '@/components/dashboard/v2/home-week-board'
import { HomeWeekMetrics } from '@/components/dashboard/v2/home-week-metrics'
import { HomePageFooter } from '@/components/dashboard/v2/home-page-footer'
import { HomeWeekWidgets } from '@/components/dashboard/v2/home-week-widgets'
import { V2PageShell } from '@/components/ui/v2'
import {
  buildHomeWeekDays,
  computeHomeWeekMetrics,
  formatWeekRangeLabel,
  formatWeeksSpanLabel,
  HOME_V2_EXPAND_EXTRA_WEEKS,
  HOME_V2_EXPAND_PACK_SIZE,
  HOME_V2_WEEK_CHUNK,
  HOME_V2_WEEK_PREFETCH_EDGE,
  homeV2SnapToExpandedPackStart,
  weekStartForOffset,
} from '@/components/dashboard/v2/home-week-utils'
import { fetchAthleteHomeWeekChunk } from '@/app/actions/athlete-home-weeks'
import type { WorkoutType } from '@prisma/client'
import type { DayNoteData } from '@/lib/day-notes'
import { addDateOnlyDays, toDateKey } from '@/lib/dates'
import {
  WORKOUT_DELETED_EVENT,
  type PlanWorkoutDetail,
} from '@/lib/plan-workout'
import type { SeasonEventData } from '@/lib/season-planner'
import { groupSeasonEventsByDate } from '@/lib/season-events'
import type { SessionLoadThresholds } from '@/lib/training-load/session-tss'
import type { WeatherDaySummary } from '@/lib/weather/places'
import { DASHBOARD_WEEK_NAV_LIMIT } from '@/lib/dashboard-week-nav'
import { cn } from '@/lib/utils'

type NextRace = {
  id: string
  name: string
  date: Date | string
  location?: string | null
  goal?: string | null
  type?: string | null
}

type HomeDayNote = DayNoteData & { dateKey: string }

function mergeWorkouts(
  current: PlanWorkoutDetail[],
  incoming: PlanWorkoutDetail[],
) {
  const byId = new Map<string, PlanWorkoutDetail>()
  for (const w of current) byId.set(w.id, w)
  for (const w of incoming) byId.set(w.id, w)
  return [...byId.values()]
}

/** RSC window is authoritative — drop deleted sessions in that range; keep lazy chunks outside it. */
function mergeWorkoutsFromServerWindow(
  current: PlanWorkoutDetail[],
  incoming: PlanWorkoutDetail[],
  windowStartKey: string,
  windowEndKey: string,
) {
  const next = new Map<string, PlanWorkoutDetail>()
  for (const workout of current) {
    if (
      workout.dateKey < windowStartKey ||
      workout.dateKey > windowEndKey
    ) {
      next.set(workout.id, workout)
    }
  }
  for (const workout of incoming) {
    next.set(workout.id, workout)
  }
  return [...next.values()]
}

function mergeNotes(current: HomeDayNote[], incoming: HomeDayNote[]) {
  const byKey = new Map<string, HomeDayNote>()
  for (const note of current) byKey.set(note.dateKey, note)
  for (const note of incoming) byKey.set(note.dateKey, note)
  return [...byKey.values()]
}

/** Apply RSC notes for the prefetched window; keep lazy-loaded notes outside it. */
function mergeNotesFromServerWindow(
  current: HomeDayNote[],
  incoming: HomeDayNote[],
  windowStartKey: string,
  windowEndKey: string,
) {
  const next = new Map<string, HomeDayNote>()
  for (const note of current) {
    if (note.dateKey < windowStartKey || note.dateKey > windowEndKey) {
      next.set(note.dateKey, note)
    }
  }
  for (const note of incoming) {
    next.set(note.dateKey, note)
  }
  return [...next.values()]
}

function mergeEvents(current: SeasonEventData[], incoming: SeasonEventData[]) {
  const byId = new Map<string, SeasonEventData>()
  for (const event of current) byId.set(event.id, event)
  for (const event of incoming) byId.set(event.id, event)
  return [...byId.values()]
}

export function AthleteHomeV2({
  weekPlanWorkouts,
  weekStatsWorkouts,
  weekStatsAnchorStartKey,
  weekStatsWindowStartKey,
  weekStatsWindowEndKey,
  dayNotes: initialDayNotes = [],
  seasonEvents: initialSeasonEvents = [],
  weatherByDate: weatherByDateRecord = {},
  showWeather = true,
  weatherLocationName = null,
  nextRaces,
  thresholds,
  planSportRows = [],
  swimCssSecPer100m = null,
  pendingRaceFollowUps = [],
}: {
  weekPlanWorkouts: PlanWorkoutDetail[]
  weekStatsWorkouts: PlanWorkoutDetail[]
  weekStatsAnchorStartKey: string
  weekStatsWindowStartKey: string
  weekStatsWindowEndKey: string
  dayNotes?: HomeDayNote[]
  seasonEvents?: SeasonEventData[]
  weatherByDate?: Record<string, WeatherDaySummary>
  showWeather?: boolean
  weatherLocationName?: string | null
  nextRaces: NextRace[]
  thresholds: SessionLoadThresholds
  planSportRows?: WorkoutType[]
  swimCssSecPer100m?: number | null
  pendingRaceFollowUps?: PendingRaceFollowUp[]
}) {
  const initialMin = -DASHBOARD_WEEK_NAV_LIMIT
  const initialMax = DASHBOARD_WEEK_NAV_LIMIT

  const [weekOffset, setWeekOffset] = useState(0)
  const [weekExpanded, setWeekExpanded] = useState(false)
  const [loadedMinOffset, setLoadedMinOffset] = useState(initialMin)
  const [loadedMaxOffset, setLoadedMaxOffset] = useState(initialMax)
  const [workouts, setWorkouts] = useState(() =>
    mergeWorkouts(weekStatsWorkouts, weekPlanWorkouts),
  )
  const [dayNotes, setDayNotes] = useState(initialDayNotes)
  const [seasonEvents, setSeasonEvents] = useState(initialSeasonEvents)
  const [loadingMore, setLoadingMore] = useState(false)
  const inFlightRef = useRef<string | null>(null)

  // After router.refresh(), sync the RSC window (incl. deletes) without dropping lazy chunks.
  useEffect(() => {
    const incoming = mergeWorkouts(weekStatsWorkouts, weekPlanWorkouts)
    setWorkouts((prev) =>
      mergeWorkoutsFromServerWindow(
        prev,
        incoming,
        weekStatsWindowStartKey,
        weekStatsWindowEndKey,
      ),
    )
  }, [
    weekPlanWorkouts,
    weekStatsWorkouts,
    weekStatsWindowStartKey,
    weekStatsWindowEndKey,
  ])

  useEffect(() => {
    function onWorkoutDeleted(event: Event) {
      const workoutId = (event as CustomEvent<{ workoutId?: string }>).detail
        ?.workoutId
      if (!workoutId) return
      setWorkouts((prev) => prev.filter((workout) => workout.id !== workoutId))
    }
    window.addEventListener(WORKOUT_DELETED_EVENT, onWorkoutDeleted)
    return () => {
      window.removeEventListener(WORKOUT_DELETED_EVENT, onWorkoutDeleted)
    }
  }, [])

  useEffect(() => {
    setDayNotes((prev) =>
      mergeNotesFromServerWindow(
        prev,
        initialDayNotes,
        weekStatsWindowStartKey,
        weekStatsWindowEndKey,
      ),
    )
  }, [initialDayNotes, weekStatsWindowStartKey, weekStatsWindowEndKey])

  useEffect(() => {
    setSeasonEvents((prev) => mergeEvents(prev, initialSeasonEvents))
  }, [initialSeasonEvents])

  const handleWorkoutMoved = useCallback((workoutId: string, dateKey: string) => {
    setWorkouts((prev) =>
      prev.map((w) =>
        w.id === workoutId
          ? {
              ...w,
              dateKey,
              rescheduledFromDateKey: w.rescheduledFromDateKey ?? w.dateKey,
            }
          : w,
      ),
    )
  }, [])

  const handleDayReordered = useCallback(
    (dateKey: string, orderedIds: string[]) => {
      const order = new Map(orderedIds.map((id, index) => [id, index]))
      setWorkouts((prev) =>
        prev.map((w) => {
          if (w.dateKey !== dateKey) return w
          const nextOrder = order.get(w.id)
          if (nextOrder == null || w.sortOrder === nextOrder) return w
          return { ...w, sortOrder: nextOrder }
        }),
      )
    },
    [],
  )

  const handleNoteChange = useCallback(
    (dateKey: string, note: DayNoteData | null) => {
      setDayNotes((prev) => {
        if (!note) return prev.filter((n) => n.dateKey !== dateKey)
        const others = prev.filter((n) => n.dateKey !== dateKey)
        return [...others, { ...note, dateKey }]
      })
    },
    [],
  )

  const focusOffset = weekExpanded
    ? homeV2SnapToExpandedPackStart(weekOffset)
    : weekOffset
  const displayedWeekCount = weekExpanded ? HOME_V2_EXPAND_PACK_SIZE : 1
  const weekNavStep = weekExpanded ? HOME_V2_EXPAND_PACK_SIZE : 1

  // Mobile: no week swipe — stay on this week (plan covers the rest).
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    function lockCurrentWeek() {
      if (mq.matches) {
        setWeekOffset(0)
        setWeekExpanded(false)
      }
    }
    lockCurrentWeek()
    mq.addEventListener('change', lockCurrentWeek)
    return () => mq.removeEventListener('change', lockCurrentWeek)
  }, [])

  const ensureRangeLoaded = useCallback(
    async (startOffset: number, endOffset: number) => {
      if (startOffset >= loadedMinOffset && endOffset <= loadedMaxOffset) {
        return
      }
      // Only request the missing sides.
      const missing: Array<{ start: number; end: number }> = []
      if (startOffset < loadedMinOffset) {
        missing.push({
          start: startOffset,
          end: loadedMinOffset - 1,
        })
      }
      if (endOffset > loadedMaxOffset) {
        missing.push({
          start: loadedMaxOffset + 1,
          end: endOffset,
        })
      }
      if (missing.length === 0) return

      const key = missing.map((m) => `${m.start}:${m.end}`).join('|')
      if (inFlightRef.current === key) return
      inFlightRef.current = key
      setLoadingMore(true)
      try {
        for (const range of missing) {
          // Server caps a single request; walk in chunks if needed.
          for (
            let cursor = range.start;
            cursor <= range.end;
            cursor += HOME_V2_WEEK_CHUNK
          ) {
            const chunkEnd = Math.min(
              range.end,
              cursor + HOME_V2_WEEK_CHUNK - 1,
            )
            const chunk = await fetchAthleteHomeWeekChunk({
              startOffset: cursor,
              endOffset: chunkEnd,
            })
            setWorkouts((prev) => mergeWorkouts(prev, chunk.workouts))
            setDayNotes((prev) => mergeNotes(prev, chunk.dayNotes))
            setSeasonEvents((prev) => mergeEvents(prev, chunk.seasonEvents))
            setLoadedMinOffset((prev) => Math.min(prev, chunk.startOffset))
            setLoadedMaxOffset((prev) => Math.max(prev, chunk.endOffset))
          }
        }
      } finally {
        if (inFlightRef.current === key) inFlightRef.current = null
        setLoadingMore(false)
      }
    },
    [loadedMinOffset, loadedMaxOffset],
  )

  // Load (or prefetch) whenever focus approaches / crosses the loaded edge.
  useEffect(() => {
    const needStart = focusOffset - HOME_V2_WEEK_PREFETCH_EDGE
    const needEnd =
      focusOffset +
      (weekExpanded ? HOME_V2_EXPAND_EXTRA_WEEKS : 0) +
      HOME_V2_WEEK_PREFETCH_EDGE
    if (needStart >= loadedMinOffset && needEnd <= loadedMaxOffset) return
    void ensureRangeLoaded(needStart, needEnd)
  }, [
    focusOffset,
    weekExpanded,
    loadedMinOffset,
    loadedMaxOffset,
    ensureRangeLoaded,
  ])

  const weekStart = useMemo(
    () => weekStartForOffset(weekStatsAnchorStartKey, focusOffset),
    [weekStatsAnchorStartKey, focusOffset],
  )
  const weekStartKey = toDateKey(weekStart)
  const weekEndKey = toDateKey(
    addDateOnlyDays(weekStart, displayedWeekCount * 7 - 1),
  )

  const notesByDate = useMemo(() => {
    const map = new Map<string, DayNoteData>()
    for (const note of dayNotes) {
      const { dateKey, ...rest } = note
      map.set(dateKey, rest)
    }
    return map
  }, [dayNotes])

  const eventsByDate = useMemo(() => {
    if (seasonEvents.length === 0) return new Map()
    const starts = seasonEvents.map((e) => new Date(e.startDate).getTime())
    const ends = seasonEvents.map((e) => new Date(e.endDate).getTime())
    const min = new Date(Math.min(...starts))
    const max = new Date(Math.max(...ends))
    return groupSeasonEventsByDate(seasonEvents, min, max)
  }, [seasonEvents])

  const weatherByDate = useMemo(() => {
    const map = new Map<string, WeatherDaySummary>()
    if (!showWeather) return map
    for (const [key, summary] of Object.entries(weatherByDateRecord)) {
      map.set(key, summary)
    }
    return map
  }, [weatherByDateRecord, showWeather])

  const weekDays = useMemo(
    () =>
      buildHomeWeekDays(
        weekStart,
        workouts,
        notesByDate,
        eventsByDate,
        weatherByDate,
      ),
    [workouts, weekStart, notesByDate, eventsByDate, weatherByDate],
  )

  const metrics = useMemo(() => {
    const weekWorkouts = workouts.filter(
      (w) => w.dateKey >= weekStartKey && w.dateKey <= weekEndKey,
    )
    const prevStart = addDateOnlyDays(weekStart, -displayedWeekCount * 7)
    const prevEndKey = toDateKey(
      addDateOnlyDays(prevStart, displayedWeekCount * 7 - 1),
    )
    const prevStartKey = toDateKey(prevStart)
    const prevWeekWorkouts = workouts.filter(
      (w) => w.dateKey >= prevStartKey && w.dateKey <= prevEndKey,
    )
    return computeHomeWeekMetrics(
      weekStart,
      weekWorkouts,
      prevWeekWorkouts,
      thresholds,
      displayedWeekCount,
    )
  }, [
    workouts,
    weekStart,
    weekStartKey,
    weekEndKey,
    thresholds,
    displayedWeekCount,
  ])

  const weekRangeLabel =
    displayedWeekCount > 1
      ? formatWeeksSpanLabel(weekStart, displayedWeekCount)
      : formatWeekRangeLabel(weekStart)

  function setWeekExpandedSafe(next: boolean) {
    if (next) setWeekOffset(homeV2SnapToExpandedPackStart(weekOffset))
    setWeekExpanded(next)
  }

  function moveWeekOffset(delta: number) {
    setWeekOffset((i) => {
      if (weekExpanded) {
        const packs =
          Math.round(delta / HOME_V2_EXPAND_PACK_SIZE) || Math.sign(delta)
        return homeV2SnapToExpandedPackStart(i) + packs * HOME_V2_EXPAND_PACK_SIZE
      }
      return i + delta
    })
  }

  return (
    <V2PageShell>
      <div className="tt-v2-hero-band tt-v2-mod-stack">
        {pendingRaceFollowUps.length > 0 ? (
          <div className="rounded-[var(--radius-lg)] bg-white/5 p-1">
            <AthleteRaceFollowUp races={pendingRaceFollowUps} />
          </div>
        ) : null}

        <div className="tt-v2-hero-row">
          <div className="tt-v2-hero-copy relative">
            <p className="tt-v2-eyebrow relative mb-2 flex items-center gap-2 text-white/45">
              <span
                className="inline-block h-2 w-2 shrink-0 bg-[var(--tt-v2-accent)]"
                aria-hidden
              />
              Training
            </p>
            <h1 className="relative text-[2.125rem] font-extrabold leading-[1.02] tracking-[-0.035em] text-white sm:text-[3.25rem] lg:text-[3.75rem]">
              Your Week<span className="tt-title-dot">.</span>
            </h1>
            <div className="tt-v2-hero-week-nav relative mt-3 hidden items-center gap-1.5 text-[13px] text-white/55 md:flex sm:gap-2 sm:text-[14px]">
              <button
                type="button"
                aria-label={
                  weekNavStep > 1 ? 'Previous weeks' : 'Previous week'
                }
                onClick={() => moveWeekOffset(-weekNavStep)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span
                className={cn(
                  'inline-flex min-w-0 items-center gap-1.5 tabular-nums',
                  displayedWeekCount > 1
                    ? 'sm:min-w-[16rem]'
                    : 'sm:min-w-[11rem]',
                )}
              >
                {weekRangeLabel}
                {loadingMore ? (
                  <Loader2
                    className="h-3.5 w-3.5 shrink-0 animate-spin text-white/45"
                    strokeWidth={2}
                    aria-label="Loading"
                  />
                ) : null}
              </span>
              <button
                type="button"
                aria-label={weekNavStep > 1 ? 'Next weeks' : 'Next week'}
                onClick={() => moveWeekOffset(weekNavStep)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="tt-v2-hero-metrics">
            <HomeWeekMetrics metrics={metrics} />
          </div>
        </div>
      </div>

      <HomeWeekBoard
        primaryDays={weekDays}
        weekOffset={focusOffset}
        onWeekOffsetChange={setWeekOffset}
        loadedMinOffset={loadedMinOffset}
        loadedMaxOffset={loadedMaxOffset}
        loadingMore={loadingMore}
        expanded={weekExpanded}
        onExpandedChange={setWeekExpandedSafe}
        anchorWeekStartKey={weekStatsAnchorStartKey}
        allWorkouts={workouts}
        notesByDate={notesByDate}
        eventsByDate={eventsByDate}
        weatherByDate={weatherByDate}
        weatherLocationName={weatherLocationName}
        onWorkoutMoved={handleWorkoutMoved}
        onDayReordered={handleDayReordered}
        onNoteChange={handleNoteChange}
      />

      <HomeWeekWidgets
        workouts={workouts}
        anchorWeekStartKey={weekStatsAnchorStartKey}
        planSportRows={planSportRows}
        swimCssSecPer100m={swimCssSecPer100m}
        thresholds={thresholds}
        nextRaces={nextRaces}
        weekOffset={focusOffset}
        loadedMinOffset={loadedMinOffset}
        loadedMaxOffset={loadedMaxOffset}
      />

      <HomePageFooter />
    </V2PageShell>
  )
}
