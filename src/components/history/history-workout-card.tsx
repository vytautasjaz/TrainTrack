'use client'

import { Badge } from '@/components/ui/badge'
import { WorkoutModalTrigger } from '@/components/plan/workout-modal-trigger'
import { CompletionSourceBadge } from '@/components/history/completion-source-badge'
import { WORKOUT_TYPE_COLORS, WORKOUT_TYPE_LABELS } from '@/lib/constants'
import {
  getWorkoutCompletionSource,
  toPlanWorkoutDetailFromHistory,
  type WorkoutHistoryItem,
} from '@/lib/workout-history'
import { formatDistance, formatDuration } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { WORKOUT_CARD_CLASS } from '@/lib/workout-display'

type HistoryWorkoutCardProps = {
  workout: WorkoutHistoryItem
  isCoach: boolean
  compact?: boolean
  className?: string
}

export function HistoryWorkoutCard({
  workout,
  isCoach,
  compact = false,
  className,
}: HistoryWorkoutCardProps) {
  const source = getWorkoutCompletionSource(workout)
  const metrics = [
    workout.result.actualDistance ? formatDistance(workout.result.actualDistance) : null,
    workout.result.actualDuration ? formatDuration(workout.result.actualDuration) : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <WorkoutModalTrigger
      workout={toPlanWorkoutDetailFromHistory(workout)}
      isCoach={isCoach}
      className={cn(
        WORKOUT_CARD_CLASS,
        'flex w-full items-start justify-between gap-2',
        compact ? 'px-2 py-1.5' : 'px-3 py-2.5',
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className={cn('font-medium leading-snug', compact ? 'text-xs' : 'text-sm')}>
            {workout.title}
          </p>
          <CompletionSourceBadge source={source} />
        </div>
        {metrics && (
          <p className={cn('mt-0.5 text-muted-foreground', compact ? 'text-[10px]' : 'text-xs')}>
            {metrics}
          </p>
        )}
        {!compact && workout.result.athleteNotes && (
          <p className="mt-1 line-clamp-2 text-xs italic text-muted-foreground">
            &ldquo;{workout.result.athleteNotes}&rdquo;
          </p>
        )}
      </div>
      {!compact && (
        <Badge className={cn('shrink-0', WORKOUT_TYPE_COLORS[workout.type])}>
          {WORKOUT_TYPE_LABELS[workout.type]}
        </Badge>
      )}
    </WorkoutModalTrigger>
  )
}
