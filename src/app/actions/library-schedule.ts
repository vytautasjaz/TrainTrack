'use server'

import { WorkoutType } from '@prisma/client'
import { requireSession, resolveAthleteId } from '@/lib/session'
import { getMonthWorkouts } from '@/lib/queries'
import { toDateKey } from '@/lib/dates'

export type LibraryPlanDayWorkout = {
  id: string
  dateKey: string
  title: string
  type: WorkoutType
}

/** Light plan markers for the library schedule day picker (selected athlete). */
export async function getLibraryMonthPlanMarkers(
  year: number,
  monthIndex: number,
): Promise<LibraryPlanDayWorkout[]> {
  const session = await requireSession()
  const athleteId = await resolveAthleteId(session)
  if (!athleteId) return []
  if (!Number.isInteger(year) || monthIndex < 0 || monthIndex > 11) return []

  const workouts = await getMonthWorkouts(athleteId, year, monthIndex)
  return workouts.map((w) => ({
    id: w.id,
    dateKey: toDateKey(w.date),
    title: w.title,
    type: w.type,
  }))
}
