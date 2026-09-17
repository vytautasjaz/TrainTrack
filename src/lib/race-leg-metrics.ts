import { RaceLegKind, TriathlonDistance, type RaceType } from '@prisma/client'
import { formatPaceMinPerKm } from '@/lib/athlete-preferences'
import { TRIATHLON_PRESETS } from '@/lib/calculators/race-distances'
import {
  bikeSpeedFromLegTime,
  formatBikeSpeedDisplay,
  formatPaceDisplay,
  parseRaceTimeToMinutes,
  runPaceFromLegTime,
  swimPaceFromLegTime,
} from '@/lib/calculators/race-time'
import { raceLegSupportsStrava, RACE_LEG_LABELS } from '@/lib/race-legs'

export type RaceLegSplitMetricsSource = {
  kind: RaceLegKind
  resultTime?: string | null
  plannedDistanceKm?: number | null
  actualDistanceKm?: number | null
  actualDurationMin?: number | null
}

export type RaceSplitMetricsContext = {
  type: RaceType
  triathlonDistance?: TriathlonDistance | null
}

export type RaceLegSplitMetrics = {
  distanceLabel: string | null
  paceLabel: string | null
  /** True when distance came from Strava actuals. */
  fromStrava: boolean
}

function triathlonPresetKm(kind: RaceLegKind, distance: TriathlonDistance | null | undefined): number | null {
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
  const preset = TRIATHLON_PRESETS.find((p) => p.id === id)
  if (!preset) return null
  if (kind === RaceLegKind.SWIM) return preset.swimKm
  if (kind === RaceLegKind.BIKE) return preset.bikeKm
  if (kind === RaceLegKind.RUN) return preset.runKm
  return null
}

function positiveKm(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return null
  return value
}

function minutesForLeg(leg: RaceLegSplitMetricsSource): number | null {
  const fromClock = leg.resultTime?.trim()
    ? parseRaceTimeToMinutes(leg.resultTime)
    : null
  if (fromClock != null && fromClock > 0) return fromClock
  if (leg.actualDurationMin != null && leg.actualDurationMin > 0) {
    return leg.actualDurationMin
  }
  return null
}

/** Format km for split display — swim prefers meters. */
export function formatRaceLegDistanceKm(kind: RaceLegKind, km: number): string {
  if (kind === RaceLegKind.SWIM) {
    const meters = Math.round(km * 1000)
    if (meters >= 1000 && meters % 1000 === 0) {
      return `${meters / 1000} km`
    }
    return `${meters} m`
  }
  if (km >= 10 || Number.isInteger(km)) {
    return `${Number.isInteger(km) ? km : Math.round(km * 10) / 10} km`
  }
  const rounded = Math.round(km * 100) / 100
  return `${rounded} km`
}

function paceLabelForLeg(kind: RaceLegKind, km: number, minutes: number): string | null {
  if (kind === RaceLegKind.SWIM) {
    const pace = swimPaceFromLegTime(km, minutes)
    if (pace == null) return null
    const formatted = formatPaceMinPerKm(pace)
    return formatted ? `${formatted}/100m` : null
  }
  if (kind === RaceLegKind.BIKE) {
    const speed = bikeSpeedFromLegTime(km, minutes)
    if (speed == null) return null
    return formatBikeSpeedDisplay(Math.round(speed * 10) / 10)
  }
  if (kind === RaceLegKind.RUN) {
    const pace = runPaceFromLegTime(km, minutes)
    if (pace == null) return null
    return formatPaceDisplay(pace)
  }
  return null
}

/**
 * Distance + pace for a race split.
 * Distance prefers Strava actual, then event preset / planned leg distance.
 */
export function raceLegSplitMetrics(
  leg: RaceLegSplitMetricsSource,
  race: RaceSplitMetricsContext,
): RaceLegSplitMetrics | null {
  if (!raceLegSupportsStrava(leg.kind)) return null

  const stravaKm = positiveKm(leg.actualDistanceKm)
  const plannedKm =
    positiveKm(leg.plannedDistanceKm) ??
    triathlonPresetKm(leg.kind, race.triathlonDistance)
  const km = stravaKm ?? plannedKm
  if (km == null) return null

  const minutes = minutesForLeg(leg)
  const distanceLabel = formatRaceLegDistanceKm(leg.kind, km)
  const paceLabel = minutes != null ? paceLabelForLeg(leg.kind, km, minutes) : null

  if (!distanceLabel && !paceLabel) return null

  return {
    distanceLabel,
    paceLabel,
    fromStrava: stravaKm != null,
  }
}

/**
 * Full triathlon distance line, e.g. "300 m SWIM / 6.7 km BIKE / 2.6 km RUN".
 * Prefers Strava actuals, then planned / event preset distances.
 */
export function formatTriathlonDistanceBreakdown(args: {
  triathlonDistance?: TriathlonDistance | null
  legs?: Array<{
    kind: RaceLegKind | string
    plannedDistanceKm?: number | null
    actualDistanceKm?: number | null
  }> | null
}): string | null {
  const parts: string[] = []
  for (const kind of [RaceLegKind.SWIM, RaceLegKind.BIKE, RaceLegKind.RUN] as const) {
    const leg = args.legs?.find((row) => row.kind === kind)
    const km =
      positiveKm(leg?.actualDistanceKm) ??
      positiveKm(leg?.plannedDistanceKm) ??
      triathlonPresetKm(kind, args.triathlonDistance)
    if (km == null) continue
    parts.push(`${formatRaceLegDistanceKm(kind, km)} ${RACE_LEG_LABELS[kind].toUpperCase()}`)
  }
  return parts.length > 0 ? parts.join(' / ') : null
}

const TRIATHLON_PRESET_DISTANCE_LABELS: Partial<Record<TriathlonDistance, string>> = {
  [TriathlonDistance.SPRINT]: 'Sprint distance',
  [TriathlonDistance.OLYMPIC]: 'Olympic distance',
  [TriathlonDistance.HALF]: '70.3 distance',
  [TriathlonDistance.FULL]: 'Ironman distance',
}

/**
 * Feed/meta triathlon distance: preset selection name, or full custom breakdown.
 */
export function formatTriathlonFeedDistanceLabel(args: {
  triathlonDistance?: TriathlonDistance | null
  legs?: Array<{
    kind: RaceLegKind | string
    plannedDistanceKm?: number | null
    actualDistanceKm?: number | null
  }> | null
}): string | null {
  const preset = args.triathlonDistance
  if (preset && preset !== TriathlonDistance.CUSTOM) {
    return TRIATHLON_PRESET_DISTANCE_LABELS[preset] ?? null
  }
  return formatTriathlonDistanceBreakdown({
    triathlonDistance: TriathlonDistance.CUSTOM,
    legs: args.legs,
  })
}
