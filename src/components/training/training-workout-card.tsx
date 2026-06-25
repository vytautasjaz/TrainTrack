'use client'

import { Badge } from '@/components/ui/badge'
import { WorkoutModalTrigger } from '@/components/plan/workout-modal-trigger'
import { CompletionSourceBadge } from '@/components/history/completion-source-badge'
import {
  WORKOUT_STATUS_LABELS,
  WORKOUT_TYPE_COLORS,
  WORKOUT_TYPE_LABELS,
} from '@/lib/constants'
import { getWorkoutPlanDescriptionLines, type PlanWorkoutDetail } from '@/lib/plan-workout'
import { getWorkoutCompletionSource } from '@/lib/workout-history'
import { formatDistance, formatDuration } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { CheckCircle2 } from 'lucide-react'

type TrainingWorkoutCardProps = {
  workout: PlanWorkoutDetail
  isCoach: boolean
  compact?: boolean
  detailed?: boolean
  className?: string
}

function formatMetrics(distance: number | null, duration: number | null) {
  return [distance ? formatDistance(distance) : null, duration ? formatDuration(duration) : null]
    .filter(Boolean)
    .join(' · ')
}

export function TrainingWorkoutCard({
  workout,
  isCoach,
  compact = false,
  detailed = false,
  className,
}: TrainingWorkoutCardProps) {
  const isCompleted = workout.status === 'COMPLETED'
  const plannedMetrics = formatMetrics(workout.plannedDistance, workout.plannedDuration)
  const actualMetrics = workout.result
    ? formatMetrics(workout.result.actualDistance, workout.result.actualDuration)
    : null
  const descriptionLines = detailed ? getWorkoutPlanDescriptionLines(workout) : []
  const showCoachNotes =
    detailed &&
    Boolean(workout.coachNotes?.trim()) &&
    Boolean(workout.description?.trim() || workout.structure)

  const completionSource =
    isCompleted && workout.result
      ? getWorkoutCompletionSource({
          selfLogged: workout.selfLogged ?? false,
          result: workout.result,
        })
      : null

  return (
    <WorkoutModalTrigger
      workout={workout}
      isCoach={isCoach}
      className={cn(
        'group flex w-full items-start justify-between gap-3 rounded-xl border border-border/60 bg-card text-left transition hover:border-brand/30 hover:shadow-sm',
        compact ? 'px-2.5 py-2' : 'px-4 py-3',
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {isCompleted && (
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          )}
          <p
            className={cn(
              'font-medium leading-snug group-hover:text-brand',
              compact ? 'text-xs' : 'text-sm',
            )}
          >
            {workout.title}
          </p>
          {completionSource && <CompletionSourceBadge source={completionSource} />}
        </div>

        <div className="mt-1.5 flex flex-wrap gap-2">
          <Badge className={cn('shrink-0', WORKOUT_TYPE_COLORS[workout.type])}>
            {WORKOUT_TYPE_LABELS[workout.type]}
          </Badge>
          <Badge className="bg-accent text-accent-foreground">
            {WORKOUT_STATUS_LABELS[workout.status]}
          </Badge>
        </div>

        {isCompleted && actualMetrics ? (
          <p className={cn('mt-1.5 text-muted-foreground', compact ? 'text-[10px]' : 'text-sm')}>
            {actualMetrics}
            {plannedMetrics && plannedMetrics !== actualMetrics && (
              <span className="text-muted-foreground/70"> · planned {plannedMetrics}</span>
            )}
          </p>
        ) : (
          plannedMetrics && (
            <p className={cn('mt-1.5 text-muted-foreground', compact ? 'text-[10px]' : 'text-sm')}>
              {plannedMetrics}
            </p>
          )
        )}

        {detailed && descriptionLines.length > 0 && (
          <div className="mt-1.5 space-y-0.5">
            {descriptionLines.map((line, index) => (
              <p
                key={`${workout.id}-desc-${index}`}
                className={cn('leading-snug text-muted-foreground', compact ? 'text-[10px]' : 'text-xs')}
              >
                {line}
              </p>
            ))}
          </div>
        )}

        {showCoachNotes && (
          <p className={cn('mt-1.5 text-muted-foreground', compact ? 'text-[10px]' : 'text-xs')}>
            Coach: {workout.coachNotes}
          </p>
        )}

        {detailed && isCompleted && workout.result?.rpe != null && (
          <p className={cn('mt-1.5 text-muted-foreground', compact ? 'text-[10px]' : 'text-xs')}>
            RPE: {workout.result.rpe}/10
          </p>
        )}

        {(detailed || !compact) && workout.result?.athleteNotes && (
          <p className="mt-1 line-clamp-2 text-xs italic text-muted-foreground">
            &ldquo;{workout.result.athleteNotes}&rdquo;
          </p>
        )}
      </div>
    </WorkoutModalTrigger>
  )
}
