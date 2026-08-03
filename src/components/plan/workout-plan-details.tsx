'use client'

import { MessageSquare } from 'lucide-react'
import { WorkoutStatus } from '@prisma/client'
import { WorkoutStructureChart } from '@/components/workout-builder/workout-structure-chart'
import { hasStructureContent } from '@/lib/workout-builder/utils'
import { StravaSyncedIndicator } from '@/components/plan/strava-synced-indicator'
import { IncludeItemsSummary } from '@/components/workout-editor/include-items-summary'
import { CompletionSourceBadge } from '@/components/history/completion-source-badge'
import {
  getWorkoutPlanDescriptionEntries,
  type PlanWorkoutDetail,
} from '@/lib/plan-workout'
import {
  formatPlannedComparison,
  formatPrimaryMetrics,
  getWorkoutPlanMetrics,
} from '@/lib/workout-plan-metrics'
import { getReschedulePlanLabel } from '@/components/plan/reschedule-plan-indicator'
import { getWorkoutCompletionSource } from '@/lib/workout-history'
import { cn } from '@/lib/utils'

type WorkoutPlanDetailsProps = {
  workout: PlanWorkoutDetail
  status?: WorkoutStatus
  isCoach?: boolean
  density?: 'compact' | 'comfortable'
  showCompletionSource?: boolean
  showRescheduleLabel?: boolean
  className?: string
}

function DescriptionEntry({
  entry,
  className,
}: {
  entry: ReturnType<typeof getWorkoutPlanDescriptionEntries>[number]
  className?: string
}) {
  if (entry.kind === 'section') {
    return (
      <p className={cn('font-semibold leading-snug text-foreground', className)}>
        {entry.text}
      </p>
    )
  }

  if (entry.prefix) {
    return (
      <p className={cn('leading-snug text-muted-foreground', className)}>
        <span className="font-semibold text-foreground">{entry.prefix}</span> {entry.text}
      </p>
    )
  }

  return (
    <p className={cn('leading-snug text-muted-foreground', className)}>{entry.text}</p>
  )
}

export function WorkoutPlanDetails({
  workout,
  status = workout.status,
  isCoach: _isCoach = false,
  density = 'comfortable',
  showCompletionSource = false,
  showRescheduleLabel = true,
  className,
}: WorkoutPlanDetailsProps) {
  const isCompact = density === 'compact'
  const isCompleted = status === WorkoutStatus.COMPLETED
  const metrics = getWorkoutPlanMetrics(workout, status)
  const primaryMetrics = formatPrimaryMetrics(metrics)
  const plannedComparison = formatPlannedComparison(metrics)
  const descriptionEntries = getWorkoutPlanDescriptionEntries(workout)
  const maxDescriptionLines = isCompact ? 2 : 4

  const completionSource =
    showCompletionSource && isCompleted && workout.result
      ? getWorkoutCompletionSource({
          selfLogged: workout.selfLogged ?? false,
          result: workout.result,
        })
      : null

  const showManualCompletionBadge =
    completionSource != null && completionSource !== 'manual'

  const hasNotes =
    Boolean(workout.result?.athleteNotes?.trim()) ||
    Boolean(workout.result?.coachReply?.trim())

  const hasFootnotes =
    showManualCompletionBadge ||
    hasNotes ||
    Boolean(workout.result?.stravaActivityUrl)

  const textSize = isCompact ? 'text-[10px]' : 'text-xs'
  const metricSize = isCompact ? 'text-[10px]' : 'text-xs'
  const plannedSize = isCompact ? 'text-[9px]' : 'text-[10px]'
  const descSize = isCompact ? 'text-[9px] line-clamp-1' : 'text-[11px] line-clamp-2'

  const rescheduleLabel = showRescheduleLabel ? getReschedulePlanLabel(workout) : null

  if (
    !primaryMetrics &&
    !plannedComparison &&
    descriptionEntries.length === 0 &&
    !workout.structure &&
    !hasFootnotes &&
    !rescheduleLabel
  ) {
    return null
  }

  return (
    <div className={cn('space-y-0.5', className)}>
      {rescheduleLabel ? (
        <p
          className={cn(
            metricSize,
            'font-semibold text-amber-700 dark:text-amber-400',
          )}
        >
          {rescheduleLabel}
        </p>
      ) : null}
      {primaryMetrics && (
        <p className={cn(metricSize, 'font-bold tabular-nums leading-snug text-foreground')}>
          {primaryMetrics}
        </p>
      )}

      {plannedComparison && (
        <p className={cn(plannedSize, 'text-muted-foreground')}>{plannedComparison}</p>
      )}

      {descriptionEntries.length > 0 && (
        <div className="space-y-0.5">
          {descriptionEntries.slice(0, maxDescriptionLines).map((entry, index) => (
            <DescriptionEntry
              key={`${workout.id}-entry-${index}`}
              entry={entry}
              className={descSize}
            />
          ))}
        </div>
      )}

      {workout.structure && hasStructureContent(workout.structure) && (
        <WorkoutStructureChart
          structure={workout.structure}
          size="sm"
          showCaption={false}
          className={isCompact ? 'mt-0.5' : 'mt-1'}
        />
      )}

      {workout.structure?.includeItems && workout.structure.includeItems.length > 0 ? (
        <div className={cn(isCompact ? 'pt-1' : 'pt-1.5')}>
          <p className={cn(descSize, 'mb-1 font-semibold text-foreground')}>Include</p>
          <IncludeItemsSummary items={workout.structure.includeItems} compact />
        </div>
      ) : null}

      {hasFootnotes && (
        <div className={cn('flex flex-wrap items-center gap-1.5', isCompact ? 'pt-0.5' : 'pt-1')}>
          <StravaSyncedIndicator
            workout={workout}
            variant={isCompact ? 'mark' : 'wordmark'}
            size={isCompact ? 'xs' : 'sm'}
          />
          {showManualCompletionBadge && completionSource && (
            <CompletionSourceBadge source={completionSource} />
          )}
          {hasNotes && (
            <span
              className={cn('inline-flex items-center text-muted-foreground', textSize)}
              title="Has notes"
            >
              <MessageSquare className={cn(isCompact ? 'h-2.5 w-2.5' : 'h-3 w-3')} aria-hidden />
            </span>
          )}
        </div>
      )}
    </div>
  )
}
