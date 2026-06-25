import { format } from 'date-fns'
import type { DayNoteData } from '@/lib/day-notes'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'

export type PlanDay = {
  date: Date
  dateKey: string
  dayLabel: string
  dateLabel: string
  isToday: boolean
  workouts: PlanWorkoutDetail[]
  dayNote?: DayNoteData | null
}

export function buildPlanTableDays(
  days: Date[],
  byDate: Map<string, PlanWorkoutDetail[]>,
  notesByDate?: Map<string, DayNoteData>,
): PlanDay[] {
  const todayKey = format(new Date(), 'yyyy-MM-dd')
  return days.map((date) => {
    const dateKey = format(date, 'yyyy-MM-dd')
    return {
      date,
      dateKey,
      dayLabel: format(date, 'EEE'),
      dateLabel: format(date, 'd MMM'),
      isToday: dateKey === todayKey,
      workouts: byDate.get(dateKey) ?? [],
      dayNote: notesByDate?.get(dateKey) ?? null,
    }
  })
}
