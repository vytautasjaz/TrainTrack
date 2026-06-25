export const PACE_ZONE_FIELDS = [
  { key: 'paceRecoveryMinPerKm', name: 'recovery', label: 'Recovery' },
  { key: 'paceEasyMinPerKm', name: 'easy', label: 'Easy' },
  { key: 'paceTempoMinPerKm', name: 'tempo', label: 'Tempo' },
  { key: 'paceThresholdMinPerKm', name: 'threshold', label: 'Threshold' },
  { key: 'paceVo2MaxMinPerKm', name: 'vo2max', label: 'VO2 max' },
] as const

export const HR_ZONE_FIELDS = [
  { key: 'hrMax', name: 'hrMax', label: 'Max HR', placeholder: '190' },
  { key: 'hrResting', name: 'hrResting', label: 'Resting HR', placeholder: '50' },
  { key: 'hrZone1Max', name: 'hrZone1Max', label: 'Zone 1 max', placeholder: '120' },
  { key: 'hrZone2Max', name: 'hrZone2Max', label: 'Zone 2 max', placeholder: '140' },
  { key: 'hrZone3Max', name: 'hrZone3Max', label: 'Zone 3 max', placeholder: '160' },
  { key: 'hrZone4Max', name: 'hrZone4Max', label: 'Zone 4 max', placeholder: '175' },
] as const

export type PaceZoneKey = (typeof PACE_ZONE_FIELDS)[number]['key']
export type HrZoneKey = (typeof HR_ZONE_FIELDS)[number]['key']

export type AthletePaceZones = Partial<Record<PaceZoneKey, number | null>>
export type AthleteHrZones = Partial<Record<HrZoneKey, number | null>>

export type AthletePreferences = AthletePaceZones & AthleteHrZones

/** Parse "5:30" or "5:30/km" into minutes per km (5.5). */
export function parsePaceMinPerKm(input: string): number | null {
  const trimmed = input.trim().replace(/\/km$/i, '').trim()
  if (!trimmed) return null

  const colonMatch = trimmed.match(/^(\d+):(\d{1,2})$/)
  if (colonMatch) {
    const mins = parseInt(colonMatch[1], 10)
    const secs = parseInt(colonMatch[2], 10)
    if (secs >= 60 || mins < 0) return null
    return mins + secs / 60
  }

  const decimal = parseFloat(trimmed)
  if (!Number.isNaN(decimal) && decimal > 0) return decimal
  return null
}

/** Format minutes per km as m:ss (e.g. 5.5 → "5:30"). */
export function formatPaceMinPerKm(minPerKm: number | null | undefined): string {
  if (minPerKm == null || minPerKm <= 0) return ''
  const totalSecs = Math.round(minPerKm * 60)
  const mins = Math.floor(totalSecs / 60)
  const secs = totalSecs % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/** Estimate workout duration in minutes from distance and pace. */
export function estimateDurationMin(distanceKm: number, paceMinPerKm: number): number {
  return Math.round(distanceKm * paceMinPerKm)
}

/** Map session types to pace zone keys for future auto-duration. */
export function paceZoneForSessionType(sessionType: string): PaceZoneKey | null {
  switch (sessionType) {
    case 'RECOVERY_RUN':
      return 'paceRecoveryMinPerKm'
    case 'EASY_RUN':
    case 'LONG_RUN':
      return 'paceEasyMinPerKm'
    case 'TEMPO':
      return 'paceTempoMinPerKm'
    case 'THRESHOLD':
      return 'paceThresholdMinPerKm'
    case 'VO2_MAX':
    case 'INTERVALS':
      return 'paceVo2MaxMinPerKm'
    default:
      return null
  }
}

export function pickAthletePreferences(athlete: {
  paceRecoveryMinPerKm?: number | null
  paceEasyMinPerKm?: number | null
  paceTempoMinPerKm?: number | null
  paceThresholdMinPerKm?: number | null
  paceVo2MaxMinPerKm?: number | null
  hrMax?: number | null
  hrResting?: number | null
  hrZone1Max?: number | null
  hrZone2Max?: number | null
  hrZone3Max?: number | null
  hrZone4Max?: number | null
}): AthletePreferences {
  return {
    paceRecoveryMinPerKm: athlete.paceRecoveryMinPerKm ?? null,
    paceEasyMinPerKm: athlete.paceEasyMinPerKm ?? null,
    paceTempoMinPerKm: athlete.paceTempoMinPerKm ?? null,
    paceThresholdMinPerKm: athlete.paceThresholdMinPerKm ?? null,
    paceVo2MaxMinPerKm: athlete.paceVo2MaxMinPerKm ?? null,
    hrMax: athlete.hrMax ?? null,
    hrResting: athlete.hrResting ?? null,
    hrZone1Max: athlete.hrZone1Max ?? null,
    hrZone2Max: athlete.hrZone2Max ?? null,
    hrZone3Max: athlete.hrZone3Max ?? null,
    hrZone4Max: athlete.hrZone4Max ?? null,
  }
}
