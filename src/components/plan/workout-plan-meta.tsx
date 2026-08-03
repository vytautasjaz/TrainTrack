import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { getWorkoutPlanDescriptionLines } from '@/lib/plan-workout'
import { RACE_TYPE_LABELS } from '@/lib/constants'
import { formatDistance, formatDuration } from '@/lib/utils'
import { formatSwimDistance } from '@/lib/swim-workout/format'
import { cn } from '@/lib/utils'

function raceMetaLines(workout: PlanWorkoutDetail): string[] {
  const lines: string[] = []
  // Triathlon leg chips already include distance in the title — keep meta light.
  const isTriathlonLeg =
    workout.raceType === 'TRIATHLON' &&
    (workout.type === 'SWIM' || workout.type === 'BIKE' || workout.type === 'RUN')
  if (workout.raceType && !isTriathlonLeg) lines.push(RACE_TYPE_LABELS[workout.raceType])
  if (isTriathlonLeg) lines.push(RACE_TYPE_LABELS.TRIATHLON)
  if (workout.raceLocation) lines.push(workout.raceLocation)
  if (workout.raceGoal) lines.push(`Goal: ${workout.raceGoal}`)
  return lines
}

function workoutMetrics(w: PlanWorkoutDetail) {
  const parts: string[] = []
  const isTriathlonLeg =
    w.isRace &&
    w.raceType === 'TRIATHLON' &&
    (w.type === 'SWIM' || w.type === 'BIKE' || w.type === 'RUN')
  // Distance is already in the triathlon leg title.
  if (!isTriathlonLeg) {
    if (w.type === 'SWIM' && w.plannedDistanceMeters) {
      parts.push(formatSwimDistance(w.plannedDistanceMeters))
    } else if (w.plannedDistance) {
      parts.push(formatDistance(w.plannedDistance))
    }
  }
  if (w.plannedDuration) parts.push(formatDuration(w.plannedDuration))
  return parts.join(' · ')
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
