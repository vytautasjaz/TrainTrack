'use client'

import {
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { RacePriority } from '@prisma/client'
import { ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react'
import { SegmentedControl, SegmentedControlItem } from '@/components/ui/segmented-control'
import { StatusPill } from '@/components/ui/status-pill'
import {
  DataSortHeader,
  compareDataSort,
  nextDataSort,
  type DataSortState,
} from '@/components/ui/data-sort-header'
import { PriorityBadge } from '@/components/races/priority-badge'
import {
  ToolbarDivider,
  ToolbarTextToggle,
} from '@/components/training/plan-sport-filter-bar'
import {
  DEFAULT_PLANNER_ZOOM,
  PLANNER_PRIORITY_CARD,
  PLANNER_PRIORITY_DOT,
  PLANNER_PRIORITY_LANES,
  PLANNER_PRIORITY_SHADOW,
  PLANNER_SPORT_LABELS,
  PLANNER_SPORTS,
  PLANNER_ZOOM_LABELS,
  SEASON_EVENT_CARD,
  buildPlannerScrollRange,
  buildPlannerWeekColumns,
  groupPlannerMonths,
  plannerLabelWidth,
  plannerVisibleWeekCount,
  plannerViewportMonths,
  plannerWeekColumnWidth,
  todayWeekIndex,
  type PlannerSport,
} from '@/lib/season-planner'
import { WORKOUT_TYPE_DOT_CLASS } from '@/lib/workout-display'
import {
  DATA_CELL_META,
  DATA_CELL_PRIMARY,
  DATA_CELL_SECONDARY,
  DATA_NUM,
  DATA_TABLE,
  DATA_TABLE_SHELL,
  TABLE_HEADER,
  TABLE_HEADER_CELL_MUTED,
  TABLE_HEADER_CELL_STRONG,
  TABLE_HEADER_SUB,
  TABLE_HEADER_VLINE,
  TABLE_SHELL,
} from '@/lib/table-styles'
import { cn } from '@/lib/utils'

/** Mock “today” aligned with redesign horizon. */
const MOCK_TODAY = new Date(Date.UTC(2026, 7, 24))

const RACE_CARD_TOP = 6

function FilterGroup({
  label,
  hint,
  children,
}: {
  label: string
  hint: string
  children: ReactNode
}) {
  return (
    <div
      className="flex shrink-0 flex-col gap-0.5"
      title={hint}
      role="group"
      aria-label={label}
    >
      <span className="px-1.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-muted-foreground/55">
        {label}
      </span>
      <div className="flex items-center gap-0.5">{children}</div>
    </div>
  )
}

function SeasonFilterBar({
  priority,
  onTogglePriority,
  showWatching,
  onToggleWatching,
  showEvents,
  onToggleEvents,
  sport,
  onToggleSport,
}: {
  priority: Record<RacePriority, boolean>
  onTogglePriority: (p: RacePriority) => void
  showWatching: boolean
  onToggleWatching: () => void
  showEvents: boolean
  onToggleEvents: () => void
  sport: Record<PlannerSport, boolean>
  onToggleSport: (s: PlannerSport) => void
}) {
  return (
    <div className="flex min-w-0 items-end gap-2 overflow-x-auto pb-0.5">
      <FilterGroup label="Priority" hint="Show or hide A / B / C goal lanes">
        {PLANNER_PRIORITY_LANES.map(({ priority: p }) => (
          <ToolbarTextToggle
            key={p}
            pressed={priority[p]}
            onClick={() => onTogglePriority(p)}
            title={`${p} lane`}
          >
            <span
              className={cn('mr-1 h-1.5 w-1.5 rounded-full', PLANNER_PRIORITY_DOT[p])}
              aria-hidden
            />
            {p}
          </ToolbarTextToggle>
        ))}
      </FilterGroup>

      <ToolbarDivider className="mb-1.5 mx-0.5" />

      <FilterGroup label="Lanes" hint="Toggle Watching and Events rows">
        <ToolbarTextToggle
          pressed={showWatching}
          onClick={onToggleWatching}
          title={showWatching ? 'Hide Watching lane' : 'Show Watching lane'}
        >
          Watching
        </ToolbarTextToggle>
        <ToolbarTextToggle
          pressed={showEvents}
          onClick={onToggleEvents}
          title={showEvents ? 'Hide Events lane' : 'Show Events lane'}
        >
          Events
        </ToolbarTextToggle>
      </FilterGroup>

      <ToolbarDivider className="mb-1.5 mx-0.5" />

      <FilterGroup label="Sport" hint="Filter races by sport (mock)">
        {PLANNER_SPORTS.map((s) => (
          <ToolbarTextToggle
            key={s}
            pressed={sport[s]}
            onClick={() => onToggleSport(s)}
            title={PLANNER_SPORT_LABELS[s]}
          >
            <span
              className={cn('mr-1 h-1.5 w-1.5 rounded-full', WORKOUT_TYPE_DOT_CLASS[s])}
              aria-hidden
            />
            {PLANNER_SPORT_LABELS[s].replace('Running', 'Run').replace('Cycling', 'Bike').replace('Swimming', 'Swim')}
          </ToolbarTextToggle>
        ))}
      </FilterGroup>
    </div>
  )
}

function isPlannerMonthEnd(
  weeks: ReturnType<typeof buildPlannerWeekColumns>,
  weekIndex: number,
): boolean {
  if (weekIndex < 0 || weekIndex >= weeks.length - 1) return false
  return weeks[weekIndex]!.monthKey !== weeks[weekIndex + 1]!.monthKey
}

const UPCOMING = [
  {
    date: '23 Aug 2026',
    dateKey: '2026-08-23',
    name: 'Local 10K',
    type: 'Road race',
    status: 'planned' as const,
    sport: 'Run',
    priority: 'C' as const,
    location: 'Vilnius',
    weeks: 0,
  },
  {
    date: '12 Oct 2026',
    dateKey: '2026-10-12',
    name: 'Vilnius Marathon',
    type: 'Marathon',
    status: 'planned' as const,
    sport: 'Run',
    priority: 'A' as const,
    location: 'Vilnius',
    weeks: 7,
  },
  {
    date: '4 Oct 2026',
    dateKey: '2026-10-04',
    name: 'Trakai Half',
    type: 'Half marathon',
    status: 'watching' as const,
    sport: 'Swim',
    priority: 'B' as const,
    location: 'Trakai',
    weeks: 6,
  },
  {
    date: '18 Sep 2026',
    dateKey: '2026-09-18',
    name: 'Nida Bike Race',
    type: 'Cycling',
    status: 'planned' as const,
    sport: 'Bike',
    priority: 'B' as const,
    location: 'Nida',
    weeks: 4,
  },
]

const PAST = [
  {
    date: '3 May 2026',
    dateKey: '2026-05-03',
    name: 'Druskininkai Half',
    type: 'Half marathon',
    sport: 'Run',
    priority: 'B' as const,
    result: '1:36:02',
  },
  {
    date: '12 Apr 2026',
    dateKey: '2026-04-12',
    name: 'Kaunas 10K',
    type: 'Road race',
    sport: 'Run',
    priority: 'C' as const,
    result: '42:18',
  },
  {
    date: '22 Jun 2025',
    dateKey: '2025-06-22',
    name: 'Trakai Sprint Tri',
    type: 'Triathlon',
    sport: 'Tri',
    priority: 'A' as const,
    result: '1:12:40',
  },
]

function useMockPlannerLayout(zoom: number) {
  const [layout, setLayout] = useState(() => ({
    labelW: plannerLabelWidth(1024),
    colW: plannerWeekColumnWidth(zoom),
  }))

  useLayoutEffect(() => {
    const measure = () => {
      const el = document.getElementById('season-planner-scroller')
      const labelW = plannerLabelWidth(window.innerWidth)
      const scrollerW = el?.clientWidth ?? Math.max(0, window.innerWidth - 32)
      const visibleGrid = Math.max(160, scrollerW - labelW)
      setLayout({
        labelW,
        colW: plannerWeekColumnWidth(zoom, visibleGrid),
      })
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

  return layout
}

function WeekGuides({
  weeks,
  colW,
  todayIdx,
}: {
  weeks: ReturnType<typeof buildPlannerWeekColumns>
  colW: number
  todayIdx: number
}) {
  return (
    <>
      {weeks.map((w, i) => (
        <div
          key={`g-${w.key}`}
          data-month-end={isPlannerMonthEnd(weeks, i) ? 'true' : undefined}
          className={cn(
            'tt-season-week-line absolute inset-y-0',
            i === todayIdx && 'tt-season-today-col',
          )}
          style={{ left: i * colW, width: colW }}
        />
      ))}
    </>
  )
}

function Lane({
  label,
  labelW,
  gridW,
  colW,
  weeks,
  todayIdx,
  children,
  thickerBottom,
}: {
  label: string
  labelW: number
  gridW: number
  colW: number
  weeks: ReturnType<typeof buildPlannerWeekColumns>
  todayIdx: number
  children?: ReactNode
  thickerBottom?: boolean
}) {
  return (
    <div
      className={cn(
        'tt-season-lane relative flex border-b',
        thickerBottom && 'border-b-2',
      )}
    >
      <div
        className="tt-season-lane-label sticky left-0 z-10 flex shrink-0 items-center border-r bg-white px-2 text-[11px] font-semibold text-foreground"
        style={{ width: labelW }}
      >
        {label}
      </div>
      <div
        className="relative"
        style={{ width: gridW, minHeight: colW >= 56 ? 62 : 46 }}
      >
        <WeekGuides weeks={weeks} colW={colW} todayIdx={todayIdx} />
        {children}
      </div>
    </div>
  )
}

function RaceCard({
  weekIndex,
  prepWeeks,
  priority,
  date,
  name,
  colW,
  watching,
}: {
  weekIndex: number
  prepWeeks: number
  priority: 'A' | 'B' | 'C'
  date: string
  name: string
  colW: number
  watching?: boolean
}) {
  const roomy = colW >= 56
  const cardW = roomy ? Math.max(colW - 4, 1) : Math.min(Math.max(colW * 1.85, 92), 148)
  const cardH = roomy ? 50 : 34
  /** Prep includes race week as “1” — shadows only on weeks before the card. */
  const prepStart = Math.max(0, weekIndex - (prepWeeks - 1))
  const prepCount = Math.max(0, weekIndex - prepStart)

  return (
    <>
      {Array.from({ length: prepCount }, (_, i) => {
        const wi = prepStart + i
        const weeksLeft = weekIndex - wi + 1
        return (
          <div
            key={`prep-${wi}`}
            className={cn(
              'pointer-events-none absolute z-[1] flex items-center justify-center rounded-[4px] text-[9px] font-medium tabular-nums',
              PLANNER_PRIORITY_SHADOW[priority],
            )}
            style={{
              left: wi * colW + 1,
              width: colW - 2,
              top: RACE_CARD_TOP,
              height: cardH,
            }}
            title={`${weeksLeft} weeks to ${name}`}
          >
            {weeksLeft}
          </div>
        )
      })}
      <div
        className={cn(
          'absolute z-[2] flex min-w-0 flex-col justify-center rounded-[6px] border px-1.5 py-0.5 text-left',
          watching
            ? 'border-dashed border-foreground/25 bg-muted/40 text-foreground'
            : PLANNER_PRIORITY_CARD[priority],
        )}
        style={{
          left: weekIndex * colW + 2,
          width: cardW,
          top: RACE_CARD_TOP,
          height: cardH,
        }}
      >
        <p className="truncate text-[9px] font-medium leading-none opacity-70">{date}</p>
        <p
          className={cn(
            'font-semibold leading-tight',
            roomy ? 'line-clamp-2 text-[11px]' : 'truncate text-[10px]',
          )}
        >
          {name}
        </p>
      </div>
    </>
  )
}

/**
 * Static Season Plan mock — production column sizing:
 * week width = viewport ÷ visible weeks for zoom (3/6/12 mo).
 * Ultra-wide: content capped like app shell (`max-w-[90rem]`).
 */
export function SeasonMockContent() {
  const [zoom, setZoom] = useState(DEFAULT_PLANNER_ZOOM)
  const [priority, setPriority] = useState<Record<RacePriority, boolean>>({
    A: true,
    B: true,
    C: true,
  })
  const [showWatching, setShowWatching] = useState(true)
  const [showEvents, setShowEvents] = useState(true)
  const [sport, setSport] = useState<Record<PlannerSport, boolean>>(() =>
    Object.fromEntries(PLANNER_SPORTS.map((s) => [s, true])) as Record<PlannerSport, boolean>,
  )
  const [upcomingSort, setUpcomingSort] = useState<DataSortState<
    'date' | 'name' | 'status' | 'sport' | 'priority' | 'location' | 'weeks'
  > | null>({ key: 'date', dir: 'asc' })
  const [pastSort, setPastSort] = useState<DataSortState<
    'date' | 'name' | 'sport' | 'priority' | 'result'
  > | null>({ key: 'date', dir: 'desc' })
  const { labelW, colW } = useMockPlannerLayout(zoom)

  const upcomingRows = useMemo(() => {
    const rows = [...UPCOMING]
    if (!upcomingSort) return rows
    const { key, dir } = upcomingSort
    rows.sort((a, b) => {
      const av =
        key === 'date'
          ? a.dateKey
          : key === 'weeks'
            ? a.weeks
            : key === 'name'
              ? a.name
              : key === 'status'
                ? a.status
                : key === 'sport'
                  ? a.sport
                  : key === 'priority'
                    ? a.priority
                    : a.location
      const bv =
        key === 'date'
          ? b.dateKey
          : key === 'weeks'
            ? b.weeks
            : key === 'name'
              ? b.name
              : key === 'status'
                ? b.status
                : key === 'sport'
                  ? b.sport
                  : key === 'priority'
                    ? b.priority
                    : b.location
      return compareDataSort(av, bv, dir)
    })
    return rows
  }, [upcomingSort])

  const pastRows = useMemo(() => {
    const rows = [...PAST]
    if (!pastSort) return rows
    const { key, dir } = pastSort
    rows.sort((a, b) => {
      const av =
        key === 'date'
          ? a.dateKey
          : key === 'name'
            ? a.name
            : key === 'sport'
              ? a.sport
              : key === 'priority'
                ? a.priority
                : a.result
      const bv =
        key === 'date'
          ? b.dateKey
          : key === 'name'
            ? b.name
            : key === 'sport'
              ? b.sport
              : key === 'priority'
                ? b.priority
                : b.result
      return compareDataSort(av, bv, dir)
    })
    return rows
  }, [pastSort])

  const weeks = useMemo(() => {
    const { start, end } = buildPlannerScrollRange(MOCK_TODAY)
    return buildPlannerWeekColumns(start, end)
  }, [])
  const months = useMemo(() => groupPlannerMonths(weeks), [weeks])
  const todayIdx = todayWeekIndex(weeks, MOCK_TODAY)
  const viewportWeeks = plannerVisibleWeekCount(zoom)
  const shortMonthLabels = plannerViewportMonths(zoom) >= 12
  const gridW = weeks.length * colW

  const raceA = todayIdx + 7
  const raceB = todayIdx + 6
  const raceC = todayIdx
  const eventStart = todayIdx + 2

  const nudge = (delta: number) => {
    const el = document.getElementById('season-planner-scroller')
    el?.scrollBy({ left: delta, behavior: 'smooth' })
  }

  const scrollToday = () => {
    const el = document.getElementById('season-planner-scroller')
    if (!el) return
    const target = Math.max(0, todayIdx * colW - el.clientWidth * 0.22)
    el.scrollTo({ left: target, behavior: 'smooth' })
  }

  useLayoutEffect(() => {
    const t = window.setTimeout(scrollToday, 50)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial align only when layout settles
  }, [colW, todayIdx, labelW])

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2 overflow-x-auto pb-0.5">
          <SegmentedControl aria-label="Lane mode">
            <SegmentedControlItem active type="button">
              Priority
            </SegmentedControlItem>
            <SegmentedControlItem type="button">Sport</SegmentedControlItem>
          </SegmentedControl>

          <button
            type="button"
            className="tt-season-cta inline-flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 text-xs font-medium"
          >
            <Plus className="h-3.5 w-3.5" />
            Add race
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-[6px] border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground"
          >
            Add event
          </button>

          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <SegmentedControl aria-label="Calendar range">
              {PLANNER_ZOOM_LABELS.map((label, i) => (
                <SegmentedControlItem
                  key={label}
                  active={zoom === i}
                  type="button"
                  onClick={() => setZoom(i)}
                >
                  {label.replace(' months', ' mo').replace(' month', ' mo')}
                </SegmentedControlItem>
              ))}
            </SegmentedControl>
            <button
              type="button"
              className="rounded-[6px] border border-border bg-card px-2.5 py-1.5 text-xs font-medium"
              onClick={scrollToday}
            >
              Today
            </button>
            <button
              type="button"
              className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] border border-border text-muted-foreground"
              aria-label="Previous"
              onClick={() => nudge(-viewportWeeks * colW)}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] border border-border text-muted-foreground"
              aria-label="Next"
              onClick={() => nudge(viewportWeeks * colW)}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className={cn(TABLE_SHELL, 'tt-season-timeline relative w-full')}>
          <div
            id="season-planner-scroller"
            className="season-planner-scroller w-full min-w-0 overflow-x-auto"
          >
            <div style={{ width: labelW + gridW, minWidth: '100%' }} className="relative">
              <div className={cn('sticky top-0 z-20 flex', TABLE_HEADER)}>
                <div
                  className={cn(
                    'tt-season-sticky-label sticky left-0 z-30 flex shrink-0 items-center px-2 py-1.5 text-[11px] font-semibold',
                    TABLE_HEADER_CELL_MUTED,
                    TABLE_HEADER_VLINE,
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
                        'flex items-center justify-center border-r border-white/8 px-2 py-1.5 text-center text-[11px] font-semibold',
                        TABLE_HEADER_CELL_STRONG,
                      )}
                      style={{ width: m.weekCount * colW }}
                    >
                      <span>{shortMonthLabels ? m.label.slice(0, 3) : m.label}</span>
                      <span className="ml-1 text-white/45">{m.year}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={cn('sticky top-[2.125rem] z-20 flex', TABLE_HEADER_SUB)}>
                <div
                  className="sticky left-0 z-10 shrink-0 border-r border-[#ECECEA] bg-[#f4f4f2]"
                  style={{ width: labelW }}
                />
                <div className="flex text-center text-[10px] tabular-nums" style={{ width: gridW }}>
                  {weeks.map((w, i) => (
                    <div
                      key={w.key}
                      className={cn(
                        'flex h-7 items-center justify-center border-r',
                        isPlannerMonthEnd(weeks, i) ? 'border-black/10' : 'border-black/[0.04]',
                        i === todayIdx && 'bg-[rgb(244_81_30/0.04)]',
                      )}
                      style={{ width: colW }}
                    >
                      {i === todayIdx ? (
                        <span className="tt-season-today-badge" title="Today">
                          {w.isoWeek}
                        </span>
                      ) : (
                        w.isoWeek
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex h-2 bg-white" aria-hidden>
                <div
                  className="tt-season-lane-label sticky left-0 z-10 shrink-0 border-r bg-white"
                  style={{ width: labelW }}
                />
                <div className="relative" style={{ width: gridW }}>
                  <WeekGuides weeks={weeks} colW={colW} todayIdx={todayIdx} />
                </div>
              </div>

              <div
                className="tt-season-today-line pointer-events-none absolute bottom-0 top-[52px] z-[1]"
                style={{ left: labelW + todayIdx * colW + colW / 2 }}
                aria-hidden
              />

              {priority.A ? (
                <Lane
                  label="A Goal"
                  labelW={labelW}
                  gridW={gridW}
                  colW={colW}
                  weeks={weeks}
                  todayIdx={todayIdx}
                >
                  <RaceCard
                    weekIndex={raceA}
                    prepWeeks={4}
                    priority="A"
                    date="12 Oct"
                    name="Vilnius Marathon"
                    colW={colW}
                  />
                </Lane>
              ) : null}
              {priority.B ? (
                <Lane
                  label="B Important"
                  labelW={labelW}
                  gridW={gridW}
                  colW={colW}
                  weeks={weeks}
                  todayIdx={todayIdx}
                >
                  <RaceCard
                    weekIndex={raceB}
                    prepWeeks={2}
                    priority="B"
                    date="4 Oct"
                    name="Trakai Half"
                    colW={colW}
                    watching
                  />
                </Lane>
              ) : null}
              {priority.C ? (
                <Lane
                  label="C Training"
                  labelW={labelW}
                  gridW={gridW}
                  colW={colW}
                  weeks={weeks}
                  todayIdx={todayIdx}
                >
                  <RaceCard
                    weekIndex={raceC}
                    prepWeeks={1}
                    priority="C"
                    date="23 Aug"
                    name="Local 10K"
                    colW={colW}
                  />
                </Lane>
              ) : null}
              {showWatching ? (
                <Lane
                  label="Watching"
                  labelW={labelW}
                  gridW={gridW}
                  colW={colW}
                  weeks={weeks}
                  todayIdx={todayIdx}
                  thickerBottom={!showEvents}
                >
                  <RaceCard
                    weekIndex={raceB}
                    prepWeeks={0}
                    priority="B"
                    date="4 Oct"
                    name="Trakai Half"
                    colW={colW}
                    watching
                  />
                </Lane>
              ) : null}
              {showEvents ? (
                <Lane
                  label="Events"
                  labelW={labelW}
                  gridW={gridW}
                  colW={colW}
                  weeks={weeks}
                  todayIdx={todayIdx}
                >
                  <div
                    className={cn(
                      'absolute z-[2] flex items-center rounded-[6px] border px-2 text-[11px] font-semibold',
                      SEASON_EVENT_CARD,
                    )}
                    style={{
                      left: eventStart * colW + 1,
                      width: colW * 2 - 2,
                      top: RACE_CARD_TOP,
                      height: colW >= 56 ? 50 : 34,
                    }}
                  >
                    Camp · Alps
                  </div>
                </Lane>
              ) : null}
            </div>
          </div>
        </div>

        <SeasonFilterBar
          priority={priority}
          onTogglePriority={(p) =>
            setPriority((prev) => ({ ...prev, [p]: !prev[p] }))
          }
          showWatching={showWatching}
          onToggleWatching={() => setShowWatching((v) => !v)}
          showEvents={showEvents}
          onToggleEvents={() => setShowEvents((v) => !v)}
          sport={sport}
          onToggleSport={(s) => setSport((prev) => ({ ...prev, [s]: !prev[s] }))}
        />
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Upcoming races</h2>
            <p className="text-[12px] text-muted-foreground">Planned and watching</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                readOnly
                placeholder="Search…"
                className="h-8 w-40 rounded-[6px] border border-border bg-card pl-8 pr-2 text-xs"
              />
            </div>
            <button
              type="button"
              className="rounded-[6px] border border-border bg-card px-3 py-1.5 text-xs font-medium"
            >
              Watch race
            </button>
            <button
              type="button"
              className="tt-season-cta rounded-[6px] px-3 py-1.5 text-xs font-medium"
            >
              Add race
            </button>
          </div>
        </div>
        <div className={cn('overflow-x-auto', DATA_TABLE_SHELL)}>
          <table className={cn(DATA_TABLE, 'min-w-[48rem]')} data-density="comfortable">
            <thead>
              <tr>
                {(
                  [
                    ['date', 'Date'],
                    ['name', 'Race'],
                    ['status', 'Status'],
                    ['sport', 'Sport'],
                    ['priority', 'Priority'],
                    ['location', 'Location'],
                    ['weeks', 'Weeks'],
                  ] as const
                ).map(([key, label]) => (
                  <th key={key}>
                    <DataSortHeader
                      label={label}
                      active={upcomingSort?.key === key}
                      dir={upcomingSort?.key === key ? upcomingSort.dir : null}
                      onClick={() => setUpcomingSort((s) => nextDataSort(s, key))}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {upcomingRows.map((r) => (
                <tr key={r.name}>
                  <td className={cn(DATA_CELL_META, DATA_NUM)}>{r.date}</td>
                  <td>
                    <p className={DATA_CELL_PRIMARY}>{r.name}</p>
                    <p className={DATA_CELL_SECONDARY}>{r.type}</p>
                  </td>
                  <td>
                    <StatusPill tone={r.status === 'watching' ? 'watching' : 'planned'}>
                      {r.status === 'watching' ? 'Watching' : 'Planned'}
                    </StatusPill>
                  </td>
                  <td className={DATA_CELL_META}>{r.sport}</td>
                  <td>
                    <PriorityBadge priority={r.priority} />
                  </td>
                  <td className={DATA_CELL_META}>{r.location}</td>
                  <td className={cn(DATA_CELL_META, DATA_NUM)}>{r.weeks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="tt-season-past-section space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Past races</h2>
            <p className="text-[12px] text-muted-foreground">Results on the season plan</p>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              readOnly
              placeholder="Search…"
              className="h-8 w-40 rounded-[6px] border border-border bg-card pl-8 pr-2 text-xs"
            />
          </div>
        </div>
        <div className={cn('overflow-x-auto', DATA_TABLE_SHELL)}>
          <table className={cn(DATA_TABLE, 'min-w-[40rem]')} data-density="comfortable">
            <thead>
              <tr>
                {(
                  [
                    ['date', 'Date'],
                    ['name', 'Race'],
                    ['sport', 'Sport'],
                    ['priority', 'Priority'],
                    ['result', 'Result'],
                  ] as const
                ).map(([key, label]) => (
                  <th key={key}>
                    <DataSortHeader
                      label={label}
                      active={pastSort?.key === key}
                      dir={pastSort?.key === key ? pastSort.dir : null}
                      onClick={() => setPastSort((s) => nextDataSort(s, key))}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pastRows.map((r) => (
                <tr key={r.name}>
                  <td className={cn(DATA_CELL_META, DATA_NUM)}>{r.date}</td>
                  <td>
                    <p className={DATA_CELL_PRIMARY}>{r.name}</p>
                    <p className={DATA_CELL_SECONDARY}>{r.type}</p>
                  </td>
                  <td className={DATA_CELL_META}>{r.sport}</td>
                  <td>
                    <PriorityBadge priority={r.priority} />
                  </td>
                  <td className={cn(DATA_CELL_PRIMARY, DATA_NUM)}>{r.result}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
