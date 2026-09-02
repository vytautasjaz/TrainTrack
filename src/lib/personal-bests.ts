import {
  PersonalBestMetric,
  PersonalBestSport,
  RaceType,
  TriathlonDistance,
  WorkoutType,
  type RaceOutcome,
} from '@prisma/client'
import { format } from 'date-fns'
import { RUNNING_PRESETS } from '@/lib/calculators/race-distances'
import { formatRaceTime, parseRaceTimeToMinutes } from '@/lib/calculators/race-time'
import { toDateKey } from '@/lib/dates'

export type PersonalBestPreset = {
  key: string
  name: string
  sport: PersonalBestSport
  metric: PersonalBestMetric
  hint?: string
  /** For race distance matching (km). */
  km?: number
  toleranceKm?: number
}

export const PERSONAL_BEST_SPORT_LABELS: Record<PersonalBestSport, string> = {
  RUN: 'Run',
  BIKE: 'Bike',
  SWIM: 'Swim',
  TRIATHLON: 'Triathlon',
  HYROX: 'HYROX',
  GYM: 'Gym',
  OTHER: 'Other',
}

export const PERSONAL_BEST_METRIC_LABELS: Record<PersonalBestMetric, string> = {
  TIME: 'Time',
  WEIGHT_KG: 'kg',
  REPS: 'Reps',
  WATTS: 'Watts',
}

/** Quick-add presets — athletes pick what they want; nothing is forced. */
export const PERSONAL_BEST_PRESETS: PersonalBestPreset[] = [
  {
    key: 'FIVE_K',
    name: '5K',
    sport: PersonalBestSport.RUN,
    metric: PersonalBestMetric.TIME,
    hint: '5.0 km',
    km: RUNNING_PRESETS.find((p) => p.id === '5k')!.distanceKm,
    toleranceKm: 0.15,
  },
  {
    key: 'TEN_K',
    name: '10K',
    sport: PersonalBestSport.RUN,
    metric: PersonalBestMetric.TIME,
    hint: '10.0 km',
    km: RUNNING_PRESETS.find((p) => p.id === '10k')!.distanceKm,
    toleranceKm: 0.25,
  },
  {
    key: 'HALF_MARATHON',
    name: 'Half marathon',
    sport: PersonalBestSport.RUN,
    metric: PersonalBestMetric.TIME,
    hint: '21.1 km',
    km: RUNNING_PRESETS.find((p) => p.id === 'half')!.distanceKm,
    toleranceKm: 0.4,
  },
  {
    key: 'MARATHON',
    name: 'Marathon',
    sport: PersonalBestSport.RUN,
    metric: PersonalBestMetric.TIME,
    hint: '42.2 km',
    km: RUNNING_PRESETS.find((p) => p.id === 'marathon')!.distanceKm,
    toleranceKm: 0.6,
  },
  {
    key: 'SWIM_100',
    name: '100m swim',
    sport: PersonalBestSport.SWIM,
    metric: PersonalBestMetric.TIME,
    hint: 'Pool / open water',
    km: 0.1,
  },
  {
    key: 'SWIM_400',
    name: '400m swim',
    sport: PersonalBestSport.SWIM,
    metric: PersonalBestMetric.TIME,
    km: 0.4,
  },
  {
    key: 'SWIM_1500',
    name: '1500m swim',
    sport: PersonalBestSport.SWIM,
    metric: PersonalBestMetric.TIME,
    km: 1.5,
  },
  {
    key: 'BIKE_20',
    name: '20 km bike',
    sport: PersonalBestSport.BIKE,
    metric: PersonalBestMetric.TIME,
    km: 20,
  },
  {
    key: 'BIKE_40',
    name: '40 km bike',
    sport: PersonalBestSport.BIKE,
    metric: PersonalBestMetric.TIME,
    km: 40,
  },
  {
    key: 'BIKE_FTP',
    name: 'FTP',
    sport: PersonalBestSport.BIKE,
    metric: PersonalBestMetric.WATTS,
    hint: 'Functional threshold power',
    km: 999,
  },
  {
    key: 'TRI_SPRINT',
    name: 'Sprint triathlon',
    sport: PersonalBestSport.TRIATHLON,
    metric: PersonalBestMetric.TIME,
    km: 25.75,
  },
  {
    key: 'TRI_OLYMPIC',
    name: 'Olympic triathlon',
    sport: PersonalBestSport.TRIATHLON,
    metric: PersonalBestMetric.TIME,
    km: 51.5,
  },
  {
    key: 'TRI_70_3',
    name: '70.3',
    sport: PersonalBestSport.TRIATHLON,
    metric: PersonalBestMetric.TIME,
    km: 113,
  },
  {
    key: 'TRI_IRONMAN',
    name: 'Ironman',
    sport: PersonalBestSport.TRIATHLON,
    metric: PersonalBestMetric.TIME,
    km: 226,
  },
  {
    key: 'HYROX_OPEN',
    name: 'HYROX Open',
    sport: PersonalBestSport.HYROX,
    metric: PersonalBestMetric.TIME,
    km: 8,
  },
  {
    key: 'HYROX_PRO',
    name: 'HYROX Pro',
    sport: PersonalBestSport.HYROX,
    metric: PersonalBestMetric.TIME,
    km: 8.1,
  },
  {
    key: 'GYM_DEADLIFT',
    name: 'Deadlift',
    sport: PersonalBestSport.GYM,
    metric: PersonalBestMetric.WEIGHT_KG,
    km: 1,
  },
  {
    key: 'GYM_SQUAT',
    name: 'Back squat',
    sport: PersonalBestSport.GYM,
    metric: PersonalBestMetric.WEIGHT_KG,
    km: 2,
  },
  {
    key: 'GYM_BENCH',
    name: 'Bench press',
    sport: PersonalBestSport.GYM,
    metric: PersonalBestMetric.WEIGHT_KG,
    km: 3,
  },
]

export type PersonalBestRecord = {
  id: string
  name: string
  sport: PersonalBestSport
  presetKey: string | null
  metric: PersonalBestMetric
  value: number
  dateText: string | null
  event: string | null
  raceId?: string | null
  sortOrder: number
}

/** Sort key by distance (shorter first). Custom / unknown go last. */
export function personalBestDistanceSortKey(record: {
  presetKey?: string | null
  name: string
  sortOrder?: number
}): number {
  if (record.presetKey) {
    const preset = PERSONAL_BEST_PRESETS.find((p) => p.key === record.presetKey)
    if (preset?.km != null) return preset.km
  }

  const kmMatch = record.name.match(/(\d+(?:[.,]\d+)?)\s*km\b/i)
  if (kmMatch) {
    const km = parseFloat(kmMatch[1]!.replace(',', '.'))
    if (Number.isFinite(km)) return km
  }

  const mMatch = record.name.match(/(\d+(?:[.,]\d+)?)\s*m\b/i)
  if (mMatch) {
    const meters = parseFloat(mMatch[1]!.replace(',', '.'))
    if (Number.isFinite(meters)) return meters / 1000
  }

  const kMatch = record.name.match(/^(\d+(?:[.,]\d+)?)\s*k\b/i)
  if (kMatch) {
    const km = parseFloat(kMatch[1]!.replace(',', '.'))
    if (Number.isFinite(km)) return km
  }

  return 10_000 + (record.sortOrder ?? 0)
}

export function comparePersonalBestsByDistance(
  a: { presetKey?: string | null; name: string; sortOrder?: number },
  b: { presetKey?: string | null; name: string; sortOrder?: number },
): number {
  const diff = personalBestDistanceSortKey(a) - personalBestDistanceSortKey(b)
  if (diff !== 0) return diff
  return a.name.localeCompare(b.name)
}

export type PersonalBestSuggestion = {
  personalBestId: string | null
  presetKey: string
  name: string
  sport: PersonalBestSport
  metric: PersonalBestMetric
  proposedValue: number
  proposedValueLabel: string
  dateText: string
  event: string
  raceId: string
  previousValue: number | null
  previousValueLabel: string | null
  previousEvent: string | null
}

export function formatPersonalBestValue(
  value: number | null | undefined,
  metric: PersonalBestMetric = PersonalBestMetric.TIME,
): string {
  if (value == null || !Number.isFinite(value) || value < 0) return ''
  if (metric === PersonalBestMetric.TIME) {
    if (value <= 0) return ''
    const formatted = formatRaceTime(value)
    return formatted === '—' ? '' : formatted
  }
  if (metric === PersonalBestMetric.WEIGHT_KG || metric === PersonalBestMetric.WATTS) {
    return Number.isInteger(value) ? String(value) : String(Math.round(value * 10) / 10)
  }
  return String(Math.round(value))
}

export function parsePersonalBestValue(
  input: string,
  metric: PersonalBestMetric,
): number | null {
  const raw = input.trim()
  if (!raw) return null

  if (metric === PersonalBestMetric.TIME) {
    return parseRaceTimeToMinutes(raw)
  }

  const cleaned = raw.replace(/,/g, '.').replace(/\s*(kg|w|watts|reps)?$/i, '')
  const num = parseFloat(cleaned)
  if (!Number.isFinite(num) || num < 0) return null
  if (metric === PersonalBestMetric.REPS) return Math.round(num)
  return num
}

export function valuePlaceholder(metric: PersonalBestMetric): string {
  switch (metric) {
    case PersonalBestMetric.WEIGHT_KG:
      return '0'
    case PersonalBestMetric.REPS:
      return '0'
    case PersonalBestMetric.WATTS:
      return '0'
    case PersonalBestMetric.TIME:
    default:
      return '0:00:00'
  }
}

/** Display stored flexible date text as-is. */
export function formatPersonalBestDate(dateText: string | null | undefined): string {
  return dateText?.trim() ?? ''
}

export function parsePersonalBestDateText(input: string): string | null {
  const raw = input.trim().replace(/\//g, '-')
  if (!raw) return null

  const yearOnly = raw.match(/^(\d{4})$/)
  if (yearOnly) {
    const year = Number(yearOnly[1])
    if (year < 1950 || year > 2100) {
      throw new Error('Year must be between 1950 and 2100.')
    }
    return yearOnly[1]!
  }

  const yearMonth = raw.match(/^(\d{4})-(\d{1,2})$/)
  if (yearMonth) {
    const year = Number(yearMonth[1])
    const month = Number(yearMonth[2])
    if (year < 1950 || year > 2100 || month < 1 || month > 12) {
      throw new Error('Use YYYY or YYYY-MM (e.g. 2022 or 2022-06).')
    }
    return `${yearMonth[1]}-${String(month).padStart(2, '0')}`
  }

  const full = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (full) {
    const year = Number(full[1])
    const month = Number(full[2])
    const day = Number(full[3])
    if (year < 1950 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
      throw new Error('Use YYYY-MM-DD (e.g. 2022-06-15).')
    }
    const probe = new Date(Date.UTC(year, month - 1, day))
    if (
      probe.getUTCFullYear() !== year ||
      probe.getUTCMonth() !== month - 1 ||
      probe.getUTCDate() !== day
    ) {
      throw new Error('That day is not valid for the month.')
    }
    return `${full[1]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  throw new Error('Date can be a year (2022), year-month (2022-06), or full date (2022-06-15).')
}

export function displayPersonalBestDate(dateText: string | null | undefined): string {
  const value = dateText?.trim()
  if (!value) return '—'
  const full = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (full) {
    try {
      return format(new Date(Number(full[1]), Number(full[2]) - 1, Number(full[3])), 'MMM d, yyyy')
    } catch {
      return value
    }
  }
  const ym = value.match(/^(\d{4})-(\d{2})$/)
  if (ym) {
    try {
      return format(new Date(Number(ym[1]), Number(ym[2]) - 1, 1), 'MMM yyyy')
    } catch {
      return value
    }
  }
  return value
}

export function isPersonalBestImprovement(
  proposed: number,
  previous: number | null | undefined,
  metric: PersonalBestMetric,
): boolean {
  if (!Number.isFinite(proposed) || proposed < 0) return false
  if (previous == null || !Number.isFinite(previous) || previous <= 0) return true
  // Lower time is better; higher weight/reps/watts is better.
  if (metric === PersonalBestMetric.TIME) return proposed < previous
  return proposed > previous
}

export type MatchedPersonalBestPreset = {
  key: string
  name: string
  sport: PersonalBestSport
  metric: PersonalBestMetric
}

/** Map a finished race to a PB preset, if applicable. */
export function matchPersonalBestPreset(race: {
  type: RaceType
  sport?: WorkoutType | null
  customDistanceKm?: number | null
  triathlonDistance?: TriathlonDistance | null
}): MatchedPersonalBestPreset | null {
  switch (race.type) {
    case RaceType.FIVE_K:
      return presetByKey('FIVE_K')
    case RaceType.TEN_K:
      return presetByKey('TEN_K')
    case RaceType.HALF_MARATHON:
      return presetByKey('HALF_MARATHON')
    case RaceType.MARATHON:
      return presetByKey('MARATHON')
    case RaceType.HYROX:
      return presetByKey('HYROX_OPEN')
    case RaceType.TRIATHLON: {
      switch (race.triathlonDistance) {
        case TriathlonDistance.SPRINT:
          return presetByKey('TRI_SPRINT')
        case TriathlonDistance.OLYMPIC:
          return presetByKey('TRI_OLYMPIC')
        case TriathlonDistance.HALF:
          return presetByKey('TRI_70_3')
        case TriathlonDistance.FULL:
          return presetByKey('TRI_IRONMAN')
        default:
          return null
      }
    }
    case RaceType.OTHER: {
      if (race.sport && race.sport !== WorkoutType.RUN) return null
      const km = race.customDistanceKm
      if (km == null || !Number.isFinite(km) || km <= 0) return null
      for (const preset of PERSONAL_BEST_PRESETS) {
        if (preset.sport !== PersonalBestSport.RUN || preset.km == null) continue
        if (Math.abs(km - preset.km) <= (preset.toleranceKm ?? 0.3)) {
          return {
            key: preset.key,
            name: preset.name,
            sport: preset.sport,
            metric: preset.metric,
          }
        }
      }
      return null
    }
    default:
      return null
  }
}

function presetByKey(key: string): MatchedPersonalBestPreset | null {
  const preset = PERSONAL_BEST_PRESETS.find((p) => p.key === key)
  if (!preset) return null
  return {
    key: preset.key,
    name: preset.name,
    sport: preset.sport,
    metric: preset.metric,
  }
}

export function buildPersonalBestSuggestion(args: {
  race: {
    id: string
    name: string
    date: Date
    type: RaceType
    sport?: WorkoutType | null
    customDistanceKm?: number | null
    triathlonDistance?: TriathlonDistance | null
    outcome?: RaceOutcome | null
    resultTime?: string | null
  }
  existing: {
    id: string
    value: number
    event: string | null
    metric: PersonalBestMetric
  } | null
}): PersonalBestSuggestion | null {
  const { race, existing } = args
  if (race.outcome && race.outcome !== 'FINISHED') return null
  if (!race.resultTime?.trim()) return null

  const matched = matchPersonalBestPreset(race)
  if (!matched) return null

  const proposedValue = parseRaceTimeToMinutes(race.resultTime)
  if (proposedValue == null || proposedValue <= 0) return null
  if (
    !isPersonalBestImprovement(
      proposedValue,
      existing?.value,
      PersonalBestMetric.TIME,
    )
  ) {
    return null
  }

  const proposedValueLabel = formatPersonalBestValue(proposedValue, PersonalBestMetric.TIME)
  if (!proposedValueLabel) return null

  return {
    personalBestId: existing?.id ?? null,
    presetKey: matched.key,
    name: matched.name,
    sport: matched.sport,
    metric: PersonalBestMetric.TIME,
    proposedValue,
    proposedValueLabel,
    dateText: toDateKey(race.date),
    event: race.name,
    raceId: race.id,
    previousValue: existing?.value ?? null,
    previousValueLabel: existing
      ? formatPersonalBestValue(existing.value, existing.metric)
      : null,
    previousEvent: existing?.event ?? null,
  }
}

export function parsePersonalBestSport(raw: string): PersonalBestSport | null {
  return (Object.values(PersonalBestSport) as string[]).includes(raw)
    ? (raw as PersonalBestSport)
    : null
}

export function parsePersonalBestMetric(raw: string): PersonalBestMetric | null {
  return (Object.values(PersonalBestMetric) as string[]).includes(raw)
    ? (raw as PersonalBestMetric)
    : null
}
