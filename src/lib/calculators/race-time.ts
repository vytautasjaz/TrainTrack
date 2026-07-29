import { formatPaceMinPerKm, parsePaceMinPerKm } from '@/lib/athlete-preferences'

/** Parse race finish time — supports h:mm:ss, m:ss, or decimal minutes. */
export function parseRaceTimeToMinutes(input: string): number | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const hms = trimmed.match(/^(\d+):(\d{1,2}):(\d{1,2})$/)
  if (hms) {
    const h = parseInt(hms[1], 10)
    const m = parseInt(hms[2], 10)
    const s = parseInt(hms[3], 10)
    if (m >= 60 || s >= 60 || h < 0) return null
    return h * 60 + m + s / 60
  }

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

/** Parse mm:ss or m:ss into minutes (e.g. "3:30" → 3.5). */
export function parseDurationToMinutes(input: string): number | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const colonMatch = trimmed.match(/^(\d+):(\d{1,2})$/)
  if (colonMatch) {
    const mins = parseInt(colonMatch[1], 10)
    const secs = parseInt(colonMatch[2], 10)
    if (secs >= 60 || mins < 0) return null
    return mins + secs / 60
  }

  const decimal = parseFloat(trimmed)
  if (!Number.isNaN(decimal) && decimal >= 0) return decimal
  return null
}

/** Parse swim pace as min per 100 m (same format as run pace). */
export function parseSwimPaceMinPer100m(input: string): number | null {
  return parsePaceMinPerKm(input)
}

export function formatSwimPaceMinPer100m(minPer100m: number): string {
  const totalSecs = Math.round(minPer100m * 60)
  const mins = Math.floor(totalSecs / 60)
  const secs = totalSecs % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/** Format total race duration — sub-hour as m:ss, otherwise h:mm:ss. */
export function formatRaceTime(totalMinutes: number): string {
  if (!Number.isFinite(totalMinutes) || totalMinutes < 0) return '—'
  const totalSecs = Math.round(totalMinutes * 60)
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function formatPaceDisplay(minPerKm: number): string {
  return `${formatPaceMinPerKm(minPerKm)}/km`
}

export function formatBikeSpeedDisplay(kmh: number): string {
  return `${kmh % 1 === 0 ? kmh : kmh.toFixed(1)} km/h`
}

export function runningFinishMinutes(distanceKm: number, paceMinPerKm: number): number {
  return distanceKm * paceMinPerKm
}

/** Interval time from pace (min/km) and distance in metres. */
export function intervalTimeMinutes(distanceM: number, paceMinPerKm: number): number {
  return (distanceM / 1000) * paceMinPerKm
}

/** Pace (min/km) from interval distance in metres and elapsed time. */
export function intervalPaceFromTime(distanceM: number, totalMinutes: number): number | null {
  if (distanceM <= 0 || totalMinutes <= 0) return null
  return totalMinutes / (distanceM / 1000)
}

export function runningPaceFromFinish(distanceKm: number, totalMinutes: number): number | null {
  if (distanceKm <= 0 || totalMinutes <= 0) return null
  return totalMinutes / distanceKm
}

export function swimPaceFromLegTime(swimKm: number, swimMinutes: number): number | null {
  if (swimKm <= 0 || swimMinutes <= 0) return null
  return swimMinutes / (swimKm * 10)
}

export function bikeSpeedFromLegTime(bikeKm: number, bikeMinutes: number): number | null {
  if (bikeKm <= 0 || bikeMinutes <= 0) return null
  return bikeKm / (bikeMinutes / 60)
}

export function runPaceFromLegTime(runKm: number, runMinutes: number): number | null {
  if (runKm <= 0 || runMinutes <= 0) return null
  return runMinutes / runKm
}

export type TriathlonSplit = {
  swimMin: number
  t1Min: number
  bikeMin: number
  t2Min: number
  runMin: number
  totalMin: number
}

export function triathlonFinishMinutes(input: {
  swimKm: number
  bikeKm: number
  runKm: number
  swimPaceMinPer100m: number
  t1Min: number
  bikeSpeedKmh: number
  t2Min: number
  runPaceMinPerKm: number
}): TriathlonSplit | null {
  const { swimKm, bikeKm, runKm, swimPaceMinPer100m, t1Min, bikeSpeedKmh, t2Min, runPaceMinPerKm } =
    input

  if (
    swimKm <= 0 ||
    bikeKm <= 0 ||
    runKm <= 0 ||
    swimPaceMinPer100m <= 0 ||
    bikeSpeedKmh <= 0 ||
    runPaceMinPerKm <= 0
  ) {
    return null
  }

  const swimMin = (swimKm * 1000) / 100 * swimPaceMinPer100m
  const bikeMin = (bikeKm / bikeSpeedKmh) * 60
  const runMin = runKm * runPaceMinPerKm
  const totalMin = swimMin + t1Min + bikeMin + t2Min + runMin

  return { swimMin, t1Min, bikeMin, t2Min, runMin, totalMin }
}

export function parsePositiveFloat(input: string): number | null {
  const trimmed = input.trim().replace(',', '.')
  if (!trimmed || trimmed === '.') return null
  const value = parseFloat(trimmed)
  if (Number.isNaN(value) || value <= 0) return null
  return value
}
