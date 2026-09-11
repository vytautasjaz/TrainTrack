'use client'

import { useEffect, useMemo, useState } from 'react'
import { format, isToday, isYesterday } from 'date-fns'
import { useRouter } from 'next/navigation'
import {
  CalendarDays,
  ChevronDown,
  Flag,
  ListFilter,
} from 'lucide-react'
import { WorkoutType } from '@prisma/client'
import { AthleteAvatar } from '@/components/athlete/athlete-avatar'
import {
  ActivityDayHeading,
  ActivityFeedWorkoutCard,
  sportRailColor,
} from '@/components/activity/activity-feed-workout-card'
import {
  CoachHomeTablePagination,
  CoachHomeMobileAccordionBody,
} from '@/components/coach/coach-home-panel'
import { StravaWordmark } from '@/components/plan/strava-mark'
import { PriorityBadge } from '@/components/races/priority-badge'
import { RaceLegsSummary } from '@/components/races/race-legs-fields'
import { RACE_TYPE_LABELS, WORKOUT_TYPE_LABELS } from '@/lib/constants'
import { parseDateOnly } from '@/lib/dates'
import {
  coachHomeRaceResultLabel,
  groupActivityRowsByDay,
  isCoachHomeRaceActivityRow,
  isCoachHomeWorkoutActivityRow,
  filterActivityByTimeRange,
  type CoachHomeActivityMetric,
  type CoachHomeActivityTableRow,
  type CoachHomeRaceActivityRow,
  type CoachHomeTimeRange,
} from '@/lib/coach-home'
import { racePlaceSummary } from '@/lib/season-races'
import type { SessionLoadThresholds } from '@/lib/training-load/session-tss'
import { cn } from '@/lib/utils'

type StatusFilter = 'activity' | 'all' | 'completed' | 'skipped' | 'races'
type SportFilter = 'all' | WorkoutType

const STATUS_FILTERS: Array<{ id: StatusFilter; label: string }> = [
  { id: 'activity', label: 'Activity' },
  { id: 'all', label: 'All' },
  { id: 'completed', label: 'Completed' },
  { id: 'skipped', label: 'Skipped' },
  { id: 'races', label: 'Races' },
]

const PAGE_SIZE_OPTIONS = [10, 20, 50, 'all'] as const
type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number]

const TIME_RANGE_OPTIONS: Array<{ id: CoachHomeTimeRange; label: string }> = [
  { id: 'last_7d', label: 'Last 7 days' },
  { id: 'this_week', label: 'This week' },
  { id: 'last_30d', label: 'Last 30 days' },
  { id: 'all_time', label: 'All time' },
]

type CoachHomeRecentActivityTableProps = {
  className?: string
  rows: CoachHomeActivityTableRow[]
  athleteOptions: Array<{ id: string; name: string }>
  loadThresholdsByAthleteId?: Record<string, SessionLoadThresholds>
}

export function CoachHomeRecentActivityTable({
  className,
  rows,
  athleteOptions,
  loadThresholdsByAthleteId = {},
}: CoachHomeRecentActivityTableProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('activity')
  const [sportFilter, setSportFilter] = useState<SportFilter>('all')
  const [athleteFilter, setAthleteFilter] = useState<string>('all')
  const [timeRange, setTimeRange] = useState<CoachHomeTimeRange>('last_7d')
  const [pageSize, setPageSize] = useState<PageSizeOption>(20)
  const [page, setPage] = useState(0)
  const [mobileOpen, setMobileOpen] = useState(true)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false)

  const timeFilteredRows = useMemo(
    () => filterActivityByTimeRange(rows, timeRange),
    [rows, timeRange],
  )

  const sportOptions = useMemo(() => {
    const counts = new Map<WorkoutType, number>()
    for (const row of timeFilteredRows) {
      counts.set(row.activityType, (counts.get(row.activityType) ?? 0) + 1)
    }
    return [...counts.entries()]
      .map(([type, count]) => ({ type, count, label: WORKOUT_TYPE_LABELS[type] }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [timeFilteredRows])

  const filtered = useMemo(() => {
    return timeFilteredRows.filter((row) => {
      if (athleteFilter !== 'all' && row.athleteId !== athleteFilter) return false
      if (statusFilter === 'activity') {
        // Default feed: completed workouts + races (hide skipped).
        if (isCoachHomeWorkoutActivityRow(row) && row.status !== 'completed') return false
      }
      if (statusFilter === 'completed') {
        if (isCoachHomeWorkoutActivityRow(row) && row.status !== 'completed') return false
        if (isCoachHomeRaceActivityRow(row) && row.racePhase !== 'report') return false
      }
      if (statusFilter === 'skipped') {
        if (!isCoachHomeWorkoutActivityRow(row) || row.status !== 'skipped') return false
      }
      if (statusFilter === 'races') {
        if (!isCoachHomeRaceActivityRow(row)) return false
      }
      if (sportFilter !== 'all' && row.activityType !== sportFilter) return false
      return true
    })
  }, [timeFilteredRows, athleteFilter, statusFilter, sportFilter])

  const effectivePageSize = pageSize === 'all' ? Math.max(filtered.length, 1) : pageSize
  const pageCount = Math.max(1, Math.ceil(filtered.length / effectivePageSize))

  const visibleRows = useMemo(() => {
    if (pageSize === 'all') return filtered
    const start = page * effectivePageSize
    return filtered.slice(start, start + effectivePageSize)
  }, [filtered, page, pageSize, effectivePageSize])

  const groups = useMemo(() => groupActivityRowsByDay(visibleRows), [visibleRows])

  const filtersActive =
    statusFilter !== 'activity' ||
    sportFilter !== 'all' ||
    athleteFilter !== 'all' ||
    timeRange !== 'last_7d' ||
    pageSize !== 20

  const moreFiltersActive =
    statusFilter !== 'activity' || sportFilter !== 'all' || pageSize !== 20

  useEffect(() => {
    setPage(0)
  }, [rows, athleteFilter, timeRange, statusFilter, sportFilter, pageSize])

  useEffect(() => {
    if (
      athleteFilter !== 'all' &&
      !athleteOptions.some((athlete) => athlete.id === athleteFilter)
    ) {
      setAthleteFilter('all')
    }
  }, [athleteFilter, athleteOptions])

  useEffect(() => {
    if (sportFilter !== 'all' && !sportOptions.some((o) => o.type === sportFilter)) {
      setSportFilter('all')
    }
  }, [sportFilter, sportOptions])

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount - 1))
  }, [pageCount])

  useEffect(() => {
    if (!moreFiltersOpen) return
    function onPointerDown(event: PointerEvent) {
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest('[data-activity-more-filters]')) return
      setMoreFiltersOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [moreFiltersOpen])

  function resetFilters() {
    setStatusFilter('activity')
    setSportFilter('all')
    setAthleteFilter('all')
    setTimeRange('last_7d')
    setPageSize(20)
  }

  function resetMoreFilters() {
    setStatusFilter('activity')
    setSportFilter('all')
    setPageSize(20)
  }

  const selectClassName =
    'appearance-none truncate rounded-full border border-[var(--tt-line)] bg-white py-1 pl-2.5 pr-7 text-[11px] font-semibold text-[var(--tt-ink)] outline-none hover:border-[var(--tt-line-strong,#ddd)]'

  const primaryFilters = (
    <>
      {athleteOptions.length > 1 ? (
        <label className="relative inline-flex min-w-0 items-center">
          <select
            value={athleteFilter}
            onChange={(e) => setAthleteFilter(e.target.value)}
            aria-label="Filter by athlete"
            className={cn(selectClassName, 'max-w-[11rem]')}
          >
            <option value="all">All athletes</option>
            {athleteOptions.map((athlete) => (
              <option key={athlete.id} value={athlete.id}>
                {athlete.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <label className="relative inline-flex items-center">
        <CalendarDays
          className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-[var(--tt-ink-faint)]"
          strokeWidth={1.75}
          aria-hidden
        />
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as CoachHomeTimeRange)}
          aria-label="Filter by time range"
          className={cn(selectClassName, 'pl-8')}
        >
          {TIME_RANGE_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </>
  )

  const moreFilterControls = (
    <>
      <div className="flex flex-wrap gap-1">
        {STATUS_FILTERS.map((item) => (
          <ToolbarChip
            key={item.id}
            label={item.label}
            active={statusFilter === item.id}
            onClick={() => setStatusFilter(item.id)}
          />
        ))}
      </div>
      {sportOptions.length > 1 ? (
        <label className="relative inline-flex items-center">
          <select
            value={sportFilter}
            onChange={(e) =>
              setSportFilter(
                e.target.value === 'all' ? 'all' : (e.target.value as WorkoutType),
              )
            }
            aria-label="Filter by sport"
            className={selectClassName}
          >
            <option value="all">All sports</option>
            {sportOptions.map((option) => (
              <option key={option.type} value={option.type}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--tt-ink-faint)]">
          Show
        </span>
        <div className="flex gap-0.5 rounded-full border border-[var(--tt-line)] p-0.5">
          {PAGE_SIZE_OPTIONS.map((option) => {
            const active = pageSize === option
            const label = option === 'all' ? 'All' : String(option)
            return (
              <button
                key={label}
                type="button"
                onClick={() => setPageSize(option)}
                className={cn(
                  'rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums transition',
                  active
                    ? 'bg-[var(--tt-ink)] text-white'
                    : 'text-[var(--tt-ink-soft)] hover:text-[var(--tt-ink)]',
                )}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>
    </>
  )

  return (
    <section className={cn('min-w-0 space-y-3 md:space-y-4', className)}>
      {/* Title + accordion only — its own bubble on mobile */}
      <div
        className={cn(
          'overflow-hidden rounded-[0.9rem] border border-[var(--tt-line,#ebebeb)] bg-[var(--tt-surface,#fff)] px-4 py-3.5 shadow-[var(--tt-shadow)]',
          'md:overflow-visible md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none',
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <header className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setMobileOpen((open) => !open)}
              aria-expanded={mobileOpen}
              className="flex w-full items-center justify-between gap-2 text-left md:pointer-events-none md:block"
            >
              <h2 className="font-[family-name:var(--font-display)] text-[1.35rem] font-normal uppercase leading-none tracking-tight text-[var(--tt-ink)]">
                Activity feed
              </h2>
              <ChevronDown
                className={cn(
                  'h-4 w-4 shrink-0 text-[var(--tt-ink-faint)] transition-transform duration-300 md:hidden',
                  mobileOpen && 'rotate-180',
                )}
                strokeWidth={1.75}
                aria-hidden
              />
            </button>
            <p className="mt-1.5 hidden text-[13px] leading-snug text-[var(--tt-ink-faint)] md:block">
              Recent workouts, races, and race reports from your athletes
            </p>
          </header>

          {/* Mobile — filters icon */}
          <button
            type="button"
            onClick={() => setMobileFiltersOpen((open) => !open)}
            aria-expanded={mobileFiltersOpen}
            aria-label="Activity filters"
            className={cn(
              'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] border border-[var(--tt-line)] bg-white text-[var(--tt-ink-soft)] transition md:hidden',
              'hover:border-[var(--tt-line-strong,#ddd)] hover:text-[var(--tt-ink)]',
              (mobileFiltersOpen || filtersActive) &&
                'border-[var(--tt-ink)]/30 text-[var(--tt-ink)]',
            )}
          >
            <ListFilter className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>

          {/* Desktop — athlete + time first; status/sport/page size under Filters */}
          <div
            className="relative hidden shrink-0 items-center gap-2 md:flex"
            data-activity-more-filters
          >
            {primaryFilters}
            <button
              type="button"
              onClick={() => setMoreFiltersOpen((open) => !open)}
              aria-expanded={moreFiltersOpen}
              aria-label="More activity filters"
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border border-[var(--tt-line)] bg-white px-2.5 py-1 text-[11px] font-semibold text-[var(--tt-ink-soft)] transition',
                'hover:border-[var(--tt-line-strong,#ddd)] hover:text-[var(--tt-ink)]',
                (moreFiltersOpen || moreFiltersActive) &&
                  'border-[var(--tt-ink)]/30 text-[var(--tt-ink)]',
              )}
            >
              <ListFilter className="h-3.5 w-3.5" strokeWidth={1.75} />
              Filters
              {moreFiltersActive ? (
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-[var(--tt-ink)]" aria-hidden />
              ) : null}
            </button>
            {moreFiltersOpen ? (
              <div className="absolute right-0 top-[calc(100%+0.4rem)] z-20 w-[min(22rem,calc(100vw-2rem))] rounded-[10px] border border-[var(--tt-line,#ebebeb)] bg-white p-3 shadow-[var(--tt-shadow)]">
                <div className="mb-2.5 flex items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--tt-ink-faint)]">
                    More filters
                  </p>
                  {moreFiltersActive ? (
                    <button
                      type="button"
                      onClick={resetMoreFilters}
                      className="text-[10px] font-semibold text-[var(--tt-ink-soft)] hover:text-[var(--tt-ink)]"
                    >
                      Reset
                    </button>
                  ) : null}
                </div>
                <div className="flex flex-col gap-2.5">{moreFilterControls}</div>
              </div>
            ) : null}
          </div>
        </div>

        {mobileFiltersOpen ? (
          <div className="mt-3 flex flex-col gap-2.5 border-t border-[var(--tt-line)] pt-3 md:hidden">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--tt-ink-faint)]">
                Filters
              </p>
              {filtersActive ? (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-[10px] font-semibold text-[var(--tt-ink-soft)] hover:text-[var(--tt-ink)]"
                >
                  Reset
                </button>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">{primaryFilters}</div>
            <div className="flex flex-col gap-2.5 border-t border-[var(--tt-line)] pt-2.5">
              {moreFilterControls}
            </div>
          </div>
        ) : null}
      </div>

      <CoachHomeMobileAccordionBody expanded={mobileOpen} className="space-y-3 md:space-y-4">
        {filtered.length === 0 ? (
          <p className="px-1 py-8 text-center text-[13px] text-[var(--tt-ink-faint)] md:border md:border-[var(--tt-line)] md:px-4 md:py-10">
            No activity matches this filter.
          </p>
        ) : (
          <>
            {/* Mobile — feed items as same-width bubbles under the header */}
            <ul className="space-y-3 md:hidden">
              {visibleRows.map((row) => (
                <li
                  key={row.id}
                  className="overflow-hidden rounded-[0.9rem] border border-[var(--tt-line,#ebebeb)] bg-[var(--tt-surface,#fff)] shadow-[var(--tt-shadow)]"
                >
                  <ActivityFeedCard
                    row={row}
                    showDate
                    loadThresholds={
                      isCoachHomeWorkoutActivityRow(row)
                        ? loadThresholdsByAthleteId[row.athleteId]
                        : undefined
                    }
                  />
                </li>
              ))}
            </ul>

            {/* Desktop — grouped by day */}
            <div className="hidden space-y-5 md:block">
              {groups.map((group) => (
                <div key={group.dateKey} className="space-y-2">
                  <ActivityDayHeading dateKey={group.dateKey} />
                  <ul className="divide-y divide-[var(--tt-line)] overflow-hidden rounded-[0.9rem] border border-[var(--tt-line,#ebebeb)] bg-[var(--tt-surface,#fff)] shadow-[var(--tt-shadow)]">
                    {group.rows.map((row) => (
                      <li key={row.id}>
                        <ActivityFeedCard
                          row={row}
                          loadThresholds={
                            isCoachHomeWorkoutActivityRow(row)
                              ? loadThresholdsByAthleteId[row.athleteId]
                              : undefined
                          }
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {pageSize !== 'all' ? (
              <div className="md:px-0">
                <CoachHomeTablePagination
                  page={page}
                  pageCount={pageCount}
                  total={filtered.length}
                  pageSize={effectivePageSize}
                  onPrevious={() => setPage((p) => Math.max(0, p - 1))}
                  onNext={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                />
              </div>
            ) : filtered.length > 0 ? (
              <p className="text-[11px] tabular-nums text-[var(--tt-ink-faint)]">
                Showing all {filtered.length}
              </p>
            ) : null}
          </>
        )}
      </CoachHomeMobileAccordionBody>
    </section>
  )
}

/** Date under athlete name — e.g. "Today at 20:25" or "Sep 7, 2025". */
function formatFeedCardAthleteMeta(opts: {
  dateKey: string
  activityAt?: string
}): string {
  const date = parseDateOnly(opts.dateKey)
  const at = opts.activityAt ? new Date(opts.activityAt) : null
  const hasClock =
    at != null &&
    !Number.isNaN(at.getTime()) &&
    (at.getHours() !== 0 || at.getMinutes() !== 0 || at.getSeconds() !== 0)

  if (isToday(date) || isYesterday(date)) {
    const day = isToday(date) ? 'Today' : 'Yesterday'
    return hasClock ? `${day} at ${format(at!, 'HH:mm')}` : day
  }
  if (hasClock) {
    return `${format(date, 'MMM d, yyyy')} · ${format(at!, 'HH:mm')}`
  }
  return format(date, 'MMM d, yyyy')
}

function FeedCardAthleteMeta({
  dateKey,
  activityAt,
}: {
  dateKey: string
  activityAt?: string
}) {
  return (
    <time
      dateTime={dateKey}
      className="mt-0.5 block truncate text-[11px] font-normal text-[var(--tt-ink-soft,#6b6b6b)]"
    >
      {formatFeedCardAthleteMeta({ dateKey, activityAt })}
    </time>
  )
}

function ToolbarChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-2.5 py-1 text-[11px] font-semibold transition',
        active
          ? 'border-[var(--tt-line-strong,#ddd)] bg-[var(--tt-sidebar,#f5f5f5)] text-[var(--tt-ink)]'
          : 'border-transparent text-[var(--tt-ink-soft)] hover:text-[var(--tt-ink)]',
      )}
    >
      {label}
    </button>
  )
}

function ActivityFeedCard({
  row,
  showDate = false,
  loadThresholds,
}: {
  row: CoachHomeActivityTableRow
  showDate?: boolean
  loadThresholds?: SessionLoadThresholds
}) {
  if (isCoachHomeRaceActivityRow(row)) {
    return <RaceFeedCard row={row} showDate={showDate} />
  }
  return (
    <ActivityFeedWorkoutCard
      row={row}
      isCoach
      showDate={showDate}
      loadThresholds={loadThresholds}
    />
  )
}

function RaceFeedCard({
  row,
  showDate = false,
}: {
  row: CoachHomeRaceActivityRow
  showDate?: boolean
}) {
  const router = useRouter()
  const { race } = row
  const resultLabel = coachHomeRaceResultLabel(race)
  const placeSummary = racePlaceSummary(race)
  const timeLabel =
    row.racePhase === 'report' ? format(new Date(row.activityAt), 'HH:mm') : null
  const statusLabel =
    row.racePhase === 'report'
      ? 'Report'
      : row.racePhase === 'race_day'
        ? 'Race day'
        : 'Upcoming'
  const statusTone =
    row.racePhase === 'report'
      ? 'text-[var(--tt-good)]'
      : row.racePhase === 'race_day'
        ? 'text-[var(--color-accent,#e85d4c)]'
        : 'text-[var(--tt-ink-soft)]'
  const stravaUrl =
    race.stravaActivityUrl ??
    race.legs.find((leg) => leg.stravaActivityUrl)?.stravaActivityUrl ??
    null

  return (
    <article
      role="link"
      tabIndex={0}
      onClick={() => router.push(`/season/${race.raceId}/edit?returnTo=/dashboard`)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          router.push(`/season/${race.raceId}/edit?returnTo=/dashboard`)
        }
      }}
      className="relative cursor-pointer overflow-hidden bg-white transition hover:bg-[color-mix(in_srgb,var(--tt-sidebar,#f5f5f5)_55%,white)]"
    >
        <div
          className="absolute inset-y-0 left-0 hidden w-[3px] md:block"
          style={{ background: sportRailColor(row.activityType, false) }}
          aria-hidden
        />

        <div className="grid gap-3 py-3 pl-4 pr-3 sm:grid-cols-[8.5rem_minmax(0,1.1fr)_minmax(0,1.2fr)] lg:grid-cols-[8.5rem_minmax(9rem,1fr)_minmax(11rem,1.2fr)_minmax(7rem,0.85fr)_minmax(8rem,1fr)_5.5rem] lg:items-start lg:gap-4">
          <div className="flex min-w-0 items-start gap-2">
            <AthleteAvatar
              name={row.athleteName}
              avatarUrl={row.avatarUrl}
              size="sm"
              className="shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-[var(--tt-ink)]">
                {row.athleteName}
              </p>
              {showDate ? (
                <FeedCardAthleteMeta
                  dateKey={row.dateKey}
                  activityAt={row.activityAt}
                />
              ) : timeLabel ? (
                <p className="text-[11px] tabular-nums text-[var(--tt-ink-faint)]">{timeLabel}</p>
              ) : (
                <p className="text-[11px] text-[var(--tt-ink-faint)]">Race</p>
              )}
            </div>
          </div>

          <div className="min-w-0 space-y-1.5">
            <div className="flex min-w-0 items-start gap-1.5">
              <Flag className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-accent,#e85d4c)]" strokeWidth={1.75} aria-hidden />
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-1.5">
                  <p className="truncate text-[13px] font-semibold text-[var(--tt-ink)]">
                    {race.name}
                  </p>
                  <PriorityBadge priority={race.priority} compact className="shrink-0 scale-90" />
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--tt-ink-faint)]">
                  {RACE_TYPE_LABELS[race.raceType]} · {WORKOUT_TYPE_LABELS[row.activityType]}
                </p>
              </div>
            </div>
          </div>

          <div className="min-w-0">
            {race.hasReport ? (
              <div className="space-y-1.5">
                <PrimaryMetric metric={{ label: 'Result', value: resultLabel }} />
                {placeSummary ? (
                  <p className="text-[11px] tabular-nums text-[var(--tt-ink-soft)]">
                    <span className="font-semibold text-[var(--tt-ink)]">{placeSummary}</span>{' '}
                    <span className="text-[var(--tt-ink-faint)]">Place</span>
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-[13px] font-semibold text-[var(--tt-ink-soft)]">
                {row.racePhase === 'upcoming' ? 'Scheduled' : 'Awaiting report'}
              </p>
            )}
          </div>

          <div className="min-w-0 space-y-1.5 lg:border-l lg:border-[var(--tt-line)] lg:pl-3">
            <p className="text-[11px] leading-snug text-[var(--tt-ink-faint)]">
              <span className="font-semibold uppercase tracking-[0.04em]">Date </span>
              {format(new Date(`${race.raceDateKey}T12:00:00.000Z`), 'd MMM yyyy')}
            </p>
            {race.location?.trim() ? (
              <p className="text-[12px] leading-snug text-[var(--tt-ink)]">{race.location.trim()}</p>
            ) : null}
            {race.hasReport && race.legs.length > 0 ? (
              <RaceLegsSummary legs={race.legs} showPlan={false} className="text-[11px]" />
            ) : null}
          </div>

          <div className="min-w-0 lg:border-l lg:border-[var(--tt-line)] lg:pl-3">
            {race.resultNotes?.trim() ? (
              <div className="space-y-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--tt-ink-faint)]">
                  Race report
                </p>
                <p className="line-clamp-2 whitespace-pre-wrap text-[12px] leading-snug text-[var(--tt-ink-soft)]">
                  “{race.resultNotes.trim()}”
                </p>
              </div>
            ) : (
              <span className="hidden text-[12px] text-[var(--tt-ink-faint)] lg:inline">—</span>
            )}
          </div>

          <div className="flex min-w-0 flex-row items-start justify-between gap-2 sm:justify-end lg:flex-col lg:items-end">
            <div className="text-right">
              <p
                className={cn(
                  'inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.04em]',
                  statusTone,
                )}
              >
                <Flag className="h-3 w-3" strokeWidth={2} aria-hidden />
                {statusLabel}
              </p>
            </div>
            {stravaUrl ? (
              <a
                href={stravaUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex shrink-0 items-center rounded-sm px-0.5 py-1 text-muted-foreground/55 transition hover:text-muted-foreground"
                title="View on Strava"
                aria-label="View on Strava"
                onClick={(event) => event.stopPropagation()}
              >
                <StravaWordmark className="h-2 w-auto text-current" />
              </a>
            ) : null}
          </div>
        </div>
      </article>
  )
}

function PrimaryMetric({ metric }: { metric: CoachHomeActivityMetric }) {
  return (
    <div className="min-w-0">
      <p className="text-[15px] font-semibold tabular-nums leading-none text-[var(--tt-ink)]">
        {metric.value}
        {metric.unit ? (
          <span className="ml-0.5 text-[11px] font-semibold text-[var(--tt-ink-soft)]">
            {metric.unit}
          </span>
        ) : null}
      </p>
      <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.06em] text-[var(--tt-ink-faint)]">
        {metric.label}
      </p>
    </div>
  )
}
