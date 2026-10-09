import { WorkoutStatus, type WorkoutType } from '@prisma/client'
import { toDateKey } from '@/lib/dates'
import { mapStravaTypeToWorkoutType, workoutTypesCompatible } from '@/lib/strava/map-sport'
import type { StravaActivity } from '@/lib/strava/types'

export type StravaMatchCandidate = {
  id: string
  date: Date | string
  status: WorkoutStatus
  type: WorkoutType
  selfLogged?: boolean
  result?: {
    stravaActivityId?: string | null
    actualDistance?: number | null
  } | null
}

/**
 * Auto-sync matching: same calendar day only.
 * Off-day linking is manual (athlete picks the activity on the planned session).
 * Nearby auto-match wrongly completed unfinished sessions on other days and could
 * leave a second self-logged copy of the same Strava activity.
 */
export function findWorkoutForActivityInPool(
  pool: StravaMatchCandidate[],
  activity: Pick<StravaActivity, 'type' | 'sport_type' | 'start_date_local'>,
  claimedWorkoutIds: Set<string>,
): { workout: StravaMatchCandidate; offDay: false } | null {
  const activityType = mapStravaTypeToWorkoutType(activity.sport_type ?? activity.type)
  if (!activityType) return null

  const dateKey = activity.start_date_local.slice(0, 10)
  const available = pool.filter((w) => !claimedWorkoutIds.has(w.id))
  const sameDay = available.filter((w) => toDateKey(w.date) === dateKey)

  const pickCompatible = (
    candidates: StravaMatchCandidate[],
    statuses: WorkoutStatus[],
  ) =>
    candidates.find(
      (w) =>
        statuses.includes(w.status) &&
        workoutTypesCompatible(w.type, activityType) &&
        !w.result?.stravaActivityId,
    ) ?? null

  const sameDayPlanned = pickCompatible(sameDay, [WorkoutStatus.PLANNED])
  if (sameDayPlanned) return { workout: sameDayPlanned, offDay: false }

  const sameDayIncomplete = sameDay.find(
    (w) =>
      w.status === WorkoutStatus.COMPLETED &&
      workoutTypesCompatible(w.type, activityType) &&
      !w.result?.stravaActivityId &&
      !w.result?.actualDistance,
  )
  if (sameDayIncomplete) return { workout: sameDayIncomplete, offDay: false }

  const sameDaySkipped = pickCompatible(sameDay, [WorkoutStatus.SKIPPED])
  if (sameDaySkipped) return { workout: sameDaySkipped, offDay: false }

  return null
}
