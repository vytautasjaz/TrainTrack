export const PACE_ZONE_FIELDS = [
  { key: 'paceRecoveryMinPerKm', name: 'recovery', label: 'Recovery' },
  { key: 'paceEasyMinPerKm', name: 'easy', label: 'Easy' },
  { key: 'paceTempoMinPerKm', name: 'tempo', label: 'Tempo' },
  { key: 'paceThresholdMinPerKm', name: 'threshold', label: 'Threshold' },
  { key: 'paceVo2MaxMinPerKm', name: 'vo2max', label: 'VO2 max' },
] as const

export const BIKE_SPEED_ZONE_FIELDS = [
  { key: 'bikeSpeedRecoveryKph', name: 'bikeRecovery', label: 'Recovery' },
  { key: 'bikeSpeedEasyKph', name: 'bikeEasy', label: 'Easy / Endurance' },
  { key: 'bikeSpeedTempoKph', name: 'bikeTempo', label: 'Tempo / Sweet Spot' },
  { key: 'bikeSpeedThresholdKph', name: 'bikeThreshold', label: 'Threshold' },
  { key: 'bikeSpeedVo2MaxKph', name: 'bikeVo2max', label: 'VO2 max / Sprint' },
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
export type BikeSpeedZoneKey = (typeof BIKE_SPEED_ZONE_FIELDS)[number]['key']
export type HrZoneKey = (typeof HR_ZONE_FIELDS)[number]['key']

export type AthletePaceZones = Partial<Record<PaceZoneKey, number | null>>
export type AthleteBikeSpeedZones = Partial<Record<BikeSpeedZoneKey, number | null>>
export type AthleteHrZones = Partial<Record<HrZoneKey, number | null>>

export type AthletePreferences = AthletePaceZones &
  AthleteBikeSpeedZones &
  AthleteHrZones & {
    bikeFtpWatts?: number | null
    swimCssSecPer100m?: number | null
  }

/** Parse "5:30", "5:30.5", "5:30.25", or "5:30/km" into minutes per km. */
export function parsePaceMinPerKm(input: string): number | null {
  const trimmed = input.trim().replace(/\/km$/i, '').trim()
  if (!trimmed) return null

  const colonMatch = trimmed.match(/^(\d+):(\d{1,2})(?:\.(\d{1,3}))?$/)
  if (colonMatch) {
    const mins = parseInt(colonMatch[1], 10)
    const secs = parseInt(colonMatch[2], 10)
    const frac = colonMatch[3]
      ? parseInt(colonMatch[3], 10) / 10 ** colonMatch[3].length
      : 0
    if (secs >= 60 || mins < 0) return null
    return mins + (secs + frac) / 60
  }

  const decimal = parseFloat(trimmed)
  if (!Number.isNaN(decimal) && decimal > 0) return decimal
  return null
}

/** Parse bike speed input like "30", "30.5", or "30 km/h" into km/h. */
export function parseBikeSpeedKph(input: string): number | null {
  const trimmed = input.trim().replace(/km\/?h$/i, '').trim()
  if (!trimmed) return null
  const speed = parseFloat(trimmed.replace(',', '.'))
  if (!Number.isFinite(speed) || speed <= 0) return null
  return speed
}

/** Format minutes per km as m:ss (e.g. 5.5 → "5:30"). */
export function formatPaceMinPerKm(minPerKm: number | null | undefined): string {
  if (minPerKm == null || minPerKm <= 0) return ''
  const totalSecs = Math.round(minPerKm * 60)
  const mins = Math.floor(totalSecs / 60)
  const secs = totalSecs % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Format pace with 0.01s resolution so finish times can change by 1 second
 * (whole-second pace rounding jumps by ~distanceKm seconds).
 */
export function formatPaceMinPerKmPrecise(minPerKm: number | null | undefined): string {
  if (minPerKm == null || minPerKm <= 0) return ''
  const totalSecs = Math.round(minPerKm * 60 * 100) / 100
  const mins = Math.floor(totalSecs / 60)
  const secs = totalSecs - mins * 60
  const wholeSecs = Math.floor(secs + 1e-9)
  const hundredths = Math.round((secs - wholeSecs) * 100)
  if (hundredths <= 0) {
    return `${mins}:${wholeSecs.toString().padStart(2, '0')}`
  }
  return `${mins}:${wholeSecs.toString().padStart(2, '0')}.${hundredths.toString().padStart(2, '0')}`
}

/** Estimate workout duration in minutes from distance and pace. */
export function estimateDurationMin(distanceKm: number, paceMinPerKm: number): number {
  return Math.round(distanceKm * paceMinPerKm)
}

export function estimateDistanceKmFromBikeSpeed(durationMin: number, speedKph: number): number {
  if (!Number.isFinite(durationMin) || durationMin <= 0 || !Number.isFinite(speedKph) || speedKph <= 0) {
    return 0
  }
  return Math.round((durationMin / 60) * speedKph * 10) / 10
}

export function estimateDurationMinFromBikeSpeed(distanceKm: number, speedKph: number): number {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0 || !Number.isFinite(speedKph) || speedKph <= 0) {
    return 0
  }
  return Math.round((distanceKm / speedKph) * 60)
}

/** Default min/km when a zone is not set in profile (matches workout-builder fallbacks). */
export const FALLBACK_PACE_MIN_PER_KM: Record<PaceZoneKey, number> = {
  paceRecoveryMinPerKm: 6.5,
  paceEasyMinPerKm: 5.75,
  paceTempoMinPerKm: 5.0,
  paceThresholdMinPerKm: 4.5,
  paceVo2MaxMinPerKm: 3.75,
}

/** Map session types to pace zone keys for duration/distance estimates. */
export function paceZoneForSessionType(sessionType: string): PaceZoneKey {
  switch (sessionType) {
    case 'RECOVERY_RUN':
      return 'paceRecoveryMinPerKm'
    case 'EASY_RUN':
    case 'LONG_RUN':
    case 'FARTLEK':
    case 'BRICK':
    case 'CROSS_TRAINING':
      return 'paceEasyMinPerKm'
    case 'TEMPO':
      return 'paceTempoMinPerKm'
    case 'THRESHOLD':
    case 'RACE_PACE':
      return 'paceThresholdMinPerKm'
    case 'VO2_MAX':
    case 'INTERVALS':
    case 'HILL_REPEATS':
      return 'paceVo2MaxMinPerKm'
    case 'CUSTOM':
    default:
      return 'paceEasyMinPerKm'
  }
}

/** Pace (min/km) for a run session type from athlete profile or zone fallback. */
export function paceMinPerKmForSessionType(
  sessionType: string,
  preferences?: AthletePreferences | null,
): number {
  const zoneKey = paceZoneForSessionType(sessionType)
  const fromPref = preferences?.[zoneKey]
  if (typeof fromPref === 'number' && fromPref > 0) return fromPref
  return FALLBACK_PACE_MIN_PER_KM[zoneKey]
}

/** Map shared SessionType buckets onto bike speed zone keys. */
export function bikeSpeedZoneForSessionType(sessionType: string): BikeSpeedZoneKey {
  switch (sessionType) {
    case 'RECOVERY_RUN':
      return 'bikeSpeedRecoveryKph'
    case 'TEMPO':
      return 'bikeSpeedTempoKph'
    case 'THRESHOLD':
      return 'bikeSpeedThresholdKph'
    case 'VO2_MAX':
    case 'INTERVALS':
      return 'bikeSpeedVo2MaxKph'
    case 'EASY_RUN':
    case 'LONG_RUN':
    case 'RACE_PACE':
    case 'HILL_REPEATS':
    case 'CUSTOM':
    default:
      return 'bikeSpeedEasyKph'
  }
}

const FALLBACK_BIKE_SPEED_KPH: Record<BikeSpeedZoneKey, number> = {
  bikeSpeedRecoveryKph: 22,
  bikeSpeedEasyKph: 26,
  bikeSpeedTempoKph: 30,
  bikeSpeedThresholdKph: 32,
  bikeSpeedVo2MaxKph: 35,
}

/** Bike speed (km/h) for a session type from athlete profile or zone fallback. */
export function bikeSpeedKphForSessionType(
  sessionType: string,
  preferences?: AthletePreferences | null,
): number {
  const zoneKey = bikeSpeedZoneForSessionType(sessionType)
  const fromPref = preferences?.[zoneKey]
  if (typeof fromPref === 'number' && fromPref > 0) return fromPref
  return FALLBACK_BIKE_SPEED_KPH[zoneKey]
}

export function hasPacePreferences(preferences: AthletePreferences | null | undefined): boolean {
  if (!preferences) return false
  return PACE_ZONE_FIELDS.some(({ key }) => {
    const value = preferences[key]
    return value != null && value > 0
  })
}

export function bikeSpeedZoneForKind(kind: string): BikeSpeedZoneKey {
  switch (kind) {
    case 'RECOVERY':
      return 'bikeSpeedRecoveryKph'
    case 'TEMPO':
    case 'SWEET_SPOT':
      return 'bikeSpeedTempoKph'
    case 'THRESHOLD':
      return 'bikeSpeedThresholdKph'
    case 'VO2':
    case 'SPRINT':
      return 'bikeSpeedVo2MaxKph'
    case 'EASY':
    case 'ENDURANCE':
    case 'LONG':
    case 'HILLS':
    case 'RACE':
    case 'CUSTOM':
    default:
      return 'bikeSpeedEasyKph'
  }
}

export function hasBikeSpeedPreferences(preferences: AthletePreferences | null | undefined): boolean {
  if (!preferences) return false
  return BIKE_SPEED_ZONE_FIELDS.some(({ key }) => {
    const value = preferences[key]
    return value != null && value > 0
  })
}

/** Parse CSS like "1:35", "1:35/100", or seconds "95" into sec/100m. */
export function parseSwimCssSecPer100m(input: string): number | null {
  const trimmed = input.trim().replace(/\/\s*100\s*m?/i, '').trim()
  if (!trimmed) return null

  const colonMatch = trimmed.match(/^(\d+):(\d{1,2})(?:\.(\d{1,3}))?$/)
  if (colonMatch) {
    const mins = parseInt(colonMatch[1], 10)
    const secs = parseInt(colonMatch[2], 10)
    const frac = colonMatch[3]
      ? parseInt(colonMatch[3], 10) / 10 ** colonMatch[3].length
      : 0
    if (secs >= 60 || mins < 0) return null
    const total = mins * 60 + secs + frac
    return total > 0 ? total : null
  }

  const decimal = parseFloat(trimmed.replace(',', '.'))
  if (!Number.isFinite(decimal) || decimal <= 0) return null
  return decimal
}

/** Format CSS seconds/100m as m:ss (e.g. 95 → "1:35"). */
export function formatSwimCssSecPer100m(secPer100?: number | null): string {
  if (secPer100 == null || secPer100 <= 0) return ''
  const totalSecs = Math.round(secPer100)
  const mins = Math.floor(totalSecs / 60)
  const secs = totalSecs % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function estimateSwimDurationMinFromCss(
  distanceMeters: number,
  cssSecPer100m: number,
): number {
  if (distanceMeters <= 0 || cssSecPer100m <= 0) return 0
  return Math.round((distanceMeters / 100) * (cssSecPer100m / 60))
}

export function estimateSwimDistanceMetersFromCss(
  durationMin: number,
  cssSecPer100m: number,
): number {
  if (durationMin <= 0 || cssSecPer100m <= 0) return 0
  return Math.round(((durationMin * 60) / cssSecPer100m) * 100)
}

export function hasSwimCssPreference(preferences: AthletePreferences | null | undefined): boolean {
  const css = preferences?.swimCssSecPer100m
  return typeof css === 'number' && css > 0
}

export function hasBikeFtpPreference(preferences: AthletePreferences | null | undefined): boolean {
  const ftp = preferences?.bikeFtpWatts
  return typeof ftp === 'number' && ftp > 0
}

/** Parse "75", "75%", "75% FTP" → percent number. */
export function parseFtpPercent(input: string): number | null {
  const match = input.trim().match(/^(\d{1,3}(?:\.\d+)?)\s*%?\s*(?:ftp)?$/i)
  if (!match) return null
  const pct = parseFloat(match[1])
  if (!Number.isFinite(pct) || pct <= 0 || pct > 200) return null
  return pct
}

export function wattsFromFtpPercent(ftpWatts: number, percent: number): number {
  return Math.round((ftpWatts * percent) / 100)
}

export function pickAthletePreferences(athlete: {
  paceRecoveryMinPerKm?: number | null
  paceEasyMinPerKm?: number | null
  paceTempoMinPerKm?: number | null
  paceThresholdMinPerKm?: number | null
  paceVo2MaxMinPerKm?: number | null
  bikeSpeedRecoveryKph?: number | null
  bikeSpeedEasyKph?: number | null
  bikeSpeedTempoKph?: number | null
  bikeSpeedThresholdKph?: number | null
  bikeSpeedVo2MaxKph?: number | null
  bikeFtpWatts?: number | null
  swimCssSecPer100m?: number | null
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
    bikeSpeedRecoveryKph: athlete.bikeSpeedRecoveryKph ?? null,
    bikeSpeedEasyKph: athlete.bikeSpeedEasyKph ?? null,
    bikeSpeedTempoKph: athlete.bikeSpeedTempoKph ?? null,
    bikeSpeedThresholdKph: athlete.bikeSpeedThresholdKph ?? null,
    bikeSpeedVo2MaxKph: athlete.bikeSpeedVo2MaxKph ?? null,
    bikeFtpWatts: athlete.bikeFtpWatts ?? null,
    swimCssSecPer100m: athlete.swimCssSecPer100m ?? null,
    hrMax: athlete.hrMax ?? null,
    hrResting: athlete.hrResting ?? null,
    hrZone1Max: athlete.hrZone1Max ?? null,
    hrZone2Max: athlete.hrZone2Max ?? null,
    hrZone3Max: athlete.hrZone3Max ?? null,
    hrZone4Max: athlete.hrZone4Max ?? null,
  }
}
