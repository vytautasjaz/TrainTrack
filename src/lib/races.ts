import {
  RaceType,
  SessionType,
  WorkoutStatus,
  WorkoutType,
  RacePriority,
  RaceIntent,
  RaceOutcome,
  TriathlonDistance,
  RaceLegKind,
} from '@prisma/client'
import { toDateKey } from '@/lib/dates'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import {
  resolveRaceDistancesBySport,
  sumRaceDurationsMin,
  type RaceDistancesBySport,
  type RaceDistanceSport,
} from '@/lib/race-distance-stats'

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
  triathlonDistance?: TriathlonDistance | null
  customDistanceKm?: number | null
  outcome?: RaceOutcome | null
  legs?: Array<{
    kind: RaceLegKind
    actualDistanceKm?: number | null
    actualDurationMin?: number | null
    plannedDistanceKm?: number | null
    plannedTime?: string | null
    resultTime?: string | null
  }> | null
  resultTime?: string | null
}

/** Sports that can be assigned when scheduling a race on the plan. */
export const RACE_SPORT_OPTIONS: WorkoutType[] = [
  WorkoutType.RUN,
  WorkoutType.BIKE,
  WorkoutType.SWIM,
  WorkoutType.TRIATHLON,
  WorkoutType.HYROX,
]

const TRIATHLON_PLAN_SPORTS: RaceDistanceSport[] = [
  WorkoutType.SWIM,
  WorkoutType.BIKE,
  WorkoutType.RUN,
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
    case RaceType.FIVE_K:
    case RaceType.TEN_K:
    case RaceType.OTHER:
    default:
      return WorkoutType.RUN
  }
}

function isTriathlonRace(race: RaceRecord): boolean {
  return race.type === RaceType.TRIATHLON || race.sport === WorkoutType.TRIATHLON
}

function racePrimaryPlannedKm(bySport: RaceDistancesBySport): number | null {
  const values = Object.values(bySport)
    .map((e) => e?.plannedKm ?? 0)
    .filter((n) => n > 0)
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0)
}

function raceResultFromMetrics(args: {
  actualDistanceKm: number | null
  actualDurationMin: number | null
}) {
  const hasDistance =
    args.actualDistanceKm != null &&
    Number.isFinite(args.actualDistanceKm) &&
    args.actualDistanceKm >= 0
  const hasDuration = args.actualDurationMin != null && args.actualDurationMin > 0
  if (!hasDistance && !hasDuration) return null
  return {
    actualDistance: hasDistance ? args.actualDistanceKm : null,
    actualDuration: hasDuration ? Math.round(args.actualDurationMin!) : null,
    rpe: null,
    athleteNotes: null,
    coachReply: null,
    coachReplyReadAt: null,
    stravaActivityUrl: null,
    logType: null,
  }
}

/** DNF / DNS with no logged distance → show 0 km on the card. */
function raceActualKmForCard(
  race: RaceRecord,
  resolvedActualKm: number | null | undefined,
): number | null {
  if (resolvedActualKm != null && resolvedActualKm > 0) return resolvedActualKm
  if (
    race.outcome === RaceOutcome.DNF ||
    race.outcome === RaceOutcome.DID_NOT_START
  ) {
    return 0
  }
  return resolvedActualKm ?? null
}

function baseRaceFields(race: RaceRecord) {
  return {
    dateKey: toDateKey(race.date),
    sessionType: SessionType.RACE_PACE,
    // Race chips are not workout status — keep PLANNED so completed/skipped styles never apply.
    status: WorkoutStatus.PLANNED,
    description: null,
    swimEnvironment: null,
    coachNotes: race.goal,
    structure: null,
    swimStructure: null,
    isRace: true as const,
    raceId: race.id,
    raceType: race.type,
    racePriority: race.priority,
    raceOutcome: race.outcome ?? null,
    raceGoal: race.goal,
    raceLocation: race.location,
  }
}

/** Single-sport (or non-split) race card. */
export function raceToPlanWorkoutDetail(race: RaceRecord): PlanWorkoutDetail {
  const raceDistanceBySport = resolveRaceDistancesBySport(race)
  const plannedTotal = racePrimaryPlannedKm(raceDistanceBySport)
  const plannedDuration = sumRaceDurationsMin(raceDistanceBySport, 'planned')
  const actualDuration = sumRaceDurationsMin(raceDistanceBySport, 'actual')
  const single = Object.values(raceDistanceBySport)[0]
  const actualKm = raceActualKmForCard(race, single?.actualKm ?? null)

  return {
    ...baseRaceFields(race),
    id: `race-${race.id}`,
    title: race.name,
    type: race.sport,
    plannedDistance: plannedTotal,
    plannedDistanceMeters:
      race.sport === WorkoutType.SWIM && plannedTotal != null
        ? Math.round(plannedTotal * 1000)
        : null,
    plannedDuration: plannedDuration > 0 ? Math.round(plannedDuration) : null,
    raceDistanceBySport:
      Object.keys(raceDistanceBySport).length > 0 ? raceDistanceBySport : undefined,
    result: raceResultFromMetrics({
      actualDistanceKm: actualKm,
      actualDurationMin: actualDuration > 0 ? actualDuration : null,
    }),
  }
}

/**
 * Triathlon → one card per swim/bike/run row.
 * Same WorkoutBlock layout as workouts: race name + distance hero.
 */
function triathlonRaceToPlanWorkoutDetails(race: RaceRecord): PlanWorkoutDetail[] {
  const bySport = resolveRaceDistancesBySport(race)
  const base = baseRaceFields(race)

  return TRIATHLON_PLAN_SPORTS.map((sport) => {
    const dist = bySport[sport]
    const plannedKm = dist?.plannedKm ?? 0
    const plannedMin = dist?.plannedMin ?? 0
    const actualKm = raceActualKmForCard(race, dist?.actualKm ?? null)
    const actualMin = dist?.actualMin ?? null

    return {
      ...base,
      id: `race-${race.id}-${sport.toLowerCase()}`,
      title: race.name,
      type: sport,
      plannedDistance: sport === WorkoutType.SWIM ? null : plannedKm > 0 ? plannedKm : null,
      plannedDistanceMeters:
        sport === WorkoutType.SWIM && plannedKm > 0
          ? Math.round(plannedKm * 1000)
          : null,
      plannedDuration: plannedMin > 0 ? Math.round(plannedMin) : null,
      raceDistanceBySport: dist ? ({ [sport]: dist } as RaceDistancesBySport) : undefined,
      result: raceResultFromMetrics({
        actualDistanceKm: actualKm,
        actualDurationMin: actualMin,
      }),
    }
  })
}

export function raceToPlanWorkoutDetails(race: RaceRecord): PlanWorkoutDetail[] {
  if (isTriathlonRace(race)) return triathlonRaceToPlanWorkoutDetails(race)
  return [raceToPlanWorkoutDetail(race)]
}

export function mergeRacesIntoByDate(
  byDate: Map<string, PlanWorkoutDetail[]>,
  races: RaceRecord[],
): Map<string, PlanWorkoutDetail[]> {
  const merged = new Map(byDate)
  for (const race of races) {
    if (race.intent === 'WATCHING') continue
    for (const detail of raceToPlanWorkoutDetails(race)) {
      const list = merged.get(detail.dateKey) ?? []
      merged.set(detail.dateKey, [...list, detail])
    }
  }
  return merged
}

export function isRacePlanItem(workout: PlanWorkoutDetail): boolean {
  return Boolean(workout.isRace)
}
