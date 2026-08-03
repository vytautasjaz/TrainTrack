'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { WorkoutDetailModal } from '@/components/plan/workout-detail-modal'
import { RaceDetailModal } from '@/components/plan/race-detail-modal'
import { TrainingListWorkoutRow } from '@/components/training/training-list-workout-row'
import { TrainingWorkoutCard } from '@/components/training/training-workout-card'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { buildPlanTableDays } from '@/lib/plan-week'
import { parseDateOnly } from '@/lib/dates'
import { WORKOUT_DAY_CARD_CLASS } from '@/lib/workout-display'
import { cn } from '@/lib/utils'

type AthleteDashboardWorkoutsProps = {
  todayWorkouts: PlanWorkoutDetail[]
  upcomingWorkouts: PlanWorkoutDetail[]
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

function workoutsToPlanDays(workouts: PlanWorkoutDetail[]) {
  const byDate = new Map<string, PlanWorkoutDetail[]>()
  for (const workout of workouts) {
    if (workout.type === 'REST' || workout.type === 'RECOVERY') continue
    const list = byDate.get(workout.dateKey) ?? []
    list.push(workout)
    byDate.set(workout.dateKey, list)
  }
  const dates = [...byDate.keys()]
    .sort()
    .map((dateKey) => parseDateOnly(dateKey))
  return buildPlanTableDays(dates, byDate)
}

export function AthleteDashboardWorkouts({
  todayWorkouts,
  upcomingWorkouts,
}: AthleteDashboardWorkoutsProps) {
  const upcomingDays = workoutsToPlanDays(upcomingWorkouts)
  const [selected, setSelected] = useState<PlanWorkoutDetail | null>(null)

  return (
    <div className="space-y-8">
      <section>
        <SectionHeader title="Today's workout" />
        <div className="space-y-3">
          {todayWorkouts.length === 0 ? (
            <div className="card-elevated px-4 py-10 text-center">
              <p className="text-sm text-muted-foreground">Rest day — nothing scheduled.</p>
            </div>
          ) : (
            <div className={cn(WORKOUT_DAY_CARD_CLASS, 'space-y-1 p-1')}>
              {todayWorkouts.map((workout) => (
                <TrainingWorkoutCard
                  key={workout.id}
                  workout={workout}
                  isCoach={false}
                  className="py-2"
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <section>
        <SectionHeader title="Upcoming" />
        {upcomingDays.length === 0 ? (
          <div className="card-elevated px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">No upcoming workouts.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {upcomingDays.map((day) => (
              <div key={day.dateKey} className="space-y-2">
                <div className="flex items-center gap-2 px-0.5">
                  <p
                    className={cn(
                      'text-[11px] font-semibold uppercase tracking-wide text-muted-foreground',
                      day.isToday && 'text-foreground',
                    )}
                  >
                    {format(day.date, 'EEEE d MMM')}
                  </p>
                </div>
                <div className="space-y-1.5">
                  {day.workouts.map((workout) => (
                    <TrainingListWorkoutRow
                      key={workout.id}
                      workout={workout}
                      isCoach={false}
                      onOpen={() => setSelected(workout)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {selected?.isRace ? (
        <RaceDetailModal
          workout={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null)
          }}
        />
      ) : selected ? (
        <WorkoutDetailModal
          workout={selected}
          isCoach={false}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null)
          }}
        />
      ) : null}
    </div>
  )
}
