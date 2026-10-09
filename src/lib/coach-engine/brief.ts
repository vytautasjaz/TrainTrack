import type { AthleteLevel } from '@/lib/coach-engine/types'
import { parsePaceMinPerKm } from '@/lib/athlete-preferences'

export const DAY_OPTIONS = [
  { value: '0', label: 'Mon' },
  { value: '1', label: 'Tue' },
  { value: '2', label: 'Wed' },
  { value: '3', label: 'Thu' },
  { value: '4', label: 'Fri' },
  { value: '5', label: 'Sat' },
  { value: '6', label: 'Sun' },
] as const

export const RACE_WEEKDAY_FIELD = {
  key: 'raceWeekday',
  label: 'Race day (final week)',
  kind: 'select' as const,
  options: [
    { value: '0', label: 'Monday' },
    { value: '1', label: 'Tuesday' },
    { value: '2', label: 'Wednesday' },
    { value: '3', label: 'Thursday' },
    { value: '4', label: 'Friday' },
    { value: '5', label: 'Saturday' },
    { value: '6', label: 'Sunday' },
  ],
  defaultValue: '6',
  required: true,
}

/** Shared schedule / context fields for draft skills (also rendered in guided wizard). */
export const SCHEDULE_BRIEF_FIELDS = [
  {
    key: 'daysPerWeek',
    label: 'Training days / week',
    kind: 'number' as const,
    min: 3,
    max: 7,
    defaultValue: 4,
    required: true,
  },
  {
    key: 'longRunDay',
    label: 'Long run day',
    kind: 'select' as const,
    options: [
      { value: '0', label: 'Monday' },
      { value: '1', label: 'Tuesday' },
      { value: '2', label: 'Wednesday' },
      { value: '3', label: 'Thursday' },
      { value: '4', label: 'Friday' },
      { value: '5', label: 'Saturday' },
      { value: '6', label: 'Sunday' },
    ],
    defaultValue: '5',
    required: true,
  },
  {
    key: 'currentWeeklyKm',
    label: 'Current weekly km (approx)',
    kind: 'number' as const,
    min: 5,
    max: 160,
    defaultValue: 30,
    required: true,
  },
  {
    key: 'firstWeekKm',
    /** Derived from currentWeeklyKm in the intake wizard — not asked of the athlete. */
    label: 'First week target km',
    kind: 'number' as const,
    min: 5,
    max: 160,
    defaultValue: 30,
    required: true,
  },
] as const

export type ScheduleBrief = {
  daysPerWeek: number
  longRunDay: number
  /** Explicit training weekdays (0=Mon … 6=Sun). Empty = derive from daysPerWeek. */
  availableDays: number[]
  currentWeeklyKm: number | null
  firstWeekKm: number | null
  /** Race weekday in final week; null if not provided. */
  raceWeekday: number | null
}

function asNumber(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return null
  return n
}

function parseAvailableDays(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value
      .map((v) => asNumber(v))
      .filter((n): n is number => n != null)
      .map((n) => Math.min(6, Math.max(0, Math.round(n))))
  }
  if (typeof value === 'string') {
    return value
      .split(/[,;\s]+/)
      .map((part) => asNumber(part.trim()))
      .filter((n): n is number => n != null)
      .map((n) => Math.min(6, Math.max(0, Math.round(n))))
  }
  return []
}

/** Parse athlete schedule constraints from wizard brief. */
export function parseScheduleBrief(
  brief: Record<string, unknown>,
): ScheduleBrief {
  const daysRaw = asNumber(brief.daysPerWeek)
  const longRaw = asNumber(brief.longRunDay)
  const kmRaw = asNumber(brief.currentWeeklyKm)
  const firstRaw = asNumber(brief.firstWeekKm)
  let availableDays = [...new Set(parseAvailableDays(brief.availableDays))].sort(
    (a, b) => a - b,
  )
  const daysPerWeek = Math.min(
    7,
    Math.max(
      3,
      Math.round(daysRaw ?? (availableDays.length || 4)),
    ),
  )
  const longRunDay = Math.min(6, Math.max(0, Math.round(longRaw ?? 5)))

  if (availableDays.length === 0) {
    availableDays = []
  } else {
    if (!availableDays.includes(longRunDay)) {
      availableDays = [...availableDays, longRunDay].sort((a, b) => a - b)
    }
    // Cap to daysPerWeek preferring long-run day kept.
    if (availableDays.length > daysPerWeek) {
      availableDays = [
        longRunDay,
        ...availableDays.filter((d) => d !== longRunDay),
      ].slice(0, daysPerWeek)
      availableDays.sort((a, b) => a - b)
    }
  }

  const currentWeeklyKm =
    kmRaw != null && kmRaw > 0
      ? Math.min(160, Math.max(5, Math.round(kmRaw)))
      : null
  const firstWeekKm =
    firstRaw != null && firstRaw > 0
      ? Math.min(160, Math.max(5, Math.round(firstRaw)))
      : currentWeeklyKm

  const raceRaw = asNumber(brief.raceWeekday)
  const raceWeekday =
    raceRaw != null && Number.isFinite(raceRaw)
      ? Math.min(6, Math.max(0, Math.round(raceRaw)))
      : null

  return {
    daysPerWeek,
    longRunDay,
    availableDays,
    currentWeeklyKm,
    firstWeekKm,
    raceWeekday,
  }
}

export function defaultLevelMinutes(
  level: AthleteLevel,
): { easy: number; quality: number; long: number; recovery: number } {
  switch (level) {
    case 'beginner':
      return { easy: 40, quality: 50, long: 70, recovery: 30 }
    case 'advanced':
      return { easy: 55, quality: 70, long: 115, recovery: 35 }
    case 'elite':
      return { easy: 60, quality: 75, long: 130, recovery: 40 }
    default:
      // Intermediate HM: long runs should be real longs (~90–110), not ~30 min.
      return { easy: 50, quality: 65, long: 100, recovery: 35 }
  }
}

/** Pace / zone overrides editable in the pre-generate guide. */
export type ProfileOverrideBrief = {
  paceEasy: number | null
  paceTempo: number | null
  paceThreshold: number | null
  paceVo2: number | null
  bikeFtpWatts: number | null
  swimCssSecPer100m: number | null
  hrMax: number | null
  hrResting: number | null
}

export function parseProfileOverrides(
  brief: Record<string, unknown>,
): ProfileOverrideBrief {
  const paceValue = (value: unknown): number | null => {
    if (typeof value === 'string') return parsePaceMinPerKm(value)
    return asNumber(value)
  }
  return {
    paceEasy: paceValue(brief.paceEasy),
    paceTempo: paceValue(brief.paceTempo),
    paceThreshold: paceValue(brief.paceThreshold),
    paceVo2: paceValue(brief.paceVo2),
    bikeFtpWatts: asNumber(brief.bikeFtpWatts),
    swimCssSecPer100m: asNumber(brief.swimCssSecPer100m),
    hrMax: asNumber(brief.hrMax),
    hrResting: asNumber(brief.hrResting),
  }
}
