import { useEffect, useMemo, useState } from 'react'
import { workoutRepository } from '../db/workoutRepository'
import type { CalendarWorkoutDot, Workout } from '../types/workout'
import { formatDateLocal } from '../utils/date'
import { resolveWorkoutType, getWorkoutDisplayStatus } from '../utils/workoutDisplay'

export function useWorkouts(
  selectedDate: Date,
  viewMonth: { year: number; month: number },
  refreshToken: number,
) {
  const [monthWorkouts, setMonthWorkouts] = useState<Workout[]>([])
  const [dayWorkouts, setDayWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)

  const selectedDateStr = formatDateLocal(selectedDate)

  const workoutsByDate = useMemo(() => {
    const map = new Map<string, CalendarWorkoutDot[]>()
    for (const workout of monthWorkouts) {
      const dot: CalendarWorkoutDot = {
        id: workout.id,
        type: resolveWorkoutType(workout.type),
        executionStatus: getWorkoutDisplayStatus(workout),
      }
      const existing = map.get(workout.date) ?? []
      map.set(workout.date, [...existing, dot])
    }
    return map
  }, [monthWorkouts])

  useEffect(() => {
    let active = true

    Promise.all([
      workoutRepository.getByMonth(viewMonth.year, viewMonth.month),
      workoutRepository.getByDate(selectedDateStr),
    ])
      .then(([month, day]) => {
        if (!active) return
        setMonthWorkouts(month)
        setDayWorkouts(day)
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [viewMonth.year, viewMonth.month, selectedDateStr, refreshToken])

  return {
    dayWorkouts,
    workoutsByDate,
    loading,
  }
}
