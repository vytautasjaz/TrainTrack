import Link from 'next/link'
import { format, isToday, isYesterday } from 'date-fns'
import { WorkoutSportIcon } from '@/components/plan/workout-sport-icon'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { getWorkoutPlanMetrics } from '@/lib/workout-plan-metrics'
import { parseDateOnly } from '@/lib/dates'
import { cn } from '@/lib/utils'

type AthleteRecentActivityProps = {
  workouts: PlanWorkoutDetail[]
  className?: string
}

function relativeDayLabel(dateKey: string): string {
  const date = parseDateOnly(dateKey)
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'MMM d')
}

export function AthleteRecentActivity({
  workouts,
  className,
}: AthleteRecentActivityProps) {
  if (workouts.length === 0) {
    return (
      <section className={cn('tt-dashboard-card', className)}>
        <p className="title-eyebrow">Recent activity</p>
        <p className="mt-3 text-sm text-[#737986]">No completed workouts yet.</p>
      </section>
    )
  }

  return (
    <section className={cn('tt-dashboard-card', className)}>
      <p className="title-eyebrow">Recent activity</p>
      <ul className="mt-1">
        {workouts.map((workout) => {
          const metrics = getWorkoutPlanMetrics(workout, workout.status)
          const parts = [metrics.duration, metrics.distance].filter(Boolean)
          return (
            <li key={workout.id}>
              <Link
                href={`/workouts/${workout.id}`}
                className="tt-dashboard-activity-row rounded-md px-0.5 transition hover:bg-black/[0.02]"
              >
                <WorkoutSportIcon
                  type={workout.type}
                  isRace={workout.isRace}
                  size="sm"
                  className="h-[38px] w-[38px] rounded-[10px]"
                />
                <div className="min-w-0">
                    <p className="title-card truncate">{workout.title}</p>
                  <p className="mt-0.5 text-xs tabular-nums text-[#8a8f98]">
                    {parts.length > 0 ? parts.join(' · ') : '—'}
                  </p>
                </div>
                <p className="shrink-0 self-start pt-1 text-[11px] text-[#737986]">
                  {relativeDayLabel(workout.dateKey)}
                </p>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
