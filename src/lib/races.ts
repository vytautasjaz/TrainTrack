import { RaceType, SessionType, WorkoutStatus, WorkoutType, RacePriority, RaceIntent } from '@prisma/client'
import { toDateKey } from '@/lib/dates'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'

export type RaceRecord = {
  id: string
  name: string
  date: Date
  location: string | null
  type: RaceType
  sport: WorkoutType
  priority: RacePriority
  intent: RaceIntent
  goal: string | null
  url: string | null
}

/** Sports that can be assigned when scheduling a race on the plan. */
export const RACE_SPORT_OPTIONS: WorkoutType[] = [
  WorkoutType.RUN,
  WorkoutType.BIKE,
  WorkoutType.SWIM,
  WorkoutType.TRIATHLON,
  WorkoutType.HYROX,
]

export function defaultSportForRaceType(type: RaceType): WorkoutType {
  switch (type) {
    case RaceType.CYCLING:
      return WorkoutType.BIKE
    case RaceType.HYROX:
      return WorkoutType.HYROX
    case RaceType.TRIATHLON:
      return WorkoutType.TRIATHLON
    case RaceType.MARATHON:
    case RaceType.HALF_MARATHON:
    case RaceType.OTHER:
    default:
      return WorkoutType.RUN
  }
}

export function raceToPlanWorkoutDetail(race: RaceRecord): PlanWorkoutDetail {
  return {
    id: `race-${race.id}`,
    title: race.name,
    dateKey: toDateKey(race.date),
    type: race.sport,
    sessionType: SessionType.RACE_PACE,
    status: WorkoutStatus.PLANNED,
    description: null,
    plannedDistance: null,
    plannedDistanceMeters: null,
    plannedDuration: null,
    swimEnvironment: null,
    coachNotes: race.goal,
    structure: null,
    swimStructure: null,
    isRace: true,
    raceId: race.id,
    raceType: race.type,
    raceGoal: race.goal,
    raceLocation: race.location,
    result: null,
  }
}

export function mergeRacesIntoByDate(
  byDate: Map<string, PlanWorkoutDetail[]>,
  races: RaceRecord[],
): Map<string, PlanWorkoutDetail[]> {
  const merged = new Map(byDate)
  for (const race of races) {
    if (race.intent === 'WATCHING') continue
    const detail = raceToPlanWorkoutDetail(race)
    const list = merged.get(detail.dateKey) ?? []
    merged.set(detail.dateKey, [...list, detail])
  }
  return merged
}

export function isRacePlanItem(workout: PlanWorkoutDetail): boolean {
  return Boolean(workout.isRace)
}
