'use server'

import { eachDayOfInterval } from 'date-fns'
import { requireSession, resolveAthleteId, isCoachView } from '@/lib/session'
import {
  getDayNotesForRange,
  getPlanWorkoutsInRange,
  getRacesForRange,
  groupDayNotesByDate,
  groupWorkoutsByDate,
} from '@/lib/queries'
import {
  toPlanWorkoutDetail,
  redactPlanWorkoutNotesForViewer,
} from '@/lib/plan-workout'
import { mergeRacesIntoByDate } from '@/lib/races'
import { buildPlanTableDays } from '@/lib/plan-week'
import { parseDateOnly } from '@/lib/dates'

export type TrainingTableDayDto = {
  dateKey: string
  dayLabel: string
  dateLabel: string
  isToday: boolean
  workouts: ReturnType<typeof toPlanWorkoutDetail>[]
}

function isValidDateKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

/** Fetch plan days for table infinite scroll. Inclusive date keys (yyyy-MM-dd). */
export async function fetchTrainingTableDays(
  fromKey: string,
  toKey: string,
): Promise<TrainingTableDayDto[]> {
  if (!isValidDateKey(fromKey) || !isValidDateKey(toKey)) {
    throw new Error('Invalid date range')
  }

  const session = await requireSession()
  const athleteId = await resolveAthleteId(session)
  if (!athleteId) throw new Error('No athlete selected')

  const start = parseDateOnly(fromKey)
  const end = parseDateOnly(toKey)
  if (end < start) throw new Error('Invalid date range')

  // Guard against huge ranges (max ~90 days per request)
  const maxMs = 90 * 24 * 60 * 60 * 1000
  if (end.getTime() - start.getTime() > maxMs) {
    throw new Error('Range too large')
  }

  const rawWorkouts = await getPlanWorkoutsInRange(athleteId, start, end)
  const byDateRaw = groupWorkoutsByDate(rawWorkouts)
  const noteViewer = isCoachView(session) ? 'coach' : 'athlete'
  const byDateWorkouts = new Map(
    [...byDateRaw.entries()].map(([key, list]) => [
      key,
      list.map((w) =>
        redactPlanWorkoutNotesForViewer(toPlanWorkoutDetail(w), noteViewer),
      ),
    ]),
  )
  const races = await getRacesForRange(athleteId, start, end)
  const byDate = mergeRacesIntoByDate(byDateWorkouts, races)
  const dayNotes = await getDayNotesForRange(athleteId, start, end)
  const notesByDate = groupDayNotesByDate(dayNotes, noteViewer)

  const days = eachDayOfInterval({ start, end })
  return buildPlanTableDays(days, byDate, notesByDate).map((day) => ({
    dateKey: day.dateKey,
    dayLabel: day.dayLabel,
    dateLabel: day.dateLabel,
    isToday: day.isToday,
    workouts: day.workouts,
  }))
}
