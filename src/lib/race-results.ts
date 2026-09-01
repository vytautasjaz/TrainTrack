import {
  RaceLegKind,
  RaceOutcome,
  RaceType,
  TriathlonDistance,
  WorkoutType,
  type RacePriority,
} from '@prisma/client'
import { RACE_OUTCOME_LABELS, RACE_TYPE_LABELS, WORKOUT_TYPE_LABELS } from '@/lib/constants'
import { TRI_DISTANCE_OPTIONS } from '@/lib/race-form'
import { toDateKey } from '@/lib/dates'
import { matchPersonalBestPreset } from '@/lib/personal-bests'
import { formatRaceLegResult } from '@/lib/race-legs'

export type RaceResultLegSplits = {
  swim: string | null
  bike: string | null
  run: string | null
}

export type RaceResultRow = {
  id: string
  name: string
  date: string
  location: string | null
  type: RaceType
  sport: WorkoutType
  triathlonDistance: TriathlonDistance | null
  customDistanceKm: number | null
  priority: RacePriority
  outcome: RaceOutcome
  resultTime: string | null
  resultPlace: string | null
  resultNotes: string | null
  resultsLogOnly: boolean
  /** Swim / bike / run clock times when logged on triathlon legs. */
  legSplits: RaceResultLegSplits | null
}

export const RACE_RESULT_OUTCOMES: RaceOutcome[] = [
  RaceOutcome.FINISHED,
  RaceOutcome.DNF,
  RaceOutcome.DID_NOT_START,
]

export function raceResultDistanceLabel(row: {
  type: RaceType
  sport: WorkoutType
  triathlonDistance?: TriathlonDistance | null
  customDistanceKm?: number | null
}): string {
  if (row.type === RaceType.TRIATHLON && row.triathlonDistance) {
    const tri = TRI_DISTANCE_OPTIONS.find((o) => o.id === row.triathlonDistance)
    return tri?.label ?? RACE_TYPE_LABELS.TRIATHLON
  }
  if (row.type === RaceType.OTHER || row.type === RaceType.CYCLING) {
    if (row.customDistanceKm != null && row.customDistanceKm > 0) {
      const km =
        Number.isInteger(row.customDistanceKm)
          ? String(row.customDistanceKm)
          : row.customDistanceKm.toFixed(1)
      return `${WORKOUT_TYPE_LABELS[row.sport]} · ${km} km`
    }
  }
  return RACE_TYPE_LABELS[row.type]
}

export function raceResultOutcomeLabel(outcome: RaceOutcome): string {
  return RACE_OUTCOME_LABELS[outcome]
}

export function raceResultYear(dateKey: string): number {
  return Number(dateKey.slice(0, 4))
}

export function serializeRaceResult(race: {
  id: string
  name: string
  date: Date
  location: string | null
  type: RaceType
  sport: WorkoutType
  triathlonDistance: TriathlonDistance | null
  customDistanceKm: number | null
  priority: RacePriority
  outcome: RaceOutcome | null
  resultTime: string | null
  resultPlace: string | null
  resultNotes: string | null
  resultsLogOnly: boolean
  legs?: Array<{
    kind: RaceLegKind
    resultTime?: string | null
    actualDurationMin?: number | null
  }> | null
}): RaceResultRow | null {
  if (!race.outcome || !RACE_RESULT_OUTCOMES.includes(race.outcome)) return null
  return {
    id: race.id,
    name: race.name,
    date: toDateKey(race.date),
    location: race.location,
    type: race.type,
    sport: race.sport,
    triathlonDistance: race.triathlonDistance,
    customDistanceKm: race.customDistanceKm,
    priority: race.priority,
    outcome: race.outcome,
    resultTime: race.resultTime,
    resultPlace: race.resultPlace,
    resultNotes: race.resultNotes,
    resultsLogOnly: race.resultsLogOnly,
    legSplits: raceResultLegSplits(race),
  }
}

export function raceResultLegSplits(race: {
  type: RaceType
  legs?: Array<{
    kind: RaceLegKind
    resultTime?: string | null
    actualDurationMin?: number | null
  }> | null
}): RaceResultLegSplits | null {
  if (race.type !== RaceType.TRIATHLON || !race.legs?.length) return null

  const timeFor = (kind: RaceLegKind): string | null => {
    const leg = race.legs!.find((l) => l.kind === kind)
    if (!leg) return null
    const formatted = formatRaceLegResult(leg)
    return formatted === '—' ? null : formatted
  }

  const swim = timeFor(RaceLegKind.SWIM)
  const bike = timeFor(RaceLegKind.BIKE)
  const run = timeFor(RaceLegKind.RUN)
  if (!swim && !bike && !run) return null
  return { swim, bike, run }
}

/** True when at least one discipline split is present. */
export function hasRaceResultLegSplits(splits: RaceResultLegSplits | null | undefined): boolean {
  if (!splits) return false
  return Boolean(splits.swim || splits.bike || splits.run)
}

/** Finished races that match a personal best distance (preset or custom name). */
export function filterRaceResultsForPersonalBest(
  results: RaceResultRow[],
  pb: { presetKey?: string | null; name: string },
): RaceResultRow[] {
  const nameNorm = pb.name.trim().toLowerCase()
  return results.filter((row) => {
    if (row.outcome !== RaceOutcome.FINISHED) return false

    const matched = matchPersonalBestPreset(row)
    if (pb.presetKey) {
      return matched?.key === pb.presetKey
    }

    if (!nameNorm) return false
    if (matched && matched.name.toLowerCase() === nameNorm) return true

    const label = raceResultDistanceLabel(row).toLowerCase()
    return label === nameNorm || label.includes(nameNorm)
  })
}
