'use client'

import { useEffect, useMemo, useState, useTransition, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MoreVertical, Pencil, Trash2, Search, X, ChevronDown, Check } from 'lucide-react'
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
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { SegmentedControl, SegmentedControlItem } from '@/components/ui/segmented-control'
import { PriorityBadge } from '@/components/races/priority-badge'
import { AddRaceButton, WatchRaceButton } from '@/components/races/add-race-modal'
import { RaceDetailSheet } from '@/components/races/race-detail-sheet'
import { WorkoutSportIcon } from '@/components/plan/workout-sport-icon'
import { deleteRace } from '@/app/actions/workouts'
import {
  createSeasonPhaseBlock,
  deleteSeasonPhaseBlock,
  updateSeasonPhaseBlock,
} from '@/app/actions/season-phases'
import { SeasonEventModal } from '@/components/plan/season-event-modal'
import { raceOutcomeSummary, type SeasonRace } from '@/lib/season-races'
import { daysUntil } from '@/lib/utils'
import {
  DEFAULT_PLANNER_ZOOM,
  PLANNER_PRIORITY_CARD,
  PLANNER_PRIORITY_DOT,
  PLANNER_PRIORITY_SHADOW,
  PLANNER_PRIORITY_LANES,
  PLANNER_SPORTS,
  PLANNER_SPORT_LABELS,
  PLANNER_SPORT_TINT,
  PLANNER_ZOOM_LABELS,
  SEASON_EVENT_CARD,
  formatSeasonEventLabel,
  SEASON_PHASE_LABELS,
  buildPlannerScrollRange,
  buildPlannerWeekColumns,
  groupPlannerMonths,
  plannerViewportMonths,
  plannerWeekColumnWidth,
  prepWindowForRace,
  resolvePreparationWeeks,
  todayWeekIndex,
  weekIndexForDate,
  weeksUntilRace,
  type PlannerSport,
  type SeasonEventData,
  type SeasonPhaseBlockData,
} from '@/lib/season-planner'
import {
  RACE_INTENT_LABELS,
  RACE_PRIORITY_LABELS,
  RACE_TYPE_LABELS,
  WORKOUT_TYPE_LABELS,
} from '@/lib/constants'
import { cn } from '@/lib/utils'
import { toDateKey } from '@/lib/dates'

type RacesPageClientProps = {
  allPlanned: SeasonRace[]
  watching: SeasonRace[]
  phaseBlocks: SeasonPhaseBlockData[]
  seasonEvents: SeasonEventData[]
  athleteId: string
}

export function RacesPageClient({
  allPlanned,
  watching,
  phaseBlocks,
  seasonEvents,
  athleteId,
}: RacesPageClientProps) {
  const allRaces = useMemo(
    () => [...allPlanned, ...watching].sort((a, b) => a.date.getTime() - b.date.getTime()),
    [allPlanned, watching],
  )

  return (
    <div className="space-y-8">
      <SeasonPlannerView
        planned={allPlanned}
        watching={watching}
        phaseBlocks={phaseBlocks}
        seasonEvents={seasonEvents}
        athleteId={athleteId}
      />
      <AllRacesTable races={allRaces} athleteId={athleteId} />
    </div>
  )
}

type LaneMode = 'priority' | 'sport'

function SeasonPlannerView({
  planned,
  watching,
  phaseBlocks,
  seasonEvents,
  athleteId,
}: {
  planned: SeasonRace[]
  watching: SeasonRace[]
  phaseBlocks: SeasonPhaseBlockData[]
  seasonEvents: SeasonEventData[]
  athleteId: string
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
  const [eventModal, setEventModal] = useState<
    | { mode: 'create' }
    | { mode: 'edit'; event: SeasonEventData }
    | null
  >(null)

  const weeks = useMemo(() => {
    const { start, end } = buildPlannerScrollRange(today)
    return buildPlannerWeekColumns(start, end)
  }, [today])
  const months = useMemo(() => groupPlannerMonths(weeks), [weeks])
  const colW = plannerWeekColumnWidth(zoom)
  const todayIdx = todayWeekIndex(weeks, today)
  const viewportWeeks = Math.round(plannerViewportMonths(zoom) * 4.35)

  useEffect(() => {
    const t = window.setTimeout(() => scrollPlannerToWeek(todayIdx, colW), 50)
    return () => window.clearTimeout(t)
  }, [todayIdx, colW])

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

  return (
    <div className="space-y-5">
      <div className="flex flex-nowrap items-center gap-x-2 overflow-x-auto pb-0.5">
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

        <AddRaceButton
          variant="secondary"
          size="sm"
          className="shrink-0"
          athleteId={athleteId}
        />

        <PlannerToolbar
          zoom={zoom}
          onZoomChange={setZoom}
          onToday={() => scrollPlannerToWeek(todayIdx, colW)}
          onPrev={() => nudgePlannerScroll(-viewportWeeks * colW)}
          onNext={() => nudgePlannerScroll(viewportWeeks * colW)}
        />
      </div>

      <SeasonPlannerBoard
        weeks={weeks}
        months={months}
        colW={colW}
        todayIdx={todayIdx}
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
        onAddEvent={() => setEventModal({ mode: 'create' })}
        onEditEvent={(event) => setEventModal({ mode: 'edit', event })}
      />

      <div className="flex flex-nowrap items-center gap-x-2 overflow-x-auto pb-0.5">
        {PLANNER_PRIORITY_LANES.map(({ priority }) => (
          <FilterChip
            key={priority}
            active={priorityFilter[priority]}
            onClick={() =>
              setPriorityFilter((prev) => ({ ...prev, [priority]: !prev[priority] }))
            }
            dotClass={PLANNER_PRIORITY_DOT[priority]}
            label={priority}
          />
        ))}
        <FilterChip
          active={showWatching}
          onClick={() => setShowWatching((prev) => !prev)}
          label="Watching"
        />
        <FilterChip
          active={showEvents}
          onClick={() => setShowEvents((prev) => !prev)}
          label="Events"
        />
        <div className="mx-0.5 h-5 w-px shrink-0 bg-foreground/20" aria-hidden />
        {PLANNER_SPORTS.map((sport) => (
          <FilterChip
            key={sport}
            active={sportFilter[sport]}
            onClick={() =>
              setSportFilter((prev) => ({ ...prev, [sport]: !prev[sport] }))
            }
            label={PLANNER_SPORT_LABELS[sport]}
          />
        ))}
      </div>

      <RaceDetailSheet
        race={selected}
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null)
        }}
        onChanged={() => router.refresh()}
      />

      <PhaseBlockModal
        state={phaseModal}
        onOpenChange={(open) => {
          if (!open) setPhaseModal(null)
        }}
      />

      <SeasonEventModal
        open={Boolean(eventModal)}
        onOpenChange={(open) => {
          if (!open) setEventModal(null)
        }}
        event={eventModal?.mode === 'edit' ? eventModal.event : null}
      />
    </div>
  )
}

function nudgePlannerScroll(delta: number) {
  const el = document.getElementById('season-planner-scroller')
  if (el) el.scrollBy({ left: delta, behavior: 'smooth' })
}

function scrollPlannerToWeek(weekIndex: number, colW: number) {
  const el = document.getElementById('season-planner-scroller')
  if (!el) return
  const labelW = 112
  const target = Math.max(0, labelW + weekIndex * colW - el.clientWidth * 0.2)
  el.scrollTo({ left: target, behavior: 'smooth' })
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
  return (
    <div className="ml-auto flex shrink-0 items-center gap-1.5 pl-2">
      <SegmentedControl aria-label="Calendar range" className="shrink-0">
        {PLANNER_ZOOM_LABELS.map((label, i) => (
          <SegmentedControlItem
            key={label}
            active={zoom === i}
            onClick={() => onZoomChange(i)}
          >
            {label.replace(' months', ' mo')}
          </SegmentedControlItem>
        ))}
      </SegmentedControl>
      <Button type="button" variant="secondary" size="sm" onClick={onToday}>
        Today
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onPrev} aria-label="Previous period">
        ←
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onNext} aria-label="Next period">
        →
      </Button>
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  label,
  dotClass,
}: {
  active: boolean
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
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition',
        active
          ? 'border-foreground/25 bg-white text-foreground shadow-sm'
          : 'border-transparent bg-transparent text-muted-foreground/55 line-through decoration-muted-foreground/40 hover:bg-muted/40 hover:text-muted-foreground',
      )}
    >
      {dotClass ? (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            dotClass,
            !active && 'opacity-40',
          )}
        />
      ) : null}
      {label}
    </button>
  )
}

function SeasonPlannerBoard({
  weeks,
  months,
  colW,
  todayIdx,
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
  onAddEvent,
  onEditEvent,
}: {
  weeks: ReturnType<typeof buildPlannerWeekColumns>
  months: ReturnType<typeof groupPlannerMonths>
  colW: number
  todayIdx: number
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
  onAddEvent: () => void
  onEditEvent: (event: SeasonEventData) => void
}) {
  const labelW = 112
  const gridW = weeks.length * colW

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
    <div className="overflow-hidden rounded-[6px] border border-border/70 bg-card">
      <div
        id="season-planner-scroller"
        className="season-planner-scroller overflow-x-auto"
      >
        <div style={{ width: labelW + gridW, minWidth: '100%' }} className="relative">
        {/* Month header */}
        <div className="sticky top-0 z-20 flex border-b border-white/10 bg-sidebar text-sidebar-foreground">
          <div
            className="sticky left-0 z-30 shrink-0 border-r border-white/18 bg-sidebar px-2 py-1.5 text-[10px] font-semibold text-sidebar-foreground/70"
            style={{ width: labelW }}
          >
            Season
          </div>
          <div className="flex" style={{ width: gridW }}>
            {months.map((m) => (
              <div
                key={m.key}
                className="border-r border-white/15 px-1 py-1.5 text-center text-[10px] font-semibold text-sidebar-foreground"
                style={{ width: m.weekCount * colW }}
              >
                <span>{m.label}</span>
                <span className="ml-1 text-sidebar-foreground/55">{m.year}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Week numbers — lighter than month header */}
        <div className="sticky top-[30px] z-20 flex border-b border-black/10 bg-[#7a7f8c] text-white">
          <div
            className="sticky left-0 z-10 shrink-0 border-r border-white/20 bg-[#7a7f8c]"
            style={{ width: labelW }}
          />
          <div className="flex" style={{ width: gridW }}>
            {weeks.map((w, i) => (
              <div
                key={w.key}
                className={cn(
                  'border-r py-1 text-center text-[9px] tabular-nums text-white/85',
                  isPlannerMonthEnd(weeks, i)
                    ? 'border-white/35'
                    : 'border-white/15',
                  i === todayIdx && 'bg-white/20 font-semibold text-white',
                )}
                style={{ width: colW }}
              >
                {w.isoWeek}
              </div>
            ))}
          </div>
        </div>

        {/* Breathing room between week header and race lanes — keep week guidelines */}
        <div className="flex h-2 bg-card" aria-hidden>
          <div
            className="sticky left-0 z-10 shrink-0 border-r border-border/60 bg-card"
            style={{ width: labelW }}
          />
          <div className="relative" style={{ width: gridW }}>
            {weeks.map((w, i) => (
              <div
                key={`gap-${w.key}`}
                className={cn(
                  'absolute inset-y-0 border-r',
                  isPlannerMonthEnd(weeks, i)
                    ? 'border-foreground/18'
                    : 'border-black/[0.05]',
                  i === todayIdx && 'bg-brand/[0.04]',
                )}
                style={{ left: i * colW, width: colW }}
              />
            ))}
          </div>
        </div>

        {/* Today line — below sticky lane labels so it clips under the left column */}
        <div
          className="pointer-events-none absolute bottom-0 top-0 z-[1] border-l border-dashed border-brand/70"
          style={{ left: labelW + todayIdx * colW + colW / 2 }}
        >
          <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-brand px-1.5 py-0.5 text-[9px] font-semibold text-white">
            Today
          </span>
        </div>

        {/* Priority lanes — planned races only */}
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
              weeks={weeks}
              todayIdx={todayIdx}
              contentMinHeight={raceLaneMinHeight(laneRaces, weeks, colW)}
            >
              <StackedRaceCards
                races={laneRaces}
                weeks={weeks}
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
            weeks={weeks}
            todayIdx={todayIdx}
            contentMinHeight={raceLaneMinHeight(watchingRaces, weeks, colW)}
          >
            <StackedRaceCards
              races={watchingRaces}
              weeks={weeks}
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
            weeks={weeks}
            todayIdx={todayIdx}
            onLabelAction={onAddEvent}
            labelActionTitle="Add event"
            contentMinHeight={eventLaneMinHeight(seasonEvents, weeks, colW)}
            thickBottom
          >
            <StackedEventCards
              events={seasonEvents}
              weeks={weeks}
              colW={colW}
              onEditEvent={onEditEvent}
            />
          </PlannerLane>
        ) : null}

        {/* Sport lanes: phase blocks + races for that sport */}
        {visibleSports.map((sport) => {
          const sportRaces = races.filter((r) => r.sport === sport)
          const raceLayoutHeight = raceLaneMinHeight(sportRaces, weeks, colW)
          return (
            <PlannerLane
              key={sport}
              label={PLANNER_SPORT_LABELS[sport]}
              labelW={labelW}
              gridW={gridW}
              colW={colW}
              weeks={weeks}
              todayIdx={todayIdx}
              onLabelAction={() => onAddPhase(sport)}
              labelActionTitle="Add phase"
              contentMinHeight={Math.max(raceLayoutHeight, 40)}
            >
              {phaseBlocks
                .filter((b) => b.sport === sport)
                .map((block) => {
                  const start = weekIndexForDate(weeks, block.startDate)
                  const end = weekIndexForDate(weeks, block.endDate)
                  const span = Math.max(1, end - start + 1)
                  return (
                    <button
                      key={block.id}
                      type="button"
                      onClick={() => onEditPhase(block)}
                      className={cn(
                        'absolute inset-y-1.5 z-[1] overflow-hidden rounded-[5px] border px-1.5 text-left text-[10px] font-semibold leading-tight',
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
                colW={colW}
                today={today}
                onSelectRace={onSelectRace}
              />
            </PlannerLane>
          )
        })}
        </div>
      </div>
    </div>
  )
}

function isPlannerMonthEnd(
  weeks: ReturnType<typeof buildPlannerWeekColumns>,
  weekIndex: number,
): boolean {
  if (weekIndex < 0 || weekIndex >= weeks.length - 1) return false
  return weeks[weekIndex].monthKey !== weeks[weekIndex + 1].monthKey
}

function PlannerLane({
  label,
  labelW,
  gridW,
  colW,
  weeks,
  todayIdx,
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
  weeks: ReturnType<typeof buildPlannerWeekColumns>
  todayIdx: number
  children?: React.ReactNode
  /** Min height for the grid content area (stacking race cards). */
  contentMinHeight?: number
  /** Stronger bottom rule — e.g. between priority lanes and sport lanes. */
  thickBottom?: boolean
  onLabelAction?: () => void
  labelActionTitle?: string
}) {
  const minH = contentMinHeight ?? 44
  const weekCount = weeks.length
  return (
    <div
      className={cn(
        'relative flex',
        thickBottom ? 'border-b-2 border-foreground/30' : 'border-b border-border/40',
      )}
      style={{ minHeight: minH }}
    >
      <div
        className="sticky left-0 z-10 flex shrink-0 items-center gap-1 border-r border-border/60 bg-card px-2"
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
        {Array.from({ length: weekCount }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'absolute inset-y-0 border-r',
              isPlannerMonthEnd(weeks, i)
                ? 'border-foreground/18'
                : 'border-black/[0.05]',
              i === todayIdx && 'bg-brand/[0.04]',
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
/** Taller card for wide week columns (3-month zoom) — date + 2-line name. */
const RACE_CARD_HEIGHT_ROOMY = 50
const RACE_CARD_TOP = 6
const RACE_CARD_STACK_GAP = 3
const RACE_CARD_BOTTOM_PAD = 6

const EVENT_CARD_HEIGHT_COMPACT = 34
/** Taller card for wide week columns (3-month zoom) — date + 2-line title. */
const EVENT_CARD_HEIGHT_ROOMY = 50
const EVENT_CARD_TOP = 6
const EVENT_CARD_STACK_GAP = 3
const EVENT_CARD_BOTTOM_PAD = 6

/** Wide enough week column (≈3-month zoom) for a roomier race card. */
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

/** 3-month: one week. Zoomed-out: stretch so the name stays readable. */
function raceCardWidth(colW: number) {
  if (raceCardRoomy(colW)) return Math.max(colW - 4, 1)
  return Math.min(Math.max(colW * 1.85, 92), 148)
}

/** Assign vertical stack rows so overlapping event ranges don't cover each other. */
function layoutStackedEvents(
  events: SeasonEventData[],
  weeks: ReturnType<typeof buildPlannerWeekColumns>,
  colW: number,
) {
  const items = [...events]
    .map((event) => {
      const start = weekIndexForDate(weeks, event.startDate)
      const end = weekIndexForDate(weeks, event.endDate)
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
  weeks: ReturnType<typeof buildPlannerWeekColumns>,
  colW: number,
) {
  if (events.length === 0) return raceCardRoomy(colW) ? 58 : 44
  const { rows } = layoutStackedEvents(events, weeks, colW)
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
  weeks,
  colW,
  onEditEvent,
}: {
  events: SeasonEventData[]
  weeks: ReturnType<typeof buildPlannerWeekColumns>
  colW: number
  onEditEvent: (event: SeasonEventData) => void
}) {
  const { items } = layoutStackedEvents(events, weeks, colW)
  const cardH = eventCardHeight(colW)
  const roomy = raceCardRoomy(colW)
  return (
    <>
      {items.map(({ event, left, width, stack }) => {
        const top = EVENT_CARD_TOP + stack * (cardH + EVENT_CARD_STACK_GAP)
        const label = formatSeasonEventLabel(event)
        const dateLabel = formatEventDateRange(event.startDate, event.endDate)
        return (
          <button
            key={event.id}
            type="button"
            onClick={() => onEditEvent(event)}
            className={cn(
              'absolute z-[1] overflow-hidden rounded-[6px] border px-1.5 py-0.5 text-left shadow-sm transition hover:brightness-[0.98]',
              SEASON_EVENT_CARD,
            )}
            style={{ left, width, top, height: cardH }}
            title={`${dateLabel} · ${label}`}
          >
            <p className="truncate text-[9px] font-medium leading-tight opacity-70">
              {dateLabel}
            </p>
            <p
              className={cn(
                'text-[11px] font-semibold leading-tight',
                roomy ? 'line-clamp-2' : 'truncate',
              )}
            >
              {label}
            </p>
          </button>
        )
      })}
    </>
  )
}

/** Assign vertical stack rows so overlapping cards / prep tails don't cover each other. */
function layoutStackedRaces(
  races: SeasonRace[],
  weeks: ReturnType<typeof buildPlannerWeekColumns>,
  colW: number,
  today?: Date,
) {
  const width = raceCardWidth(colW)
  const items = [...races]
    .map((race) => {
      const raceIdx = weekIndexForDate(weeks, race.date)
      const win = prepWindowForRace({
        raceId: race.id,
        raceDate: race.date,
        type: race.type,
        preparationWeeks: race.preparationWeeks,
        weeks,
        today,
      })
      const prepStart = win != null ? win.startWeekIndex : raceIdx
      // Occupancy spans prep weeks through the race card (may extend past race week when zoomed out).
      const spanLeft = prepStart * colW
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
  weeks: ReturnType<typeof buildPlannerWeekColumns>,
  colW: number,
) {
  if (races.length === 0) return raceCardRoomy(colW) ? 58 : 44
  const { rows } = layoutStackedRaces(races, weeks, colW)
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
  colW,
  today,
  onSelectRace,
}: {
  races: SeasonRace[]
  weeks: ReturnType<typeof buildPlannerWeekColumns>
  colW: number
  today: Date
  onSelectRace: (id: string) => void
}) {
  const { items } = layoutStackedRaces(races, weeks, colW, today)
  const cardH = raceCardHeight(colW)
  const roomy = raceCardRoomy(colW)
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
                  // Draw weeks before race; race week itself = 1 (not drawn under the card).
                  { length: prepWin.endWeekIndex - prepWin.startWeekIndex },
                  (_, i) => {
                    const weekIdx = prepWin.startWeekIndex + i
                    const weeksLeft = prepWin.endWeekIndex - weekIdx + 1
                    return (
                      <div
                        key={`${race.id}-prep-${weekIdx}`}
                        className={cn(
                          'pointer-events-none absolute z-[1] flex items-center justify-center rounded-[4px] text-[9px] font-medium tabular-nums',
                          PLANNER_PRIORITY_SHADOW[race.priority],
                        )}
                        style={{
                          left: weekIdx * colW + 1,
                          width: colW - 2,
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
            />
          </div>
        )
      })}
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
}: {
  race: SeasonRace
  left: number
  width: number
  top: number
  height: number
  nameLines: 1 | 2
  onSelect: () => void
}) {
  const isWatching = race.intent === RaceIntent.WATCHING
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'absolute z-[2] overflow-hidden rounded-[6px] border px-1.5 py-0.5 text-left shadow-sm transition hover:brightness-[0.98]',
        isWatching
          ? 'border-dashed border-muted-foreground/40 bg-muted/40 text-muted-foreground'
          : PLANNER_PRIORITY_CARD[race.priority],
      )}
      style={{ left, width, top, height }}
      title={race.name}
    >
      <p className="truncate text-[9px] font-medium leading-tight opacity-70">
        {race.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
      </p>
      <p
        className={cn(
          'text-[11px] font-semibold leading-tight',
          nameLines === 2 ? 'line-clamp-2' : 'truncate',
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
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  label: string
}) {
  const hasSearch = value.trim().length > 0
  return (
    <label
      className={cn(
        'group relative flex h-9 w-full max-w-[14rem] items-center gap-2 rounded-full border bg-muted/40 pl-3 pr-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] transition',
        'border-border/60 hover:border-border hover:bg-muted/55',
        'focus-within:border-foreground/25 focus-within:bg-card focus-within:shadow-sm',
        hasSearch && 'border-foreground/20 bg-card',
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

function AllRacesTable({ races, athleteId }: { races: SeasonRace[]; athleteId: string }) {
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
    <div className="space-y-8">
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
          <div className="flex shrink-0 items-center gap-2">
            <WatchRaceButton variant="ghost" size="sm" athleteId={athleteId} />
            <AddRaceButton variant="secondary" size="sm" athleteId={athleteId} />
          </div>
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
      />

      <RaceDetailSheet
        race={selected}
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null)
        }}
        onChanged={() => router.refresh()}
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
}: {
  title: string
  description: string
  races: SeasonRace[]
  today: Date
  variant: 'upcoming' | 'past'
  searchPlaceholder: string
  searchLabel: string
  emptyNoResults: string
  emptyDefault: string
  onSelect: (id: string) => void
  headerActions?: ReactNode
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
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <RaceSearchField
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={searchPlaceholder}
            label={searchLabel}
          />
          {headerActions}
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
}: {
  label: string
  active?: boolean
  onShowAll: () => void
  onShowNone: () => void
  allSelected: boolean
  noneSelected: boolean
  children: ReactNode
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-1 rounded px-0.5 font-semibold uppercase tracking-wide transition',
            'text-sidebar-foreground/80 hover:text-sidebar-foreground',
            'outline-none focus-visible:ring-1 focus-visible:ring-sidebar-foreground/40',
            active && 'text-sidebar-foreground',
          )}
        >
          {label}
          <ChevronDown className="h-3 w-3 opacity-70" aria-hidden />
          {active ? (
            <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden />
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
  const statusFilterActive = !filters.showPlanned || !filters.showWatching
  const priorityFilterActive = Object.values(filters.priorityFilter).some((v) => !v)
  const sportFilterActive = Object.values(filters.sportFilter).some((v) => !v)

  return (
    <div className="overflow-x-auto rounded-[6px] border border-border/70 bg-white">
      <table className="w-full min-w-[40rem] text-left text-sm">
        <thead className="border-b border-white/10 bg-sidebar text-[10px] uppercase tracking-wide text-sidebar-foreground">
          <tr>
            <th className="px-3 py-2.5 font-semibold text-sidebar-foreground/80">Date</th>
            <th className="px-3 py-2.5 font-semibold text-sidebar-foreground/80">Race</th>
            <th className="px-3 py-2.5 font-semibold">
              <HeaderFilterMenu
                label="Status"
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
            </th>
            {isPast ? (
              <th className="px-3 py-2.5 font-semibold text-sidebar-foreground/80">Result</th>
            ) : null}
            <th className="px-3 py-2.5 font-semibold">
              <HeaderFilterMenu
                label="Sport"
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
            </th>
            <th className="px-3 py-2.5 font-semibold">
              <HeaderFilterMenu
                label="Priority"
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
            </th>
            <th className="px-3 py-2.5 font-semibold text-sidebar-foreground/80">Location</th>
            <th className="px-3 py-2.5 font-semibold text-sidebar-foreground/80">Goal</th>
            {!isPast ? (
              <th className="px-3 py-2.5 font-semibold text-sidebar-foreground/80">Weeks</th>
            ) : null}
            {!isPast ? (
              <th className="px-3 py-2.5 font-semibold text-sidebar-foreground/80">Prep</th>
            ) : null}
            <th className="px-3 py-2.5 font-semibold"> </th>
          </tr>
        </thead>
        <tbody>
          {races.length === 0 ? (
            <tr>
              <td
                colSpan={isPast ? 8 : 10}
                className="px-4 py-8 text-center text-sm text-muted-foreground"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            races.map((race) => {
              const weeks = weeksUntilRace(race.date, today)
              const prep = resolvePreparationWeeks(race.preparationWeeks)
              const statusLabel =
                race.intent === RaceIntent.WATCHING
                  ? RACE_INTENT_LABELS.WATCHING
                  : RACE_INTENT_LABELS.PLANNED
              return (
                <tr
                  key={race.id}
                  className={cn(
                    'border-b border-border/40 bg-white last:border-0 hover:bg-zinc-50',
                    isPast && 'opacity-80',
                  )}
                >
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums text-xs">
                    {race.date.toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="text-left font-medium hover:underline"
                      onClick={() => onSelect(race.id)}
                    >
                      {race.name}
                    </button>
                    <p className="text-[11px] text-muted-foreground">
                      {RACE_TYPE_LABELS[race.type]}
                    </p>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{statusLabel}</td>
                  {isPast ? (
                    <td className="max-w-[9rem] px-3 py-2 text-xs text-muted-foreground">
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
                  <td className="px-3 py-2 text-xs">
                    {race.sport ? (
                      <span className="inline-flex items-center gap-2">
                        <WorkoutSportIcon type={race.sport} size="xs" />
                        <span>{WORKOUT_TYPE_LABELS[race.sport]}</span>
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {race.intent === RaceIntent.WATCHING ? (
                      '—'
                    ) : (
                      <PriorityBadge priority={race.priority} />
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {race.location || '—'}
                  </td>
                  <td className="max-w-[8rem] truncate px-3 py-2 text-xs text-muted-foreground">
                    {race.goal || '—'}
                  </td>
                  {!isPast ? (
                    <td className="px-3 py-2 text-xs tabular-nums">
                      {weeks === 0 ? 'This week' : `${weeks}w`}
                    </td>
                  ) : null}
                  {!isPast ? (
                    <td className="px-3 py-2 text-xs tabular-nums">
                      {prep == null ? '—' : `${prep}w`}
                    </td>
                  ) : null}
                  <td className="px-3 py-2">
                    <RaceRowMenu race={race} />
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}

function RaceRowMenu({ race }: { race: SeasonRace }) {
  const [deleteOpen, setDeleteOpen] = useState(false)
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
        onOpenChange={setDeleteOpen}
        title="Delete this race?"
        description={`${race.name} will be removed from your season plan.`}
        confirmLabel="Delete"
        pending={pending}
        onConfirm={() => {
          startTransition(async () => {
            const fd = new FormData()
            fd.set('raceId', race.id)
            await deleteRace(fd)
            setDeleteOpen(false)
          })
        }}
      />
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
  const open = Boolean(state)
  const editing = state?.mode === 'edit' ? state.block : null
  const defaultSport =
    state?.mode === 'create' ? state.sport : (editing?.sport as PlannerSport | undefined)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            const fd = new FormData(e.currentTarget)
            startTransition(async () => {
              if (editing) {
                fd.set('id', editing.id)
                await updateSeasonPhaseBlock(fd)
              } else {
                await createSeasonPhaseBlock(fd)
              }
              onOpenChange(false)
            })
          }}
        >
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
              <Input
                name="startDate"
                type="date"
                required
                defaultValue={
                  editing ? editing.startDate.toISOString().slice(0, 10) : undefined
                }
              />
            </FormField>
            <FormField label="End">
              <Input
                name="endDate"
                type="date"
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
                  startTransition(async () => {
                    const fd = new FormData()
                    fd.set('id', editing.id)
                    await deleteSeasonPhaseBlock(fd)
                    onOpenChange(false)
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
