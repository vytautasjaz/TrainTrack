'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { ChevronDown, Loader2 } from 'lucide-react'
import { HomeWeekGrid } from '@/components/dashboard/v2/home-week-grid'
import {
  buildHomeWeekDays,
  formatWeekRangeLabel,
  HOME_V2_EXPAND_EXTRA_WEEKS,
  HOME_V2_EXPAND_PACK_SIZE,
  homeV2SnapToExpandedPackStart,
  weekStartForOffset,
} from '@/components/dashboard/v2/home-week-utils'
import {
  WeekSwipePane,
  WeekSwipeSlide,
} from '@/components/dashboard/week-swipe-pane'
import {
  PlanWeekDndErrorBanner,
  PlanWeekDndProvider,
} from '@/components/plan/plan-week-dnd'
import { V2WeekBoard } from '@/components/ui/v2'
import type { DayNoteData } from '@/lib/day-notes'
import type { PlanDay } from '@/lib/plan-week'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import type { SeasonEventData } from '@/lib/season-planner'
import type { WeatherDaySummary } from '@/lib/weather/places'
import { toDateKey } from '@/lib/dates'
import { cn } from '@/lib/utils'

/** Match WeekSwipePane SLIDE_MS — recenter the 3-slide window after settle. */
const SWIPE_SETTLE_MS = 300

type HomeWeekBoardProps = {
  primaryDays: PlanDay[]
  /** Offset from this calendar week (0 = current). Unbounded. */
  weekOffset: number
  onWeekOffsetChange: (offset: number) => void
  loadedMinOffset: number
  loadedMaxOffset: number
  /** True while a lazy chunk beyond the loaded window is in flight. */
  loadingMore?: boolean
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
  anchorWeekStartKey: string
  allWorkouts: PlanWorkoutDetail[]
  notesByDate?: Map<string, DayNoteData>
  eventsByDate?: Map<string, SeasonEventData[]>
  weatherByDate?: Map<string, WeatherDaySummary>
  weatherLocationName?: string | null
  /** Optimistic date move for drag-and-drop (home keeps workouts in client state). */
  onWorkoutMoved?: (workoutId: string, dateKey: string) => void
  /** Optimistic same-day reorder. */
  onDayReordered?: (dateKey: string, orderedIds: string[]) => void
  /** Immediate day-note update after save/remove. */
  onNoteChange?: (dateKey: string, note: DayNoteData | null) => void
}

function WeekLoadingOverlay({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center rounded-[var(--radius-xl)] bg-white/55">
      <Loader2
        className="h-5 w-5 animate-spin text-[var(--tt-v2-accent)]"
        strokeWidth={2}
        aria-label="Loading week"
      />
    </div>
  )
}

function weekEntry(
  offset: number,
  anchorWeekStartKey: string,
  allWorkouts: PlanWorkoutDetail[],
  notesByDate: Map<string, DayNoteData> | undefined,
  eventsByDate: Map<string, SeasonEventData[]> | undefined,
  weatherByDate: Map<string, WeatherDaySummary> | undefined,
  loadedMinOffset: number,
  loadedMaxOffset: number,
) {
  const start = weekStartForOffset(anchorWeekStartKey, offset)
  return {
    key: toDateKey(start),
    start,
    days: buildHomeWeekDays(
      start,
      allWorkouts,
      notesByDate,
      eventsByDate,
      weatherByDate,
    ),
    loaded: offset >= loadedMinOffset && offset <= loadedMaxOffset,
  }
}

export function HomeWeekBoard({
  primaryDays,
  weekOffset,
  onWeekOffsetChange,
  loadedMinOffset,
  loadedMaxOffset,
  loadingMore = false,
  expanded,
  onExpandedChange,
  anchorWeekStartKey,
  allWorkouts,
  notesByDate,
  eventsByDate,
  weatherByDate,
  weatherLocationName = null,
  onWorkoutMoved,
  onDayReordered,
  onNoteChange,
}: HomeWeekBoardProps) {
  const panelId = useId()

  const focusOffset = expanded
    ? homeV2SnapToExpandedPackStart(weekOffset)
    : weekOffset

  /**
   * Carousel uses a fixed 3-slot window (prev / current / next) so swiping
   * never hits a hard edge. `slideAnchor` recenters after the swipe animation
   * so index shifts don’t fight the settle transition.
   */
  const [slideAnchor, setSlideAnchor] = useState(focusOffset)
  const swipeLockRef = useRef(false)
  const settleTimerRef = useRef<number | null>(null)
  const latestFocusRef = useRef(focusOffset)
  latestFocusRef.current = focusOffset

  useEffect(() => {
    if (swipeLockRef.current) return
    setSlideAnchor(focusOffset)
  }, [focusOffset])

  useEffect(() => {
    return () => {
      if (settleTimerRef.current != null) {
        window.clearTimeout(settleTimerRef.current)
      }
    }
  }, [])

  function commitSwipeOffset(next: number) {
    if (next === focusOffset) return
    // While the 3-slot window is mid-settle, ignore extra steps (avoids a
    // broken activeIndex). Unlock is time-based so this can’t stick.
    if (swipeLockRef.current) return
    swipeLockRef.current = true
    onWeekOffsetChange(next)
    if (settleTimerRef.current != null) {
      window.clearTimeout(settleTimerRef.current)
    }
    settleTimerRef.current = window.setTimeout(() => {
      settleTimerRef.current = null
      setSlideAnchor(latestFocusRef.current)
      swipeLockRef.current = false
    }, SWIPE_SETTLE_MS)
  }

  const navStep = expanded ? HOME_V2_EXPAND_PACK_SIZE : 1

  const slideOffsets = useMemo(
    () => [slideAnchor - navStep, slideAnchor, slideAnchor + navStep],
    [slideAnchor, navStep],
  )

  // Always build the +3 trailing weeks so collapse/expand can animate height
  // without mounting new grids mid-transition.
  const displayMin = slideOffsets[0]!
  const displayMax = slideOffsets[2]! + HOME_V2_EXPAND_EXTRA_WEEKS

  const weekByOffset = useMemo(() => {
    const map = new Map<
      number,
      { key: string; start: Date; days: PlanDay[]; loaded: boolean }
    >()
    for (let offset = displayMin; offset <= displayMax; offset += 1) {
      map.set(
        offset,
        weekEntry(
          offset,
          anchorWeekStartKey,
          allWorkouts,
          notesByDate,
          eventsByDate,
          weatherByDate,
          loadedMinOffset,
          loadedMaxOffset,
        ),
      )
    }
    return map
  }, [
    displayMin,
    displayMax,
    loadedMinOffset,
    loadedMaxOffset,
    anchorWeekStartKey,
    allWorkouts,
    notesByDate,
    eventsByDate,
    weatherByDate,
  ])

  const activeIndex = Math.max(0, slideOffsets.indexOf(focusOffset))

  const focusNeedsLoad =
    focusOffset < loadedMinOffset ||
    focusOffset > loadedMaxOffset ||
    (expanded && focusOffset + HOME_V2_EXPAND_EXTRA_WEEKS > loadedMaxOffset)

  return (
    <PlanWeekDndProvider
      mode="athlete"
      onWorkoutMoved={onWorkoutMoved}
      onDayReordered={onDayReordered}
    >
      <PlanWeekDndErrorBanner className="mb-2" />
      <V2WeekBoard className="relative pb-0">
        <div className="md:hidden">
          <HomeWeekGrid
            days={primaryDays}
            surface="mobile"
            weatherLocationName={weatherLocationName}
            onNoteChange={onNoteChange}
          />
        </div>

        <div className="relative hidden md:block">
          <WeekSwipePane
            active={activeIndex}
            count={slideOffsets.length}
            onActiveChange={(index) => {
              const next = slideOffsets[index]
              if (next == null) return
              commitSwipeOffset(next)
            }}
            grabCursor={false}
            wheelSwipe
            fitActiveHeight
            className="tt-v2-week-swipe"
          >
            {slideOffsets.map((startOffset, i) => {
              const primary = weekByOffset.get(startOffset)
              if (!primary) return null
              const packNeedsLoad =
                startOffset < loadedMinOffset ||
                startOffset + HOME_V2_EXPAND_EXTRA_WEEKS > loadedMaxOffset
              return (
                <WeekSwipeSlide
                  key={primary.key}
                  active={i === activeIndex}
                >
                  <div
                    id={i === activeIndex ? panelId : undefined}
                    className="relative flex flex-col"
                  >
                    <WeekLoadingOverlay
                      show={
                        i === activeIndex &&
                        (!primary.loaded ||
                          (loadingMore && focusNeedsLoad) ||
                          (expanded && packNeedsLoad && loadingMore))
                      }
                    />
                    <HomeWeekGrid
                      days={primary.days}
                      surface="desktop"
                      weatherLocationName={weatherLocationName}
                      onNoteChange={onNoteChange}
                    />
                    <div
                      className="tt-v2-week-expand"
                      data-open={expanded ? 'true' : undefined}
                    >
                      <div className="tt-v2-week-expand-inner">
                        {Array.from(
                          { length: HOME_V2_EXPAND_EXTRA_WEEKS },
                          (_, j) => {
                            const offset = startOffset + j + 1
                            const week = weekByOffset.get(offset)
                            if (!week) return null
                            return (
                              <div key={week.key} className="tt-v2-week-extra">
                                <HomeWeekGrid
                                  days={week.days}
                                  weekLabel={formatWeekRangeLabel(week.start)}
                                  surface="desktop"
                                  weatherLocationName={weatherLocationName}
                                  onNoteChange={onNoteChange}
                                />
                              </div>
                            )
                          },
                        )}
                      </div>
                    </div>
                  </div>
                </WeekSwipeSlide>
              )
            })}
          </WeekSwipePane>

          <button
            type="button"
            className={cn('tt-v2-week-expand-toggle')}
            data-open={expanded ? 'true' : undefined}
            aria-expanded={expanded}
            aria-controls={panelId}
            onClick={() => onExpandedChange(!expanded)}
          >
            <ChevronDown className="h-4 w-4" strokeWidth={2} aria-hidden />
            <span>
              {expanded
                ? 'Show less'
                : `Show ${HOME_V2_EXPAND_EXTRA_WEEKS} more weeks`}
            </span>
          </button>
        </div>
      </V2WeekBoard>
    </PlanWeekDndProvider>
  )
}
