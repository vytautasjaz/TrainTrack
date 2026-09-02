'use server'

import { WorkoutType } from '@prisma/client'
import {
  requireSession,
  resolveAthleteId,
  requireCoachOwnsAthlete,
  isCoach,
} from '@/lib/session'
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
  athleteId?: string | null,
): Promise<LibraryPlanDayWorkout[]> {
  const session = await requireSession()
  let targetAthleteId = athleteId?.trim() || null

  if (targetAthleteId) {
    if (!isCoach(session)) throw new Error('Coach only')
    await requireCoachOwnsAthlete(session.userId, targetAthleteId)
  } else {
    targetAthleteId = await resolveAthleteId(session)
  }

  if (!targetAthleteId) return []
  if (!Number.isInteger(year) || monthIndex < 0 || monthIndex > 11) return []

  const workouts = await getMonthWorkouts(targetAthleteId, year, monthIndex)
  return workouts.map((w) => ({
    id: w.id,
    dateKey: toDateKey(w.date),
    title: w.title,
    type: w.type,
  }))
}
