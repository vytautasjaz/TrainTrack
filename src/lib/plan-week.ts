import { format } from 'date-fns'
import type { DayNoteData } from '@/lib/day-notes'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { todayDateKey, toDateKey } from '@/lib/dates'

export type PlanDay = {
  date: Date
  dateKey: string
  dayLabel: string
  dateLabel: string
  isToday: boolean
  workouts: PlanWorkoutDetail[]
  dayNote?: DayNoteData | null
}

/** Local calendar date for labels — avoids TZ drift on UTC date-only instants. */
function labelDateFor(date: Date, dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function planDateKey(date: Date): string {
  // UTC midnight = Prisma DATE / parseDateOnly; local midnight = startOfWeek etc.
  const isUtcMidnight =
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0
  return isUtcMidnight ? toDateKey(date) : format(date, 'yyyy-MM-dd')
}

export function buildPlanTableDays(
  days: Date[],
  byDate: Map<string, PlanWorkoutDetail[]>,
  notesByDate?: Map<string, DayNoteData>,
): PlanDay[] {
  const todayKey = todayDateKey()
  return days.map((date) => {
    const dateKey = planDateKey(date)
    const labelDate = labelDateFor(date, dateKey)
    return {
      date,
      dateKey,
      dayLabel: format(labelDate, 'EEE'),
      dateLabel: format(labelDate, 'd MMM'),
      isToday: dateKey === todayKey,
      workouts: byDate.get(dateKey) ?? [],
      dayNote: notesByDate?.get(dateKey) ?? null,
    }
  })
}
