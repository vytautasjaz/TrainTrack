/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type DragEvent,
  type RefObject,
  type UIEvent,
} from 'react'
import { useRouter } from 'next/navigation'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  Activity,
  CalendarDays,
  ChartColumn,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Columns2,
  Columns3,
  GripVertical,
  Link2,
  StickyNote,
  Unlink,
} from 'lucide-react'
import { WorkoutType } from '@prisma/client'
import { AthleteAvatar } from '@/components/athlete/athlete-avatar'
import { SELECT_DROPDOWN_CONTENT_CLASS } from '@/components/ui/select-dropdown'
import { WORKOUT_TYPE_COLORS, WORKOUT_TYPE_LABELS } from '@/lib/constants'
import {
  DEFAULT_PLAN_SPORT_ROWS,
  resolveCoachPlanSportRows,
} from '@/lib/plan-sports'
import {
  WORKOUT_TYPE_CELL_TINT,
  WORKOUT_TYPE_DOT_CLASS,
  WORKOUT_TYPE_ICONS,
} from '@/lib/workout-display'
import {
  compareCopyLibrarySession,
  compareCopyLibraryWeek,
  compareCopyWeek,
  compareCopyWorkout,
  getCoachCompareAthleteWeek,
  getCoachCompareLibraryWeek,
  listCoachComparePlans,
  type CoachCompareAthletePane,
  type CoachCompareLibraryPane,
  type CoachCompareRange,
} from '@/app/actions/coach-compare'
import { DayMetaNoteLines } from '@/components/plan/day-meta-lines'
import { useSessionLoadThresholds } from '@/components/plan/session-load-thresholds-context'
import { SportWeekTotalsLabel } from '@/components/plan/sport-week-totals-label'
import { WeekPlanWorkoutCard } from '@/components/plan/week-plan-workout-card'
import {
  WeekCardSizeProvider,
  useOptionalWeekCardSize,
  useWeekCardSize,
} from '@/components/plan/week-card-size-context'
import { WeekCardSizeSwitch } from '@/components/plan/week-card-size-switch'
import { FeedbackLayerToggle } from '@/components/training/feedback-layer-toggle'
import {
  CompletionLayerToggle,
  PlanSportFilterBar,
  PlanViewModeControl,
  ToolbarDivider,
  ToolbarFilterGroup,
  ToolbarTextToggle,
} from '@/components/training/plan-sport-filter-bar'
import { useOptionalPlanSportFilter } from '@/components/training/plan-sport-filter-context'
import { CalendarWeekStatsCell } from '@/components/training/calendar-week-stats-cell'
import { useFilteredPlanDays } from '@/components/training/use-plan-sport-filter-data'
import {
  readStoredFlag,
  SHOW_NOTES_STORAGE_KEY,
  SHOW_STATS_STORAGE_KEY,
  writeStoredFlag,
} from '@/lib/plan-calendar-layers'
import { dayNoteHasVisibleContent } from '@/lib/day-notes'
import { Button } from '@/components/ui/button'
import { FormError } from '@/components/ui/form-error'
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@/components/ui/segmented-control'
import {
  addDateOnlyDays,
  addDateOnlyMonths,
  parseDateOnly,
  startOfMonthDateOnly,
  startOfWeekDateOnly,
  toDateKey,
  todayDateOnly,
} from '@/lib/dates'
import { filterPlanSportRows } from '@/lib/plan-sport-filter'
import type { PlanDay } from '@/lib/plan-week'
import {
  sumSportWeekTotals,
  sumWeekDurationMinutes,
} from '@/lib/plan-week-totals'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import {
  weekSessionLoadActual,
  weekSessionLoadPlanned,
} from '@/lib/training-load/session-tss'
import { WEEK_CARD_SIZE_STORAGE_KEY } from '@/lib/week-card-size'
import { isCloneablePlanWorkout } from '@/lib/workout-clone'
import { cn, formatDuration } from '@/lib/utils'

type AthleteOption = { id: string; name: string; avatarUrl?: string | null }
type PlanOption = { id: string; title: string; weekCount: number }

type PaneSource =
  | { kind: 'athlete'; athleteId: string }
  | { kind: 'library'; planId: string; weekIndex: number }

type DragPayload =
  | {
      kind: 'workout'
      workoutId: string
      sourceAthleteId: string
      sport: string
    }
  | {
      kind: 'week'
      sourceAthleteId: string
      sourceWeekStartKey: string
    }
  | {
      kind: 'library-session'
      planSessionId: string
      sport: string
    }
  | {
      kind: 'library-week'
      planId: string
      weekIndex: number
    }

type CoachCompareViewProps = {
  initialAthleteId: string
  initialWeekStartKey: string
  athletes: AthleteOption[]
  weekHref: string
}

type PaneState = CoachCompareAthletePane | CoachCompareLibraryPane | null

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function isWeekDragPayload(
  drag: DragPayload | null,
): drag is Extract<DragPayload, { kind: 'week' | 'library-week' }> {
  return drag?.kind === 'week' || drag?.kind === 'library-week'
}

function weekRangeLabel(weekStartKey: string) {
  const start = parseDateOnly(weekStartKey)
  const end = addDateOnlyDays(start, 6)
  const fmt = (d: Date) => {
    const key = toDateKey(d)
    const [y, m, day] = key.split('-').map(Number)
    return new Date(y, m - 1, day).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    })
  }
  return `${fmt(start)} – ${fmt(end)}`
}

/** Visible ghost so dragging a whole week is obvious. */
function attachWeekDragImage(
  e: DragEvent,
  weekStartKey: string,
  opts?: { library?: boolean },
) {
  const ghost = document.createElement('div')
  ghost.textContent = opts?.library
    ? `Copy library week · ${weekRangeLabel(weekStartKey)}`
    : `Copy week · ${weekRangeLabel(weekStartKey)}`
  ghost.style.cssText = [
    'position:fixed',
    'top:-1000px',
    'left:0',
    'z-index:9999',
    'pointer-events:none',
    'display:inline-flex',
    'align-items:center',
    'gap:0.5rem',
    'border-radius:0.5rem',
    'border:1px solid rgb(240 68 10 / 0.45)',
    'background:#111315',
    'color:#f4f6fb',
    'padding:0.55rem 0.85rem',
    'font:600 12px/1.2 Inter,system-ui,sans-serif',
    'box-shadow:0 8px 24px rgb(0 0 0 / 0.28)',
    'white-space:nowrap',
  ].join(';')
  document.body.appendChild(ghost)
  e.dataTransfer.setDragImage(ghost, 16, 16)
  e.dataTransfer.setData('text/plain', `week:${weekStartKey}`)
  requestAnimationFrame(() => {
    ghost.remove()
  })
}

function chunkWeeks(days: PlanDay[]): PlanDay[][] {
  const weeks: PlanDay[][] = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }
  return weeks
}

function formatMonthLabel(monthStartKey: string) {
  const [y, m] = monthStartKey.split('-').map(Number)
  // Local calendar date — avoids SSR/client locale + TZ hydration drift.
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  })
}

function useHasMounted() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  return mounted
}

/** SSR + first client paint use `fallback`; localStorage applies after mount. */
function useCompareLayerFlag(key: string, fallback: boolean) {
  const [value, setValue] = useState(fallback)
  useEffect(() => {
    setValue(readStoredFlag(key, fallback))
  }, [key, fallback])
  const setFlag = useCallback(
    (next: boolean | ((prev: boolean) => boolean)) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next
        writeStoredFlag(key, resolved)
        return resolved
      })
    },
    [key],
  )
  return [value, setFlag] as const
}

export function CoachCompareView({
  initialAthleteId,
  initialWeekStartKey,
  athletes,
  weekHref,
}: CoachCompareViewProps) {
  const router = useRouter()
  const [range, setRange] = useState<CoachCompareRange>('week')
  const [anchorKey, setAnchorKey] = useState(initialWeekStartKey)
  const [leftSource, setLeftSource] = useState<PaneSource>({
    kind: 'athlete',
    athleteId: initialAthleteId,
  })
  const [rightSource, setRightSource] = useState<PaneSource>(() => {
    const other = athletes.find((a) => a.id !== initialAthleteId)
    return other
      ? { kind: 'athlete', athleteId: other.id }
      : { kind: 'athlete', athleteId: initialAthleteId }
  })
  const [plans, setPlans] = useState<PlanOption[]>([])
  const [leftPane, setLeftPane] = useState<PaneState>(null)
  const [rightPane, setRightPane] = useState<PaneState>(null)
  const [drag, setDrag] = useState<DragPayload | null>(null)
  /** While dragging a whole week — which target week would receive the copy. */
  const [weekDropTarget, setWeekDropTarget] = useState<{
    athleteId: string
    weekStartKey: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  /** Linked = both panes share scroll position; unlinked = independent, with overscroll chaining. */
  const [scrollLinked, setScrollLinked] = useState(true)
  const [showStats, setShowStats] = useCompareLayerFlag(
    SHOW_STATS_STORAGE_KEY,
    false,
  )
  const [showNotes, setShowNotes] = useCompareLayerFlag(
    SHOW_NOTES_STORAGE_KEY,
    true,
  )
  const filtersReady = useHasMounted()
  const leftScrollRef = useRef<HTMLDivElement>(null)
  const rightScrollRef = useRef<HTMLDivElement>(null)
  const syncingScrollRef = useRef(false)

  const clearDrag = useCallback(() => {
    setDrag(null)
    setWeekDropTarget(null)
  }, [])

  const onWeekDropHover = useCallback(
    (athleteId: string, weekStartKey: string) => {
      if (!isWeekDragPayload(drag)) return
      setWeekDropTarget((prev) =>
        prev?.athleteId === athleteId && prev.weekStartKey === weekStartKey
          ? prev
          : { athleteId, weekStartKey },
      )
    },
    [drag],
  )

  const mirrorScroll = useCallback(
    (source: 'left' | 'right') => {
      if (!scrollLinked || syncingScrollRef.current) return
      const from =
        source === 'left' ? leftScrollRef.current : rightScrollRef.current
      const to =
        source === 'left' ? rightScrollRef.current : leftScrollRef.current
      if (!from || !to) return
      syncingScrollRef.current = true
      to.scrollTop = from.scrollTop
      to.scrollLeft = from.scrollLeft
      requestAnimationFrame(() => {
        syncingScrollRef.current = false
      })
    },
    [scrollLinked],
  )

  const chainOverscroll = useCallback(
    (source: 'left' | 'right', deltaY: number) => {
      if (scrollLinked || deltaY === 0) return false
      const from =
        source === 'left' ? leftScrollRef.current : rightScrollRef.current
      const to =
        source === 'left' ? rightScrollRef.current : leftScrollRef.current
      if (!from || !to) return false
      const maxFrom = Math.max(0, from.scrollHeight - from.clientHeight)
      const atTop = from.scrollTop <= 0
      const atBottom = from.scrollTop >= maxFrom - 1
      if ((deltaY < 0 && atTop) || (deltaY > 0 && atBottom)) {
        to.scrollTop += deltaY
        return true
      }
      return false
    },
    [scrollLinked],
  )

  useEffect(() => {
    if (!scrollLinked) return
    const left = leftScrollRef.current
    const right = rightScrollRef.current
    if (!left || !right) return
    syncingScrollRef.current = true
    right.scrollTop = left.scrollTop
    right.scrollLeft = left.scrollLeft
    requestAnimationFrame(() => {
      syncingScrollRef.current = false
    })
  }, [scrollLinked])

  useEffect(() => {
    leftScrollRef.current && (leftScrollRef.current.scrollTop = 0)
    rightScrollRef.current && (rightScrollRef.current.scrollTop = 0)
  }, [anchorKey, range])

  useCompareLinkedDayHeights({
    enabled: scrollLinked,
    leftRoot: leftScrollRef,
    rightRoot: rightScrollRef,
    deps: [leftPane, rightPane, range, anchorKey, pending, showStats, showNotes],
  })

  /** Month: pin the current week to the top of each pane after layout. */
  useEffect(() => {
    if (range !== 'month' || !leftPane || !rightPane) return
    const currentWeekKey = toDateKey(startOfWeekDateOnly(todayDateOnly()))

    function scrollWeekToTop(root: HTMLDivElement | null) {
      if (!root) return
      const row = root.querySelector<HTMLElement>(
        `[data-compare-align="week:${currentWeekKey}"]`,
      )
      if (!row) return
      const rootRect = root.getBoundingClientRect()
      const rowRect = row.getBoundingClientRect()
      root.scrollTop += rowRect.top - rootRect.top - 4
    }

    const id = window.requestAnimationFrame(() => {
      scrollWeekToTop(leftScrollRef.current)
      if (scrollLinked) {
        const left = leftScrollRef.current
        const right = rightScrollRef.current
        if (left && right) right.scrollTop = left.scrollTop
      } else {
        scrollWeekToTop(rightScrollRef.current)
      }
    })
    return () => window.cancelAnimationFrame(id)
  }, [range, leftPane, rightPane, anchorKey, scrollLinked, pending])

  useEffect(() => {
    void listCoachComparePlans().then(setPlans)
  }, [])

  const loadPane = useCallback(
    async (source: PaneSource): Promise<PaneState> => {
      if (source.kind === 'athlete') {
        return getCoachCompareAthleteWeek({
          athleteId: source.athleteId,
          weekStartKey: anchorKey,
          range,
        })
      }
      return getCoachCompareLibraryWeek({
        planId: source.planId,
        weekStartKey: anchorKey,
        weekIndex: source.weekIndex,
        range,
      })
    },
    [anchorKey, range],
  )

  useEffect(() => {
    let cancelled = false
    void Promise.all([loadPane(leftSource), loadPane(rightSource)]).then(
      ([left, right]) => {
        if (cancelled) return
        setLeftPane(left)
        setRightPane(right)
      },
    )
    return () => {
      cancelled = true
    }
  }, [leftSource, rightSource, loadPane])

  function shiftRange(delta: number) {
    if (range === 'month') {
      const next = addDateOnlyMonths(startOfMonthDateOnly(parseDateOnly(anchorKey)), delta)
      setAnchorKey(toDateKey(startOfWeekDateOnly(next)))
      return
    }
    setAnchorKey(toDateKey(addDateOnlyDays(parseDateOnly(anchorKey), delta * 7)))
  }

  function refreshPanes() {
    startTransition(async () => {
      const [left, right] = await Promise.all([
        loadPane(leftSource),
        loadPane(rightSource),
      ])
      setLeftPane(left)
      setRightPane(right)
      router.refresh()
    })
  }

  function runCopy(action: () => Promise<void>) {
    setError(null)
    startTransition(async () => {
      try {
        await action()
        setDrag(null)
        refreshPanes()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not copy')
      }
    })
  }

  function onDropToAthlete(
    targetAthleteId: string,
    targetWeekStartKey: string,
    dateKey: string,
  ) {
    if (!drag) return
    if (drag.kind === 'workout') {
      if (drag.sourceAthleteId === targetAthleteId) return
      runCopy(() =>
        compareCopyWorkout({
          workoutId: drag.workoutId,
          targetAthleteId,
          dateKey,
        }),
      )
      return
    }
    if (drag.kind === 'week') {
      if (drag.sourceAthleteId === targetAthleteId) return
      runCopy(() =>
        compareCopyWeek({
          sourceAthleteId: drag.sourceAthleteId,
          sourceWeekStartKey: drag.sourceWeekStartKey,
          targetAthleteId,
          targetWeekStartKey,
        }),
      )
      return
    }
    if (drag.kind === 'library-session') {
      runCopy(() =>
        compareCopyLibrarySession({
          planSessionId: drag.planSessionId,
          targetAthleteId,
          dateKey,
        }),
      )
      return
    }
    if (drag.kind === 'library-week') {
      runCopy(() =>
        compareCopyLibraryWeek({
          planId: drag.planId,
          weekIndex: drag.weekIndex,
          targetAthleteId,
          targetWeekStartKey,
        }),
      )
    }
  }

  const periodLabel = useMemo(() => {
    const pane = leftPane ?? rightPane
    if (!pane) return anchorKey
    if (range === 'month') return formatMonthLabel(pane.monthStartKey)
    const start = parseDateOnly(pane.weekStartKey)
    const end = addDateOnlyDays(start, 6)
    return `${toDateKey(start)} → ${toDateKey(end)}`
  }, [anchorKey, leftPane, range, rightPane])

  return (
    <WeekCardSizeProvider storageKey={WEEK_CARD_SIZE_STORAGE_KEY}>
      <div className="tt-coach-compare space-y-4">
        <div className="tt-coach-compare-chrome space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Columns2 className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">Compare plans</p>
              <SegmentedControl aria-label="Compare range" className="h-8">
                <SegmentedControlItem
                  active={range === 'week'}
                  onClick={() => setRange('week')}
                  className="gap-1.5 px-2.5 text-xs"
                >
                  <Columns3 className="h-3.5 w-3.5" aria-hidden />
                  Week
                </SegmentedControlItem>
                <SegmentedControlItem
                  active={range === 'month'}
                  onClick={() => setRange('month')}
                  className="gap-1.5 px-2.5 text-xs"
                >
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                  Month
                </SegmentedControlItem>
              </SegmentedControl>
              <Button
                type="button"
                variant={scrollLinked ? 'secondary' : 'ghost'}
                size="sm"
                className="gap-1.5"
                aria-pressed={scrollLinked}
                title={
                  scrollLinked
                    ? 'Scroll linked — both panes move together'
                    : 'Scroll unlinked — each pane scrolls alone; overscroll moves the other'
                }
                onClick={() => setScrollLinked((v) => !v)}
              >
                {scrollLinked ? (
                  <Link2 className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <Unlink className="h-3.5 w-3.5" aria-hidden />
                )}
                {scrollLinked ? 'Linked' : 'Unlinked'}
              </Button>
              <Button asChild variant="ghost" size="sm">
                <a href={weekHref}>Exit</a>
              </Button>
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={
                  range === 'month' ? 'Previous month' : 'Previous week'
                }
                onClick={() => shiftRange(-1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[9rem] text-center text-sm tabular-nums">
                {periodLabel}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={range === 'month' ? 'Next month' : 'Next week'}
                onClick={() => shiftRange(1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <CompareFilterToolbar
            ready={filtersReady}
            showStats={showStats}
            onToggleStats={() => setShowStats((v) => !v)}
            showNotes={showNotes}
            onToggleNotes={() => setShowNotes((v) => !v)}
          />
        </div>

        <FormError message={error} />
        {pending ? (
          <p className="text-xs text-muted-foreground">Updating…</p>
        ) : null}

        <div
          className={cn(
            'grid gap-3 lg:gap-4 2xl:gap-5',
            'grid-cols-1',
            'lg:grid-cols-2',
            'lg:items-stretch',
            'h-[min(72vh,54rem)]',
            '2xl:h-[min(80vh,60rem)]',
            'min-h-[28rem]',
          )}
        >
          <ComparePane
            label="Left"
            source={leftSource}
            pane={leftPane}
            range={range}
            athletes={athletes}
            plans={plans}
            onSourceChange={setLeftSource}
            drag={drag}
            setDrag={setDrag}
            clearDrag={clearDrag}
            weekDropTarget={weekDropTarget}
            onWeekDropHover={onWeekDropHover}
            onDropToAthlete={onDropToAthlete}
            scrollRef={leftScrollRef}
            onScroll={() => mirrorScroll('left')}
            onWheelChain={(deltaY) => chainOverscroll('left', deltaY)}
            showStats={showStats}
            showNotes={showNotes}
            menusReady={filtersReady}
          />
          <ComparePane
            label="Right"
            source={rightSource}
            pane={rightPane}
            range={range}
            athletes={athletes}
            plans={plans}
            onSourceChange={setRightSource}
            drag={drag}
            setDrag={setDrag}
            clearDrag={clearDrag}
            weekDropTarget={weekDropTarget}
            onWeekDropHover={onWeekDropHover}
            onDropToAthlete={onDropToAthlete}
            scrollRef={rightScrollRef}
            onScroll={() => mirrorScroll('right')}
            onWheelChain={(deltaY) => chainOverscroll('right', deltaY)}
            showStats={showStats}
            showNotes={showNotes}
            menusReady={filtersReady}
          />
        </div>
      </div>
    </WeekCardSizeProvider>
  )
}

function CompareCardSizeControl() {
  const { cardSize, setCardSize } = useWeekCardSize()
  return <WeekCardSizeSwitch value={cardSize} onChange={setCardSize} />
}

function CompareFilterToolbar({
  ready,
  showStats,
  onToggleStats,
  showNotes,
  onToggleNotes,
}: {
  ready: boolean
  showStats: boolean
  onToggleStats: () => void
  showNotes: boolean
  onToggleNotes: () => void
}) {
  return (
    <div className="flex min-w-0 max-w-full flex-wrap items-end gap-2">
      <ToolbarFilterGroup
        label="Filter"
        hint="Show or hide sports and workout statuses"
      >
        {ready ? (
          <PlanSportFilterBar className="shrink-0" />
        ) : (
          <div className="flex h-7 items-center gap-0.5 px-1.5 text-xs text-muted-foreground">
            Sports · Status
          </div>
        )}
      </ToolbarFilterGroup>
      <ToolbarDivider className="mb-1.5 mx-0.5" />
      <ToolbarFilterGroup
        label="Layers"
        hint="Toggle Notes, weekly sport stats, and Feedback on cards"
      >
        <div className="flex shrink-0 flex-wrap items-center gap-0.5">
          <ToolbarTextToggle
            pressed={showNotes}
            onClick={onToggleNotes}
            title={showNotes ? 'Hide day notes' : 'Show day notes'}
          >
            <StickyNote className="h-3 w-3" aria-hidden />
            Notes
          </ToolbarTextToggle>
          <ToolbarTextToggle
            pressed={showStats}
            onClick={onToggleStats}
            title={
              showStats ? 'Hide weekly sport stats' : 'Show weekly sport stats'
            }
          >
            <ChartColumn className="h-3 w-3" aria-hidden />
            Stats
          </ToolbarTextToggle>
          {ready ? <FeedbackLayerToggle /> : null}
        </div>
      </ToolbarFilterGroup>
      <ToolbarDivider className="mb-1.5 mx-0.5" />
      <ToolbarFilterGroup
        label="View"
        hint="Card color (Color / Plain) and completion status layer"
      >
        {ready ? (
          <div className="flex shrink-0 items-center gap-0.5">
            <PlanViewModeControl className="shrink-0" />
            <ToolbarDivider className="mx-0.5" />
            <CompletionLayerToggle />
          </div>
        ) : (
          <div className="h-7 w-28" aria-hidden />
        )}
      </ToolbarFilterGroup>
      <ToolbarDivider className="mb-1.5 mx-0.5" />
      <ToolbarFilterGroup label="Cards" hint="Workout card density">
        {ready ? <CompareCardSizeControl /> : <div className="h-7 w-20" aria-hidden />}
      </ToolbarFilterGroup>
    </div>
  )
}

/** When Linked, matching days/weeks share max height so weeks line up while scrolling. */
function useCompareLinkedDayHeights({
  enabled,
  leftRoot,
  rightRoot,
  deps,
}: {
  enabled: boolean
  leftRoot: RefObject<HTMLDivElement | null>
  rightRoot: RefObject<HTMLDivElement | null>
  deps: unknown[]
}) {
  useLayoutEffect(() => {
    const left = leftRoot.current
    const right = rightRoot.current
    if (!left || !right) return

    const roots = [left, right]
    let applying = false
    let raf = 0

    function collect() {
      const entries: { el: HTMLElement; key: string }[] = []
      for (const root of roots) {
        root
          .querySelectorAll<HTMLElement>('[data-compare-align]')
          .forEach((el) => {
            const key = el.dataset.compareAlign
            if (key) entries.push({ el, key })
          })
      }
      return entries
    }

    function clearHeights(entries = collect()) {
      for (const { el } of entries) el.style.minHeight = ''
    }

    function syncHeights() {
      if (applying) return
      applying = true

      const entries = collect()
      // Cells/rows first, then outer week bands.
      const cellEntries = entries.filter(
        ({ key }) => key.startsWith('day:') || key.startsWith('sport:'),
      )
      const weekEntries = entries.filter(({ key }) => key.startsWith('week:'))

      function applyMax(group: { el: HTMLElement; key: string }[]) {
        for (const { el } of group) el.style.minHeight = ''
        void roots[0].offsetHeight
        const maxByKey = new Map<string, number>()
        for (const { el, key } of group) {
          maxByKey.set(key, Math.max(maxByKey.get(key) ?? 0, el.offsetHeight))
        }
        for (const { el, key } of group) {
          const h = maxByKey.get(key) ?? 0
          const next = h > 0 ? `${h}px` : ''
          if (el.style.minHeight !== next) el.style.minHeight = next
        }
      }

      applyMax(cellEntries)
      applyMax(weekEntries)

      raf = window.requestAnimationFrame(() => {
        applying = false
      })
    }

    if (!enabled) {
      clearHeights()
      return
    }

    syncHeights()

    const ro = new ResizeObserver(() => {
      if (applying) return
      syncHeights()
    })
    for (const root of roots) ro.observe(root)

    return () => {
      window.cancelAnimationFrame(raf)
      ro.disconnect()
      clearHeights()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps passed explicitly from caller
  }, [enabled, leftRoot, rightRoot, ...deps])
}

function CompareAthletePicker({
  athletes,
  selectedId,
  onSelect,
  menusReady = true,
}: {
  athletes: AthleteOption[]
  selectedId: string
  onSelect: (id: string) => void
  menusReady?: boolean
}) {
  const selected =
    athletes.find((a) => a.id === selectedId) ?? athletes[0] ?? null
  if (!selected) return null

  const triggerClass = cn(
    'group inline-flex h-9 min-w-0 flex-1 items-center gap-2.5 rounded-md border border-border bg-background px-2 text-left text-sm outline-none',
    'hover:bg-foreground/[0.03] focus-visible:ring-2 focus-visible:ring-brand/30',
  )

  if (!menusReady) {
    return (
      <div className={triggerClass} aria-label="Select athlete">
        <AthleteAvatar
          name={selected.name}
          avatarUrl={selected.avatarUrl}
          size="sm"
          className="h-7 w-7"
        />
        <span className="min-w-0 flex-1 truncate font-medium text-foreground">
          {selected.name}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </div>
    )
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger aria-label="Select athlete" className={triggerClass}>
        <AthleteAvatar
          name={selected.name}
          avatarUrl={selected.avatarUrl}
          size="sm"
          className="h-7 w-7"
        />
        <span className="min-w-0 flex-1 truncate font-medium text-foreground">
          {selected.name}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition group-data-[state=open]:rotate-180" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className={cn(SELECT_DROPDOWN_CONTENT_CLASS, 'min-w-[14rem]')}
        >
          {athletes.map((athlete) => {
            const active = athlete.id === selected.id
            return (
              <DropdownMenu.Item
                key={athlete.id}
                onSelect={() => onSelect(athlete.id)}
                className={cn(
                  'relative flex cursor-pointer select-none items-center gap-2.5 px-3 py-2 text-sm outline-none',
                  'data-[highlighted]:bg-foreground/[0.04]',
                  active && 'font-semibold',
                )}
              >
                <AthleteAvatar
                  name={athlete.name}
                  avatarUrl={athlete.avatarUrl}
                  size="sm"
                />
                <span className="min-w-0 flex-1 truncate">{athlete.name}</span>
                {active ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-brand" />
                ) : (
                  <span className="w-3.5 shrink-0" />
                )}
              </DropdownMenu.Item>
            )
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

function ComparePane({
  label,
  source,
  pane,
  range,
  athletes,
  plans,
  onSourceChange,
  drag,
  setDrag,
  clearDrag,
  weekDropTarget,
  onWeekDropHover,
  onDropToAthlete,
  scrollRef,
  onScroll,
  onWheelChain,
  showStats,
  showNotes,
  menusReady,
}: {
  label: string
  source: PaneSource
  pane: PaneState
  range: CoachCompareRange
  athletes: AthleteOption[]
  plans: PlanOption[]
  onSourceChange: (source: PaneSource) => void
  drag: DragPayload | null
  setDrag: (drag: DragPayload | null) => void
  clearDrag: () => void
  weekDropTarget: { athleteId: string; weekStartKey: string } | null
  onWeekDropHover: (athleteId: string, weekStartKey: string) => void
  onDropToAthlete: (
    targetAthleteId: string,
    targetWeekStartKey: string,
    dateKey: string,
  ) => void
  scrollRef: RefObject<HTMLDivElement | null>
  onScroll: () => void
  onWheelChain: (deltaY: number) => boolean
  showStats: boolean
  showNotes: boolean
  menusReady: boolean
}) {
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    function onWheel(e: WheelEvent) {
      if (onWheelChain(e.deltaY)) {
        e.preventDefault()
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [onWheelChain, scrollRef])

  const isLibrary = source.kind === 'library'
  const athleteId = source.kind === 'athlete' ? source.athleteId : null
  const canReceive =
    Boolean(athleteId) &&
    Boolean(drag) &&
    (drag?.kind === 'library-session' ||
      drag?.kind === 'library-week' ||
      (drag?.kind === 'workout' && drag.sourceAthleteId !== athleteId) ||
      (drag?.kind === 'week' && drag.sourceAthleteId !== athleteId))

  const filteredDays = useFilteredPlanDays(pane?.days ?? [])
  const weeks = useMemo(() => chunkWeeks(filteredDays), [filteredDays])

  function onSourceKindChange(kind: 'athlete' | 'library') {
    if (kind === 'athlete') {
      onSourceChange({
        kind: 'athlete',
        athleteId: athletes[0]?.id ?? '',
      })
      return
    }
    const plan = plans[0]
    if (!plan) return
    onSourceChange({ kind: 'library', planId: plan.id, weekIndex: 0 })
  }

  function startWeekDrag(e: DragEvent, weekDays: PlanDay[]) {
    const weekStartKey = weekDays[0]?.dateKey
    if (!weekStartKey || !pane) return
    if (pane.kind === 'athlete') {
      setDrag({
        kind: 'week',
        sourceAthleteId: pane.athleteId,
        sourceWeekStartKey: weekStartKey,
      })
      attachWeekDragImage(e, weekStartKey)
      return
    }
    const offset = Math.max(
      0,
      Math.round(
        (parseDateOnly(weekStartKey).getTime() -
          parseDateOnly(pane.weekStartKey).getTime()) /
          (7 * 24 * 60 * 60 * 1000),
      ),
    )
    setDrag({
      kind: 'library-week',
      planId: pane.planId,
      weekIndex: pane.weekIndex + offset,
    })
    attachWeekDragImage(e, weekStartKey, { library: true })
  }

  const draggingWholeWeek = isWeekDragPayload(drag)
  const isSourceWeek = (weekStartKey: string) =>
    (drag?.kind === 'week' &&
      pane?.kind === 'athlete' &&
      drag.sourceAthleteId === pane.athleteId &&
      drag.sourceWeekStartKey === weekStartKey) ||
    (drag?.kind === 'library-week' &&
      pane?.kind === 'library' &&
      // Approximate: library week row being dragged
      weekStartKey === pane.weekStartKey)

  const isWeekDropTarget = (weekStartKey: string) =>
    Boolean(
      athleteId &&
        weekDropTarget?.athleteId === athleteId &&
        weekDropTarget.weekStartKey === weekStartKey,
    )

  const selectedAthlete =
    source.kind === 'athlete'
      ? athletes.find((a) => a.id === source.athleteId) ?? athletes[0]
      : null

  function handleScroll(_e: UIEvent<HTMLDivElement>) {
    onScroll()
  }

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col rounded-xl border border-border bg-card">
      <header className="shrink-0 space-y-2 border-b border-border/60 px-3 py-3 sm:px-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
          <select
            className="h-8 rounded-md border border-border bg-background px-2 text-sm"
            value={source.kind}
            onChange={(e) =>
              onSourceKindChange(e.target.value as 'athlete' | 'library')
            }
          >
            <option value="athlete">Athlete</option>
            <option value="library" disabled={plans.length === 0}>
              Library plan
            </option>
          </select>
          {source.kind === 'athlete' && selectedAthlete ? (
            <CompareAthletePicker
              athletes={athletes}
              selectedId={selectedAthlete.id}
              menusReady={menusReady}
              onSelect={(id) =>
                onSourceChange({ kind: 'athlete', athleteId: id })
              }
            />
          ) : source.kind === 'library' ? (
            <>
              <select
                className="h-8 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-sm"
                value={source.planId}
                onChange={(e) =>
                  onSourceChange({
                    kind: 'library',
                    planId: e.target.value,
                    weekIndex: 0,
                  })
                }
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
              <select
                className="h-8 rounded-md border border-border bg-background px-2 text-sm"
                value={source.weekIndex}
                onChange={(e) =>
                  onSourceChange({
                    ...source,
                    weekIndex: Number(e.target.value),
                  })
                }
                title={
                  range === 'month'
                    ? 'Library week that aligns to the first week of this month'
                    : 'Library week'
                }
              >
                {Array.from(
                  {
                    length:
                      plans.find((p) => p.id === source.planId)?.weekCount ?? 1,
                  },
                  (_, i) => (
                    <option key={i} value={i}>
                      W{i + 1}
                    </option>
                  ),
                )}
              </select>
            </>
          ) : null}
        </div>
      </header>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 overflow-auto overscroll-y-contain p-2 sm:p-3 lg:p-4"
      >
        {!pane ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : range === 'week' ? (
          <CompareWeekBoard
            days={filteredDays}
            isLibrary={isLibrary}
            athleteId={athleteId}
            canReceive={canReceive}
            setDrag={setDrag}
            clearDrag={clearDrag}
            startWeekDrag={startWeekDrag}
            onDropToAthlete={onDropToAthlete}
            onWeekDropHover={onWeekDropHover}
            pane={pane}
            showStats={showStats}
            showNotes={showNotes}
            draggingWholeWeek={draggingWholeWeek}
            isDropTarget={isWeekDropTarget(
              filteredDays[0]?.dateKey ?? pane.weekStartKey,
            )}
            isDragSource={isSourceWeek(
              filteredDays[0]?.dateKey ?? pane.weekStartKey,
            )}
          />
        ) : (
          <div className="space-y-1.5 xl:space-y-2">
            <div
              className={cn(
                'grid gap-1 xl:gap-1.5',
                showStats
                  ? 'grid-cols-[1.25rem_minmax(10.5rem,12.5rem)_repeat(7,minmax(0,1fr))] xl:grid-cols-[1.5rem_minmax(11.5rem,13.5rem)_repeat(7,minmax(0,1fr))]'
                  : 'grid-cols-[1.25rem_repeat(7,minmax(0,1fr))] xl:grid-cols-[1.5rem_repeat(7,minmax(0,1fr))]',
              )}
            >
              <div aria-hidden />
              {showStats ? (
                <div className="px-0.5 py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground xl:text-[11px]">
                  Stats
                </div>
              ) : null}
              {DAY_HEADERS.map((h) => (
                <div
                  key={h}
                  className="px-0.5 py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground xl:text-[11px]"
                >
                  {h}
                </div>
              ))}
            </div>

            {weeks.map((weekDays) => {
              const weekStartKey = weekDays[0]?.dateKey ?? 'week'
              const workoutsByDate = new Map(
                weekDays.map((d) => [d.dateKey, d.workouts] as const),
              )
              const dropTarget = isWeekDropTarget(weekStartKey)
              const dragSource = isSourceWeek(weekStartKey)
              return (
                <div
                  key={weekStartKey}
                  data-compare-align={`week:${weekStartKey}`}
                  className={cn(
                    'relative grid gap-1 rounded-md xl:gap-1.5',
                    showStats
                      ? 'grid-cols-[1.25rem_minmax(10.5rem,12.5rem)_repeat(7,minmax(0,1fr))] xl:grid-cols-[1.5rem_minmax(11.5rem,13.5rem)_repeat(7,minmax(0,1fr))]'
                      : 'grid-cols-[1.25rem_repeat(7,minmax(0,1fr))] xl:grid-cols-[1.5rem_repeat(7,minmax(0,1fr))]',
                    dragSource && 'opacity-55 ring-1 ring-dashed ring-brand/40',
                    dropTarget &&
                      'bg-brand/[0.07] ring-2 ring-brand/55 ring-offset-1 ring-offset-background',
                  )}
                >
                  {dropTarget ? (
                    <div className="pointer-events-none absolute inset-x-6 top-1 z-10 flex justify-center sm:inset-x-10">
                      <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                        Apply week · {weekRangeLabel(weekStartKey)}
                      </span>
                    </div>
                  ) : null}
                  <button
                    type="button"
                    draggable
                    onDragStart={(e) => {
                      startWeekDrag(e, weekDays)
                      e.dataTransfer.effectAllowed = 'copy'
                    }}
                    onDragEnd={clearDrag}
                    className={cn(
                      'flex items-start justify-center pt-2 text-muted-foreground hover:text-foreground',
                      dragSource && 'text-brand',
                    )}
                    title="Drag this whole week onto the other athlete"
                    aria-label={`Drag week ${weekRangeLabel(weekStartKey)}`}
                  >
                    <GripVertical className="h-3.5 w-3.5" />
                  </button>
                  {showStats ? (
                    <CalendarWeekStatsCell
                      weekDays={weekDays}
                      workoutsByDate={workoutsByDate}
                      planSportRows={compareWeekSportRows(weekDays)}
                      className="min-h-[5rem] min-w-0 overflow-visible rounded-md border border-border/50 bg-muted/20 !p-2"
                    />
                  ) : null}
                  {weekDays.map((day) => (
                    <DayDropCell
                      key={day.dateKey}
                      day={day}
                      variant="month"
                      isLibrary={isLibrary}
                      athleteId={athleteId}
                      canReceive={canReceive}
                      weekDropMode={draggingWholeWeek}
                      showNotes={showNotes}
                      dimOutsideMonth={
                        pane.monthStartKey.slice(0, 7) !==
                        day.dateKey.slice(0, 7)
                      }
                      setDrag={setDrag}
                      clearDrag={clearDrag}
                      onWeekDropHover={
                        athleteId
                          ? () => onWeekDropHover(athleteId, weekStartKey)
                          : undefined
                      }
                      onDrop={() => {
                        if (!athleteId || !pane) return
                        const dropWeekStart = toDateKey(
                          startOfWeekDateOnly(parseDateOnly(day.dateKey)),
                        )
                        onDropToAthlete(athleteId, dropWeekStart, day.dateKey)
                      }}
                    />
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

function compareWeekSportRows(days: PlanDay[]): WorkoutType[] {
  const typesInWeek = new Set(days.flatMap((d) => d.workouts.map((w) => w.type)))
  const rows = resolveCoachPlanSportRows(DEFAULT_PLAN_SPORT_ROWS, [], typesInWeek)
  if (typesInWeek.has(WorkoutType.RECOVERY) && !rows.includes(WorkoutType.RECOVERY)) {
    return [...rows, WorkoutType.RECOVERY]
  }
  return rows
}

function CompareWeekBoard({
  days,
  isLibrary,
  athleteId,
  canReceive,
  setDrag,
  clearDrag,
  startWeekDrag,
  onDropToAthlete,
  onWeekDropHover,
  pane,
  showStats,
  showNotes,
  draggingWholeWeek,
  isDropTarget,
  isDragSource,
}: {
  days: PlanDay[]
  isLibrary: boolean
  athleteId: string | null
  canReceive: boolean
  setDrag: (drag: DragPayload | null) => void
  clearDrag: () => void
  startWeekDrag: (e: DragEvent, weekDays: PlanDay[]) => void
  onDropToAthlete: (
    targetAthleteId: string,
    targetWeekStartKey: string,
    dateKey: string,
  ) => void
  onWeekDropHover: (athleteId: string, weekStartKey: string) => void
  pane: NonNullable<PaneState>
  showStats: boolean
  showNotes: boolean
  draggingWholeWeek: boolean
  isDropTarget: boolean
  isDragSource: boolean
}) {
  const weekStartKey = days[0]?.dateKey ?? pane.weekStartKey
  const loadThresholds = useSessionLoadThresholds()
  const sportFilter = useOptionalPlanSportFilter()
  const sportRows = useMemo(() => {
    const rows = compareWeekSportRows(days)
    if (!sportFilter?.visibleSportSet) return rows
    return filterPlanSportRows(rows, sportFilter.visibleSportSet)
  }, [days, sportFilter])
  const gridCols = showStats
    ? 'grid-cols-[5.75rem_repeat(7,minmax(0,1fr))] sm:grid-cols-[6.75rem_repeat(7,minmax(0,1fr))] xl:grid-cols-[7.25rem_repeat(7,minmax(0,1fr))]'
    : 'grid-cols-[2.25rem_repeat(7,minmax(0,1fr))] sm:grid-cols-[2.75rem_repeat(7,minmax(0,1fr))]'

  const weekVolume = useMemo(() => {
    if (!showStats) return null
    return sumWeekDurationMinutes(days)
  }, [days, showStats])

  const weekLoad = useMemo(() => {
    if (!showStats) return null
    const all = days.flatMap((d) => d.workouts)
    return {
      planned: weekSessionLoadPlanned(all, loadThresholds),
      actual: weekSessionLoadActual(all, loadThresholds),
    }
  }, [days, showStats, loadThresholds])

  const showVolumeFooter = Boolean(
    showStats &&
      weekVolume &&
      (weekVolume.planned > 0 || (weekLoad && weekLoad.planned > 0)),
  )
  const showNotesFooter =
    showNotes && days.some((d) => dayNoteHasVisibleContent(d.dayNote))
  const showMetaFooter = showVolumeFooter || showNotesFooter

  return (
    <div
      className={cn(
        'tt-coach-compare-week relative flex min-h-full gap-1.5',
        isDragSource && 'opacity-55',
      )}
      data-compare-align={`week:${weekStartKey}`}
    >
      <button
        type="button"
        draggable
        onDragStart={(e) => {
          startWeekDrag(e, days)
          e.dataTransfer.effectAllowed = 'copy'
        }}
        onDragEnd={clearDrag}
        className={cn(
          'flex w-5 shrink-0 items-start justify-center pt-10 text-muted-foreground hover:text-foreground',
          isDragSource && 'text-brand',
        )}
        title="Drag this whole week onto the other athlete"
        aria-label={`Drag week ${weekRangeLabel(weekStartKey)}`}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div
        className={cn(
          'relative min-h-full min-w-0 flex-1 overflow-x-auto overflow-y-visible rounded-lg border border-border bg-card',
          isDragSource && 'ring-1 ring-dashed ring-brand/40',
          isDropTarget && 'ring-2 ring-brand/60 ring-offset-2 ring-offset-background',
        )}
      >
        {isDropTarget ? (
          <div className="pointer-events-none absolute inset-x-0 top-2 z-20 flex justify-center">
            <span className="rounded-full bg-brand px-2.5 py-1 text-[11px] font-semibold text-white shadow-md">
              Apply week · {weekRangeLabel(weekStartKey)}
            </span>
          </div>
        ) : null}
        <div className={cn('grid border-b border-border/70 bg-muted/20', gridCols)}>
          <div aria-hidden className="border-r border-border/60" />
          {days.map((day, index) => {
            const weekend =
              day.date.getUTCDay() === 0 || day.date.getUTCDay() === 6
            return (
              <div
                key={day.dateKey}
                data-week-day-today={day.isToday ? '1' : undefined}
                className={cn(
                  'px-0.5 py-2 text-center sm:px-1',
                  index < days.length - 1 && 'border-r border-border/60',
                  day.isToday && 'bg-brand/[0.06]',
                  weekend && !day.isToday && 'bg-muted/30',
                )}
              >
                <div
                  className={cn(
                    'text-[11px] font-semibold leading-tight tracking-[0.04em] lg:text-xs',
                    day.isToday ? 'text-brand' : 'text-foreground',
                    weekend && !day.isToday && 'text-muted-foreground',
                  )}
                >
                  {day.dayLabel.slice(0, 3)}
                </div>
                <div
                  className={cn(
                    'mt-1 text-[10px] font-normal leading-none tabular-nums tracking-tight',
                    day.isToday ? 'text-brand' : 'text-muted-foreground',
                  )}
                >
                  {day.dateLabel}
                </div>
              </div>
            )
          })}
        </div>

        {sportRows.map((sport) => {
          const SportIcon = WORKOUT_TYPE_ICONS[sport]
          const sportIconColor = WORKOUT_TYPE_COLORS[sport]
            .replace(/bg-\S+\s*/g, '')
            .trim()
          const totals = showStats
            ? sumSportWeekTotals(days, sport)
            : null
          return (
            <div
              key={sport}
              data-compare-align={`sport:${sport}`}
              data-sport={sport}
              className={cn(
                'grid border-b border-border/60 last:border-b-0',
                gridCols,
              )}
            >
              <div
                className={cn(
                  'relative border-r border-border/60 p-0',
                  WORKOUT_TYPE_CELL_TINT[sport],
                )}
              >
                <div
                  className={cn(
                    'absolute inset-y-0 left-0 w-[3px]',
                    WORKOUT_TYPE_DOT_CLASS[sport],
                  )}
                  aria-hidden
                />
                <div
                  className={cn(
                    'flex h-full min-h-[4.5rem] flex-col justify-start gap-1 overflow-visible py-2 pl-[5px] sm:min-h-[5.5rem]',
                    showStats
                      ? 'items-stretch px-1.5 sm:px-2'
                      : 'items-center px-0.5 sm:px-1',
                  )}
                >
                  <span
                    className={cn(
                      'inline-flex gap-1',
                      sportIconColor,
                      showStats
                        ? 'items-center'
                        : 'flex-col items-center',
                    )}
                    title={WORKOUT_TYPE_LABELS[sport]}
                  >
                    <SportIcon
                      className="h-3.5 w-3.5 shrink-0"
                      strokeWidth={2.25}
                      aria-hidden
                    />
                    <span className="max-w-full truncate text-[8px] font-semibold leading-none sm:text-[9px]">
                      {WORKOUT_TYPE_LABELS[sport]}
                    </span>
                  </span>
                  {showStats && totals ? (
                    <SportWeekTotalsLabel
                      sport={sport}
                      totals={totals}
                      className="tt-week-sport-totals min-w-0 [&_div]:min-w-0 [&_div]:flex-wrap"
                    />
                  ) : null}
                </div>
              </div>
              {days.map((day, index) => {
                const weekend =
                  day.date.getUTCDay() === 0 || day.date.getUTCDay() === 6
                const sportWorkouts = day.workouts.filter((w) => w.type === sport)
                return (
                  <DayDropCell
                    key={`${sport}-${day.dateKey}`}
                    day={day}
                    workouts={sportWorkouts}
                    variant="week"
                    isLibrary={isLibrary}
                    athleteId={athleteId}
                    canReceive={canReceive}
                    weekDropMode={draggingWholeWeek}
                    dimOutsideMonth={false}
                    setDrag={setDrag}
                    clearDrag={clearDrag}
                    onWeekDropHover={
                      athleteId
                        ? () => onWeekDropHover(athleteId, weekStartKey)
                        : undefined
                    }
                    className={cn(
                      index < days.length - 1 && 'border-r border-border/50',
                      day.isToday && 'bg-brand/[0.03]',
                      weekend && !day.isToday && 'bg-muted/15',
                      isDropTarget && 'bg-brand/[0.06]',
                    )}
                    onDrop={() => {
                      if (!athleteId) return
                      onDropToAthlete(athleteId, weekStartKey, day.dateKey)
                    }}
                  />
                )
              })}
            </div>
          )
        })}

        {showMetaFooter ? (
          <div
            className={cn(
              'grid border-t border-border/70 bg-muted/15',
              gridCols,
            )}
            data-compare-align="notes-row"
          >
            <div
              className={cn(
                'flex flex-col gap-1.5 border-r border-border/60 text-[10px] text-muted-foreground',
                showVolumeFooter ? 'px-2 py-2' : 'items-center px-1 py-2',
              )}
            >
              {showVolumeFooter && weekVolume ? (
                <>
                  {weekVolume.planned > 0 ? (
                    <div className="flex min-w-0 items-center gap-1">
                      <Clock
                        className="h-3 w-3 shrink-0 opacity-70"
                        strokeWidth={2.25}
                      />
                      <span className="min-w-0 flex-1 font-semibold text-foreground">
                        Vol
                      </span>
                      <span className="shrink-0 tabular-nums">
                        {weekVolume.actual > 0 ? (
                          <>
                            <span className="font-semibold text-foreground">
                              {formatDuration(weekVolume.actual)}
                            </span>
                            {' / '}
                            {formatDuration(weekVolume.planned)}
                          </>
                        ) : (
                          formatDuration(weekVolume.planned)
                        )}
                      </span>
                    </div>
                  ) : null}
                  {weekLoad && weekLoad.planned > 0 ? (
                    <div className="flex min-w-0 items-center gap-1">
                      <Activity
                        className="h-3 w-3 shrink-0 opacity-70"
                        strokeWidth={2.25}
                      />
                      <span className="min-w-0 flex-1 font-semibold text-foreground">
                        TSS
                      </span>
                      <span className="shrink-0 tabular-nums">
                        {weekLoad.actual > 0 ? (
                          <>
                            <span className="font-semibold text-foreground">
                              {weekLoad.actual}
                            </span>
                            {' / '}
                            {weekLoad.planned}
                          </>
                        ) : (
                          weekLoad.planned
                        )}
                      </span>
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  <StickyNote
                    className="h-3.5 w-3.5 text-muted-foreground"
                    strokeWidth={2}
                    aria-hidden
                  />
                  <span className="sr-only">Notes</span>
                </>
              )}
            </div>
            {days.map((day, index) => (
              <div
                key={`note-${day.dateKey}`}
                className={cn(
                  'min-w-0 p-1 sm:p-1.5',
                  index < days.length - 1 && 'border-r border-border/50',
                  day.isToday && 'bg-brand/[0.03]',
                )}
              >
                {showNotesFooter &&
                day.dayNote &&
                dayNoteHasVisibleContent(day.dayNote) ? (
                  <DayMetaNoteLines
                    dateKey={day.dateKey}
                    note={day.dayNote}
                    isCoach
                    canEdit={Boolean(athleteId) && !isLibrary}
                  />
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function DayDropCell({
  day,
  workouts: workoutsProp,
  variant,
  isLibrary,
  athleteId,
  canReceive,
  weekDropMode = false,
  showNotes = false,
  dimOutsideMonth,
  setDrag,
  clearDrag,
  onWeekDropHover,
  onDrop,
  className,
}: {
  day: PlanDay
  workouts?: PlanWorkoutDetail[]
  variant: 'week' | 'month'
  isLibrary: boolean
  athleteId: string | null
  canReceive: boolean
  /** Whole-week drag — don't paint per-day hover; parent highlights the week. */
  weekDropMode?: boolean
  showNotes?: boolean
  dimOutsideMonth: boolean
  setDrag: (drag: DragPayload | null) => void
  clearDrag?: () => void
  onWeekDropHover?: () => void
  onDrop: () => void
  className?: string
}) {
  const [over, setOver] = useState(false)
  const workouts = workoutsProp ?? day.workouts
  const isWeek = variant === 'week'
  const cardSize =
    useOptionalWeekCardSize()?.cardSize ?? (isWeek ? 'm' : 's')

  function handleDragOver(e: DragEvent) {
    if (!canReceive) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    if (weekDropMode) {
      onWeekDropHover?.()
      return
    }
    setOver(true)
  }

  return (
    <div
      data-compare-align={isWeek ? undefined : `day:${day.dateKey}`}
      className={cn(
        'transition',
        isWeek
          ? 'flex min-h-[4.5rem] flex-col p-1 sm:min-h-[5.5rem] sm:p-1.5'
          : 'min-h-[5rem] rounded-md border border-border/50 p-1 sm:min-h-[5.75rem] xl:min-h-[6.5rem] 2xl:min-h-[7.25rem]',
        !isWeek && dimOutsideMonth && 'opacity-40',
        !isWeek && day.isToday && 'border-brand/40 bg-brand/[0.04]',
        canReceive &&
          !weekDropMode &&
          over &&
          (isWeek ? 'bg-brand/[0.08]' : 'border-brand bg-brand/[0.08]'),
        canReceive && !over && !isWeek && !weekDropMode && 'border-dashed',
        canReceive && isWeek && !weekDropMode && over && 'ring-1 ring-inset ring-brand/40',
        canReceive && weekDropMode && 'border-dashed border-brand/30',
        className,
      )}
      onDragOver={handleDragOver}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        onDrop()
      }}
    >
      {isWeek ? null : (
        <p className="mb-1 text-[10px] font-medium tabular-nums text-muted-foreground">
          {day.dateLabel}
        </p>
      )}
      <div className={cn('space-y-1', isWeek && 'space-y-1.5')}>
        {workouts.length === 0 ? null : (
          workouts.map((workout) => {
            const cloneable =
              !workout.isRace && isCloneablePlanWorkout(workout)
            return (
              <div
                key={workout.id}
                draggable={cloneable}
                onDragStart={(e) => {
                  if (!cloneable) return
                  if (isLibrary) {
                    const sessionId = workout.id.startsWith('library:')
                      ? workout.id.slice('library:'.length)
                      : workout.id
                    setDrag({
                      kind: 'library-session',
                      planSessionId: sessionId,
                      sport: workout.type,
                    })
                  } else if (athleteId) {
                    setDrag({
                      kind: 'workout',
                      workoutId: workout.id,
                      sourceAthleteId: athleteId,
                      sport: workout.type,
                    })
                  }
                  e.dataTransfer.effectAllowed = 'copy'
                }}
                onDragEnd={() => (clearDrag ? clearDrag() : setDrag(null))}
                className={cn(
                  'min-w-0',
                  cloneable && 'cursor-grab active:cursor-grabbing',
                )}
              >
                <WeekPlanWorkoutCard
                  workout={workout}
                  status={workout.status}
                  isCoach
                  size={cardSize}
                />
              </div>
            )
          })
        )}
      </div>
      {!isWeek &&
      showNotes &&
      day.dayNote &&
      dayNoteHasVisibleContent(day.dayNote) ? (
        <div className="mt-1.5 min-w-0 border-t border-border/40 pt-1.5">
          <DayMetaNoteLines
            dateKey={day.dateKey}
            note={day.dayNote}
            isCoach
            canEdit={Boolean(athleteId) && !isLibrary}
          />
        </div>
      ) : null}
    </div>
  )
}
