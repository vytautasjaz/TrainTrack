'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition, type MouseEvent, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  MoreVertical,
  Pencil,
  Trash2,
  Search,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  Plus,
  Minus,
  Lock,
  ListFilter,
} from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { RaceIntent, RacePriority, SeasonPhase } from '@prisma/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FormError } from '@/components/ui/form-error'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { DateField } from '@/components/ui/date-field'
import { Select } from '@/components/ui/select'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { SegmentedControl, SegmentedControlItem } from '@/components/ui/segmented-control'
import { PriorityBadge } from '@/components/races/priority-badge'
import { StatusPill } from '@/components/ui/status-pill'
import { AddRaceButton, AddRaceModal, WatchRaceButton } from '@/components/races/add-race-modal'
import { RaceDetailSheet } from '@/components/races/race-detail-sheet'
import { WorkoutSportIcon } from '@/components/plan/workout-sport-icon'
import { deleteRace } from '@/app/actions/workouts'
import {
  createSeasonPhaseBlock,
  deleteSeasonPhaseBlock,
  updateSeasonPhaseBlock,
} from '@/app/actions/season-phases'
import { SeasonEventDetailSheet } from '@/components/plan/season-event-detail-sheet'
import { SeasonEventModal } from '@/components/plan/season-event-modal'
import { raceOutcomeSummary, raceDistanceLabel, type SeasonRace } from '@/lib/season-races'
import { daysUntil } from '@/lib/utils'
import { WORKOUT_TYPE_DOT_CLASS } from '@/lib/workout-display'
import {
  PlannerTipMeta,
  PlannerTipRow,
  PlannerTipTitle,
  usePlannerFollowTooltip,
} from '@/components/races/season-planner/planner-follow-tooltip'
import {
  DEFAULT_PLANNER_ZOOM,
  PLANNER_PRIORITY_CARD,
  PLANNER_PRIORITY_DOT,
  PLANNER_PRIORITY_SHADOW,
  PLANNER_PRIORITY_LANES,
  PLANNER_SPORTS,
  PLANNER_SPORT_LABELS,
  PLANNER_SPORT_TINT,
  SEASON_EVENT_CARD,
  formatSeasonEventLabel,
  formatSeasonEventWhenLine,
  SEASON_PHASE_LABELS,
  buildPlannerDayColumns,
  buildPlannerScrollRange,
  buildPlannerWeekColumns,
  groupPlannerMonths,
  PLANNER_FALLBACK_GRID_PX,
  plannerColumnWidth,
  plannerLabelWidth,
  plannerScrollLeftForColumn,
  plannerScrollLeftToCenterColumn,
  plannerScrollLeftToTimeMs,
  plannerTimeMsAtGridX,
  plannerVisibleColumnCount,
  plannerZoomLevel,
  plannerZoomMaxForWidth,
  plannerZoomUnit,
  PLANNER_ZOOM_DESKTOP_MAX,
  prepWindowDaySpan,
  prepWindowForRace,
  todayDayIndex,
  todayWeekIndex,
  weekIndexForDate,
  dayIndexForDate,
  weeksUntilRace,
  type PlannerDayColumn,
  type PlannerMonthGroup,
  type PlannerSport,
  type PlannerWeekColumn,
  type PlannerZoomUnit,
  type SeasonEventData,
  type SeasonPhaseBlockData,
} from '@/lib/season-planner'
import {
  RACE_INTENT_LABELS,
  RACE_PRIORITY_LABELS,
  RACE_TYPE_LABELS,
  WORKOUT_TYPE_LABELS,
} from '@/lib/constants'
import {
  DataSortHeader,
  compareDataSort,
  nextDataSort,
  type DataSortState,
} from '@/components/ui/data-sort-header'
import { cn } from '@/lib/utils'
import {
  TABLE_HEADER,
  TABLE_HEADER_CELL_MUTED,
  TABLE_HEADER_CELL_STRONG,
  TABLE_HEADER_SUB,
  TABLE_HEADER_VLINE,
  TABLE_SHELL,
  DATA_TABLE,
  DATA_TABLE_SHELL,
  DATA_CELL_PRIMARY,
  DATA_CELL_SECONDARY,
  DATA_CELL_META,
  DATA_MOBILE_CARD,
} from '@/lib/table-styles'
import { toDateKey } from '@/lib/dates'

/** UTC weekday 0=Sun … 6=Sat — compact labels for day-zoom header. */
const PLANNER_WEEKDAY_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const

type RacesPageClientProps = {
  allPlanned: SeasonRace[]
  watching: SeasonRace[]
  phaseBlocks: SeasonPhaseBlockData[]
  seasonEvents: SeasonEventData[]
  athleteId: string
  isCoach?: boolean
}

export function RacesPageClient({
  allPlanned,
  watching,
  phaseBlocks,
  seasonEvents,
  athleteId,
  isCoach = false,
}: RacesPageClientProps) {
  const allRaces = useMemo(
    () => [...allPlanned, ...watching].sort((a, b) => a.date.getTime() - b.date.getTime()),
    [allPlanned, watching],
  )

  return (
    <div className="space-y-10">
      <SeasonPlannerView
        planned={allPlanned}
        watching={watching}
        phaseBlocks={phaseBlocks}
        seasonEvents={seasonEvents}
        athleteId={athleteId}
        isCoach={isCoach}
      />
      <AllRacesTable races={allRaces} athleteId={athleteId} isCoach={isCoach} />
    </div>
  )
}

const SEASON_CTA_CLASS = 'tt-season-cta'

type LaneMode = 'priority' | 'sport'

function SeasonPlannerView({
  planned,
  watching,
  phaseBlocks,
  seasonEvents,
  athleteId,
  isCoach,
}: {
  planned: SeasonRace[]
  watching: SeasonRace[]
  phaseBlocks: SeasonPhaseBlockData[]
  seasonEvents: SeasonEventData[]
  athleteId: string
  isCoach: boolean
}) {
  const router = useRouter()
  const today = useMemo(() => new Date(), [])
  const [zoom, setZoom] = useState(DEFAULT_PLANNER_ZOOM)
  const [laneMode, setLaneMode] = useState<LaneMode>('priority')
  const [priorityFilter, setPriorityFilter] = useState<Record<RacePriority, boolean>>({
    A: true,
    B: true,
    C: true,
  })
  const [showWatching, setShowWatching] = useState(true)
  const [showEvents, setShowEvents] = useState(true)
  const [sportFilter, setSportFilter] = useState<Record<PlannerSport, boolean>>(() =>
    Object.fromEntries(PLANNER_SPORTS.map((s) => [s, true])) as Record<PlannerSport, boolean>,
  )
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [phaseModal, setPhaseModal] = useState<
    | { mode: 'create'; sport: PlannerSport }
    | { mode: 'edit'; block: SeasonPhaseBlockData }
    | null
  >(null)
  const [eventCreateOpen, setEventCreateOpen] = useState(false)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [addRaceOpen, setAddRaceOpen] = useState(false)

  const weeks = useMemo(() => {
    const { start, end } = buildPlannerScrollRange(today)
    return buildPlannerWeekColumns(start, end)
  }, [today])
  const days = useMemo(() => {
    const { start, end } = buildPlannerScrollRange(today)
    return buildPlannerDayColumns(start, end)
  }, [today])
  const unit = plannerZoomUnit(zoom)
  const scale = useMemo(
    () => buildPlannerBoardScale({ weeks, days, unit, today }),
    [weeks, days, unit, today],
  )
  const { labelW, colW, layoutReady } = usePlannerLayout(zoom)
  const viewportColumns = plannerVisibleColumnCount(zoom)
  const didInitialScrollRef = useRef(false)
  const zoomAnchorRef = useRef<{ timeMs: number; ratio: number; zoom: number } | null>(
    null,
  )

  function captureZoomAnchor(nextZoom: number) {
    const el = document.getElementById('season-planner-scroller')
    if (!el || colW <= 0) return
    const columns = unit === 'day' ? days : weeks
    const visibleGrid = Math.max(1, el.clientWidth - labelW)
    const ratio = 0.5
    const gridFocusX = el.scrollLeft + visibleGrid * ratio
    zoomAnchorRef.current = {
      timeMs: plannerTimeMsAtGridX(columns, colW, gridFocusX, unit),
      ratio,
      zoom: nextZoom,
    }
  }

  function handleZoomChange(next: number) {
    if (next === zoom) return
    captureZoomAnchor(next)
    setZoom(next)
  }

  // Align to today once the scroller has a real measured width (not the fallback).
  useLayoutEffect(() => {
    const el = document.getElementById('season-planner-scroller')
    if (!el || colW <= 0 || !layoutReady) return

    if (!didInitialScrollRef.current) {
      el.scrollLeft = plannerScrollLeftToCenterColumn(
        scale.todayIdx,
        colW,
        el.clientWidth,
        labelW,
      )
      didInitialScrollRef.current = true
      return
    }

    const anchor = zoomAnchorRef.current
    if (!anchor || anchor.zoom !== zoom) return
    const columns = unit === 'day' ? days : weeks
    el.scrollLeft = plannerScrollLeftToTimeMs(
      columns,
      colW,
      el.clientWidth,
      labelW,
      anchor.timeMs,
      unit,
      anchor.ratio,
    )
  }, [layoutReady, zoom, colW, labelW, unit, days, weeks, scale.todayIdx])

  // Drop the zoom anchor after layout settles so later resizes don't fight user scroll.
  useLayoutEffect(() => {
    const anchor = zoomAnchorRef.current
    if (!anchor || anchor.zoom !== zoom) return
    const id = requestAnimationFrame(() => {
      if (zoomAnchorRef.current?.zoom === zoom) {
        zoomAnchorRef.current = null
      }
    })
    return () => cancelAnimationFrame(id)
  }, [zoom, colW])

  const showPriority = laneMode === 'priority'
  const showSport = laneMode === 'sport'

  const boardRaces = useMemo(() => [...planned, ...watching], [planned, watching])

  const visibleRaces = boardRaces.filter((r) => {
    if (r.intent === RaceIntent.WATCHING) {
      if (!showWatching) return false
    } else if (!priorityFilter[r.priority]) {
      return false
    }
    if (r.sport == null || !PLANNER_SPORTS.includes(r.sport as PlannerSport)) {
      return true
    }
    return sportFilter[r.sport as PlannerSport]
  })
  const selected = boardRaces.find((r) => r.id === selectedId) ?? null
  const selectedEvent =
    seasonEvents.find((e) => e.id === selectedEventId) ?? null

  const plannerFiltersActive =
    !(priorityFilter.A && priorityFilter.B && priorityFilter.C) ||
    !(showWatching && showEvents) ||
    PLANNER_SPORTS.some((s) => !sportFilter[s])

  return (
    <div className="space-y-6">
      <div className="flex flex-nowrap items-center gap-x-2 overflow-x-auto pb-0.5">
        <div className="flex shrink-0 items-center gap-2">
          <SegmentedControl aria-label="Board layout" className="shrink-0">
            {(
              [
                ['priority', 'Priority'],
                ['sport', 'Sport'],
              ] as const
            ).map(([id, label]) => (
              <SegmentedControlItem
                key={id}
                active={laneMode === id}
                className="px-3 text-xs"
                onClick={() => setLaneMode(id)}
              >
                {label}
              </SegmentedControlItem>
            ))}
          </SegmentedControl>

          <DropdownMenu.Root modal={false}>
            <DropdownMenu.Trigger asChild>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className={cn(
                  'gap-1.5',
                  plannerFiltersActive && 'border-foreground/25 text-foreground',
                )}
                aria-label="Calendar filters"
              >
                <ListFilter className="h-3.5 w-3.5" />
                Filters
                {plannerFiltersActive ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
                ) : null}
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="start"
                sideOffset={8}
                className="z-[200] w-[min(calc(100vw-2rem),22rem)] overflow-hidden rounded-[12px] border border-border bg-card p-3 shadow-lg"
                onCloseAutoFocus={(e) => e.preventDefault()}
              >
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <p className="px-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                      Priority
                    </p>
                    <div
                      className="flex flex-wrap items-center gap-1.5 rounded-[10px] border border-[#E1E3E6] bg-white px-1.5 py-1.5"
                      role="group"
                      aria-label="Priority filters"
                    >
                      {PLANNER_PRIORITY_LANES.map(({ priority }) => (
                        <FilterChip
                          key={priority}
                          active={priorityFilter[priority]}
                          onClick={() =>
                            setPriorityFilter((prev) => ({
                              ...prev,
                              [priority]: !prev[priority],
                            }))
                          }
                          dotClass={PLANNER_PRIORITY_DOT[priority]}
                          label={priority}
                          nested
                        />
                      ))}
                      <FilterGroupAllNone
                        allSelected={
                          priorityFilter.A && priorityFilter.B && priorityFilter.C
                        }
                        noneSelected={
                          !priorityFilter.A && !priorityFilter.B && !priorityFilter.C
                        }
                        onAll={() => setPriorityFilter({ A: true, B: true, C: true })}
                        onNone={() =>
                          setPriorityFilter({ A: false, B: false, C: false })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <p className="px-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                      Lanes
                    </p>
                    <div
                      className="flex flex-wrap items-center gap-1.5 rounded-[10px] border border-[#E1E3E6] bg-white px-1.5 py-1.5"
                      role="group"
                      aria-label="Lane filters"
                    >
                      <FilterChip
                        active={showWatching}
                        onClick={() => setShowWatching((prev) => !prev)}
                        label="Watching"
                        nested
                      />
                      <FilterChip
                        active={showEvents}
                        onClick={() => setShowEvents((prev) => !prev)}
                        label="Events"
                        nested
                      />
                      <FilterGroupAllNone
                        allSelected={showWatching && showEvents}
                        noneSelected={!showWatching && !showEvents}
                        onAll={() => {
                          setShowWatching(true)
                          setShowEvents(true)
                        }}
                        onNone={() => {
                          setShowWatching(false)
                          setShowEvents(false)
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <p className="px-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                      Sport
                    </p>
                    <div
                      className="flex flex-wrap items-center gap-1.5 rounded-[10px] border border-[#E1E3E6] bg-white px-1.5 py-1.5"
                      role="group"
                      aria-label="Sport filters"
                    >
                      {PLANNER_SPORTS.map((sport) => (
                        <FilterChip
                          key={sport}
                          active={sportFilter[sport]}
                          onClick={() =>
                            setSportFilter((prev) => ({
                              ...prev,
                              [sport]: !prev[sport],
                            }))
                          }
                          dotClass={WORKOUT_TYPE_DOT_CLASS[sport]}
                          label={PLANNER_SPORT_LABELS[sport]}
                          nested
                        />
                      ))}
                      <FilterGroupAllNone
                        allSelected={PLANNER_SPORTS.every((s) => sportFilter[s])}
                        noneSelected={PLANNER_SPORTS.every((s) => !sportFilter[s])}
                        onAll={() =>
                          setSportFilter(
                            Object.fromEntries(
                              PLANNER_SPORTS.map((s) => [s, true]),
                            ) as Record<PlannerSport, boolean>,
                          )
                        }
                        onNone={() =>
                          setSportFilter(
                            Object.fromEntries(
                              PLANNER_SPORTS.map((s) => [s, false]),
                            ) as Record<PlannerSport, boolean>,
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <PlannerToolbar
            zoom={zoom}
            onZoomChange={handleZoomChange}
            onToday={() => scrollPlannerToColumn(scale.todayIdx, colW, labelW)}
            onPrev={() => nudgePlannerScroll(-viewportColumns * colW)}
            onNext={() => nudgePlannerScroll(viewportColumns * colW)}
          />

          <DropdownMenu.Root modal={false}>
            <DropdownMenu.Trigger asChild>
              <Button
                type="button"
                size="sm"
                className={cn(SEASON_CTA_CLASS, 'gap-1.5')}
                aria-label="Add race or event"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={8}
                className="z-[200] min-w-[9.5rem] overflow-hidden rounded-[10px] border border-border bg-card p-1 shadow-lg"
              >
                <DropdownMenu.Item
                  className="cursor-pointer rounded-[6px] px-2.5 py-1.5 text-sm outline-none data-[highlighted]:bg-muted/60"
                  onSelect={() => setAddRaceOpen(true)}
                >
                  Race
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className="cursor-pointer rounded-[6px] px-2.5 py-1.5 text-sm outline-none data-[highlighted]:bg-muted/60"
                  onSelect={() => setEventCreateOpen(true)}
                >
                  Event
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>

      <SeasonPlannerBoard
        scale={scale}
        weeks={weeks}
        labelW={labelW}
        colW={colW}
        zoom={zoom}
        races={visibleRaces}
        priorityFilter={priorityFilter}
        sportFilter={sportFilter}
        showWatching={showWatching}
        showEvents={showEvents}
        seasonEvents={seasonEvents}
        showPriorityLanes={showPriority}
        showSportLanes={showSport}
        phaseBlocks={phaseBlocks}
        today={today}
        onSelectRace={setSelectedId}
        onAddPhase={(sport) => setPhaseModal({ mode: 'create', sport })}
        onEditPhase={(block) => setPhaseModal({ mode: 'edit', block })}
        onSelectEvent={(event) => setSelectedEventId(event.id)}
      />

      <AddRaceModal
        open={addRaceOpen}
        onOpenChange={setAddRaceOpen}
        athleteId={athleteId}
        defaultIntent={RaceIntent.PLANNED}
      />

      <RaceDetailSheet
        race={selected}
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null)
        }}
        onChanged={() => router.refresh()}
        isCoach={isCoach}
      />

      <PhaseBlockModal
        state={phaseModal}
        onOpenChange={(open) => {
          if (!open) setPhaseModal(null)
        }}
      />

      <SeasonEventModal
        open={eventCreateOpen}
        onOpenChange={setEventCreateOpen}
        isCoach={isCoach}
        onSaved={() => router.refresh()}
      />

      <SeasonEventDetailSheet
        event={selectedEvent}
        open={Boolean(selectedEvent)}
        onOpenChange={(open) => {
          if (!open) setSelectedEventId(null)
        }}
        isCoach={isCoach}
        onChanged={() => router.refresh()}
      />
    </div>
  )
}

function nudgePlannerScroll(delta: number) {
  const el = document.getElementById('season-planner-scroller')
  if (el) el.scrollBy({ left: delta, behavior: 'smooth' })
}

function scrollPlannerToColumn(columnIndex: number, colW: number, labelW: number) {
  const el = document.getElementById('season-planner-scroller')
  if (!el) return
  const target = plannerScrollLeftForColumn(columnIndex, colW, el.clientWidth, labelW)
  el.scrollTo({ left: target, behavior: 'smooth' })
}

function usePlannerLayout(zoom: number) {
  const [viewportW, setViewportW] = useState(1024)
  const [gridPx, setGridPx] = useState(PLANNER_FALLBACK_GRID_PX)
  const [layoutReady, setLayoutReady] = useState(false)

  useLayoutEffect(() => {
    const measure = () => {
      const el = document.getElementById('season-planner-scroller')
      if (!el || el.clientWidth < 32) return
      const nextViewport = window.innerWidth
      const nextLabelW = plannerLabelWidth(nextViewport)
      setViewportW(nextViewport)
      setGridPx(Math.max(160, el.clientWidth - nextLabelW))
      setLayoutReady(true)
    }
    measure()
    const el = document.getElementById('season-planner-scroller')
    const ro = new ResizeObserver(measure)
    if (el) ro.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [zoom])

  const labelW = plannerLabelWidth(viewportW)
  // Derive from zoom immediately so zoom + scroll restore share the same frame.
  const colW = plannerColumnWidth(zoom, gridPx)
  return { labelW, colW, layoutReady }
}

type PlannerBoardScale = {
  unit: PlannerZoomUnit
  colCount: number
  months: PlannerMonthGroup[]
  todayIdx: number
  indexForDate: (date: Date) => number
  isMonthEnd: (index: number) => boolean
  isWeekBoundary: (index: number) => boolean
  isWeekend: (index: number) => boolean
  columnLabel: (index: number) => string | number
  days: PlannerDayColumn[]
}

function buildPlannerBoardScale(args: {
  weeks: PlannerWeekColumn[]
  days: PlannerDayColumn[]
  unit: PlannerZoomUnit
  today: Date
}): PlannerBoardScale {
  const { weeks, days, unit, today } = args
  if (unit === 'day') {
    return {
      unit,
      colCount: days.length,
      months: groupPlannerMonths(days),
      todayIdx: todayDayIndex(days, today),
      indexForDate: (date) => dayIndexForDate(days, date),
      isMonthEnd: (index) => {
        if (index < 0 || index >= days.length - 1) return false
        return days[index]!.monthKey !== days[index + 1]!.monthKey
      },
      isWeekBoundary: (index) => days[index]?.weekday === 1,
      isWeekend: (index) => {
        const weekday = days[index]?.weekday
        return weekday === 0 || weekday === 6
      },
      columnLabel: (index) => days[index]?.dayOfMonth ?? '',
      days,
    }
  }

  return {
    unit,
    colCount: weeks.length,
    months: groupPlannerMonths(weeks),
    todayIdx: todayWeekIndex(weeks, today),
    indexForDate: (date) => weekIndexForDate(weeks, date),
    isMonthEnd: (index) => {
      if (index < 0 || index >= weeks.length - 1) return false
      return weeks[index]!.monthKey !== weeks[index + 1]!.monthKey
    },
    isWeekBoundary: () => false,
    isWeekend: () => false,
    columnLabel: (index) => weeks[index]?.isoWeek ?? '',
    days,
  }
}

function PlannerToolbar({
  zoom,
  onZoomChange,
  onToday,
  onPrev,
  onNext,
}: {
  zoom: number
  onZoomChange: (z: number) => void
  onToday: () => void
  onPrev: () => void
  onNext: () => void
}) {
  const [zoomMax, setZoomMax] = useState(() =>
    typeof window === 'undefined'
      ? PLANNER_ZOOM_DESKTOP_MAX
      : plannerZoomMaxForWidth(window.innerWidth),
  )

  useEffect(() => {
    const sync = () => {
      const max = plannerZoomMaxForWidth(window.innerWidth)
      setZoomMax(max)
      if (zoom > max) onZoomChange(max)
    }
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [zoom, onZoomChange])

  const zoomBtnClass =
    'inline-flex h-7 w-7 items-center justify-center rounded-[6px] border border-border text-muted-foreground transition hover:text-foreground disabled:pointer-events-none disabled:opacity-35'

  return (
    <div className="ml-auto flex shrink-0 items-center gap-1.5 pl-2">
      <div className="inline-flex items-center gap-0.5" role="group" aria-label="Zoom">
        <button
          type="button"
          onClick={() => onZoomChange(Math.max(0, zoom - 1))}
          disabled={zoom <= 0}
          aria-label="Zoom out"
          title="Zoom out"
          className={zoomBtnClass}
        >
          <Minus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => onZoomChange(Math.min(zoomMax, zoom + 1))}
          disabled={zoom >= zoomMax}
          aria-label="Zoom in"
          title="Zoom in"
          className={zoomBtnClass}
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        </button>
      </div>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="h-7 rounded-[6px] px-2.5 text-[11px]"
        onClick={onToday}
      >
        Today
      </Button>
      <button
        type="button"
        onClick={onPrev}
        aria-label="Previous period"
        className={zoomBtnClass}
      >
        <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
      </button>
      <button
        type="button"
        onClick={onNext}
        aria-label="Next period"
        className={zoomBtnClass}
      >
        <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
      </button>
    </div>
  )
}

function FilterGroupAllNone({
  allSelected,
  noneSelected,
  onAll,
  onNone,
}: {
  allSelected: boolean
  noneSelected: boolean
  onAll: () => void
  onNone: () => void
}) {
  return (
    <span className="ml-0.5 flex items-center gap-0.5 border-l border-[#E1E3E6] pl-1.5 pr-0.5">
      <button
        type="button"
        onClick={onAll}
        disabled={allSelected}
        className={cn(
          'rounded px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide transition',
          allSelected
            ? 'cursor-default text-foreground/40'
            : 'cursor-pointer text-muted-foreground hover:text-foreground',
        )}
      >
        All
      </button>
      <button
        type="button"
        onClick={onNone}
        disabled={noneSelected}
        className={cn(
          'rounded px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide transition',
          noneSelected
            ? 'cursor-default text-foreground/40'
            : 'cursor-pointer text-muted-foreground hover:text-foreground',
        )}
      >
        None
      </button>
    </span>
  )
}

function FilterChip({
  active,
  nested = false,
  onClick,
  label,
  dotClass,
}: {
  active: boolean
  /** Inside a grouped filter shell — quieter idle borders. */
  nested?: boolean
  onClick: () => void
  label: string
  dotClass?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition',
        nested ? 'border border-transparent' : 'border border-[#E1E3E6]',
        active
          ? 'bg-black/[0.06] text-foreground'
          : 'bg-transparent text-muted-foreground/55 hover:bg-black/[0.03] hover:text-muted-foreground',
      )}
    >
      {dotClass ? (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            dotClass,
            !active && 'opacity-45',
          )}
        />
      ) : null}
      {label}
    </button>
  )
}

function SeasonPlannerBoard({
  scale,
  weeks,
  labelW,
  colW,
  zoom,
  races,
  priorityFilter,
  sportFilter,
  showWatching,
  showEvents,
  seasonEvents,
  showPriorityLanes,
  showSportLanes,
  phaseBlocks,
  today,
  onSelectRace,
  onAddPhase,
  onEditPhase,
  onSelectEvent,
}: {
  scale: PlannerBoardScale
  weeks: PlannerWeekColumn[]
  labelW: number
  colW: number
  zoom: number
  races: SeasonRace[]
  priorityFilter: Record<RacePriority, boolean>
  sportFilter: Record<PlannerSport, boolean>
  showWatching: boolean
  showEvents: boolean
  seasonEvents: SeasonEventData[]
  showPriorityLanes: boolean
  showSportLanes: boolean
  phaseBlocks: SeasonPhaseBlockData[]
  today: Date
  onSelectRace: (id: string) => void
  onAddPhase: (sport: PlannerSport) => void
  onEditPhase: (block: SeasonPhaseBlockData) => void
  onSelectEvent: (event: SeasonEventData) => void
}) {
  const { months, todayIdx, colCount, unit } = scale
  const gridW = colCount * colW
  const shortMonthLabels = plannerZoomLevel(zoom).viewportDays >= 365
  const headerSubTop = '2.125rem'

  // Keep month names pinned beside the Season column while scrolling horizontally.
  // CSS position:sticky is unreliable here (nested sticky header + flex timeline).
  useLayoutEffect(() => {
    const scroller = document.getElementById('season-planner-scroller')
    if (!scroller) return

    const update = () => {
      const scrollLeft = scroller.scrollLeft
      for (const month of months) {
        const el = scroller.querySelector<HTMLElement>(
          `[data-month-label="${month.key}"]`,
        )
        if (!el) continue
        const monthLeft = month.startIndex * colW
        const monthWidth = month.weekCount * colW
        const labelWidth = el.offsetWidth
        const maxOffset = Math.max(0, monthWidth - labelWidth - 4)
        const desired = scrollLeft - monthLeft
        const offset = Math.min(Math.max(0, desired), maxOffset)
        el.style.transform = `translateX(${offset}px)`
      }
    }

    update()
    scroller.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      scroller.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [months, colW, gridW])

  // Click-drag to pan the timeline horizontally (map-style).
  useEffect(() => {
    const el = document.getElementById('season-planner-scroller')
    if (!el) return

    const DRAG_THRESHOLD_PX = 5
    let pointerId: number | null = null
    let startX = 0
    let startScroll = 0
    let dragging = false
    let didPan = false

    const shouldIgnoreTarget = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return true
      return Boolean(
        target.closest(
          'input, textarea, select, option, [data-no-pan], [data-radix-collection-item]',
        ),
      )
    }

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return
      if (shouldIgnoreTarget(event.target)) return
      pointerId = event.pointerId
      startX = event.clientX
      startScroll = el.scrollLeft
      dragging = true
      didPan = false
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!dragging || event.pointerId !== pointerId) return
      const dx = event.clientX - startX
      if (!didPan) {
        if (Math.abs(dx) < DRAG_THRESHOLD_PX) return
        didPan = true
        el.classList.add('is-panning')
        try {
          el.setPointerCapture(event.pointerId)
        } catch {
          // ignore — capture is best-effort
        }
      }
      el.scrollLeft = startScroll - dx
      event.preventDefault()
    }

    const endPan = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return
      if (didPan) {
        el.classList.remove('is-panning')
        const suppressClick = (clickEvent: Event) => {
          clickEvent.preventDefault()
          clickEvent.stopPropagation()
          el.removeEventListener('click', suppressClick, true)
        }
        el.addEventListener('click', suppressClick, true)
        window.setTimeout(() => {
          el.removeEventListener('click', suppressClick, true)
        }, 0)
      }
      dragging = false
      pointerId = null
      didPan = false
    }

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', endPan)
    el.addEventListener('pointercancel', endPan)
    return () => {
      el.classList.remove('is-panning')
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', endPan)
      el.removeEventListener('pointercancel', endPan)
    }
  }, [])

  const visiblePriorityLanes = showPriorityLanes
    ? PLANNER_PRIORITY_LANES.filter((l) => priorityFilter[l.priority])
    : []
  const visibleSports = showSportLanes
    ? PLANNER_SPORTS.filter((s) => sportFilter[s])
    : []
  const watchingRaces = showPriorityLanes && showWatching
    ? races.filter((r) => r.intent === RaceIntent.WATCHING)
    : []

  return (
    <div className={cn(TABLE_SHELL, 'tt-season-timeline')}>
      <div
        id="season-planner-scroller"
        className="season-planner-scroller overflow-x-auto"
      >
        <div style={{ width: labelW + gridW, minWidth: '100%' }} className="relative">
        {/* Month header */}
        <div className={cn('sticky top-0 z-20 flex', TABLE_HEADER)}>
          <div
            className={cn(
              'tt-season-sticky-label sticky left-0 z-30 flex shrink-0 items-center px-2 py-1.5 text-[11px] font-semibold',
              TABLE_HEADER_VLINE,
              TABLE_HEADER_CELL_MUTED,
            )}
            style={{ width: labelW }}
          >
            Season
          </div>
          <div className="flex" style={{ width: gridW }}>
            {months.map((m) => (
              <div
                key={m.key}
                className={cn(
                  'relative overflow-hidden border-r border-white/8',
                  TABLE_HEADER_CELL_STRONG,
                )}
                style={{ width: m.weekCount * colW }}
              >
                <div
                  data-month-label={m.key}
                  className="tt-season-month-label relative z-[1] flex w-max max-w-full items-center gap-1 px-2 py-1.5 text-[11px] font-semibold will-change-transform"
                >
                  <span>
                    {shortMonthLabels ? m.label.slice(0, 3) : m.label}
                  </span>
                  <span className="text-white/45">{m.year}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column numbers — week zoom: ISO weeks; day zoom: date row */}
        {unit === 'day' ? (
          <div
            className={cn('sticky z-20 flex', TABLE_HEADER_SUB)}
            style={{ top: headerSubTop }}
          >
            <div
              className="sticky left-0 z-10 shrink-0 border-r border-[#ECECEA] bg-[#f4f4f2]"
              style={{ width: labelW }}
            />
            <div className="flex" style={{ width: gridW }}>
              {scale.days.map((day, i) => (
                <div
                  key={`day-h-${day.key}`}
                  className={cn(
                    'flex h-9 flex-col items-center justify-center gap-0.5 border-r py-1 leading-none',
                    scale.isMonthEnd(i) ? 'border-black/12' : 'border-black/[0.04]',
                    scale.isWeekBoundary(i) && 'border-l border-l-black/18',
                    i === todayIdx && 'bg-[rgb(244_81_30/0.04)]',
                    scale.isWeekend(i) &&
                      i !== todayIdx &&
                      'bg-black/[0.028] text-muted-foreground/55',
                  )}
                  style={{ width: colW }}
                  title={day.start.toLocaleDateString(undefined, {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    timeZone: 'UTC',
                  })}
                >
                  <span className="text-[8px] font-semibold uppercase tracking-[0.02em] text-muted-foreground">
                    {PLANNER_WEEKDAY_SHORT[day.weekday]}
                  </span>
                  {i === todayIdx ? (
                    <span className="tt-season-today-badge" title="Today">
                      {day.dayOfMonth}
                    </span>
                  ) : (
                    <span className="text-[10px] tabular-nums">{day.dayOfMonth}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div
            className={cn('sticky z-20 flex', TABLE_HEADER_SUB)}
            style={{ top: headerSubTop }}
          >
            <div
              className="sticky left-0 z-10 shrink-0 border-r border-[#ECECEA] bg-[#f4f4f2]"
              style={{ width: labelW }}
            />
            <div className="flex" style={{ width: gridW }}>
              {Array.from({ length: colCount }, (_, i) => (
                <div
                  key={`col-h-${i}`}
                  className={cn(
                    'flex h-7 items-center justify-center border-r text-center text-[10px] tabular-nums',
                    scale.isMonthEnd(i) ? 'border-black/12' : 'border-black/[0.04]',
                    i === todayIdx && 'bg-[rgb(244_81_30/0.04)]',
                  )}
                  style={{ width: colW }}
                >
                  {i === todayIdx ? (
                    <span className="tt-season-today-badge" title="Today">
                      {scale.columnLabel(i)}
                    </span>
                  ) : (
                    scale.columnLabel(i)
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Breathing room between header and lanes */}
        <div className="flex h-2 bg-white" aria-hidden>
          <div
            className="tt-season-lane-label sticky left-0 z-10 shrink-0 border-r bg-white"
            style={{ width: labelW }}
          />
          <div className="relative" style={{ width: gridW }}>
            {Array.from({ length: colCount }, (_, i) => (
              <div
                key={`gap-${i}`}
                data-month-end={scale.isMonthEnd(i) ? 'true' : undefined}
                data-week-start={
                  unit === 'day' && scale.isWeekBoundary(i) ? 'true' : undefined
                }
                data-weekend={
                  unit === 'day' && scale.isWeekend(i) ? 'true' : undefined
                }
                className={cn(
                  'tt-season-week-line absolute inset-y-0',
                  i === todayIdx && 'tt-season-today-col',
                )}
                style={{ left: i * colW, width: colW }}
              />
            ))}
          </div>
        </div>

        {/* Today line */}
        <div
          className="tt-season-today-line pointer-events-none absolute bottom-0 z-[1] top-[52px]"
          style={{
            left: labelW + todayIdx * colW + colW / 2,
          }}
          aria-hidden
        />

        {visiblePriorityLanes.map(({ priority, label }) => {
          const laneRaces = races.filter(
            (r) => r.priority === priority && r.intent !== RaceIntent.WATCHING,
          )
          return (
            <PlannerLane
              key={priority}
              label={label}
              labelW={labelW}
              gridW={gridW}
              colW={colW}
              scale={scale}
              contentMinHeight={raceLaneMinHeight(laneRaces, weeks, scale, colW)}
            >
              <StackedRaceCards
                races={laneRaces}
                weeks={weeks}
                scale={scale}
                colW={colW}
                today={today}
                onSelectRace={onSelectRace}
              />
            </PlannerLane>
          )
        })}

        {showPriorityLanes && showWatching ? (
          <PlannerLane
            label="Watching"
            labelW={labelW}
            gridW={gridW}
            colW={colW}
            scale={scale}
            contentMinHeight={raceLaneMinHeight(watchingRaces, weeks, scale, colW)}
          >
            <StackedRaceCards
              races={watchingRaces}
              weeks={weeks}
              scale={scale}
              colW={colW}
              today={today}
              onSelectRace={onSelectRace}
            />
          </PlannerLane>
        ) : null}

        {showPriorityLanes && showEvents ? (
          <PlannerLane
            label="Events"
            labelW={labelW}
            gridW={gridW}
            colW={colW}
            scale={scale}
            contentMinHeight={eventLaneMinHeight(seasonEvents, scale, colW)}
            thickBottom
          >
            <StackedEventCards
              events={seasonEvents}
              scale={scale}
              colW={colW}
              onSelectEvent={onSelectEvent}
            />
          </PlannerLane>
        ) : null}

        {visibleSports.map((sport) => {
          const sportRaces = races.filter((r) => r.sport === sport)
          const raceLayoutHeight = raceLaneMinHeight(sportRaces, weeks, scale, colW)
          return (
            <PlannerLane
              key={sport}
              label={PLANNER_SPORT_LABELS[sport]}
              labelW={labelW}
              gridW={gridW}
              colW={colW}
              scale={scale}
              onLabelAction={() => onAddPhase(sport)}
              labelActionTitle="Add phase"
              contentMinHeight={Math.max(raceLayoutHeight, 40)}
            >
              {phaseBlocks
                .filter((b) => b.sport === sport)
                .map((block) => {
                  const start = scale.indexForDate(block.startDate)
                  const end = scale.indexForDate(block.endDate)
                  const span = Math.max(1, end - start + 1)
                  return (
                    <button
                      key={block.id}
                      type="button"
                      onClick={() => onEditPhase(block)}
                      className={cn(
                        'absolute inset-y-1.5 z-[2] overflow-hidden rounded-[5px] border px-1.5 text-left text-[10px] font-semibold leading-tight',
                        PLANNER_SPORT_TINT[sport],
                      )}
                      style={{ left: start * colW + 1, width: span * colW - 2 }}
                      title={`${SEASON_PHASE_LABELS[block.phase]}${block.label ? ` — ${block.label}` : ''}`}
                    >
                      {block.label?.trim() || SEASON_PHASE_LABELS[block.phase]}
                    </button>
                  )
                })}
              <StackedRaceCards
                races={sportRaces}
                weeks={weeks}
                scale={scale}
                colW={colW}
                today={today}
                onSelectRace={onSelectRace}
              />
            </PlannerLane>
          )
        })}

        {showSportLanes && showEvents ? (
          <PlannerLane
            label="Events"
            labelW={labelW}
            gridW={gridW}
            colW={colW}
            scale={scale}
            contentMinHeight={eventLaneMinHeight(seasonEvents, scale, colW)}
          >
            <StackedEventCards
              events={seasonEvents}
              scale={scale}
              colW={colW}
              onSelectEvent={onSelectEvent}
            />
          </PlannerLane>
        ) : null}
        </div>
      </div>
    </div>
  )
}

function PlannerLane({
  label,
  labelW,
  gridW,
  colW,
  scale,
  children,
  contentMinHeight,
  thickBottom,
  onLabelAction,
  labelActionTitle,
}: {
  label: string
  labelW: number
  gridW: number
  colW: number
  scale: PlannerBoardScale
  children?: React.ReactNode
  contentMinHeight?: number
  thickBottom?: boolean
  onLabelAction?: () => void
  labelActionTitle?: string
}) {
  const minH = contentMinHeight ?? 44
  const { colCount, todayIdx } = scale
  return (
    <div
      className={cn(
        'tt-season-lane relative flex',
        thickBottom ? 'border-b-2 border-foreground/20' : 'border-b border-[#ECECEA]',
      )}
      style={{ minHeight: minH }}
    >
      <div
        className="tt-season-lane-label sticky left-0 z-10 flex shrink-0 items-center gap-1 border-r bg-white px-2"
        style={{ width: labelW }}
      >
        <span className="truncate text-[11px] font-semibold text-foreground">{label}</span>
        {onLabelAction ? (
          <button
            type="button"
            onClick={onLabelAction}
            className="ml-auto text-[10px] font-medium text-brand hover:underline"
            title={labelActionTitle}
          >
            +
          </button>
        ) : null}
      </div>
      <div className="relative" style={{ width: gridW, minHeight: minH }}>
        {Array.from({ length: colCount }).map((_, i) => (
          <div
            key={i}
            data-month-end={scale.isMonthEnd(i) ? 'true' : undefined}
            data-week-start={
              scale.unit === 'day' && scale.isWeekBoundary(i) ? 'true' : undefined
            }
            data-weekend={
              scale.unit === 'day' && scale.isWeekend(i) ? 'true' : undefined
            }
            className={cn(
              'tt-season-week-line absolute inset-y-0 z-0',
              i === todayIdx && 'tt-season-today-col',
            )}
            style={{ left: i * colW, width: colW }}
          />
        ))}
        {children}
      </div>
    </div>
  )
}

const RACE_CARD_HEIGHT_COMPACT = 34
/** Taller card for wide week columns (4-month zoom) — date + 2-line name. */
const RACE_CARD_HEIGHT_ROOMY = 50
const RACE_CARD_TOP = 6
const RACE_CARD_STACK_GAP = 3
const RACE_CARD_BOTTOM_PAD = 6

const EVENT_CARD_HEIGHT_COMPACT = 34
/** Taller card for wide week columns (4-month zoom) — date + 2-line title. */
const EVENT_CARD_HEIGHT_ROOMY = 50
const EVENT_CARD_TOP = 6
const EVENT_CARD_STACK_GAP = 3
const EVENT_CARD_BOTTOM_PAD = 6

/** Wide enough week column (≈4-month zoom) for a roomier race card. */
function raceCardRoomy(colW: number) {
  return colW >= 56
}

function raceCardHeight(colW: number) {
  return raceCardRoomy(colW) ? RACE_CARD_HEIGHT_ROOMY : RACE_CARD_HEIGHT_COMPACT
}

function eventCardHeight(colW: number) {
  return raceCardRoomy(colW) ? EVENT_CARD_HEIGHT_ROOMY : EVENT_CARD_HEIGHT_COMPACT
}

function formatEventDateRange(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  const startLabel = start.toLocaleDateString(undefined, opts)
  if (toDateKey(start) === toDateKey(end)) return startLabel
  return `${startLabel} – ${end.toLocaleDateString(undefined, opts)}`
}

/** 4-month: one week. Zoomed-out: stretch so the name stays readable. */
function raceCardWidth(colW: number) {
  if (raceCardRoomy(colW)) return Math.max(colW - 4, 1)
  return Math.min(Math.max(colW * 1.85, 92), 148)
}

/** Assign vertical stack rows so overlapping event ranges don't cover each other. */
function layoutStackedEvents(
  events: SeasonEventData[],
  scale: PlannerBoardScale,
  colW: number,
) {
  const items = [...events]
    .map((event) => {
      const start = scale.indexForDate(event.startDate)
      const end = scale.indexForDate(event.endDate)
      const span = Math.max(1, end - start + 1)
      const spanLeft = start * colW
      const spanRight = (start + span) * colW
      return {
        event,
        left: start * colW + 1,
        width: span * colW - 2,
        spanLeft,
        spanRight,
        stack: 0,
      }
    })
    .sort(
      (a, b) =>
        a.spanLeft - b.spanLeft ||
        a.spanRight - b.spanRight ||
        a.event.title.localeCompare(b.event.title),
    )

  const rowEnds: number[] = []
  for (const item of items) {
    let row = 0
    while (row < rowEnds.length && item.spanLeft < rowEnds[row]! - 2) {
      row += 1
    }
    item.stack = row
    if (row === rowEnds.length) rowEnds.push(item.spanRight)
    else rowEnds[row] = Math.max(rowEnds[row]!, item.spanRight)
  }

  return {
    items,
    rows: Math.max(1, rowEnds.length),
  }
}

function eventLaneMinHeight(
  events: SeasonEventData[],
  scale: PlannerBoardScale,
  colW: number,
) {
  if (events.length === 0) return raceCardRoomy(colW) ? 58 : 44
  const { rows } = layoutStackedEvents(events, scale, colW)
  const cardH = eventCardHeight(colW)
  return (
    EVENT_CARD_TOP +
    rows * cardH +
    (rows - 1) * EVENT_CARD_STACK_GAP +
    EVENT_CARD_BOTTOM_PAD
  )
}

function StackedEventCards({
  events,
  scale,
  colW,
  onSelectEvent,
}: {
  events: SeasonEventData[]
  scale: PlannerBoardScale
  colW: number
  onSelectEvent: (event: SeasonEventData) => void
}) {
  const { items } = layoutStackedEvents(events, scale, colW)
  const cardH = eventCardHeight(colW)
  const roomy = raceCardRoomy(colW)
  const follow = usePlannerFollowTooltip()

  return (
    <>
      {items.map(({ event, left, width, stack }) => {
        const top = EVENT_CARD_TOP + stack * (cardH + EVENT_CARD_STACK_GAP)
        const label = formatSeasonEventLabel(event)
        const dateLabel = formatEventDateRange(event.startDate, event.endDate)
        const tip = (
          <>
            <PlannerTipTitle>{label}</PlannerTipTitle>
            <PlannerTipMeta>{dateLabel}</PlannerTipMeta>
            {formatSeasonEventWhenLine(event) ? (
              <PlannerTipRow>{formatSeasonEventWhenLine(event)}</PlannerTipRow>
            ) : null}
            {event.notes?.trim() ? (
              <PlannerTipRow strong>{event.notes.trim()}</PlannerTipRow>
            ) : null}
          </>
        )
        return (
          <button
            key={event.id}
            type="button"
            onClick={() => onSelectEvent(event)}
            onMouseEnter={(e) => follow.show(tip, e)}
            onMouseMove={follow.move}
            onMouseLeave={follow.hide}
            className={cn(
              'absolute z-[2] overflow-hidden rounded-[6px] border px-2 py-0.5 text-left transition hover:brightness-[0.98]',
              SEASON_EVENT_CARD,
            )}
            style={{ left, width, top, height: cardH }}
          >
            <p className="truncate text-[9px] font-medium leading-none opacity-70">
              {dateLabel}
            </p>
            <p
              className={cn(
                'flex items-start gap-1 text-[11px] font-semibold leading-tight',
                roomy ? 'line-clamp-2' : 'truncate',
              )}
            >
              {event.isPrivate ? (
                <Lock
                  className="mt-px h-3 w-3 shrink-0 opacity-70"
                  strokeWidth={2}
                  aria-label="Private"
                />
              ) : null}
              <span className={roomy ? undefined : 'truncate'}>{label}</span>
            </p>
          </button>
        )
      })}
      {follow.tooltip}
    </>
  )
}

/** Assign vertical stack rows so overlapping cards / prep tails don't cover each other. */
function layoutStackedRaces(
  races: SeasonRace[],
  weeks: PlannerWeekColumn[],
  scale: PlannerBoardScale,
  colW: number,
  today?: Date,
) {
  const width = raceCardWidth(colW)
  const items = [...races]
    .map((race) => {
      const raceIdx = scale.indexForDate(race.date)
      const win = prepWindowForRace({
        raceId: race.id,
        raceDate: race.date,
        type: race.type,
        preparationWeeks: race.preparationWeeks,
        weeks,
        today,
      })
      let spanLeft = raceIdx * colW
      if (win != null) {
        if (scale.unit === 'day') {
          const daySpan = prepWindowDaySpan(win, weeks, scale.days)
          spanLeft = (daySpan?.startDayIndex ?? raceIdx) * colW
        } else {
          spanLeft = win.startWeekIndex * colW
        }
      }
      const spanRight = Math.max(raceIdx * colW + width, (raceIdx + 1) * colW)
      return {
        race,
        left: raceIdx * colW + 2,
        width,
        spanLeft,
        spanRight,
        stack: 0,
        prepWin: win,
      }
    })
    .sort(
      (a, b) =>
        a.spanLeft - b.spanLeft ||
        a.left - b.left ||
        a.race.date.getTime() - b.race.date.getTime() ||
        a.race.name.localeCompare(b.race.name),
    )

  const rowEnds: number[] = []
  for (const item of items) {
    let row = 0
    while (row < rowEnds.length && item.spanLeft < rowEnds[row]! - 2) {
      row += 1
    }
    item.stack = row
    if (row === rowEnds.length) rowEnds.push(item.spanRight)
    else rowEnds[row] = Math.max(rowEnds[row]!, item.spanRight)
  }

  return {
    items,
    rows: Math.max(1, rowEnds.length),
  }
}

function raceLaneMinHeight(
  races: SeasonRace[],
  weeks: PlannerWeekColumn[],
  scale: PlannerBoardScale,
  colW: number,
) {
  if (races.length === 0) return raceCardRoomy(colW) ? 62 : 46
  const { rows } = layoutStackedRaces(races, weeks, scale, colW)
  const cardH = raceCardHeight(colW)
  return (
    RACE_CARD_TOP +
    rows * cardH +
    (rows - 1) * RACE_CARD_STACK_GAP +
    RACE_CARD_BOTTOM_PAD
  )
}

function StackedRaceCards({
  races,
  weeks,
  scale,
  colW,
  today,
  onSelectRace,
}: {
  races: SeasonRace[]
  weeks: PlannerWeekColumn[]
  scale: PlannerBoardScale
  colW: number
  today: Date
  onSelectRace: (id: string) => void
}) {
  const { items } = layoutStackedRaces(races, weeks, scale, colW, today)
  const cardH = raceCardHeight(colW)
  const roomy = raceCardRoomy(colW)
  const follow = usePlannerFollowTooltip()

  return (
    <>
      {items.map(({ race, left, width, stack, prepWin }) => {
        const top = RACE_CARD_TOP + stack * (cardH + RACE_CARD_STACK_GAP)
        const showShadow =
          prepWin != null && prepWin.endWeekIndex > prepWin.startWeekIndex

        return (
          <div key={race.id}>
            {showShadow && prepWin
              ? Array.from(
                  { length: prepWin.endWeekIndex - prepWin.startWeekIndex },
                  (_, i) => {
                    const weekIdx = prepWin.startWeekIndex + i
                    const weeksLeft = prepWin.endWeekIndex - weekIdx + 1
                    const week = weeks[weekIdx]
                    const dayStart =
                      scale.unit === 'day' && week
                        ? dayIndexForDate(scale.days, week.start)
                        : weekIdx
                    const blockWidth =
                      scale.unit === 'day' ? colW * 7 - 2 : colW - 2
                    return (
                      <div
                        key={`${race.id}-prep-${weekIdx}`}
                        className={cn(
                          'pointer-events-none absolute z-[1] flex items-center justify-center rounded-[4px] text-[9px] font-medium tabular-nums',
                          PLANNER_PRIORITY_SHADOW[race.priority],
                        )}
                        style={{
                          left: dayStart * colW + 1,
                          width: Math.max(blockWidth, 2),
                          top,
                          height: cardH,
                        }}
                        title={`${weeksLeft} weeks to ${race.name}`}
                      >
                        {weeksLeft}
                      </div>
                    )
                  },
                )
              : null}
            <RaceCard
              race={race}
              left={left}
              width={width}
              top={top}
              height={cardH}
              nameLines={roomy ? 2 : 1}
              onSelect={() => onSelectRace(race.id)}
              followTooltip={{
                show: follow.show,
                move: follow.move,
                hide: follow.hide,
              }}
            />
          </div>
        )
      })}
      {follow.tooltip}
    </>
  )
}

function raceFollowTipContent(race: SeasonRace) {
  const isWatching = race.intent === RaceIntent.WATCHING
  const dateLabel = race.date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const distance = raceDistanceLabel(race.type, {
    triathlonDistance: race.triathlonDistance,
    hyroxDivision: race.hyroxDivision,
    customDistanceKm: race.customDistanceKm,
    legs: race.legs,
  })
  const sport = race.sport ? WORKOUT_TYPE_LABELS[race.sport] : null
  const status = isWatching
    ? RACE_INTENT_LABELS.WATCHING
    : `${race.priority} ${RACE_PRIORITY_LABELS[race.priority]}`

  return (
    <>
      <PlannerTipTitle>{race.name}</PlannerTipTitle>
      <PlannerTipMeta>{dateLabel}</PlannerTipMeta>
      <PlannerTipRow label="Status">{status}</PlannerTipRow>
      {sport ? <PlannerTipRow label="Sport">{sport}</PlannerTipRow> : null}
      <PlannerTipRow label="Type">{RACE_TYPE_LABELS[race.type]}</PlannerTipRow>
      {distance ? <PlannerTipRow label="Distance">{distance}</PlannerTipRow> : null}
      {race.location?.trim() ? (
        <PlannerTipRow label="Location">{race.location.trim()}</PlannerTipRow>
      ) : null}
      {race.goal?.trim() ? (
        <PlannerTipRow label="Goal" strong>
          {race.goal.trim()}
        </PlannerTipRow>
      ) : null}
    </>
  )
}

function RaceCard({
  race,
  left,
  width,
  top,
  height,
  nameLines,
  onSelect,
  followTooltip,
}: {
  race: SeasonRace
  left: number
  width: number
  top: number
  height: number
  nameLines: 1 | 2
  onSelect: () => void
  followTooltip: {
    show: (content: ReactNode, e: MouseEvent) => void
    move: (e: MouseEvent) => void
    hide: () => void
  }
}) {
  const isWatching = race.intent === RaceIntent.WATCHING
  const tip = raceFollowTipContent(race)
  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={(e) => followTooltip.show(tip, e)}
      onMouseMove={followTooltip.move}
      onMouseLeave={followTooltip.hide}
      className={cn(
        'absolute z-[2] overflow-hidden rounded-[6px] border px-1.5 py-0.5 text-left transition hover:brightness-[0.98]',
        isWatching
          ? 'border-dashed border-foreground/25 bg-muted/40 text-foreground shadow-none'
          : PLANNER_PRIORITY_CARD[race.priority],
      )}
      style={{ left, width, top, height }}
    >
      <p className="truncate text-[9px] font-medium leading-none opacity-70">
        {race.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
      </p>
      <p
        className={cn(
          'font-semibold leading-tight',
          nameLines === 2 ? 'line-clamp-2 text-[11px]' : 'truncate text-[10px]',
        )}
      >
        {race.name}
      </p>
    </button>
  )
}

function matchesSportFilter(
  race: SeasonRace,
  sportFilter: Record<PlannerSport, boolean>,
): boolean {
  if (race.sport == null) return true
  if (!PLANNER_SPORTS.includes(race.sport as PlannerSport)) return true
  return sportFilter[race.sport as PlannerSport]
}

function matchesPriorityFilter(
  race: SeasonRace,
  priorityFilter: Record<RacePriority, boolean>,
  showPlanned: boolean,
  showWatching: boolean,
): boolean {
  if (race.intent === RaceIntent.WATCHING) return showWatching
  if (!showPlanned) return false
  return priorityFilter[race.priority]
}

function matchesRaceSearch(race: SeasonRace, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const haystack = [
    race.name,
    race.location,
    race.goal,
    RACE_TYPE_LABELS[race.type],
    race.sport ? WORKOUT_TYPE_LABELS[race.sport] : null,
    race.intent === RaceIntent.WATCHING
      ? RACE_INTENT_LABELS.WATCHING
      : RACE_INTENT_LABELS.PLANNED,
    raceOutcomeSummary(race),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(q)
}

function defaultSportFilter(): Record<PlannerSport, boolean> {
  return Object.fromEntries(PLANNER_SPORTS.map((s) => [s, true])) as Record<
    PlannerSport,
    boolean
  >
}

function defaultPriorityFilter(): Record<RacePriority, boolean> {
  return { A: true, B: true, C: true }
}

function RaceSearchField({
  value,
  onChange,
  placeholder,
  label,
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  label: string
  className?: string
}) {
  const hasSearch = value.trim().length > 0
  return (
    <label
      className={cn(
        'group relative flex h-9 w-full max-w-[14rem] items-center gap-2 rounded-full border bg-white pl-3 pr-2 transition',
        'border-[#E1E3E6] hover:border-foreground/25',
        'focus-within:border-foreground/25 focus-within:bg-white focus-within:shadow-sm',
        hasSearch && 'border-foreground/20 bg-white',
        className,
      )}
    >
      <Search
        className={cn(
          'h-3.5 w-3.5 shrink-0 text-muted-foreground/70 transition group-focus-within:text-foreground/70',
          hasSearch && 'text-foreground/60',
        )}
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="min-w-0 flex-1 bg-transparent py-1 text-sm text-foreground outline-none placeholder:text-muted-foreground/55 [&::-webkit-search-cancel-button]:hidden"
      />
      {hasSearch ? (
        <button
          type="button"
          onClick={() => onChange('')}
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </label>
  )
}

function AllRacesTable({
  races,
  athleteId,
  isCoach = false,
}: {
  races: SeasonRace[]
  athleteId: string
  isCoach?: boolean
}) {
  const router = useRouter()
  const today = useMemo(() => new Date(), [])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const upcomingRaces = useMemo(
    () =>
      races
        .filter((race) => daysUntil(race.date) >= 0)
        .sort((a, b) => a.date.getTime() - b.date.getTime()),
    [races],
  )
  const pastRaces = useMemo(
    () =>
      races
        .filter((race) => daysUntil(race.date) < 0)
        .sort((a, b) => b.date.getTime() - a.date.getTime()),
    [races],
  )

  const selected = races.find((r) => r.id === selectedId) ?? null

  return (
    <div className="space-y-10">
      <RaceListSection
        title="Upcoming races"
        description="Planned and watching — click a race for details"
        races={upcomingRaces}
        today={today}
        variant="upcoming"
        searchPlaceholder="Search upcoming…"
        searchLabel="Search upcoming races"
        emptyNoResults="No upcoming races match your filters."
        emptyDefault="No upcoming races."
        onSelect={setSelectedId}
        headerActions={
          <>
            <WatchRaceButton variant="ghost" size="sm" athleteId={athleteId} />
            <AddRaceButton
              variant="secondary"
              size="sm"
              athleteId={athleteId}
              className={SEASON_CTA_CLASS}
            />
          </>
        }
      />

      <RaceListSection
        title="Past races"
        description="Completed season events — click a race to read the report"
        races={pastRaces}
        today={today}
        variant="past"
        searchPlaceholder="Search past…"
        searchLabel="Search past races"
        emptyNoResults="No past races match your filters."
        emptyDefault="No past races yet."
        onSelect={setSelectedId}
        quieter
      />

      <RaceDetailSheet
        race={selected}
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null)
        }}
        onChanged={() => router.refresh()}
        isCoach={isCoach}
      />
    </div>
  )
}

function RaceListSection({
  title,
  description,
  races,
  today,
  variant,
  searchPlaceholder,
  searchLabel,
  emptyNoResults,
  emptyDefault,
  onSelect,
  headerActions,
  quieter = false,
}: {
  title: string
  description?: string
  races: SeasonRace[]
  today: Date
  variant: 'upcoming' | 'past'
  searchPlaceholder: string
  searchLabel: string
  emptyNoResults: string
  emptyDefault: string
  onSelect: (id: string) => void
  headerActions?: ReactNode
  quieter?: boolean
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sportFilter, setSportFilter] = useState<Record<PlannerSport, boolean>>(defaultSportFilter)
  const [priorityFilter, setPriorityFilter] =
    useState<Record<RacePriority, boolean>>(defaultPriorityFilter)
  const [showPlanned, setShowPlanned] = useState(true)
  const [showWatching, setShowWatching] = useState(true)

  const filtered = races.filter(
    (race) =>
      matchesSportFilter(race, sportFilter) &&
      matchesPriorityFilter(race, priorityFilter, showPlanned, showWatching) &&
      matchesRaceSearch(race, searchQuery),
  )
  const filtersActive =
    searchQuery.trim().length > 0 ||
    Object.values(sportFilter).some((v) => !v) ||
    Object.values(priorityFilter).some((v) => !v) ||
    !showPlanned ||
    !showWatching

  const filterControls: RaceTableFilters = {
    priorityFilter,
    showPlanned,
    showWatching,
    sportFilter,
    onTogglePriority: (priority) =>
      setPriorityFilter((prev) => ({ ...prev, [priority]: !prev[priority] })),
    onTogglePlanned: () => setShowPlanned((prev) => !prev),
    onToggleWatching: () => setShowWatching((prev) => !prev),
    onToggleSport: (sport) =>
      setSportFilter((prev) => ({ ...prev, [sport]: !prev[sport] })),
    onSetStatusAll: (visible) => {
      setShowPlanned(visible)
      setShowWatching(visible)
    },
    onSetPriorityAll: (visible) =>
      setPriorityFilter({ A: visible, B: visible, C: visible }),
    onSetSportAll: (visible) =>
      setSportFilter(
        Object.fromEntries(PLANNER_SPORTS.map((s) => [s, visible])) as Record<
          PlannerSport,
          boolean
        >,
      ),
  }

  return (
    <section
      className={cn('space-y-6', quieter && 'tt-season-past-section')}
      aria-label={title}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-x-3">
        <div className="min-w-0 space-y-1">
          <h2 className="title-section">{title}</h2>
          {description ? (
            <p className="text-pretty text-xs leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center md:ml-auto md:w-auto md:justify-end md:pb-0.5">
          <RaceSearchField
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={searchPlaceholder}
            label={searchLabel}
            className="max-w-none sm:max-w-[14rem]"
          />
          {headerActions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">{headerActions}</div>
          ) : null}
        </div>
      </div>

      <SeasonRaceTable
        races={filtered}
        today={today}
        variant={variant}
        emptyMessage={filtersActive ? emptyNoResults : emptyDefault}
        onSelect={onSelect}
        filters={filterControls}
      />
    </section>
  )
}

type RaceTableFilters = {
  priorityFilter: Record<RacePriority, boolean>
  showPlanned: boolean
  showWatching: boolean
  sportFilter: Record<PlannerSport, boolean>
  onTogglePriority: (priority: RacePriority) => void
  onTogglePlanned: () => void
  onToggleWatching: () => void
  onToggleSport: (sport: PlannerSport) => void
  onSetStatusAll: (visible: boolean) => void
  onSetPriorityAll: (visible: boolean) => void
  onSetSportAll: (visible: boolean) => void
}

function HeaderFilterMenu({
  label,
  active,
  onShowAll,
  onShowNone,
  allSelected,
  noneSelected,
  children,
  iconOnly = false,
}: {
  label: string
  active?: boolean
  onShowAll: () => void
  onShowNone: () => void
  allSelected: boolean
  noneSelected: boolean
  children: ReactNode
  /** When true, only the chevron is shown (pair with DataSortHeader). */
  iconOnly?: boolean
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={iconOnly ? `Filter ${label}` : undefined}
          title={iconOnly ? `Filter ${label}` : undefined}
          className={cn(
            'inline-flex items-center gap-1 rounded px-0.5 font-semibold uppercase tracking-wide transition',
            'text-text-secondary hover:text-foreground',
            'outline-none focus-visible:ring-1 focus-visible:ring-foreground/30',
            active && 'text-foreground',
            iconOnly && 'px-0.5',
          )}
        >
          {iconOnly ? null : label}
          <ChevronDown className="h-3 w-3 opacity-70" aria-hidden />
          {active ? (
            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
          ) : null}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="z-[200] min-w-[11rem] overflow-hidden rounded-[10px] border border-border bg-card p-1.5 shadow-lg"
        >
          <div className="mb-1 flex items-center justify-between gap-2 border-b border-border/60 px-2 pb-1.5 pt-0.5">
            <button
              type="button"
              className={cn(
                'text-[10px] font-semibold transition',
                allSelected
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              onClick={onShowAll}
              disabled={allSelected}
            >
              Show all
            </button>
            <button
              type="button"
              className={cn(
                'text-[10px] font-semibold transition',
                noneSelected
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              onClick={onShowNone}
              disabled={noneSelected}
            >
              Show none
            </button>
          </div>
          {children}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

function HeaderFilterItem({
  label,
  checked,
  onSelect,
  dotClass,
}: {
  label: string
  checked: boolean
  onSelect: () => void
  dotClass?: string
}) {
  return (
    <DropdownMenu.CheckboxItem
      checked={checked}
      onCheckedChange={() => onSelect()}
      onSelect={(e) => e.preventDefault()}
      className={cn(
        'relative flex cursor-pointer select-none items-center gap-2 rounded-[6px] px-2.5 py-1.5 text-sm outline-none',
        'data-[highlighted]:bg-muted/60',
        !checked && 'text-muted-foreground',
      )}
    >
      <span
        className={cn(
          'flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border',
          checked
            ? 'border-foreground bg-foreground text-background'
            : 'border-border bg-card',
        )}
        aria-hidden
      >
        {checked ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
      </span>
      {dotClass ? (
        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dotClass)} />
      ) : null}
      <span className="flex-1">{label}</span>
    </DropdownMenu.CheckboxItem>
  )
}

function SeasonRaceTable({
  races,
  today,
  variant,
  emptyMessage,
  onSelect,
  filters,
}: {
  races: SeasonRace[]
  today: Date
  variant: 'upcoming' | 'past'
  emptyMessage: string
  onSelect: (id: string) => void
  filters: RaceTableFilters
}) {
  const isPast = variant === 'past'
  type SortKey =
    | 'date'
    | 'name'
    | 'status'
    | 'result'
    | 'sport'
    | 'priority'
    | 'location'
    | 'distance'
    | 'weeks'
  const [sort, setSort] = useState<DataSortState<SortKey> | null>({
    key: 'date',
    dir: isPast ? 'desc' : 'asc',
  })

  const statusFilterActive = !filters.showPlanned || !filters.showWatching
  const priorityFilterActive = Object.values(filters.priorityFilter).some((v) => !v)
  const sportFilterActive = Object.values(filters.sportFilter).some((v) => !v)

  const sortedRaces = useMemo(() => {
    if (!sort) return races
    const { key, dir } = sort
    return [...races].sort((a, b) => {
      const weeksA = weeksUntilRace(a.date, today)
      const weeksB = weeksUntilRace(b.date, today)
      const statusA = a.intent === RaceIntent.WATCHING ? 'watching' : 'planned'
      const statusB = b.intent === RaceIntent.WATCHING ? 'watching' : 'planned'
      const sportA = a.sport ? WORKOUT_TYPE_LABELS[a.sport] : ''
      const sportB = b.sport ? WORKOUT_TYPE_LABELS[b.sport] : ''
      const resultA = raceOutcomeSummary(a) ?? ''
      const resultB = raceOutcomeSummary(b) ?? ''
      const distanceA = raceDistanceLabel(a.type, {
        triathlonDistance: a.triathlonDistance,
        hyroxDivision: a.hyroxDivision,
        customDistanceKm: a.customDistanceKm,
        legs: a.legs,
      })
      const distanceB = raceDistanceLabel(b.type, {
        triathlonDistance: b.triathlonDistance,
        hyroxDivision: b.hyroxDivision,
        customDistanceKm: b.customDistanceKm,
        legs: b.legs,
      })
      const av =
        key === 'date'
          ? a.date.getTime()
          : key === 'name'
            ? a.name
            : key === 'status'
              ? statusA
              : key === 'result'
                ? resultA
                : key === 'sport'
                  ? sportA
                  : key === 'priority'
                    ? a.priority
                    : key === 'location'
                      ? a.location ?? ''
                      : key === 'distance'
                        ? distanceA
                        : weeksA
      const bv =
        key === 'date'
          ? b.date.getTime()
          : key === 'name'
            ? b.name
            : key === 'status'
              ? statusB
              : key === 'result'
                ? resultB
                : key === 'sport'
                  ? sportB
                  : key === 'priority'
                    ? b.priority
                    : key === 'location'
                      ? b.location ?? ''
                      : key === 'distance'
                        ? distanceB
                        : weeksB
      return compareDataSort(av, bv, dir)
    })
  }, [races, sort, today])

  const sortHeader = (key: SortKey, label: string) => (
    <DataSortHeader
      label={label}
      active={sort?.key === key}
      dir={sort?.key === key ? sort.dir : null}
      onClick={() => setSort((s) => nextDataSort(s, key))}
    />
  )

  return (
    <div className={DATA_TABLE_SHELL}>
      <div className="hidden overflow-x-auto md:block">
        <table className={cn(DATA_TABLE, 'min-w-[40rem]')} data-density="comfortable">
          <thead>
            <tr>
              <th>{sortHeader('date', 'Date')}</th>
              <th>{sortHeader('name', 'Race')}</th>
              <th>
                <span className="inline-flex items-center gap-0.5">
                  {sortHeader('sport', 'Sport')}
                  <HeaderFilterMenu
                    label="Sport"
                    iconOnly
                    active={sportFilterActive}
                    onShowAll={() => filters.onSetSportAll(true)}
                    onShowNone={() => filters.onSetSportAll(false)}
                    allSelected={Object.values(filters.sportFilter).every(Boolean)}
                    noneSelected={Object.values(filters.sportFilter).every((v) => !v)}
                  >
                    {PLANNER_SPORTS.map((sport) => (
                      <HeaderFilterItem
                        key={sport}
                        label={PLANNER_SPORT_LABELS[sport]}
                        checked={filters.sportFilter[sport]}
                        onSelect={() => filters.onToggleSport(sport)}
                      />
                    ))}
                  </HeaderFilterMenu>
                </span>
              </th>
              <th>{sortHeader('distance', 'Distance')}</th>
              <th>{sortHeader('location', 'Location')}</th>
              <th>
                <span className="inline-flex items-center gap-0.5">
                  {sortHeader('priority', 'Priority')}
                  <HeaderFilterMenu
                    label="Priority"
                    iconOnly
                    active={priorityFilterActive}
                    onShowAll={() => filters.onSetPriorityAll(true)}
                    onShowNone={() => filters.onSetPriorityAll(false)}
                    allSelected={Object.values(filters.priorityFilter).every(Boolean)}
                    noneSelected={Object.values(filters.priorityFilter).every((v) => !v)}
                  >
                    {PLANNER_PRIORITY_LANES.map(({ priority }) => (
                      <HeaderFilterItem
                        key={priority}
                        label={priority}
                        checked={filters.priorityFilter[priority]}
                        onSelect={() => filters.onTogglePriority(priority)}
                        dotClass={PLANNER_PRIORITY_DOT[priority]}
                      />
                    ))}
                  </HeaderFilterMenu>
                </span>
              </th>
              <th>
                <span className="inline-flex items-center gap-0.5">
                  {sortHeader('status', 'Status')}
                  <HeaderFilterMenu
                    label="Status"
                    iconOnly
                    active={statusFilterActive}
                    onShowAll={() => filters.onSetStatusAll(true)}
                    onShowNone={() => filters.onSetStatusAll(false)}
                    allSelected={filters.showPlanned && filters.showWatching}
                    noneSelected={!filters.showPlanned && !filters.showWatching}
                  >
                    <HeaderFilterItem
                      label={RACE_INTENT_LABELS.PLANNED}
                      checked={filters.showPlanned}
                      onSelect={filters.onTogglePlanned}
                    />
                    <HeaderFilterItem
                      label={RACE_INTENT_LABELS.WATCHING}
                      checked={filters.showWatching}
                      onSelect={filters.onToggleWatching}
                    />
                  </HeaderFilterMenu>
                </span>
              </th>
              {isPast ? <th>{sortHeader('result', 'Result')}</th> : null}
              {!isPast ? <th>{sortHeader('weeks', 'Time left')}</th> : null}
              <th>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRaces.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedRaces.map((race) => {
                const weeks = weeksUntilRace(race.date, today)
                const days = daysUntil(race.date)
                const isWatching = race.intent === RaceIntent.WATCHING
                const statusLabel = isWatching
                  ? RACE_INTENT_LABELS.WATCHING
                  : RACE_INTENT_LABELS.PLANNED
                return (
                  <tr key={race.id} className={cn(isPast && 'opacity-80')}>
                    <td className={cn('whitespace-nowrap', DATA_CELL_SECONDARY)}>
                      {race.date.toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td>
                      <button
                        type="button"
                        className={cn('text-left hover:underline', DATA_CELL_PRIMARY)}
                        onClick={() => onSelect(race.id)}
                      >
                        {race.name}
                      </button>
                    </td>
                    <td>
                      {race.sport ? (
                        <span className="inline-flex items-center gap-2">
                          <WorkoutSportIcon type={race.sport} size="xs" />
                          <span className={DATA_CELL_SECONDARY}>
                            {WORKOUT_TYPE_LABELS[race.sport]}
                          </span>
                        </span>
                      ) : (
                        <span className={DATA_CELL_META}>—</span>
                      )}
                    </td>
                    <td className={cn('whitespace-nowrap', DATA_CELL_SECONDARY)}>
                      {raceDistanceLabel(race.type, {
                        triathlonDistance: race.triathlonDistance,
                        hyroxDivision: race.hyroxDivision,
                        customDistanceKm: race.customDistanceKm,
                        legs: race.legs,
                      })}
                    </td>
                    <td className={DATA_CELL_SECONDARY}>{race.location || '—'}</td>
                    <td>
                      {isWatching ? (
                        <span className={DATA_CELL_META}>—</span>
                      ) : (
                        <PriorityBadge priority={race.priority} />
                      )}
                    </td>
                    <td>
                      <StatusPill tone={isWatching ? 'watching' : 'planned'}>
                        {statusLabel}
                      </StatusPill>
                    </td>
                    {isPast ? (
                      <td className={cn('max-w-[9rem]', DATA_CELL_SECONDARY)}>
                        <button
                          type="button"
                          className="block max-w-full truncate text-left hover:underline"
                          onClick={() => onSelect(race.id)}
                          title={
                            race.outcome && race.outcome !== 'DISMISSED' && race.resultNotes
                              ? race.resultNotes
                              : undefined
                          }
                        >
                          {raceOutcomeSummary(race)}
                        </button>
                      </td>
                    ) : null}
                    {!isPast ? (
                      <td className="whitespace-nowrap text-xs tabular-nums leading-snug text-foreground">
                        <span className="font-medium">
                          {weeks === 0 ? 'This week' : `${weeks}w`}
                        </span>
                        <span className="font-normal text-muted-foreground">
                          {' '}
                          / {days}d
                        </span>
                      </td>
                    ) : null}
                    <td>
                      <RaceRowMenu race={race} />
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="md:hidden">
        {sortedRaces.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          sortedRaces.map((race) => {
            const weeks = weeksUntilRace(race.date, today)
            const days = daysUntil(race.date)
            const isWatching = race.intent === RaceIntent.WATCHING
            const statusLabel = isWatching
              ? RACE_INTENT_LABELS.WATCHING
              : RACE_INTENT_LABELS.PLANNED
            const result = isPast ? raceOutcomeSummary(race) : null
            return (
              <div
                key={race.id}
                className={cn(DATA_MOBILE_CARD, isPast && 'opacity-80')}
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    className={cn('min-w-0 flex-1 text-left', DATA_CELL_PRIMARY)}
                    onClick={() => onSelect(race.id)}
                  >
                    {race.name}
                  </button>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <StatusPill tone={isWatching ? 'watching' : 'planned'}>
                      {statusLabel}
                    </StatusPill>
                    <RaceRowMenu race={race} />
                  </div>
                </div>
                <button
                  type="button"
                  className={cn('mt-1 block w-full text-left', DATA_CELL_SECONDARY)}
                  onClick={() => onSelect(race.id)}
                >
                  {race.date.toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                  {' · '}
                  {RACE_TYPE_LABELS[race.type]}
                  {race.sport ? ` · ${WORKOUT_TYPE_LABELS[race.sport]}` : ''}
                </button>
                <p className={cn('mt-1', DATA_CELL_META)}>
                  {race.location || '—'}
                  {' · '}
                  {raceDistanceLabel(race.type, {
                    triathlonDistance: race.triathlonDistance,
                    hyroxDivision: race.hyroxDivision,
                    customDistanceKm: race.customDistanceKm,
                    legs: race.legs,
                  })}
                  {!isPast ? (
                    <>
                      {' · '}
                      <span className="tabular-nums text-foreground">
                        <span className="font-medium">
                          {weeks === 0 ? 'This week' : `${weeks}w`}
                        </span>
                        <span className="font-normal text-muted-foreground">
                          {' '}
                          / {days}d
                        </span>
                      </span>
                    </>
                  ) : null}
                  {!isWatching ? (
                    <>
                      {' · '}
                      Priority {race.priority}
                    </>
                  ) : null}
                </p>
                {result ? (
                  <p className={cn('mt-1', DATA_CELL_SECONDARY)}>{result}</p>
                ) : null}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function RaceRowMenu({ race }: { race: SeasonRace }) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
            aria-label="Race actions"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            className="z-[200] min-w-[10rem] overflow-hidden rounded-[10px] border border-border bg-card p-1 shadow-lg"
          >
            <DropdownMenu.Item asChild>
              <Link
                href={`/season/${race.id}/edit`}
                className="flex cursor-pointer items-center gap-2 rounded-[6px] px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-muted/60"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Link>
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className="flex cursor-pointer items-center gap-2 rounded-[6px] px-2.5 py-2 text-sm text-destructive outline-none data-[highlighted]:bg-muted/60"
              onSelect={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!open) setDeleteError(null)
          setDeleteOpen(open)
        }}
        title="Delete this race?"
        description={`${race.name} will be removed from your season plan.`}
        confirmLabel="Delete"
        pending={pending}
        onConfirm={() => {
          setDeleteError(null)
          startTransition(async () => {
            try {
              const fd = new FormData()
              fd.set('raceId', race.id)
              await deleteRace(fd)
              setDeleteOpen(false)
            } catch (err) {
              setDeleteError(err instanceof Error ? err.message : 'Could not delete race')
            }
          })
        }}
      >
        {deleteError ? <FormError message={deleteError} className="mt-3" /> : null}
      </ConfirmDialog>
    </>
  )
}

function PhaseBlockModal({
  state,
  onOpenChange,
}: {
  state:
    | { mode: 'create'; sport: PlannerSport }
    | { mode: 'edit'; block: SeasonPhaseBlockData }
    | null
  onOpenChange: (open: boolean) => void
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const open = Boolean(state)
  const editing = state?.mode === 'edit' ? state.block : null
  const defaultSport =
    state?.mode === 'create' ? state.sport : (editing?.sport as PlannerSport | undefined)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setError(null)
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit phase' : 'Add phase'}</DialogTitle>
          <DialogDescription>
            Planning blocks on sport lanes — they do not create workouts.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            setError(null)
            const fd = new FormData(e.currentTarget)
            startTransition(async () => {
              try {
                if (editing) {
                  fd.set('id', editing.id)
                  await updateSeasonPhaseBlock(fd)
                } else {
                  await createSeasonPhaseBlock(fd)
                }
                onOpenChange(false)
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Could not save phase')
              }
            })
          }}
        >
          <FormError message={error} />
          <FormField label="Sport">
            <Select name="sport" required defaultValue={defaultSport ?? 'RUN'}>
              {PLANNER_SPORTS.map((s) => (
                <option key={s} value={s}>
                  {PLANNER_SPORT_LABELS[s]}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Phase">
            <Select name="phase" required defaultValue={editing?.phase ?? SeasonPhase.BASE}>
              {(Object.keys(SEASON_PHASE_LABELS) as SeasonPhase[]).map((p) => (
                <option key={p} value={p}>
                  {SEASON_PHASE_LABELS[p]}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Label (optional)">
            <Input
              name="label"
              defaultValue={editing?.label ?? ''}
              placeholder="e.g. Base 1"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Start">
              <DateField
                key={`${editing?.id ?? 'new'}-start`}
                name="startDate"
                required
                defaultValue={
                  editing ? editing.startDate.toISOString().slice(0, 10) : undefined
                }
              />
            </FormField>
            <FormField label="End">
              <DateField
                key={`${editing?.id ?? 'new'}-end`}
                name="endDate"
                required
                defaultValue={
                  editing ? editing.endDate.toISOString().slice(0, 10) : undefined
                }
              />
            </FormField>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? 'Saving…' : editing ? 'Save' : 'Add phase'}
            </Button>
            {editing ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-destructive"
                disabled={pending}
                onClick={() => {
                  setError(null)
                  startTransition(async () => {
                    try {
                      const fd = new FormData()
                      fd.set('id', editing.id)
                      await deleteSeasonPhaseBlock(fd)
                      onOpenChange(false)
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Could not delete phase')
                    }
                  })
                }}
              >
                Delete
              </Button>
            ) : null}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
