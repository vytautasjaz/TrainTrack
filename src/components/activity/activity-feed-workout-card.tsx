'use client'

import { format, isToday, isYesterday } from 'date-fns'
import { Check, Minus } from 'lucide-react'
import { SessionType, WorkoutType } from '@prisma/client'
import { AthleteAvatar } from '@/components/athlete/athlete-avatar'
import { ActivityRouteMap } from '@/components/plan/activity-route-map'
import { StravaSyncedIndicator } from '@/components/plan/strava-synced-indicator'
import { WorkoutModalTrigger } from '@/components/plan/workout-modal-trigger'
import { WorkoutChatIndicator } from '@/components/plan/workout-chat-indicator'
import { WorkoutSportIcon } from '@/components/plan/workout-sport-icon'
import { SelfAddedBadge } from '@/components/plan/self-added-badge'
import { WORKOUT_TYPE_LABELS } from '@/lib/constants'
import {
  type CoachHomeActivityMetric,
  type CoachHomeWorkoutActivityRow,
} from '@/lib/coach-home'
import { parseDateOnly } from '@/lib/dates'
import {
  athleteCanLeaveWorkoutComment,
  isStravaSynced,
  workoutHasCoachingChat,
  type PlanWorkoutDetail,
} from '@/lib/plan-workout'
import { getSessionTypeLabel } from '@/lib/workout-builder/session-modes'
import {
  estimateSessionLoad,
  type SessionLoadThresholds,
} from '@/lib/training-load/session-tss'
import { cn } from '@/lib/utils'
import { ActivityFeedFeedbackReadout } from '@/components/activity/activity-feed-feeling'
import { ActivityFeedInlineFeedback } from '@/components/dashboard/athlete-activity-feed-feedback'

export function ActivityDayHeading({ dateKey }: { dateKey: string }) {
  const [y, m, d] = dateKey.split('-').map(Number)
  const date = new Date(y!, m! - 1, d!)
  return (
    <h3 className="flex flex-wrap items-baseline gap-x-1.5 text-[0.8125rem] leading-none tracking-tight">
      <span className="font-semibold text-[var(--tt-ink)]">{format(date, 'EEEE')}</span>
      <span className="font-medium text-[var(--tt-ink-faint)]">{format(date, 'MMMM d')}</span>
    </h3>
  )
}

export function sportRailColor(type: WorkoutType, skipped: boolean): string {
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

export function feedWorkoutSubtitle(
  activityType: WorkoutType,
  sessionType: SessionType,
): string {
  const sport = WORKOUT_TYPE_LABELS[activityType]
  const session = getSessionTypeLabel(sessionType, activityType)
  const trimmed = session.replace(new RegExp(`\\s*${sport}$`, 'i'), '').trim()
  if (!trimmed || trimmed.toLowerCase() === sport.toLowerCase()) return sport
  return `${sport} · ${trimmed}`
}

function formatFeedCardDateMeta(opts: {
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

function feedMetricSlots(
  row: CoachHomeWorkoutActivityRow,
  thresholds: SessionLoadThresholds = {},
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
      : '—'
  const load = estimateSessionLoad(row.workout, thresholds)
  const tss = load ? String(Math.round(load.tss)) : '—'

  const durationFallback =
    !time && result?.actualDuration != null && result.actualDuration > 0
      ? formatFeedClock(result.actualDuration)
      : null

  if (row.activityType === WorkoutType.STRENGTH || row.activityType === WorkoutType.RECOVERY) {
    return [
      {
        label: 'Duration',
        value: formatMetric(time) !== '—' ? formatMetric(time) : durationFallback ?? '—',
      },
      { label: 'Distance', value: formatMetric(distance) },
      { label: 'Avg pace', value: formatMetric(pace) },
      { label: 'Elev gain', value: elev ?? '—' },
      { label: 'TSS', value: tss },
      { label: 'Calories', value: calories },
    ]
  }

  return [
    { label: 'Distance', value: formatMetric(distance) },
    {
      label: 'Time',
      value: formatMetric(time) !== '—' ? formatMetric(time) : durationFallback ?? '—',
    },
    { label: 'Avg pace', value: formatMetric(pace) },
    { label: 'Elev gain', value: elev ?? '—' },
    { label: 'TSS', value: tss },
    { label: 'Calories', value: calories },
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
      <p className="truncate text-[13px] font-semibold tabular-nums leading-none text-[var(--tt-ink)] sm:text-[15px]">
        {metric.value}
      </p>
      <p className="mt-1 truncate text-[8px] font-semibold uppercase tracking-[0.05em] text-[var(--tt-ink-faint)] sm:text-[9px] sm:tracking-[0.06em]">
        {metric.label}
      </p>
    </div>
  )
}

function WorkoutFeedStatusBadges({
  workout,
  skipped,
  hasChat,
  chatRole,
}: {
  workout: PlanWorkoutDetail
  skipped: boolean
  hasChat: boolean
  chatRole: 'coach' | 'athlete'
}) {
  const stravaSynced = isStravaSynced(workout)
  return (
    <div
      className="flex shrink-0 flex-wrap items-center justify-end gap-1.5"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {skipped ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--tt-red-soft,rgb(218_47_54_/0.08))] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--tt-red)]">
          <Minus className="h-3 w-3" strokeWidth={2.25} aria-hidden />
          Skipped
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--tt-good-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--tt-good)]">
          <Check className="h-3 w-3" strokeWidth={2.25} aria-hidden />
          Completed
        </span>
      )}
      {stravaSynced ? (
        <span className="inline-flex items-center rounded-full bg-[var(--tt-sidebar,#f5f5f5)] px-2 py-0.5">
          <StravaSyncedIndicator workout={workout} variant="wordmark" size="xs" />
        </span>
      ) : null}
      {hasChat ? <WorkoutChatIndicator workout={workout} role={chatRole} size="sm" /> : null}
    </div>
  )
}

function CoachReplyBlock({ reply }: { reply: string }) {
  return (
    <div className="rounded-[6px] border border-brand/20 bg-brand-soft/25 px-2.5 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-brand">Coach reply</p>
      <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-[12px] leading-snug text-[var(--tt-ink-soft)] md:text-[13px]">
        {reply}
      </p>
    </div>
  )
}

type ActivityFeedWorkoutCardProps = {
  row: CoachHomeWorkoutActivityRow
  isCoach: boolean
  /**
   * Athlete mobile flat list: show date under the title.
   * Coach always shows date under the athlete name instead.
   */
  showDate?: boolean
  /** Improves TSS accuracy when FTP / threshold / HR zones are known. */
  loadThresholds?: SessionLoadThresholds
}

/**
 * Shared activity-feed workout card for coach home + athlete home.
 * Coach adds athlete header; athlete adds inline feedback / coach reply.
 */
export function ActivityFeedWorkoutCard({
  row,
  isCoach,
  showDate = false,
  loadThresholds = {},
}: ActivityFeedWorkoutCardProps) {
  const skipped = row.status === 'skipped'
  const hasChat = workoutHasCoachingChat(row.workout)
  const selfAdded = Boolean(row.workout.selfLogged)
  const summaryPolyline = row.workout.result?.summaryPolyline?.trim() || null
  const showMap = !skipped && Boolean(summaryPolyline)
  const metricSlots = feedMetricSlots(row, loadThresholds)
  const subtitle = feedWorkoutSubtitle(row.activityType, row.workout.sessionType)
  const chatRole = isCoach ? 'coach' : 'athlete'
  const canAthleteFeedback = !isCoach && athleteCanLeaveWorkoutComment(row.workout, false)
  const feedbackReadout = (
    <ActivityFeedFeedbackReadout
      notes={row.feedbackNotes}
      feeling={row.feedbackFeeling}
      skipped={skipped}
    />
  )

  return (
    <WorkoutModalTrigger
      workout={row.workout}
      isCoach={isCoach}
      className="block w-full text-left"
    >
      <article
        className={cn(
          'relative overflow-hidden bg-white transition hover:bg-[color-mix(in_srgb,var(--tt-sidebar,#f5f5f5)_55%,white)]',
          skipped && 'bg-[color-mix(in_srgb,var(--tt-sidebar,#f5f5f5)_40%,white)]',
        )}
      >
        <div
          className="absolute inset-y-0 left-0 hidden w-[3px] md:block"
          style={{ background: sportRailColor(row.activityType, skipped) }}
          aria-hidden
        />

        <div className="grid gap-2.5 py-3.5 pl-4 pr-3.5 md:grid-cols-[minmax(15rem,1.1fr)_minmax(0,1.4fr)] md:items-start md:gap-4">
          <div className="min-w-0 space-y-3">
            {isCoach ? (
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
                  <time
                    dateTime={row.dateKey}
                    className="mt-0.5 block truncate text-[11px] font-normal text-[var(--tt-ink-soft,#6b6b6b)]"
                  >
                    {formatFeedCardDateMeta({
                      dateKey: row.dateKey,
                      activityAt: row.activityAt,
                    })}
                  </time>
                </div>
                <WorkoutFeedStatusBadges
                  workout={row.workout}
                  skipped={skipped}
                  hasChat={hasChat}
                  chatRole={chatRole}
                />
              </div>
            ) : null}

            <div className="flex min-w-0 items-start gap-2">
              <WorkoutSportIcon type={row.activityType} size="sm" className="mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold leading-snug text-[var(--tt-ink)]">
                  {row.activityTitle}
                </p>
                {!isCoach && showDate ? (
                  <time
                    dateTime={row.dateKey}
                    className="mt-0.5 block truncate text-[11px] font-normal text-[var(--tt-ink-soft,#6b6b6b)]"
                  >
                    {formatFeedCardDateMeta({
                      dateKey: row.dateKey,
                      activityAt: row.activityAt,
                    })}
                  </time>
                ) : null}
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                  <p className="text-[12px] text-[var(--tt-ink-soft,#6b6b6b)]">{subtitle}</p>
                  {selfAdded ? <SelfAddedBadge /> : null}
                </div>
              </div>
              {!isCoach ? (
                <WorkoutFeedStatusBadges
                  workout={row.workout}
                  skipped={skipped}
                  hasChat={hasChat}
                  chatRole={chatRole}
                />
              ) : null}
            </div>

            <div className="hidden space-y-3 pt-2.5 md:block">
              {canAthleteFeedback ? (
                <ActivityFeedInlineFeedback row={row} skipped={skipped} />
              ) : (
                feedbackReadout
              )}
              {!isCoach && row.feedbackReply ? (
                <CoachReplyBlock reply={row.feedbackReply} />
              ) : null}
            </div>
          </div>

          <div className="min-w-0 space-y-3">
            {showMap && summaryPolyline ? (
              <ActivityRouteMap
                summaryPolyline={summaryPolyline}
                routeColor={sportRailColor(row.activityType, false)}
              />
            ) : null}
            {!skipped ? (
              <div
                className={cn(
                  'grid gap-x-2 sm:gap-x-3',
                  // Distance · Time · Pace · Elev · TSS · Calories
                  'grid-cols-[minmax(0,1.05fr)_minmax(0,1.1fr)_minmax(0,1.45fr)_minmax(0,0.95fr)_minmax(0,0.65fr)_minmax(0,0.85fr)]',
                )}
              >
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

            <div className="space-y-3 md:hidden">
              {canAthleteFeedback ? null : (
                <>
                  {feedbackReadout}
                  {!isCoach && row.feedbackReply ? (
                    <CoachReplyBlock reply={row.feedbackReply} />
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>

        {canAthleteFeedback ? (
          <div className="border-t border-[var(--tt-line)] px-4 pb-3.5 pt-3 md:hidden">
            <ActivityFeedInlineFeedback row={row} skipped={skipped} />
          </div>
        ) : null}
      </article>
    </WorkoutModalTrigger>
  )
}
