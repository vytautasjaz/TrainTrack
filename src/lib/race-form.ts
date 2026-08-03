import {
  RaceCourseType,
  RaceType,
  TriathlonDistance,
  WorkoutType,
} from '@prisma/client'

/** Sports offered in Add / Edit Race (maps to calendar WorkoutType). */
export const RACE_FORM_SPORTS = [
  { id: 'RUN', label: 'Running', sport: WorkoutType.RUN },
  { id: 'BIKE', label: 'Cycling', sport: WorkoutType.BIKE },
  { id: 'TRIATHLON', label: 'Triathlon', sport: WorkoutType.TRIATHLON },
  { id: 'HYROX', label: 'HYROX', sport: WorkoutType.HYROX },
  { id: 'SWIM', label: 'Swimming', sport: WorkoutType.SWIM },
  { id: 'OTHER', label: 'Other', sport: WorkoutType.RUN },
] as const

export type RaceFormSportId = (typeof RACE_FORM_SPORTS)[number]['id']

/** Running (+ generic) distance presets. */
export type RunDistancePreset =
  | 'FIVE_K'
  | 'TEN_K'
  | 'HALF_MARATHON'
  | 'MARATHON'
  | 'CUSTOM'

export const RUN_DISTANCE_OPTIONS: { id: RunDistancePreset; label: string; hint?: string }[] = [
  { id: 'FIVE_K', label: '5 km' },
  { id: 'TEN_K', label: '10 km' },
  { id: 'HALF_MARATHON', label: 'Half marathon', hint: '21.1 km' },
  { id: 'MARATHON', label: 'Marathon', hint: '42.2 km' },
  { id: 'CUSTOM', label: 'Custom' },
]

export const TRI_DISTANCE_OPTIONS: {
  id: TriathlonDistance
  label: string
  hint?: string
}[] = [
  { id: TriathlonDistance.SPRINT, label: 'Sprint' },
  { id: TriathlonDistance.OLYMPIC, label: 'Olympic' },
  { id: TriathlonDistance.HALF, label: '70.3', hint: 'Half Ironman' },
  { id: TriathlonDistance.FULL, label: 'Ironman' },
  { id: TriathlonDistance.CUSTOM, label: 'Custom' },
]

export const RACE_COURSE_TYPE_LABELS: Record<RaceCourseType, string> = {
  ROAD: 'Road',
  TRAIL: 'Trail',
  TRACK: 'Track',
  GRAVEL: 'Gravel',
  MTB: 'MTB',
  POOL: 'Pool',
  OPEN_WATER: 'Open water',
  OTHER: 'Other',
}

export function courseTypesForSport(sportId: RaceFormSportId | null): RaceCourseType[] {
  if (!sportId) return []
  switch (sportId) {
    case 'RUN':
      return [RaceCourseType.ROAD, RaceCourseType.TRAIL, RaceCourseType.TRACK, RaceCourseType.OTHER]
    case 'BIKE':
      return [RaceCourseType.ROAD, RaceCourseType.GRAVEL, RaceCourseType.MTB, RaceCourseType.OTHER]
    case 'SWIM':
      return [RaceCourseType.POOL, RaceCourseType.OPEN_WATER, RaceCourseType.OTHER]
    case 'TRIATHLON':
      return [RaceCourseType.ROAD, RaceCourseType.OTHER]
    case 'HYROX':
    case 'OTHER':
    default:
      return [RaceCourseType.OTHER]
  }
}

export function courseTypeLabel(courseType: RaceCourseType): string {
  if (courseType === RaceCourseType.OTHER) return 'Custom'
  return RACE_COURSE_TYPE_LABELS[courseType]
}

/** Distance select options for the metrics row (always at least Custom). */
export function distanceOptionsForSport(sportId: RaceFormSportId | null): {
  id: string
  label: string
}[] {
  if (!sportId) return []
  if (sportId === 'RUN') return RUN_DISTANCE_OPTIONS
  if (sportId === 'TRIATHLON') return TRI_DISTANCE_OPTIONS
  if (sportId === 'HYROX') return [{ id: 'STANDARD', label: 'Standard' }]
  return [{ id: 'CUSTOM', label: 'Custom' }]
}

export function defaultCourseType(sportId: RaceFormSportId | null): RaceCourseType | null {
  if (!sportId) return null
  const options = courseTypesForSport(sportId)
  return options[0] ?? null
}

export function defaultRunDistance(sportId: RaceFormSportId): RunDistancePreset | null {
  if (sportId !== 'RUN') return null
  return 'MARATHON'
}

export function defaultTriDistance(sportId: RaceFormSportId): TriathlonDistance | null {
  if (sportId !== 'TRIATHLON') return null
  return TriathlonDistance.OLYMPIC
}

export function showsDistancePresets(sportId: RaceFormSportId): boolean {
  return sportId === 'RUN' || sportId === 'TRIATHLON'
}

export function showsCustomDistance(
  sportId: RaceFormSportId | null,
  runDistance: RunDistancePreset | null,
  triDistance: TriathlonDistance | null,
): boolean {
  if (!sportId) return false
  if (sportId === 'RUN') return runDistance === 'CUSTOM'
  // Triathlon Custom uses per-leg swim/bike/run distances instead of one total.
  if (sportId === 'TRIATHLON') return false
  if (sportId === 'HYROX') return false
  // Bike / Swim / Other — only after Custom is explicitly chosen
  return runDistance === 'CUSTOM'
}

export function showsTriCustomLegDistances(
  sportId: RaceFormSportId | null,
  triDistance: TriathlonDistance | null,
): boolean {
  return sportId === 'TRIATHLON' && triDistance === TriathlonDistance.CUSTOM
}

/** Resolve DB RaceType from sport + distance selections. */
export function resolveRaceType(args: {
  sportId: RaceFormSportId | null
  runDistance: RunDistancePreset | null
  triDistance: TriathlonDistance | null
}): RaceType {
  if (!args.sportId) return RaceType.OTHER
  switch (args.sportId) {
    case 'RUN':
      switch (args.runDistance) {
        case 'FIVE_K':
          return RaceType.FIVE_K
        case 'TEN_K':
          return RaceType.TEN_K
        case 'HALF_MARATHON':
          return RaceType.HALF_MARATHON
        case 'MARATHON':
          return RaceType.MARATHON
        case 'CUSTOM':
        default:
          return RaceType.OTHER
      }
    case 'BIKE':
      return RaceType.CYCLING
    case 'TRIATHLON':
      return RaceType.TRIATHLON
    case 'HYROX':
      return RaceType.HYROX
    case 'SWIM':
    case 'OTHER':
    default:
      return RaceType.OTHER
  }
}

export function resolveWorkoutSport(sportId: RaceFormSportId | null): WorkoutType {
  if (!sportId) return WorkoutType.RUN
  return RACE_FORM_SPORTS.find((s) => s.id === sportId)?.sport ?? WorkoutType.RUN
}

/** Infer form sport id from stored race fields. */
export function sportIdFromRace(args: {
  sport: WorkoutType
  type: RaceType
  courseType?: RaceCourseType | null
}): RaceFormSportId {
  if (args.type === RaceType.HYROX || args.sport === WorkoutType.HYROX) return 'HYROX'
  if (args.type === RaceType.TRIATHLON || args.sport === WorkoutType.TRIATHLON) return 'TRIATHLON'
  if (args.type === RaceType.CYCLING || args.sport === WorkoutType.BIKE) return 'BIKE'
  if (args.sport === WorkoutType.SWIM) return 'SWIM'
  if (
    args.type === RaceType.MARATHON ||
    args.type === RaceType.HALF_MARATHON ||
    args.type === RaceType.FIVE_K ||
    args.type === RaceType.TEN_K
  ) {
    return 'RUN'
  }
  if (args.type === RaceType.OTHER) {
    const runCourses: RaceCourseType[] = [
      RaceCourseType.ROAD,
      RaceCourseType.TRAIL,
      RaceCourseType.TRACK,
    ]
    if (args.courseType && runCourses.includes(args.courseType)) return 'RUN'
    return 'OTHER'
  }
  if (args.sport === WorkoutType.RUN) return 'RUN'
  return 'OTHER'
}

export function runDistanceFromRaceType(type: RaceType): RunDistancePreset {
  switch (type) {
    case RaceType.FIVE_K:
      return 'FIVE_K'
    case RaceType.TEN_K:
      return 'TEN_K'
    case RaceType.HALF_MARATHON:
      return 'HALF_MARATHON'
    case RaceType.MARATHON:
      return 'MARATHON'
    default:
      return 'CUSTOM'
  }
}

export function distanceSummaryLabel(args: {
  sportId: RaceFormSportId
  runDistance: RunDistancePreset | null
  triDistance: TriathlonDistance | null
  customDistanceKm?: number | null
  customSwimKm?: number | null
  customBikeKm?: number | null
  customRunKm?: number | null
}): string | null {
  const {
    sportId,
    runDistance,
    triDistance,
    customDistanceKm,
    customSwimKm,
    customBikeKm,
    customRunKm,
  } = args
  if (sportId === 'RUN' && runDistance) {
    if (runDistance === 'CUSTOM') {
      return customDistanceKm != null && customDistanceKm > 0
        ? `${customDistanceKm} km`
        : 'Custom'
    }
    return RUN_DISTANCE_OPTIONS.find((o) => o.id === runDistance)?.label ?? null
  }
  if (sportId === 'TRIATHLON' && triDistance) {
    if (triDistance === TriathlonDistance.CUSTOM) {
      const parts = [
        customSwimKm != null && customSwimKm > 0
          ? `${formatLegKm(customSwimKm)} swim`
          : null,
        customBikeKm != null && customBikeKm > 0
          ? `${formatLegKm(customBikeKm)} bike`
          : null,
        customRunKm != null && customRunKm > 0
          ? `${formatLegKm(customRunKm)} run`
          : null,
      ].filter(Boolean)
      return parts.length > 0 ? parts.join(' · ') : 'Custom'
    }
    return TRI_DISTANCE_OPTIONS.find((o) => o.id === triDistance)?.label ?? null
  }
  if ((sportId === 'BIKE' || sportId === 'OTHER') && customDistanceKm != null && customDistanceKm > 0) {
    return `${customDistanceKm} km`
  }
  if (sportId === 'HYROX') return 'HYROX'
  return null
}

function formatLegKm(km: number): string {
  return km % 1 === 0 ? String(km) : km.toFixed(1).replace(/\.0$/, '')
}

export const TRIATHLON_DISTANCE_LABELS: Record<TriathlonDistance, string> = {
  SPRINT: 'Sprint',
  OLYMPIC: 'Olympic',
  HALF: '70.3',
  FULL: 'Ironman',
  CUSTOM: 'Custom',
}

export const TRIATHLON_DISTANCE_HINTS: Partial<Record<TriathlonDistance, string>> = {
  SPRINT: 'Sprint triathlon',
  OLYMPIC: 'Olympic / standard',
  HALF: 'Half Ironman',
  FULL: 'Full Ironman',
}
