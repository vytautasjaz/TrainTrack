import { useEffect, useMemo, useState } from 'react'
import { dayIntentRepository } from '../db/dayIntentRepository'
import type { DayIntent } from '../types/dayIntent'

export function useDayIntents(
  viewMonth: { year: number; month: number },
  selectedDateStr: string,
  refreshToken: number,
) {
  const [monthIntents, setMonthIntents] = useState<DayIntent[]>([])
  const [selectedIntent, setSelectedIntent] = useState<DayIntent | undefined>()
  const [loading, setLoading] = useState(true)

  const intentsByDate = useMemo(() => {
    const map = new Map<string, DayIntent>()
    for (const intent of monthIntents) {
      map.set(intent.date, intent)
    }
    return map
  }, [monthIntents])

  useEffect(() => {
    let active = true

    Promise.all([
      dayIntentRepository.getByMonth(viewMonth.year, viewMonth.month),
      dayIntentRepository.getByDate(selectedDateStr),
    ])
      .then(([month, selected]) => {
        if (!active) return
        setMonthIntents(month)
        setSelectedIntent(selected)
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
    intentsByDate,
    selectedIntent,
    loading,
  }
}
