'use client'

import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { Check, Flag, MessageSquare, Minus } from 'lucide-react'
import { WorkoutType } from '@prisma/client'
import { AthleteAvatar } from '@/components/athlete/athlete-avatar'
import { CoachHomeTablePagination } from '@/components/coach/coach-home-panel'
import { ActivityRouteMap } from '@/components/plan/activity-route-map'
import { StravaSyncedIndicator } from '@/components/plan/strava-synced-indicator'
import { StravaWordmark } from '@/components/plan/strava-mark'
import { WorkoutModalTrigger } from '@/components/plan/workout-modal-trigger'
import { WorkoutChatIndicator } from '@/components/plan/workout-chat-indicator'
import { WorkoutSportIcon } from '@/components/plan/workout-sport-icon'
import { SelfAddedBadge } from '@/components/plan/self-added-badge'
import { PriorityBadge } from '@/components/races/priority-badge'
import { RaceLegsSummary } from '@/components/races/race-legs-fields'
import { RACE_TYPE_LABELS, WORKOUT_TYPE_LABELS } from '@/lib/constants'
import {
  coachHomeRaceResultLabel,
  groupActivityRowsByDay,
  isCoachHomeRaceActivityRow,
  isCoachHomeWorkoutActivityRow,
  type CoachHomeActivityMetric,
  type CoachHomeActivityTableRow,
  type CoachHomeRaceActivityRow,
  type CoachHomeWorkoutActivityRow,
} from '@/lib/coach-home'
import { isStravaSynced, workoutHasCoachingChat } from '@/lib/plan-workout'
import { workoutFeelingLabel } from '@/lib/workout-feeling'
import { cn } from '@/lib/utils'

type StatusFilter = 'all' | 'completed' | 'skipped' | 'races'
type SportFilter = 'all' | WorkoutType

const STATUS_FILTERS: Array<{ id: StatusFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'completed', label: 'Completed' },
  { id: 'skipped', label: 'Skipped' },
  { id: 'races', label: 'Races' },
]

const PAGE_SIZE_OPTIONS = [10, 20, 50, 'all'] as const
type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number]

type CoachHomeRecentActivityTableProps = {
  rows: CoachHomeActivityTableRow[]
}

export function CoachHomeRecentActivityTable({
  rows,
}: CoachHomeRecentActivityTableProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sportFilter, setSportFilter] = useState<SportFilter>('all')
  const [pageSize, setPageSize] = useState<PageSizeOption>(20)
  const [page, setPage] = useState(0)

  const sportOptions = useMemo(() => {
    const counts = new Map<WorkoutType, number>()
    for (const row of rows) {
      counts.set(row.activityType, (counts.get(row.activityType) ?? 0) + 1)
    }
    return [...counts.entries()]
      .map(([type, count]) => ({ type, count, label: WORKOUT_TYPE_LABELS[type] }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [rows])

  const filtered = useMemo(() => {
    return rows.filter((row) => {
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
  }, [rows, statusFilter, sportFilter])

  const effectivePageSize = pageSize === 'all' ? Math.max(filtered.length, 1) : pageSize
  const pageCount = Math.max(1, Math.ceil(filtered.length / effectivePageSize))

  const visibleRows = useMemo(() => {
    if (pageSize === 'all') return filtered
    const start = page * effectivePageSize
    return filtered.slice(start, start + effectivePageSize)
  }, [filtered, page, pageSize, effectivePageSize])

  const groups = useMemo(() => groupActivityRowsByDay(visibleRows), [visibleRows])

  useEffect(() => {
    setPage(0)
  }, [rows, statusFilter, sportFilter, pageSize])

  useEffect(() => {
    if (sportFilter !== 'all' && !sportOptions.some((o) => o.type === sportFilter)) {
      setSportFilter('all')
    }
  }, [sportFilter, sportOptions])

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount - 1))
  }, [pageCount])

  return (
    <section className="min-w-0 space-y-4 xl:w-3/5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <header className="min-w-0">
          <h2 className="font-[family-name:var(--font-display)] text-[1.35rem] font-normal uppercase leading-none tracking-tight text-[var(--tt-ink)]">
            Activity feed
          </h2>
          <p className="mt-1 text-[13px] text-[var(--tt-ink-faint)]">
            Recent workouts, races, and race reports from your athletes
          </p>
        </header>

        <div className="flex flex-wrap items-center gap-2">
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
                className="appearance-none rounded-full border border-[var(--tt-line)] bg-white py-1 pl-2.5 pr-7 text-[11px] font-semibold text-[var(--tt-ink)] outline-none hover:border-[var(--tt-line-strong,#ddd)]"
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
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="border border-[var(--tt-line)] px-4 py-10 text-center text-[13px] text-[var(--tt-ink-faint)]">
          No activity matches this filter.
        </p>
      ) : (
        <>
          <div className="space-y-5">
            {groups.map((group) => (
              <div key={group.dateKey} className="space-y-2">
                <ActivityDayHeading dateKey={group.dateKey} />
                <ul className="divide-y divide-[var(--tt-line)] overflow-hidden border border-[var(--tt-line)] bg-white">
                  {group.rows.map((row) => (
                    <li key={row.id}>
                      <ActivityFeedCard row={row} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {pageSize !== 'all' ? (
            <CoachHomeTablePagination
              page={page}
              pageCount={pageCount}
              total={filtered.length}
              pageSize={effectivePageSize}
              onPrevious={() => setPage((p) => Math.max(0, p - 1))}
              onNext={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            />
          ) : filtered.length > 0 ? (
            <p className="text-[11px] tabular-nums text-[var(--tt-ink-faint)]">
              Showing all {filtered.length}
            </p>
          ) : null}
        </>
      )}
    </section>
  )
}

function ActivityDayHeading({ dateKey }: { dateKey: string }) {
  const [y, m, d] = dateKey.split('-').map(Number)
  const date = new Date(y!, m! - 1, d!)
  return (
    <h3 className="flex flex-wrap items-baseline gap-x-1.5 text-[0.8125rem] leading-none tracking-tight">
      <span className="font-semibold text-[var(--tt-ink)]">{format(date, 'EEEE')}</span>
      <span className="font-medium text-[var(--tt-ink-faint)]">{format(date, 'MMMM d')}</span>
    </h3>
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

function sportRailColor(type: WorkoutType, skipped: boolean): string {
  if (skipped) return 'var(--tt-red, #e85d4c)'
  switch (type) {
    case WorkoutType.BIKE:
      return 'var(--color-sport-bike)'
    case WorkoutType.SWIM:
      return 'var(--color-sport-swim)'
    case WorkoutType.STRENGTH:
      return 'var(--color-sport-strength)'
    case WorkoutType.RECOVERY:
    case WorkoutType.REST:
      return 'var(--color-sport-recovery, var(--color-sport-strength))'
    case WorkoutType.HYROX:
      return 'var(--color-sport-hyrox)'
    case WorkoutType.TRIATHLON:
      return 'var(--color-sport-tri)'
    default:
      return 'var(--color-sport-run)'
  }
}

function ActivityFeedCard({ row }: { row: CoachHomeActivityTableRow }) {
  if (isCoachHomeRaceActivityRow(row)) {
    return <RaceFeedCard row={row} />
  }
  return <WorkoutFeedCard row={row} />
}

function WorkoutFeedCard({ row }: { row: CoachHomeWorkoutActivityRow }) {
  const skipped = row.status === 'skipped'
  const hasFeedbackNotes = Boolean(row.feedbackNotes?.trim())
  const hasChat = workoutHasCoachingChat(row.workout)
  const stravaSynced = isStravaSynced(row.workout)
  const selfAdded = Boolean(row.workout.selfLogged)
  const summaryPolyline = row.workout.result?.summaryPolyline?.trim() || null
  const showMap = !skipped && Boolean(summaryPolyline)
  const metricSlots = feedMetricSlots(row)

  return (
    <WorkoutModalTrigger
      workout={row.workout}
      isCoach
      className="block w-full text-left"
    >
      <article
        className={cn(
          'relative overflow-hidden bg-white transition hover:bg-[color-mix(in_srgb,var(--tt-sidebar,#f5f5f5)_55%,white)]',
          skipped && 'bg-[color-mix(in_srgb,var(--tt-sidebar,#f5f5f5)_40%,white)]',
        )}
      >
        <div
          className="absolute inset-y-0 left-0 w-[3px]"
          style={{ background: sportRailColor(row.activityType, skipped) }}
          aria-hidden
        />

        <div className="grid gap-4 py-3.5 pl-4 pr-3.5 md:grid-cols-[minmax(12rem,0.9fr)_minmax(0,1.6fr)] md:items-start md:gap-5">
          <div className="min-w-0 space-y-3">
            <div className="flex min-w-0 items-center gap-2">
              <AthleteAvatar
                name={row.athleteName}
                avatarUrl={row.avatarUrl}
                size="sm"
                className="shrink-0"
              />
              <p className="truncate text-[13px] font-semibold text-[var(--tt-ink)]">
                {row.athleteName}
              </p>
            </div>

            <div className="flex min-w-0 items-start gap-2">
              <WorkoutSportIcon type={row.activityType} size="sm" className="mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold leading-snug text-[var(--tt-ink)]">
                  {row.activityTitle}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--tt-ink-faint)]">
                    {WORKOUT_TYPE_LABELS[row.activityType]}
                  </p>
                  {selfAdded ? <SelfAddedBadge /> : null}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <p
                className={cn(
                  'inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.04em]',
                  skipped ? 'text-[var(--tt-red)]' : 'text-[var(--tt-good)]',
                )}
              >
                {skipped ? (
                  <Minus className="h-3 w-3" strokeWidth={2} aria-hidden />
                ) : (
                  <Check className="h-3 w-3" strokeWidth={2} aria-hidden />
                )}
                {skipped ? 'Skipped' : 'Completed'}
              </p>
              <div
                className="flex items-center gap-1"
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                {hasChat ? (
                  <WorkoutChatIndicator workout={row.workout} role="coach" size="sm" />
                ) : null}
                {stravaSynced ? (
                  <StravaSyncedIndicator workout={row.workout} variant="wordmark" size="xs" />
                ) : null}
              </div>
            </div>

            {skipped ? (
              <SkippedReason notes={row.feedbackNotes} />
            ) : hasFeedbackNotes ? (
              <p className="flex items-start gap-1.5 text-[12px] leading-snug text-[var(--tt-ink-soft)]">
                <MessageSquare
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--tt-ink-faint)]"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <span className="line-clamp-3 whitespace-pre-wrap">
                  {row.feedbackNotes}
                </span>
              </p>
            ) : row.feedbackFeeling != null ? (
              <p className="text-[12px] text-[var(--tt-ink-soft)]">
                Feeling {row.feedbackFeeling}/10 · {workoutFeelingLabel(row.feedbackFeeling)}
              </p>
            ) : null}
          </div>

          <div className="min-w-0 space-y-3">
            {showMap && summaryPolyline ? (
              <ActivityRouteMap
                summaryPolyline={summaryPolyline}
                routeColor={sportRailColor(row.activityType, false)}
              />
            ) : null}
            {!skipped ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-5">
                {metricSlots.map((metric) => (
                  <FeedMetricCell key={metric.label} metric={metric} />
                ))}
              </div>
            ) : row.plannedSummary ? (
              <p className="text-[12px] text-[var(--tt-ink-faint)]">
                <span className="font-semibold uppercase tracking-[0.04em]">Planned </span>
                {row.plannedSummary}
              </p>
            ) : null}
          </div>
        </div>
      </article>
    </WorkoutModalTrigger>
  )
}

function feedMetricSlots(
  row: CoachHomeWorkoutActivityRow,
): Array<{ label: string; value: string }> {
  const result = row.workout.result
  const all = [...row.primaryMetrics, ...row.secondaryMetrics]

  const find = (...labels: string[]) =>
    all.find((m) => labels.some((label) => m.label.toLowerCase() === label.toLowerCase()))

  const formatMetric = (metric: CoachHomeActivityMetric | undefined) => {
    if (!metric) return '—'
    const unit = metric.unit ? ` ${metric.unit}` : ''
    return `${metric.value}${unit}`
  }

  const distance = find('Distance')
  const time = find('Time', 'Duration')
  const pace = find('Avg pace', 'Avg speed')
  const elev =
    result?.elevationGainM != null && result.elevationGainM >= 1
      ? `${Math.round(result.elevationGainM)} m`
      : null
  const calories =
    result?.calories != null && result.calories > 0
      ? String(Math.round(result.calories))
      : null

  const durationFallback =
    !time && result?.actualDuration != null && result.actualDuration > 0
      ? formatFeedClock(result.actualDuration)
      : null

  if (row.activityType === WorkoutType.STRENGTH || row.activityType === WorkoutType.RECOVERY) {
    return [
      { label: 'Duration', value: formatMetric(time) !== '—' ? formatMetric(time) : durationFallback ?? '—' },
      { label: 'Distance', value: formatMetric(distance) },
      { label: 'Avg pace', value: formatMetric(pace) },
      { label: 'Elev gain', value: elev ?? '—' },
      { label: 'Calories', value: calories ?? '—' },
    ]
  }

  return [
    { label: 'Distance', value: formatMetric(distance) },
    { label: 'Time', value: formatMetric(time) !== '—' ? formatMetric(time) : durationFallback ?? '—' },
    { label: 'Avg pace', value: formatMetric(pace) },
    { label: 'Elev gain', value: elev ?? '—' },
    { label: 'Calories', value: calories ?? '—' },
  ]
}

function formatFeedClock(durationMin: number): string {
  const totalSecs = Math.max(0, Math.round(durationMin * 60))
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

function FeedMetricCell({ metric }: { metric: { label: string; value: string } }) {
  return (
    <div className="min-w-0">
      <p className="text-[15px] font-semibold tabular-nums leading-none text-[var(--tt-ink)]">
        {metric.value}
      </p>
      <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.06em] text-[var(--tt-ink-faint)]">
        {metric.label}
      </p>
    </div>
  )
}

function RaceFeedCard({ row }: { row: CoachHomeRaceActivityRow }) {
  const router = useRouter()
  const { race } = row
  const resultLabel = coachHomeRaceResultLabel(race)
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
          className="absolute inset-y-0 left-0 w-[3px]"
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
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-[var(--tt-ink)]">
                {row.athleteName}
              </p>
              {timeLabel ? (
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
                {race.resultPlace?.trim() ? (
                  <p className="text-[11px] tabular-nums text-[var(--tt-ink-soft)]">
                    <span className="font-semibold text-[var(--tt-ink)]">{race.resultPlace.trim()}</span>{' '}
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

function SkippedReason({ notes }: { notes: string | null }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--tt-ink-faint)]">
        Reason
      </p>
      <p className="line-clamp-2 text-[12px] leading-snug text-[var(--tt-ink-soft)]">
        {notes?.trim() ? `“${notes.trim()}”` : 'No reason provided'}
      </p>
    </div>
  )
}
