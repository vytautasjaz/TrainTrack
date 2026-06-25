'use client'

import { WorkoutStatus } from '@prisma/client'
import { WorkoutModalTrigger } from '@/components/plan/workout-modal-trigger'
import { AthleteAddedBadge } from '@/components/plan/athlete-added-badge'
import { WorkoutSportIcon } from '@/components/plan/workout-sport-icon'
import { CompletionSourceBadge } from '@/components/history/completion-source-badge'
import { getWorkoutPlanDescriptionLines, type PlanWorkoutDetail } from '@/lib/plan-workout'
import { getWorkoutCompletionSource } from '@/lib/workout-history'
import { formatDistance, formatDuration } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { CheckCircle2, XCircle } from 'lucide-react'

type TrainingWorkoutCardProps = {
  workout: PlanWorkoutDetail
  isCoach: boolean
  compact?: boolean
  detailed?: boolean
  className?: string
}

function MetricInline({
  label,
  value,
  compact,
}: {
  label: string
  value: string
  compact?: boolean
}) {
  return (
    <div className="text-left">
      <p className={cn('font-bold tabular-nums leading-none', compact ? 'text-xs' : 'text-sm')}>
        {value}
      </p>
      <p className="mt-0.5 text-[10px] text-muted-foreground">{label}</p>
    </div>
  )
}

export function TrainingWorkoutCard({
  workout,
  isCoach,
  compact = false,
  detailed = false,
  className,
}: TrainingWorkoutCardProps) {
  const isCompleted = workout.status === WorkoutStatus.COMPLETED
  const isSkipped = workout.status === WorkoutStatus.SKIPPED
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

  const showAthleteAddedBadge =
    workout.selfLogged && workout.status !== WorkoutStatus.COMPLETED

  const distanceValue =
    isCompleted && workout.result?.actualDistance != null
      ? formatDistance(workout.result.actualDistance)
      : workout.plannedDistance != null
        ? formatDistance(workout.plannedDistance)
        : '—'

  const durationValue =
    isCompleted && workout.result?.actualDuration != null
      ? formatDuration(workout.result.actualDuration)
      : workout.plannedDuration != null
        ? formatDuration(workout.plannedDuration)
        : '—'

  const rpeValue = workout.result?.rpe != null ? `${workout.result.rpe}/10` : '—'

  return (
    <WorkoutModalTrigger
      workout={workout}
      isCoach={isCoach}
      className={cn(
        'group block w-full rounded-2xl border border-border/50 bg-card text-left transition hover:border-brand/30 hover:shadow-[var(--shadow-card)]',
        compact ? 'p-2.5' : 'p-3.5',
        isSkipped && 'opacity-75',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <WorkoutSportIcon
          type={workout.type}
          isRace={workout.isRace}
          size="sm"
          className="shrink-0"
        />
        {isCompleted && (
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
        )}
        {isSkipped && (
          <XCircle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
        )}
        <p
          className={cn(
            'min-w-0 flex-1 font-semibold leading-snug group-hover:text-brand',
            compact ? 'text-xs' : 'text-sm',
            isSkipped && 'line-through text-muted-foreground',
          )}
        >
          {workout.title}
        </p>
      </div>

      {completionSource && (
        <div className="mt-1.5">
          <CompletionSourceBadge source={completionSource} />
        </div>
      )}

      {showAthleteAddedBadge && (
        <div className="mt-1.5">
          <AthleteAddedBadge forCoach={isCoach} />
        </div>
      )}

      <div
        className={cn(
          'mt-2 flex flex-wrap items-start gap-x-5 gap-y-2',
          compact && 'mt-1.5 gap-x-4',
        )}
      >
        <MetricInline label="Distance" value={distanceValue} compact={compact} />
        <MetricInline label="Duration" value={durationValue} compact={compact} />
        <MetricInline label="RPE" value={rpeValue} compact={compact} />
      </div>

      {detailed && descriptionLines.length > 0 && (
        <div className="mt-2 space-y-0.5">
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
        <p className={cn('mt-2 text-muted-foreground', compact ? 'text-[10px]' : 'text-xs')}>
          Coach: {workout.coachNotes}
        </p>
      )}

      {(detailed || !compact) && workout.result?.athleteNotes && (
        <p className="mt-1 line-clamp-2 text-xs italic text-muted-foreground">
          &ldquo;{workout.result.athleteNotes}&rdquo;
        </p>
      )}
    </WorkoutModalTrigger>
  )
}
