import { useEffect, useMemo, useState } from 'react'
import { workoutRepository } from '../db/workoutRepository'
import type { Workout } from '../types/workout'
import { formatMonthYear } from '../utils/date'
import { computeActivityStats, computeTypeCounts } from '../utils/weekStats'

export function useMonthlyStats(refreshToken: number) {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  useEffect(() => {
    let active = true

    void workoutRepository.getByMonth(year, month).then((data) => {
      if (!active) return
      setWorkouts(data)
      setLoading(false)
    })

    return () => {
      active = false
    }
  }, [year, month, refreshToken])

  const stats = useMemo(() => computeActivityStats(workouts), [workouts])
  const typeCounts = useMemo(() => computeTypeCounts(workouts), [workouts])

  return {
    stats,
    typeCounts,
    loading,
    monthLabel: formatMonthYear(year, month),
  }
}
