'use client'

import { useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ArrowRight } from 'lucide-react'
import { WorkoutDetailModal } from '@/components/plan/workout-detail-modal'
import { RaceDetailModal } from '@/components/plan/race-detail-modal'
import { TrainingListWorkoutRow } from '@/components/training/training-list-workout-row'
import { TrainingWorkoutCard } from '@/components/training/training-workout-card'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { getWorkoutCompletionPercent } from '@/lib/workout-card'
import { buildPlanTableDays } from '@/lib/plan-week'
import { parseDateOnly } from '@/lib/dates'
import { cn } from '@/lib/utils'

type AthleteDashboardWorkoutsProps = {
  todayWorkouts: PlanWorkoutDetail[]
  upcomingWorkouts: PlanWorkoutDetail[]
}

function SectionHeader({
  title,
  level = 'section',
  action,
}: {
  title: string
  level?: 'section' | 'eyebrow'
  action?: React.ReactNode
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      {level === 'eyebrow' ? (
        <p className="title-eyebrow">{title}</p>
      ) : (
        <h2 className="title-section">{title}</h2>
      )}
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
    <div className="tt-dashboard-main-col">
      <section>
        <SectionHeader title="Today's workout" />
        {todayWorkouts.length === 0 ? (
          <div className="tt-dashboard-card px-4 py-10 text-center">
            <p className="text-sm text-[#737986]">Rest day — nothing scheduled.</p>
          </div>
        ) : (
          <div className="tt-dashboard-today-list">
            {todayWorkouts.map((workout) => {
              const completionPercent = getWorkoutCompletionPercent(workout)
              return (
                <div
                  key={workout.id}
                  className="tt-dashboard-today"
                  data-sport={workout.type}
                  data-completion={
                    completionPercent != null
                      ? Math.min(100, completionPercent)
                      : undefined
                  }
                  style={
                    completionPercent != null
                      ? ({
                          '--tt-completion': `${Math.min(100, Math.max(0, completionPercent))}%`,
                        } as CSSProperties)
                      : undefined
                  }
                >
                  <TrainingWorkoutCard
                    workout={workout}
                    isCoach={false}
                    appearance="dashboard-today"
                    className="py-0"
                  />
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section>
        <SectionHeader title="Upcoming" />
        {upcomingDays.length === 0 ? (
          <div className="tt-dashboard-card px-4 py-8 text-center">
            <p className="text-sm text-[#737986]">No upcoming workouts.</p>
          </div>
        ) : (
          <div>
            {upcomingDays.map((day) => (
              <div key={day.dateKey} className="tt-dashboard-upcoming-day">
                <p
                  className={cn(
                    'title-day',
                    day.isToday && 'text-[#111111]',
                  )}
                >
                  {format(day.date, 'EEEE d MMM').toUpperCase()}
                </p>
                <div className="tt-dashboard-upcoming-stack">
                  {day.workouts.map((workout) => (
                    <TrainingListWorkoutRow
                      key={workout.id}
                      workout={workout}
                      isCoach={false}
                      appearance="dashboard"
                      onOpen={() => setSelected(workout)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <Link
          href="/training"
          className="mt-5 flex items-center justify-center gap-2 rounded-[8px] border border-[#e3e4e2] bg-white px-4 py-3 text-sm font-semibold text-[#111111] transition hover:bg-black/[0.02]"
        >
          View full schedule
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
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
