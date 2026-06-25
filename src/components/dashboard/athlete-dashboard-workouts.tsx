'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { WorkoutModalTrigger } from '@/components/plan/workout-modal-trigger'
import { WorkoutSportIcon } from '@/components/plan/workout-sport-icon'
import { TrainingWorkoutCard } from '@/components/training/training-workout-card'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { formatDistance, formatDuration } from '@/lib/utils'
import { parseDateOnly } from '@/lib/dates'

type AthleteDashboardWorkoutsProps = {
  todayWorkouts: PlanWorkoutDetail[]
  upcomingWorkouts: PlanWorkoutDetail[]
}

function formatUpcomingDate(dateKey: string) {
  return parseDateOnly(dateKey).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

function SectionHeader({
  title,
  action,
}: {
  title: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-lg font-semibold leading-tight tracking-tight">{title}</h2>
      {action}
    </div>
  )
}

export function AthleteDashboardWorkouts({
  todayWorkouts,
  upcomingWorkouts,
}: AthleteDashboardWorkoutsProps) {
  return (
    <div className="space-y-8">
      <section>
        <SectionHeader
          title="Today's workout"
          action={
            <Link
              href="/training"
              className="flex shrink-0 items-center gap-0.5 text-xs font-semibold text-brand"
            >
              View plan
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
        <div className="space-y-3">
          {todayWorkouts.length === 0 ? (
            <div className="rounded-2xl bg-muted/50 px-4 py-10 text-center">
              <p className="text-sm text-muted-foreground">Rest day — nothing scheduled.</p>
            </div>
          ) : (
            todayWorkouts.map((workout) => (
              <TrainingWorkoutCard key={workout.id} workout={workout} isCoach={false} />
            ))
          )}
        </div>
      </section>

      <section>
        <SectionHeader title="Upcoming" />
        <div className="space-y-2">
          {upcomingWorkouts.map((workout) => (
            <WorkoutModalTrigger
              key={workout.id}
              workout={workout}
              isCoach={false}
              className="flex w-full items-center gap-3 rounded-2xl border border-border/40 bg-muted/30 px-3 py-3 text-left transition hover:bg-muted/50"
            >
              <WorkoutSportIcon type={workout.type} isRace={workout.isRace} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium leading-snug text-muted-foreground">
                  {formatUpcomingDate(workout.dateKey)}
                </p>
                <p className="mt-0.5 truncate text-sm font-semibold leading-snug">{workout.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatDistance(workout.plannedDistance)} ·{' '}
                  {formatDuration(workout.plannedDuration)}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
            </WorkoutModalTrigger>
          ))}
          {upcomingWorkouts.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">Nothing scheduled ahead.</p>
          )}
        </div>
      </section>
    </div>
  )
}
