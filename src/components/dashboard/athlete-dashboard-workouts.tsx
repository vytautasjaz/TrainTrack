'use client'

import Link from 'next/link'
import { Route } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { WorkoutModalTrigger } from '@/components/plan/workout-modal-trigger'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { WORKOUT_TYPE_COLORS, WORKOUT_TYPE_LABELS } from '@/lib/constants'
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
    timeZone: 'UTC',
  })
}

function formatDayNumber(dateKey: string) {
  return parseDateOnly(dateKey).getUTCDate()
}

export function AthleteDashboardWorkouts({
  todayWorkouts,
  upcomingWorkouts,
}: AthleteDashboardWorkoutsProps) {
  return (
    <>
      <Card className="order-1 md:order-3">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Today&apos;s workout</CardTitle>
          <Link href="/training" className="text-xs text-muted-foreground hover:text-brand">
            View plan
          </Link>
        </CardHeader>
        <CardContent className="space-y-3">
          {todayWorkouts.length === 0 ? (
            <div className="rounded-2xl bg-muted/50 px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">Rest day — nothing scheduled.</p>
            </div>
          ) : (
            todayWorkouts.map((workout) => (
              <WorkoutModalTrigger
                key={workout.id}
                workout={workout}
                isCoach={false}
                className="group flex w-full items-center gap-4 rounded-2xl border border-border/60 bg-card p-4 transition hover:border-brand/30 hover:shadow-sm"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft">
                  <Route className="h-5 w-5 text-brand" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold group-hover:text-brand">{workout.title}</p>
                    <Badge className={WORKOUT_TYPE_COLORS[workout.type]}>
                      {WORKOUT_TYPE_LABELS[workout.type]}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {formatDistance(workout.plannedDistance)} ·{' '}
                    {formatDuration(workout.plannedDuration)}
                  </p>
                  {workout.description && (
                    <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                      {workout.description}
                    </p>
                  )}
                </div>
              </WorkoutModalTrigger>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="order-2 md:order-4">
        <CardHeader>
          <CardTitle>Upcoming</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {upcomingWorkouts.map((workout) => (
            <WorkoutModalTrigger
              key={workout.id}
              workout={workout}
              isCoach={false}
              className="flex w-full items-center justify-between rounded-2xl bg-muted/40 px-4 py-3 text-sm transition hover:bg-muted/70"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-card text-xs font-bold text-brand">
                  {formatDayNumber(workout.dateKey)}
                </div>
                <span className="truncate font-medium">
                  {formatUpcomingDate(workout.dateKey)} · {workout.title}
                </span>
              </div>
              <Badge className={`shrink-0 ${WORKOUT_TYPE_COLORS[workout.type]}`}>
                {WORKOUT_TYPE_LABELS[workout.type]}
              </Badge>
            </WorkoutModalTrigger>
          ))}
          {upcomingWorkouts.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">Nothing scheduled ahead.</p>
          )}
        </CardContent>
      </Card>
    </>
  )
}
