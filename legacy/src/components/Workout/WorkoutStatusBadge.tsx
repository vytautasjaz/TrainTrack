import type { Workout } from '../../types/workout'
import {
  getExecutionStatusLabel,
  getWorkoutDisplayStatus,
  getExecutionStatusTheme,
} from '../../utils/workoutDisplay'

type WorkoutStatusBadgeProps = {
  workout: Workout
}

export function WorkoutStatusBadge({ workout }: WorkoutStatusBadgeProps) {
  const status = getWorkoutDisplayStatus(workout)
  const theme = getExecutionStatusTheme(status)
  const label = status === 'planned' ? 'Planned' : getExecutionStatusLabel(status)

  return (
    <span
      className="mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide"
      style={{ backgroundColor: theme.badgeBg, color: theme.badgeText }}
    >
      {label}
    </span>
  )
}
