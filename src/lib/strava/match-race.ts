import { RaceType, type RaceLegKind, type WorkoutType } from '@prisma/client'
import { toDateKey } from '@/lib/dates'
import { raceLegSupportsStrava, workoutTypeForRaceLeg } from '@/lib/race-legs'
import {
  resolveStravaActivityWorkoutType,
  workoutTypesCompatible,
} from '@/lib/strava/map-sport'
import type { StravaActivity } from '@/lib/strava/types'

export type StravaRaceMatchCandidate = {
  id: string
  date: Date | string
  type: RaceType
  sport: WorkoutType
  stravaActivityId?: string | null
  legs?: Array<{
    id: string
    kind: RaceLegKind
    stravaActivityId?: string | null
  }>
}

export type StravaRaceMatchTarget =
  | { kind: 'race'; raceId: string }
  | { kind: 'leg'; raceId: string; legId: string }

/**
 * Auto-sync: prefer linking a same-day race (or triathlon leg) before creating
 * a self-logged workout. Ambiguous days (2+ eligible targets) return null.
 */
export function findRaceTargetForActivity(
  pool: StravaRaceMatchCandidate[],
  activity: Pick<StravaActivity, 'type' | 'sport_type' | 'start_date_local'>,
  claimedRaceIds: Set<string>,
  claimedLegIds: Set<string>,
): StravaRaceMatchTarget | null {
  const activityType = resolveStravaActivityWorkoutType(activity)
  if (!activityType) return null

  const dateKey = activity.start_date_local.slice(0, 10)
  const sameDay = pool.filter((race) => toDateKey(race.date) === dateKey)

  const legTargets: Array<{ raceId: string; legId: string }> = []
  const raceTargets: string[] = []

  for (const race of sameDay) {
    if (race.type === RaceType.TRIATHLON) {
      for (const leg of race.legs ?? []) {
        if (!raceLegSupportsStrava(leg.kind)) continue
        if (leg.stravaActivityId) continue
        if (claimedLegIds.has(leg.id)) continue
        const legSport = workoutTypeForRaceLeg(leg.kind)
        if (!legSport) continue
        if (!workoutTypesCompatible(legSport, activityType)) continue
        legTargets.push({ raceId: race.id, legId: leg.id })
      }
      continue
    }

    if (race.stravaActivityId) continue
    if (claimedRaceIds.has(race.id)) continue
    if (!workoutTypesCompatible(race.sport, activityType)) continue
    raceTargets.push(race.id)
  }

  if (legTargets.length === 1 && raceTargets.length === 0) {
    const only = legTargets[0]!
    return { kind: 'leg', raceId: only.raceId, legId: only.legId }
  }
  if (raceTargets.length === 1 && legTargets.length === 0) {
    return { kind: 'race', raceId: raceTargets[0]! }
  }
  return null
}
