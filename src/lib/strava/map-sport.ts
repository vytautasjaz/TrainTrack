import { WorkoutType } from '@prisma/client'

/**
 * Strava `sport_type` / legacy `type` → TrainTrack sport.
 * Gym sessions are often logged as generic "Workout" (not WeightTraining).
 * Those map to STRENGTH and are also compatible with planned HYROX
 * (see workoutTypesCompatible), so either plan can auto-match.
 */
const STRAVA_TYPE_MAP: Record<string, WorkoutType> = {
  Run: WorkoutType.RUN,
  VirtualRun: WorkoutType.RUN,
  TrailRun: WorkoutType.RUN,
  Ride: WorkoutType.BIKE,
  VirtualRide: WorkoutType.BIKE,
  EBikeRide: WorkoutType.BIKE,
  GravelRide: WorkoutType.BIKE,
  MountainBikeRide: WorkoutType.BIKE,
  Swim: WorkoutType.SWIM,
  WeightTraining: WorkoutType.STRENGTH,
  /** Generic gym / “Other” session in Strava — treat as strength. */
  Workout: WorkoutType.STRENGTH,
  Elliptical: WorkoutType.STRENGTH,
  StairStepper: WorkoutType.STRENGTH,
  Crossfit: WorkoutType.HYROX,
  HighIntensityIntervalTraining: WorkoutType.HYROX,
  Walk: WorkoutType.RECOVERY,
  Hike: WorkoutType.RECOVERY,
  Yoga: WorkoutType.RECOVERY,
  Pilates: WorkoutType.RECOVERY,
}

const STRAVA_TYPE_MAP_LOWER: Record<string, WorkoutType> = Object.fromEntries(
  Object.entries(STRAVA_TYPE_MAP).map(([key, value]) => [key.toLowerCase(), value]),
) as Record<string, WorkoutType>

export function mapStravaTypeToWorkoutType(stravaType: string): WorkoutType | null {
  const key = stravaType.trim()
  if (!key) return null
  return STRAVA_TYPE_MAP[key] ?? STRAVA_TYPE_MAP_LOWER[key.toLowerCase()] ?? null
}

/**
 * Prefer `sport_type`, but if it is missing or unmapped fall back to legacy `type`.
 * (Previously `sport_type ?? type` skipped `type` whenever sport_type was a
 * non-null unmapped string.)
 */
export function resolveStravaActivityWorkoutType(activity: {
  type?: string | null
  sport_type?: string | null
}): WorkoutType | null {
  const fromSport = activity.sport_type
    ? mapStravaTypeToWorkoutType(activity.sport_type)
    : null
  if (fromSport) return fromSport
  if (activity.type) return mapStravaTypeToWorkoutType(activity.type)
  return null
}

export function workoutTypesCompatible(
  planned: WorkoutType,
  activity: WorkoutType,
): boolean {
  if (planned === activity) return true
  if (planned === WorkoutType.RECOVERY && activity === WorkoutType.RUN) return true
  if (planned === WorkoutType.RUN && activity === WorkoutType.RECOVERY) return true
  // Strength / HYROX share Strava gym types: Workout, WeightTraining, Crossfit, HIIT
  if (planned === WorkoutType.STRENGTH && activity === WorkoutType.HYROX) return true
  if (planned === WorkoutType.HYROX && activity === WorkoutType.STRENGTH) return true
  return false
}
