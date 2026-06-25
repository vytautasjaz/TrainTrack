import { WorkoutType } from '@prisma/client'

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
  Workout: WorkoutType.STRENGTH,
  Crossfit: WorkoutType.HYROX,
  HighIntensityIntervalTraining: WorkoutType.HYROX,
  Walk: WorkoutType.RECOVERY,
  Hike: WorkoutType.RECOVERY,
  Yoga: WorkoutType.RECOVERY,
}

export function mapStravaTypeToWorkoutType(stravaType: string): WorkoutType | null {
  return STRAVA_TYPE_MAP[stravaType] ?? null
}

export function workoutTypesCompatible(
  planned: WorkoutType,
  activity: WorkoutType,
): boolean {
  if (planned === activity) return true
  if (planned === WorkoutType.RECOVERY && activity === WorkoutType.RUN) return true
  if (planned === WorkoutType.RUN && activity === WorkoutType.RECOVERY) return true
  return false
}
