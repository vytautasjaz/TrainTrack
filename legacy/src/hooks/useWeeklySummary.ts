import { useEffect, useMemo, useState } from 'react'
import { workoutRepository } from '../db/workoutRepository'
import type { Workout } from '../types/workout'
import { formatDateLocal, getWeekBoundsForOffset } from '../utils/date'
import { computeWeekStats } from '../utils/weekStats'

export function useWeeklySummary(weekOffset: number, refreshToken: number) {
  const [weekWorkouts, setWeekWorkouts] = useState<Workout[]>([])
  const [upcomingWorkouts, setUpcomingWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)

  const { start, end } = getWeekBoundsForOffset(weekOffset)
  const startStr = formatDateLocal(start)
  const endStr = formatDateLocal(end)
  const todayStr = formatDateLocal(new Date())

  useEffect(() => {
    let active = true

    Promise.all([
      workoutRepository.getByDateRange(startStr, endStr),
      workoutRepository.getFromDate(todayStr),
    ])
      .then(([week, upcoming]) => {
        if (!active) return
        setWeekWorkouts(week)
        setUpcomingWorkouts(upcoming)
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [startStr, endStr, todayStr, refreshToken])

  const stats = useMemo(() => computeWeekStats(weekWorkouts), [weekWorkouts])

  return {
    stats,
    weekWorkouts,
    upcomingWorkouts,
    loading,
    weekStart: start,
    weekEnd: end,
  }
}
