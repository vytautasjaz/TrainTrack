'use client'

import { format } from 'date-fns'
import { Check, MessageSquare, Minus } from 'lucide-react'
import { WorkoutType } from '@prisma/client'
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
import { isStravaSynced, workoutHasCoachingChat, athleteCanLeaveWorkoutComment } from '@/lib/plan-workout'
import { workoutFeelingLabel } from '@/lib/workout-feeling'
import { cn } from '@/lib/utils'
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
      {
        label: 'Duration',
        value: formatMetric(time) !== '—' ? formatMetric(time) : durationFallback ?? '—',
      },
      { label: 'Distance', value: formatMetric(distance) },
      { label: 'Avg pace', value: formatMetric(pace) },
      { label: 'Elev gain', value: elev ?? '—' },
      { label: 'Calories', value: calories ?? '—' },
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

type ActivityFeedWorkoutCardProps = {
  row: CoachHomeWorkoutActivityRow
  isCoach: boolean
}

export function ActivityFeedWorkoutCard({ row, isCoach }: ActivityFeedWorkoutCardProps) {
  const skipped = row.status === 'skipped'
  const hasFeedbackNotes = Boolean(row.feedbackNotes?.trim())
  const hasChat = workoutHasCoachingChat(row.workout)
  const stravaSynced = isStravaSynced(row.workout)
  const selfAdded = Boolean(row.workout.selfLogged)
  const summaryPolyline = row.workout.result?.summaryPolyline?.trim() || null
  const showMap = !skipped && Boolean(summaryPolyline)
  const metricSlots = feedMetricSlots(row)
  const canAthleteFeedback = !isCoach && athleteCanLeaveWorkoutComment(row.workout, false)

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
          className="absolute inset-y-0 left-0 w-[3px]"
          style={{ background: sportRailColor(row.activityType, skipped) }}
          aria-hidden
        />

        <div className="grid gap-4 py-3.5 pl-4 pr-3.5 md:grid-cols-[minmax(12rem,0.9fr)_minmax(0,1.6fr)] md:items-start md:gap-5">
          <div className="min-w-0 space-y-3">
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
                  <WorkoutChatIndicator workout={row.workout} role={isCoach ? 'coach' : 'athlete'} size="sm" />
                ) : null}
                {stravaSynced ? (
                  <StravaSyncedIndicator workout={row.workout} variant="wordmark" size="xs" />
                ) : null}
              </div>
            </div>

            {canAthleteFeedback ? (
              <ActivityFeedInlineFeedback row={row} skipped={skipped} />
            ) : skipped ? (
              <SkippedReason notes={row.feedbackNotes} />
            ) : hasFeedbackNotes ? (
              <p className="flex items-start gap-1.5 text-[12px] leading-snug text-[var(--tt-ink-soft)]">
                <MessageSquare
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--tt-ink-faint)]"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <span className="line-clamp-3 whitespace-pre-wrap">{row.feedbackNotes}</span>
              </p>
            ) : row.feedbackFeeling != null ? (
              <p className="text-[12px] text-[var(--tt-ink-soft)]">
                Feeling {row.feedbackFeeling}/10 · {workoutFeelingLabel(row.feedbackFeeling)}
              </p>
            ) : null}

            {row.feedbackReply ? (
              <div className="rounded-[6px] border border-brand/20 bg-brand-soft/25 px-2.5 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-brand">
                  Coach reply
                </p>
                <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-[12px] leading-snug text-[var(--tt-ink-soft)]">
                  {row.feedbackReply}
                </p>
              </div>
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
