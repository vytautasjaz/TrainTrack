import { WorkoutType } from '@prisma/client'
import {
  CONFIGURABLE_PLAN_SPORTS,
  isConfigurablePlanSport,
} from '@/lib/plan-sports'

export const PLAN_SPORT_FILTER_STORAGE_KEY = 'tt-plan-visible-sports'

export const FILTERABLE_PLAN_SPORTS = CONFIGURABLE_PLAN_SPORTS

export function defaultVisiblePlanSports(): WorkoutType[] {
  return [...FILTERABLE_PLAN_SPORTS]
}

export function normalizeVisiblePlanSports(sports: WorkoutType[]): WorkoutType[] {
  const selected = new Set(sports.filter(isConfigurablePlanSport))
  if (selected.size === 0) return []
  return FILTERABLE_PLAN_SPORTS.filter((sport) => selected.has(sport))
}

export function parseVisiblePlanSports(raw: string | null): WorkoutType[] {
  if (!raw) return defaultVisiblePlanSports()
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return defaultVisiblePlanSports()
    return normalizeVisiblePlanSports(
      parsed.filter((v): v is WorkoutType => typeof v === 'string'),
    )
  } catch {
    return defaultVisiblePlanSports()
  }
}

export function serializeVisiblePlanSports(sports: WorkoutType[]): string {
  return JSON.stringify(normalizeVisiblePlanSports(sports))
}

export function isPlanSportVisible(
  sport: WorkoutType,
  visibleSports: ReadonlySet<WorkoutType>,
): boolean {
  if (!isConfigurablePlanSport(sport)) return true
  return visibleSports.has(sport)
}

export function isPlanWorkoutVisible(
  workout: { type: WorkoutType },
  visibleSports: ReadonlySet<WorkoutType>,
): boolean {
  return isPlanSportVisible(workout.type, visibleSports)
}

export function filterPlanWorkouts<T extends { type: WorkoutType }>(
  workouts: T[],
  visibleSports: ReadonlySet<WorkoutType>,
): T[] {
  return workouts.filter((w) => isPlanWorkoutVisible(w, visibleSports))
}

export function filterPlanSportRows(
  sports: WorkoutType[],
  visibleSports: ReadonlySet<WorkoutType>,
): WorkoutType[] {
  return sports.filter((sport) => isPlanSportVisible(sport, visibleSports))
}
