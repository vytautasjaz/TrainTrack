import {
  RaceCourseType,
  RaceType,
  TriathlonDistance,
  WorkoutType,
} from '@prisma/client'

/** Sports offered in Add / Edit Race (maps to calendar WorkoutType + course). */
export const RACE_FORM_SPORTS = [
  {
    id: 'RUN',
    label: 'Run',
    sport: WorkoutType.RUN,
    courseType: RaceCourseType.ROAD,
    group: 'Running',
  },
  {
    id: 'TRAIL_RUN',
    label: 'Trail Run',
    sport: WorkoutType.RUN,
    courseType: RaceCourseType.TRAIL,
    group: 'Running',
  },
  {
    id: 'TRACK_RUN',
    label: 'Track Run',
    sport: WorkoutType.RUN,
    courseType: RaceCourseType.TRACK,
    group: 'Running',
  },
  {
    id: 'ROAD_BIKE',
    label: 'Road cycling',
    sport: WorkoutType.BIKE,
    courseType: RaceCourseType.ROAD,
    group: 'Cycling',
  },
  {
    id: 'GRAVEL',
    label: 'Gravel',
    sport: WorkoutType.BIKE,
    courseType: RaceCourseType.GRAVEL,
    group: 'Cycling',
  },
  {
    id: 'MTB',
    label: 'MTB',
    sport: WorkoutType.BIKE,
    courseType: RaceCourseType.MTB,
    group: 'Cycling',
  },
  {
    id: 'TRIATHLON',
    label: 'Triathlon',
    sport: WorkoutType.TRIATHLON,
    courseType: null,
    group: null,
  },
  {
    id: 'HYROX',
    label: 'HYROX',
    sport: WorkoutType.HYROX,
    courseType: null,
    group: null,
  },
  {
    id: 'SWIM',
    label: 'Swimming',
    sport: WorkoutType.SWIM,
    courseType: null,
    group: null,
  },
  {
    id: 'OTHER',
    label: 'Other',
    sport: WorkoutType.RUN,
    courseType: RaceCourseType.OTHER,
    group: null,
  },
] as const

export type RaceFormSportId = (typeof RACE_FORM_SPORTS)[number]['id']

export type RaceFormSportFamily =
  | 'RUN'
  | 'BIKE'
  | 'TRIATHLON'
  | 'HYROX'
  | 'SWIM'
  | 'OTHER'

const RUN_SPORT_IDS: RaceFormSportId[] = ['RUN', 'TRAIL_RUN', 'TRACK_RUN']
const BIKE_SPORT_IDS: RaceFormSportId[] = ['ROAD_BIKE', 'GRAVEL', 'MTB']

/** Optgroups for the sport select (Running / Cycling + ungrouped). */
export const RACE_FORM_SPORT_GROUPS: {
  label: string | null
  options: (typeof RACE_FORM_SPORTS)[number][]
}[] = (() => {
  const groups: {
    label: string | null
    options: (typeof RACE_FORM_SPORTS)[number][]
  }[] = []
  for (const sport of RACE_FORM_SPORTS) {
    const label = sport.group
    const existing = groups.find((g) => g.label === label)
    if (existing) existing.options.push(sport)
    else groups.push({ label, options: [sport] })
  }
  return groups
})()

export function isRaceFormSportId(value: string): value is RaceFormSportId {
  return RACE_FORM_SPORTS.some((s) => s.id === value)
}

/** Normalize legacy form values (`BIKE`) and validate. */
export function parseRaceFormSportId(raw: string): RaceFormSportId {
  if (raw === 'BIKE') return 'ROAD_BIKE'
  if (isRaceFormSportId(raw)) return raw
  return 'RUN'
}

export function raceFormSportFamily(
  sportId: RaceFormSportId | null,
): RaceFormSportFamily | null {
  if (!sportId) return null
  if (RUN_SPORT_IDS.includes(sportId)) return 'RUN'
  if (BIKE_SPORT_IDS.includes(sportId)) return 'BIKE'
  if (sportId === 'TRIATHLON') return 'TRIATHLON'
  if (sportId === 'HYROX') return 'HYROX'
  if (sportId === 'SWIM') return 'SWIM'
  return 'OTHER'
}

export function raceFormSportLabel(sportId: RaceFormSportId): string {
  return RACE_FORM_SPORTS.find((s) => s.id === sportId)?.label ?? sportId
}

export function courseTypeForSportId(
  sportId: RaceFormSportId | null,
): RaceCourseType | null {
  if (!sportId) return null
  return RACE_FORM_SPORTS.find((s) => s.id === sportId)?.courseType ?? null
}

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

/** Official HYROX race divisions (Singles / Doubles / Relay). */
export type HyroxDivisionId =
  | 'MEN'
  | 'WOMEN'
  | 'PRO_MEN'
  | 'PRO_WOMEN'
  | 'ADAPTIVE_MEN'
  | 'ADAPTIVE_WOMEN'
  | 'DOUBLES_MEN'
  | 'DOUBLES_WOMEN'
  | 'DOUBLES_MIXED'
  | 'PRO_DOUBLES_MEN'
  | 'PRO_DOUBLES_WOMEN'
  | 'RELAY_MEN'
  | 'RELAY_WOMEN'
  | 'RELAY_MIXED'

export const HYROX_DISTANCE_GROUPS: {
  label: string
  options: { id: HyroxDivisionId; label: string }[]
}[] = [
  {
    label: 'Singles',
    options: [
      { id: 'MEN', label: 'HYROX Men' },
      { id: 'WOMEN', label: 'HYROX Women' },
      { id: 'PRO_MEN', label: 'HYROX Pro Men' },
      { id: 'PRO_WOMEN', label: 'HYROX Pro Women' },
      { id: 'ADAPTIVE_MEN', label: 'HYROX Adaptive Men' },
      { id: 'ADAPTIVE_WOMEN', label: 'HYROX Adaptive Women' },
    ],
  },
  {
    label: 'Doubles',
    options: [
      { id: 'DOUBLES_MEN', label: 'HYROX Doubles Men' },
      { id: 'DOUBLES_WOMEN', label: 'HYROX Doubles Women' },
      { id: 'DOUBLES_MIXED', label: 'HYROX Doubles Mixed' },
      { id: 'PRO_DOUBLES_MEN', label: 'HYROX Pro Doubles Men' },
      { id: 'PRO_DOUBLES_WOMEN', label: 'HYROX Pro Doubles Women' },
    ],
  },
  {
    label: 'Relay',
    options: [
      { id: 'RELAY_MEN', label: "HYROX Men's Relay" },
      { id: 'RELAY_WOMEN', label: "HYROX Women's Relay" },
      { id: 'RELAY_MIXED', label: 'HYROX Mixed Relay' },
    ],
  },
]

export const HYROX_DISTANCE_OPTIONS: { id: HyroxDivisionId; label: string }[] =
  HYROX_DISTANCE_GROUPS.flatMap((group) => group.options)

export const HYROX_DIVISION_LABELS: Record<HyroxDivisionId, string> =
  Object.fromEntries(
    HYROX_DISTANCE_OPTIONS.map((opt) => [opt.id, opt.label]),
  ) as Record<HyroxDivisionId, string>

export function isHyroxDivisionId(value: string): value is HyroxDivisionId {
  return HYROX_DISTANCE_OPTIONS.some((opt) => opt.id === value)
}

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

export function courseTypeLabel(courseType: RaceCourseType): string {
  if (courseType === RaceCourseType.OTHER) return 'Custom'
  return RACE_COURSE_TYPE_LABELS[courseType]
}

/** Distance select options for the metrics row (always at least Custom). */
export function distanceOptionsForSport(sportId: RaceFormSportId | null): {
  id: string
  label: string
}[] {
  const family = raceFormSportFamily(sportId)
  if (!family) return []
  if (family === 'RUN') return RUN_DISTANCE_OPTIONS
  if (family === 'TRIATHLON') return TRI_DISTANCE_OPTIONS
  if (family === 'HYROX') return HYROX_DISTANCE_OPTIONS
  return [{ id: 'CUSTOM', label: 'Custom' }]
}

/** Optgroup structure for sports that need sectioned distance lists. */
export function distanceOptionGroupsForSport(sportId: RaceFormSportId | null): {
  label: string
  options: { id: string; label: string }[]
}[] | null {
  if (raceFormSportFamily(sportId) === 'HYROX') return HYROX_DISTANCE_GROUPS
  return null
}

export function defaultRunDistance(sportId: RaceFormSportId): RunDistancePreset | null {
  if (raceFormSportFamily(sportId) !== 'RUN') return null
  return 'MARATHON'
}

export function defaultTriDistance(sportId: RaceFormSportId): TriathlonDistance | null {
  if (sportId !== 'TRIATHLON') return null
  return TriathlonDistance.OLYMPIC
}

export function showsDistancePresets(sportId: RaceFormSportId): boolean {
  const family = raceFormSportFamily(sportId)
  return family === 'RUN' || family === 'TRIATHLON'
}

export function showsCustomDistance(
  sportId: RaceFormSportId | null,
  runDistance: RunDistancePreset | null,
  _triDistance: TriathlonDistance | null,
): boolean {
  const family = raceFormSportFamily(sportId)
  if (!family) return false
  if (family === 'RUN') return runDistance === 'CUSTOM'
  // Triathlon Custom uses per-leg swim/bike/run distances instead of one total.
  if (family === 'TRIATHLON') return false
  if (family === 'HYROX') return false
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
  const family = raceFormSportFamily(args.sportId)
  if (!family) return RaceType.OTHER
  switch (family) {
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
  if (args.type === RaceType.TRIATHLON || args.sport === WorkoutType.TRIATHLON) {
    return 'TRIATHLON'
  }
  if (args.type === RaceType.CYCLING || args.sport === WorkoutType.BIKE) {
    if (args.courseType === RaceCourseType.GRAVEL) return 'GRAVEL'
    if (args.courseType === RaceCourseType.MTB) return 'MTB'
    return 'ROAD_BIKE'
  }
  if (args.sport === WorkoutType.SWIM) return 'SWIM'
  if (
    args.type === RaceType.MARATHON ||
    args.type === RaceType.HALF_MARATHON ||
    args.type === RaceType.FIVE_K ||
    args.type === RaceType.TEN_K
  ) {
    return runSportIdFromCourse(args.courseType)
  }
  if (args.type === RaceType.OTHER) {
    if (args.courseType === RaceCourseType.TRAIL) return 'TRAIL_RUN'
    if (args.courseType === RaceCourseType.TRACK) return 'TRACK_RUN'
    if (args.courseType === RaceCourseType.ROAD) return 'RUN'
    if (args.courseType === RaceCourseType.GRAVEL) return 'GRAVEL'
    if (args.courseType === RaceCourseType.MTB) return 'MTB'
    return 'OTHER'
  }
  if (args.sport === WorkoutType.RUN) return runSportIdFromCourse(args.courseType)
  return 'OTHER'
}

function runSportIdFromCourse(courseType?: RaceCourseType | null): RaceFormSportId {
  if (courseType === RaceCourseType.TRAIL) return 'TRAIL_RUN'
  if (courseType === RaceCourseType.TRACK) return 'TRACK_RUN'
  return 'RUN'
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
  hyroxDistance?: HyroxDivisionId | null
  customDistanceKm?: number | null
  customSwimKm?: number | null
  customBikeKm?: number | null
  customRunKm?: number | null
}): string | null {
  const {
    sportId,
    runDistance,
    triDistance,
    hyroxDistance,
    customDistanceKm,
    customSwimKm,
    customBikeKm,
    customRunKm,
  } = args
  const family = raceFormSportFamily(sportId)
  if (family === 'RUN' && runDistance) {
    if (runDistance === 'CUSTOM') {
      return customDistanceKm != null && customDistanceKm > 0
        ? `${customDistanceKm} km`
        : 'Custom'
    }
    return RUN_DISTANCE_OPTIONS.find((o) => o.id === runDistance)?.label ?? null
  }
  if (family === 'TRIATHLON' && triDistance) {
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
  if (family === 'HYROX') {
    if (hyroxDistance && isHyroxDivisionId(hyroxDistance)) {
      return HYROX_DIVISION_LABELS[hyroxDistance]
    }
    return 'HYROX'
  }
  if (
    (family === 'BIKE' || family === 'OTHER') &&
    customDistanceKm != null &&
    customDistanceKm > 0
  ) {
    return `${customDistanceKm} km`
  }
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
