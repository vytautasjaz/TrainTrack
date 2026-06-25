import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { getWorkoutPlanDescriptionLines } from '@/lib/plan-workout'
import { RACE_TYPE_LABELS } from '@/lib/constants'
import { formatDistance, formatDuration } from '@/lib/utils'
import { cn } from '@/lib/utils'

function workoutMetrics(w: PlanWorkoutDetail) {
  const parts: string[] = []
  if (w.plannedDistance) parts.push(formatDistance(w.plannedDistance))
  if (w.plannedDuration) parts.push(formatDuration(w.plannedDuration))
  return parts.join(' · ')
}

function raceMetaLines(workout: PlanWorkoutDetail): string[] {
  const lines: string[] = []
  if (workout.raceType) lines.push(RACE_TYPE_LABELS[workout.raceType])
  if (workout.raceLocation) lines.push(workout.raceLocation)
  if (workout.raceGoal) lines.push(`Goal: ${workout.raceGoal}`)
  return lines
}

type WorkoutPlanMetaProps = {
  workout: PlanWorkoutDetail
  size?: 'sm' | 'md'
  className?: string
}

export function WorkoutPlanMeta({ workout, size = 'sm', className }: WorkoutPlanMetaProps) {
  const metrics = workoutMetrics(workout)
  const lines = workout.isRace ? raceMetaLines(workout) : getWorkoutPlanDescriptionLines(workout)
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs'

  if (!metrics && lines.length === 0) return null

  return (
    <div className={cn('space-y-0.5', className)}>
      {metrics && (
        <p className={cn(textSize, 'text-muted-foreground')}>{metrics}</p>
      )}
      {lines.length > 0 && (
        <div className="space-y-0.5">
          {lines.map((line, index) => (
            <p key={`${workout.id}-line-${index}`} className={cn(textSize, 'leading-snug text-muted-foreground')}>
              {line}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
