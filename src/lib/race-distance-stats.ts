import {
  RaceLegKind,
  RaceOutcome,
  RaceType,
  TriathlonDistance,
  WorkoutType,
} from '@prisma/client'
import { RUNNING_PRESETS, TRIATHLON_PRESETS } from '@/lib/calculators/race-distances'
import { parseRaceTimeToMinutes } from '@/lib/calculators/race-time'
import { workoutTypeForRaceLeg } from '@/lib/race-legs'

export type RaceDistanceSport = typeof WorkoutType.RUN | typeof WorkoutType.BIKE | typeof WorkoutType.SWIM

export type RaceSportDistance = {
  plannedKm: number
  actualKm: number | null
  plannedMin: number
  actualMin: number | null
}

export type RaceDistancesBySport = Partial<Record<RaceDistanceSport, RaceSportDistance>>

export type RaceDistanceSource = {
  type: RaceType
  sport: WorkoutType
  triathlonDistance?: TriathlonDistance | null
  customDistanceKm?: number | null
  outcome?: RaceOutcome | null
  resultTime?: string | null
  legs?: Array<{
    kind: RaceLegKind
    actualDistanceKm?: number | null
    actualDurationMin?: number | null
    plannedDistanceKm?: number | null
    plannedTime?: string | null
    resultTime?: string | null
  }> | null
}

function runningPresetKm(type: RaceType): number | null {
  switch (type) {
    case RaceType.FIVE_K:
      return RUNNING_PRESETS.find((p) => p.id === '5k')!.distanceKm
    case RaceType.TEN_K:
      return RUNNING_PRESETS.find((p) => p.id === '10k')!.distanceKm
    case RaceType.HALF_MARATHON:
      return RUNNING_PRESETS.find((p) => p.id === 'half')!.distanceKm
    case RaceType.MARATHON:
      return RUNNING_PRESETS.find((p) => p.id === 'marathon')!.distanceKm
    default:
      return null
  }
}

function triathlonPreset(distance: TriathlonDistance | null | undefined) {
  if (!distance || distance === TriathlonDistance.CUSTOM) return null
  const id =
    distance === TriathlonDistance.SPRINT
      ? 'sprint'
      : distance === TriathlonDistance.OLYMPIC
        ? 'olympic'
        : distance === TriathlonDistance.HALF
          ? 'half'
          : distance === TriathlonDistance.FULL
            ? 'ironman'
            : null
  if (!id) return null
  return TRIATHLON_PRESETS.find((p) => p.id === id) ?? null
}

function positiveKm(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return null
  return value
}

function positiveMin(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return null
  return value
}

function minutesFromClock(value: string | null | undefined): number | null {
  if (!value?.trim()) return null
  return positiveMin(parseRaceTimeToMinutes(value))
}

function withMetrics(args: {
  plannedKm: number
  actualKm: number | null
  plannedMin: number
  actualMin: number | null
  finished: boolean
}): RaceSportDistance | null {
  const plannedKm =
    args.plannedKm > 0 ? args.plannedKm : (args.actualKm ?? 0)
  const plannedMin =
    args.plannedMin > 0 ? args.plannedMin : (args.actualMin ?? 0)
  if (plannedKm <= 0 && plannedMin <= 0) return null

  const actualKm =
    args.actualKm ?? (args.finished && plannedKm > 0 ? plannedKm : null)
  const actualMin =
    args.actualMin ?? (args.finished && plannedMin > 0 ? plannedMin : null)

  return {
    plannedKm,
    actualKm,
    plannedMin,
    actualMin,
  }
}

/**
 * Planned + actual distance/duration by endurance sport for a race.
 * Triathlon splits into swim / bike / run.
 */
export function resolveRaceDistancesBySport(
  race: RaceDistanceSource,
): RaceDistancesBySport {
  const finished = race.outcome === RaceOutcome.FINISHED
  const out: RaceDistancesBySport = {}

  if (race.type === RaceType.TRIATHLON || race.sport === WorkoutType.TRIATHLON) {
    const preset = triathlonPreset(race.triathlonDistance)
    const plannedBySport: Partial<Record<RaceDistanceSport, number>> = {
      [WorkoutType.SWIM]: preset?.swimKm ?? 0,
      [WorkoutType.BIKE]: preset?.bikeKm ?? 0,
      [WorkoutType.RUN]: preset?.runKm ?? 0,
    }

    for (const kind of [RaceLegKind.SWIM, RaceLegKind.BIKE, RaceLegKind.RUN] as const) {
      const sport = workoutTypeForRaceLeg(kind) as RaceDistanceSport | null
      if (!sport) continue
      const leg = race.legs?.find((l) => l.kind === kind)
      const presetKm = plannedBySport[sport] ?? 0
      const customKm = positiveKm(leg?.plannedDistanceKm ?? null)
      const plannedKm =
        race.triathlonDistance === TriathlonDistance.CUSTOM
          ? (customKm ?? 0)
          : presetKm > 0
            ? presetKm
            : (customKm ?? 0)
      const actualKm = positiveKm(leg?.actualDistanceKm ?? null)
      const plannedMin = minutesFromClock(leg?.plannedTime) ?? 0
      const actualMin =
        positiveMin(leg?.actualDurationMin) ?? minutesFromClock(leg?.resultTime)
      const entry = withMetrics({
        plannedKm,
        actualKm,
        plannedMin,
        actualMin,
        finished,
      })
      if (entry) out[sport] = entry
    }
    return out
  }

  if (race.type === RaceType.HYROX || race.sport === WorkoutType.HYROX) {
    return out
  }

  let targetSport: RaceDistanceSport | null = null
  if (race.sport === WorkoutType.BIKE || race.type === RaceType.CYCLING) {
    targetSport = WorkoutType.BIKE
  } else if (race.sport === WorkoutType.SWIM) {
    targetSport = WorkoutType.SWIM
  } else if (
    race.sport === WorkoutType.RUN ||
    race.type === RaceType.FIVE_K ||
    race.type === RaceType.TEN_K ||
    race.type === RaceType.HALF_MARATHON ||
    race.type === RaceType.MARATHON
  ) {
    targetSport = WorkoutType.RUN
  } else if (positiveKm(race.customDistanceKm) || minutesFromClock(race.resultTime)) {
    targetSport = WorkoutType.RUN
  }

  if (!targetSport) return out

  const plannedKm =
    positiveKm(runningPresetKm(race.type)) ??
    positiveKm(race.customDistanceKm) ??
    0
  const actualMin = minutesFromClock(race.resultTime)

  const entry = withMetrics({
    plannedKm,
    actualKm: null,
    plannedMin: 0,
    actualMin,
    finished,
  })
  if (entry) out[targetSport] = entry
  return out
}

/** Total km across sports (swim counted as km). */
export function sumRaceDistancesKm(
  bySport: RaceDistancesBySport,
  mode: 'planned' | 'actual',
): number {
  let sum = 0
  for (const entry of Object.values(bySport)) {
    if (!entry) continue
    if (mode === 'planned') sum += entry.plannedKm
    else if (entry.actualKm != null) sum += entry.actualKm
  }
  return sum
}

/** Total minutes across sports. */
export function sumRaceDurationsMin(
  bySport: RaceDistancesBySport,
  mode: 'planned' | 'actual',
): number {
  let sum = 0
  for (const entry of Object.values(bySport)) {
    if (!entry) continue
    if (mode === 'planned') sum += entry.plannedMin
    else if (entry.actualMin != null) sum += entry.actualMin
  }
  return sum
}
