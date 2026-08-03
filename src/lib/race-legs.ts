import { RaceLegKind, RaceType, WorkoutType } from '@prisma/client'

export const TRIATHLON_LEG_ORDER: RaceLegKind[] = [
  RaceLegKind.SWIM,
  RaceLegKind.T1,
  RaceLegKind.BIKE,
  RaceLegKind.T2,
  RaceLegKind.RUN,
]

export const RACE_LEG_LABELS: Record<RaceLegKind, string> = {
  SWIM: 'Swim',
  T1: 'T1',
  BIKE: 'Bike',
  T2: 'T2',
  RUN: 'Run',
}

/** Sport legs can link a Strava activity; transitions are time-only. */
export function raceLegSupportsStrava(kind: RaceLegKind): boolean {
  return kind === RaceLegKind.SWIM || kind === RaceLegKind.BIKE || kind === RaceLegKind.RUN
}

export function workoutTypeForRaceLeg(kind: RaceLegKind): WorkoutType | null {
  switch (kind) {
    case RaceLegKind.SWIM:
      return WorkoutType.SWIM
    case RaceLegKind.BIKE:
      return WorkoutType.BIKE
    case RaceLegKind.RUN:
      return WorkoutType.RUN
    default:
      return null
  }
}

export function raceUsesLegs(type: RaceType): boolean {
  return type === RaceType.TRIATHLON
}

export function triathlonLegsCreateData() {
  return TRIATHLON_LEG_ORDER.map((kind, index) => ({
    kind,
    sortOrder: index,
  }))
}

export type RaceLegView = {
  id: string
  kind: RaceLegKind
  sortOrder: number
  plannedTime: string | null
  plannedNotes: string | null
  plannedDistanceKm: number | null
  resultTime: string | null
  stravaActivityId: string | null
  stravaActivityUrl: string | null
  stravaActivityName: string | null
  actualDistanceKm: number | null
  actualDurationMin: number | null
}

export function formatRaceLegResult(leg: {
  resultTime?: string | null
  actualDurationMin?: number | null
  stravaActivityName?: string | null
}): string {
  if (leg.resultTime?.trim()) return leg.resultTime.trim()
  if (leg.actualDurationMin != null && leg.actualDurationMin > 0) {
    const total = Math.round(leg.actualDurationMin)
    const h = Math.floor(total / 60)
    const m = total % 60
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}`
    return `${m} min`
  }
  return '—'
}

/** Format Strava moving/elapsed seconds as H:MM:SS or M:SS. */
export function formatElapsedClock(seconds: number): string {
  const total = Math.max(0, Math.round(seconds))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${m}:${String(s).padStart(2, '0')}`
}
