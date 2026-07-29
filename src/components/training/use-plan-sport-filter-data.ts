'use client'

import { useMemo } from 'react'
import type { PlanDay } from '@/lib/plan-week'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { filterPlanWorkouts } from '@/lib/plan-sport-filter'
import { useOptionalPlanSportFilter } from '@/components/training/plan-sport-filter-context'

export function useFilteredPlanDays(days: PlanDay[]): PlanDay[] {
  const filter = useOptionalPlanSportFilter()
  const visibleSportSet = filter?.visibleSportSet

  return useMemo(() => {
    if (!visibleSportSet) return days
    return days.map((day) => ({
      ...day,
      workouts: filterPlanWorkouts(day.workouts, visibleSportSet),
    }))
  }, [days, visibleSportSet])
}

export function useFilteredWorkoutsByDate(
  workoutsByDate: Map<string, PlanWorkoutDetail[]>,
): Map<string, PlanWorkoutDetail[]> {
  const filter = useOptionalPlanSportFilter()
  const visibleSportSet = filter?.visibleSportSet

  return useMemo(() => {
    if (!visibleSportSet) return workoutsByDate
    const next = new Map<string, PlanWorkoutDetail[]>()
    for (const [key, workouts] of workoutsByDate) {
      next.set(key, filterPlanWorkouts(workouts, visibleSportSet))
    }
    return next
  }, [workoutsByDate, visibleSportSet])
}
