import Link from 'next/link'
import { parseDateOnly } from '@/lib/dates'
import type { WorkoutType } from '@prisma/client'
import { Badge } from '@/components/ui/badge'
import { WORKOUT_TYPE_COLORS, WORKOUT_TYPE_LABELS } from '@/lib/constants'
import { formatDistance, formatDuration } from '@/lib/utils'

export type WorkoutFeedbackContext = {
  id: string
  title: string
  date: string
  type: WorkoutType
  plannedDistance: number | null
  plannedDuration: number | null
}

type WorkoutFeedbackContextProps = {
  workout: WorkoutFeedbackContext
  athleteName?: string
  completedAt?: string
  repliedAt?: string
  variant?: 'feedback' | 'reply'
}

function formatWorkoutDate(dateKey: string) {
  return parseDateOnly(dateKey).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

function formatShortDate(dateIso: string) {
  return new Date(dateIso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

function workoutMetrics(workout: WorkoutFeedbackContext) {
  return [
    workout.plannedDistance != null ? formatDistance(workout.plannedDistance) : null,
    workout.plannedDuration != null ? formatDuration(workout.plannedDuration) : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

export function WorkoutFeedbackContextCard({
  workout,
  athleteName,
  completedAt,
  repliedAt,
  variant = 'feedback',
}: WorkoutFeedbackContextProps) {
  const metrics = workoutMetrics(workout)
  const contextLabel =
    variant === 'reply' ? 'Coach replied about this workout' : 'Feedback on this workout'

  return (
    <div className="rounded-xl border border-border/60 bg-background/80 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {contextLabel}
      </p>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <Badge className={WORKOUT_TYPE_COLORS[workout.type]}>
          {WORKOUT_TYPE_LABELS[workout.type]}
        </Badge>
        <Link href={`/workouts/${workout.id}`} className="font-semibold hover:text-brand">
          {workout.title}
        </Link>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {formatWorkoutDate(workout.date)}
        {metrics && ` · ${metrics}`}
      </p>
      {(athleteName || completedAt || repliedAt) && (
        <p className="mt-0.5 text-xs text-muted-foreground">
          {athleteName}
          {athleteName && (completedAt || repliedAt) && ' · '}
          {completedAt && `logged ${formatShortDate(completedAt)}`}
          {repliedAt && `replied ${formatShortDate(repliedAt)}`}
        </p>
      )}
    </div>
  )
}
