import type { SessionType, WorkoutType } from '@prisma/client'
import { WorkoutType as SportEnum } from '@prisma/client'
import {
  bikeSpeedKphForSessionType,
  estimateDistanceKmFromBikeSpeed,
  estimateDurationMinFromBikeSpeed,
  estimateSwimDistanceMetersFromCss,
  estimateSwimDurationMinFromCss,
  formatPaceMinPerKm,
  paceMinPerKmForSessionType,
  parsePaceMinPerKm,
  type AthletePreferences,
} from '@/lib/athlete-preferences'
import type { Segment, Target, WorkoutBlock, WorkoutStructure } from './types'
import { progressiveMidpointTarget } from './progressive'
import { recoveryTarget } from './target-helpers'
import { formatBlockSummary, formatIntervalRecoveryLabel, formatSegment, formatTargets, segmentDistanceKm, segmentToMinutes } from './utils'

function progressiveEstimationTargets(block: WorkoutBlock): Target[] | undefined {
  const mid = progressiveMidpointTarget(block)
  return mid ? [mid] : block.targets
}

/** Generic paces (min/km) when athlete zones are not set. */
export const FALLBACK_PACES = {
  recovery: 6.5,
  easy: 5.75,
  tempo: 5.0,
  threshold: 4.5,
  vo2max: 3.75,
  interval: 3.75,
} as const

/** Generic bike speeds (km/h) when athlete zones are not set. */
export const FALLBACK_BIKE_SPEEDS = {
  recovery: 22,
  easy: 26,
  tempo: 30,
  threshold: 32,
  vo2max: 35,
  interval: 34,
} as const

export type EstimationRole = 'work' | 'recovery' | 'continuous'

function isBikeEstimationSport(sportType?: WorkoutType | null): boolean {
  return sportType === SportEnum.BIKE
}

function pickPace(
  key: keyof typeof FALLBACK_PACES,
  preferences?: AthletePreferences | null,
): number {
  const prefMap: Record<keyof typeof FALLBACK_PACES, keyof AthletePreferences> = {
    recovery: 'paceRecoveryMinPerKm',
    easy: 'paceEasyMinPerKm',
    tempo: 'paceTempoMinPerKm',
    threshold: 'paceThresholdMinPerKm',
    vo2max: 'paceVo2MaxMinPerKm',
    interval: 'paceVo2MaxMinPerKm',
  }
  const fromPref = preferences?.[prefMap[key]]
  if (typeof fromPref === 'number' && fromPref > 0) return fromPref
  return FALLBACK_PACES[key]
}

function pickBikeSpeed(
  key: keyof typeof FALLBACK_BIKE_SPEEDS,
  preferences?: AthletePreferences | null,
): number {
  const prefMap: Record<keyof typeof FALLBACK_BIKE_SPEEDS, keyof AthletePreferences> = {
    recovery: 'bikeSpeedRecoveryKph',
    easy: 'bikeSpeedEasyKph',
    tempo: 'bikeSpeedTempoKph',
    threshold: 'bikeSpeedThresholdKph',
    vo2max: 'bikeSpeedVo2MaxKph',
    interval: 'bikeSpeedVo2MaxKph',
  }
  const fromPref = preferences?.[prefMap[key]]
  if (typeof fromPref === 'number' && fromPref > 0) return fromPref
  return FALLBACK_BIKE_SPEEDS[key]
}

function paceFromHrZone(zone: number, preferences?: AthletePreferences | null): number | null {
  switch (zone) {
    case 1:
      return pickPace('recovery', preferences)
    case 2:
      return pickPace('easy', preferences)
    case 3:
      return pickPace('tempo', preferences)
    case 4:
      return pickPace('threshold', preferences)
    case 5:
      return pickPace('vo2max', preferences)
    default:
      return null
  }
}

function speedFromHrZone(zone: number, preferences?: AthletePreferences | null): number | null {
  switch (zone) {
    case 1:
      return pickBikeSpeed('recovery', preferences)
    case 2:
      return pickBikeSpeed('easy', preferences)
    case 3:
      return pickBikeSpeed('tempo', preferences)
    case 4:
      return pickBikeSpeed('threshold', preferences)
    case 5:
      return pickBikeSpeed('vo2max', preferences)
    default:
      return null
  }
}

function paceFromRpe(rpe: number, preferences?: AthletePreferences | null): number {
  if (rpe <= 2) return pickPace('recovery', preferences)
  if (rpe <= 4) return pickPace('easy', preferences)
  if (rpe <= 6) return pickPace('tempo', preferences)
  if (rpe <= 8) return pickPace('threshold', preferences)
  return pickPace('vo2max', preferences)
}

function speedFromRpe(rpe: number, preferences?: AthletePreferences | null): number {
  if (rpe <= 2) return pickBikeSpeed('recovery', preferences)
  if (rpe <= 4) return pickBikeSpeed('easy', preferences)
  if (rpe <= 6) return pickBikeSpeed('tempo', preferences)
  if (rpe <= 8) return pickBikeSpeed('threshold', preferences)
  return pickBikeSpeed('vo2max', preferences)
}

function paceFromKeywords(value: string, preferences?: AthletePreferences | null): number | null {
  const v = value.toLowerCase()
  if (v.includes('recovery') || v.includes('z1')) return pickPace('recovery', preferences)
  if (v.includes('easy') || v.includes('z2')) return pickPace('easy', preferences)
  if (v.includes('marathon') || v.includes('z3')) return pickPace('tempo', preferences)
  if (v.includes('tempo') || v.includes('sweet')) return pickPace('tempo', preferences)
  if (v.includes('threshold') || v.includes('z4')) return pickPace('threshold', preferences)
  if (v.includes('vo2') || v.includes('interval') || v.includes('5k') || v.includes('z5') || v.includes('sprint')) {
    return pickPace('vo2max', preferences)
  }
  return null
}

function speedFromKeywords(value: string, preferences?: AthletePreferences | null): number | null {
  const v = value.toLowerCase()
  if (v.includes('recovery') || v.includes('z1')) return pickBikeSpeed('recovery', preferences)
  if (v.includes('easy') || v.includes('z2') || v.includes('endurance')) {
    return pickBikeSpeed('easy', preferences)
  }
  if (v.includes('tempo') || v.includes('sweet') || v.includes('z3')) {
    return pickBikeSpeed('tempo', preferences)
  }
  if (v.includes('threshold') || v.includes('z4')) return pickBikeSpeed('threshold', preferences)
  if (v.includes('vo2') || v.includes('sprint') || v.includes('z5') || v.includes('race')) {
    return pickBikeSpeed('vo2max', preferences)
  }
  return null
}

export function resolvePaceMinPerKm(
  targets: Target[] | undefined,
  role: EstimationRole,
  preferences?: AthletePreferences | null,
): number | null {
  for (const target of targets ?? []) {
    const value = (target.value ?? '').trim()
    if (!value) continue

    if (target.type === 'pace' || value.includes('/km') || /\d+:\d{1,2}/.test(value)) {
      const pace = parsePaceMinPerKm(value)
      if (pace != null) return pace
    }

    if (target.type === 'heartRateZone') {
      const zone = parseInt(value.replace(/\D/g, ''), 10)
      const pace = paceFromHrZone(zone, preferences)
      if (pace != null) return pace
    }

    if (target.type === 'rpe') {
      const rpe = parseInt(value, 10)
      if (!Number.isNaN(rpe) && rpe >= 1 && rpe <= 10) {
        return paceFromRpe(rpe, preferences)
      }
      const keyword = paceFromKeywords(value, preferences)
      if (keyword != null) return keyword
    }

    const keyword = paceFromKeywords(value, preferences)
    if (keyword != null) return keyword
  }

  if (role === 'recovery') return pickPace('easy', preferences)
  if (role === 'continuous') return pickPace('easy', preferences)
  return pickPace('interval', preferences)
}

/** Resolve bike speed (km/h) from targets / zone keywords / role defaults. */
export function resolveSpeedKph(
  targets: Target[] | undefined,
  role: EstimationRole,
  preferences?: AthletePreferences | null,
): number {
  for (const target of targets ?? []) {
    const value = (target.value ?? '').trim()
    if (!value) continue

    if (target.type === 'speed') {
      const parsed = parseFloat(value.replace(/[^\d.]/g, ''))
      if (!Number.isNaN(parsed) && parsed > 0) return parsed
    }

    if (target.type === 'heartRateZone') {
      const zone = parseInt(value.replace(/\D/g, ''), 10)
      const speed = speedFromHrZone(zone, preferences)
      if (speed != null) return speed
    }

    if (target.type === 'rpe') {
      const rpe = parseInt(value, 10)
      if (!Number.isNaN(rpe) && rpe >= 1 && rpe <= 10) {
        return speedFromRpe(rpe, preferences)
      }
    }

    const keyword = speedFromKeywords(value, preferences)
    if (keyword != null) return keyword
  }

  if (role === 'recovery') return pickBikeSpeed('recovery', preferences)
  if (role === 'continuous') return pickBikeSpeed('easy', preferences)
  return pickBikeSpeed('interval', preferences)
}

function resolveTravelRate(
  targets: Target[] | undefined,
  role: EstimationRole,
  preferences: AthletePreferences | null | undefined,
  sportType?: WorkoutType | null,
): { kind: 'pace'; paceMinPerKm: number } | { kind: 'speed'; speedKph: number } {
  if (isBikeEstimationSport(sportType)) {
    return { kind: 'speed', speedKph: resolveSpeedKph(targets, role, preferences) }
  }
  return {
    kind: 'pace',
    paceMinPerKm:
      resolvePaceMinPerKm(targets, role, preferences) ?? FALLBACK_PACES.easy,
  }
}

export function segmentDurationMinutes(
  segment: Segment | undefined,
  paceMinPerKm: number | null,
  speedKph?: number | null,
): number {
  if (!segment || segment.value <= 0) return 0
  const fromTime = segmentToMinutes(segment)
  if (fromTime > 0) return fromTime
  if (segment.mode === 'distance') {
    const km = segmentDistanceKm(segment)
    if (km <= 0) return 0
    if (speedKph && speedKph > 0) return estimateDurationMinFromBikeSpeed(km, speedKph)
    if (paceMinPerKm && paceMinPerKm > 0) return km * paceMinPerKm
  }
  return 0
}

export function segmentDistanceKmEstimated(
  segment: Segment | undefined,
  paceMinPerKm: number | null,
  speedKph?: number | null,
): number {
  if (!segment || segment.value <= 0) return 0
  const fromDistance = segmentDistanceKm(segment)
  if (fromDistance > 0) return fromDistance
  const minutes = segmentToMinutes(segment)
  if (minutes > 0) {
    if (speedKph && speedKph > 0) return estimateDistanceKmFromBikeSpeed(minutes, speedKph)
    if (paceMinPerKm && paceMinPerKm > 0) return minutes / paceMinPerKm
  }
  return 0
}

export const DEFAULT_INTERVAL_WORK: Segment = {
  mode: 'distance',
  value: 1000,
  unit: 'm',
}

export const DEFAULT_INTERVAL_RECOVERY: Segment = {
  mode: 'time',
  value: 2,
  unit: 'min',
  description: 'jog',
}

export const DEFAULT_BIKE_INTERVAL_WORK: Segment = {
  mode: 'time',
  value: 5,
  unit: 'min',
}

export const DEFAULT_BIKE_INTERVAL_RECOVERY: Segment = {
  mode: 'time',
  value: 2,
  unit: 'min',
  description: 'easy spin',
}

function hasEstimableTargets(targets?: Target[]): boolean {
  return Boolean(targets?.some((t) => (t.value ?? '').trim()))
}

export function effectiveIntervalSegment(
  segment: Segment | undefined,
  role: 'work' | 'recovery',
  targets?: Target[],
  sportType?: WorkoutType | null,
): Segment | undefined {
  if (segment && segment.value > 0) return segment
  if (!hasEstimableTargets(targets)) return segment
  if (isBikeEstimationSport(sportType)) {
    return role === 'work' ? DEFAULT_BIKE_INTERVAL_WORK : DEFAULT_BIKE_INTERVAL_RECOVERY
  }
  return role === 'work' ? DEFAULT_INTERVAL_WORK : DEFAULT_INTERVAL_RECOVERY
}

export function intervalRepMinutes(
  block: WorkoutBlock,
  preferences?: AthletePreferences | null,
  sportType?: WorkoutType | null,
): { work: number; recovery: number } {
  const workSeg = effectiveIntervalSegment(block.work, 'work', block.targets, sportType)
  const workRate = resolveTravelRate(block.targets, 'work', preferences, sportType)
  const work = segmentDurationMinutes(
    workSeg,
    workRate.kind === 'pace' ? workRate.paceMinPerKm : null,
    workRate.kind === 'speed' ? workRate.speedKph : null,
  )

  const recoverySeg = effectiveIntervalSegment(
    block.recovery,
    'recovery',
    block.targets,
    sportType,
  )
  const recoveryRate = resolveTravelRate(
    [recoveryTarget(block.targets)],
    'recovery',
    preferences,
    sportType,
  )
  const recovery = segmentDurationMinutes(
    recoverySeg,
    recoveryRate.kind === 'pace' ? recoveryRate.paceMinPerKm : null,
    recoveryRate.kind === 'speed' ? recoveryRate.speedKph : null,
  )

  return { work, recovery }
}

export function estimateBlockDurationMinutes(
  block: WorkoutBlock,
  preferences?: AthletePreferences | null,
  sportType?: WorkoutType | null,
): number {
  const reps = block.repetitions ?? 1

  switch (block.type) {
    case 'CONTINUOUS':
    case 'RECOVERY':
    case 'PROGRESSIVE': {
      const targets =
        block.type === 'PROGRESSIVE'
          ? progressiveEstimationTargets(block)
          : block.targets
      if (block.durationType === 'distance') {
        const km =
          block.distanceUnit === 'm'
            ? (block.distance ?? 0) / 1000
            : block.distance ?? 0
        if (km <= 0) return 0
        const role = block.type === 'RECOVERY' ? 'recovery' : 'continuous'
        const rate = resolveTravelRate(targets, role, preferences, sportType)
        if (rate.kind === 'speed') return estimateDurationMinFromBikeSpeed(km, rate.speedKph)
        return km * rate.paceMinPerKm
      }
      return block.time ?? 0
    }
    case 'REST':
      return block.time ?? 0
    case 'INTERVAL': {
      const { work, recovery } = intervalRepMinutes(block, preferences, sportType)
      return reps * (work + recovery)
    }
    case 'REPETITION': {
      const rate = resolveTravelRate(block.targets, 'work', preferences, sportType)
      return (
        reps *
        segmentDurationMinutes(
          block.work,
          rate.kind === 'pace' ? rate.paceMinPerKm : null,
          rate.kind === 'speed' ? rate.speedKph : null,
        )
      )
    }
    default:
      return 0
  }
}

export function estimateStructureDurationMinutes(
  structure: WorkoutStructure,
  preferences?: AthletePreferences | null,
  sportType?: WorkoutType | null,
): number {
  let total = 0
  for (const block of [...structure.warmup, ...structure.mainSet, ...structure.cooldown]) {
    total += estimateBlockDurationMinutes(block, preferences, sportType)
  }
  return Math.round(total)
}

export function estimateBlockDistanceKm(
  block: WorkoutBlock,
  preferences?: AthletePreferences | null,
  sportType?: WorkoutType | null,
): number {
  const reps = block.repetitions ?? 1

  switch (block.type) {
    case 'CONTINUOUS':
    case 'RECOVERY':
    case 'PROGRESSIVE': {
      const targets =
        block.type === 'PROGRESSIVE'
          ? progressiveEstimationTargets(block)
          : block.targets
      if (block.durationType === 'distance') {
        const km =
          block.distanceUnit === 'm'
            ? (block.distance ?? 0) / 1000
            : block.distance ?? 0
        return km > 0 ? km : 0
      }
      const role = block.type === 'RECOVERY' ? 'recovery' : 'continuous'
      const rate = resolveTravelRate(targets, role, preferences, sportType)
      const minutes = block.time ?? 0
      if (minutes <= 0) return 0
      if (rate.kind === 'speed') return estimateDistanceKmFromBikeSpeed(minutes, rate.speedKph)
      return minutes / rate.paceMinPerKm
    }
    case 'REST':
      return 0
    case 'INTERVAL': {
      const workSeg = effectiveIntervalSegment(block.work, 'work', block.targets, sportType)
      const workRate = resolveTravelRate(block.targets, 'work', preferences, sportType)
      const workKm = segmentDistanceKmEstimated(
        workSeg,
        workRate.kind === 'pace' ? workRate.paceMinPerKm : null,
        workRate.kind === 'speed' ? workRate.speedKph : null,
      )

      const recoverySeg = effectiveIntervalSegment(
        block.recovery,
        'recovery',
        block.targets,
        sportType,
      )
      const recoveryRate = resolveTravelRate(
        [recoveryTarget(block.targets)],
        'recovery',
        preferences,
        sportType,
      )
      const recoveryKm = segmentDistanceKmEstimated(
        recoverySeg,
        recoveryRate.kind === 'pace' ? recoveryRate.paceMinPerKm : null,
        recoveryRate.kind === 'speed' ? recoveryRate.speedKph : null,
      )

      return reps * (workKm + recoveryKm)
    }
    case 'REPETITION': {
      const rate = resolveTravelRate(block.targets, 'work', preferences, sportType)
      const workSeg = effectiveIntervalSegment(block.work, 'work', block.targets, sportType)
      return (
        reps *
        segmentDistanceKmEstimated(
          workSeg,
          rate.kind === 'pace' ? rate.paceMinPerKm : null,
          rate.kind === 'speed' ? rate.speedKph : null,
        )
      )
    }
    default:
      return 0
  }
}

export function estimateStructureDistanceKm(
  structure: WorkoutStructure,
  preferences?: AthletePreferences | null,
  sportType?: WorkoutType | null,
): number {
  let total = 0
  for (const block of [...structure.warmup, ...structure.mainSet, ...structure.cooldown]) {
    total += estimateBlockDistanceKm(block, preferences, sportType)
  }
  return Math.round(total * 10) / 10
}

/** Work distance in the main set only (excludes warm-up, cool-down, and recovery jogs). */
export function estimateMainSetWorkDistanceKm(
  structure: WorkoutStructure,
  preferences?: AthletePreferences | null,
  sportType?: WorkoutType | null,
): number {
  let total = 0
  for (const block of structure.mainSet) {
    const reps = block.repetitions ?? 1
    switch (block.type) {
      case 'CONTINUOUS':
      case 'RECOVERY':
      case 'PROGRESSIVE': {
        total += estimateBlockDistanceKm(block, preferences, sportType)
        break
      }
      case 'INTERVAL': {
        const workSeg = effectiveIntervalSegment(block.work, 'work', block.targets, sportType)
        const workRate = resolveTravelRate(block.targets, 'work', preferences, sportType)
        total +=
          reps *
          segmentDistanceKmEstimated(
            workSeg,
            workRate.kind === 'pace' ? workRate.paceMinPerKm : null,
            workRate.kind === 'speed' ? workRate.speedKph : null,
          )
        break
      }
      case 'REPETITION': {
        const rate = resolveTravelRate(block.targets, 'work', preferences, sportType)
        const workSeg = effectiveIntervalSegment(block.work, 'work', block.targets, sportType)
        total +=
          reps *
          segmentDistanceKmEstimated(
            workSeg,
            rate.kind === 'pace' ? rate.paceMinPerKm : null,
            rate.kind === 'speed' ? rate.speedKph : null,
          )
        break
      }
      default:
        break
    }
  }
  return Math.round(total * 10) / 10
}

/** Estimate duration from distance using sport-appropriate athlete zones. */
export function estimateDurationMinutesFromDistanceKm(
  km: number,
  preferences?: AthletePreferences | null,
  sessionType?: SessionType | string,
  sportType?: WorkoutType | null,
): number {
  if (km <= 0) return 0
  if (sportType === SportEnum.SWIM) {
    const css = preferences?.swimCssSecPer100m
    if (typeof css === 'number' && css > 0) {
      return estimateSwimDurationMinFromCss(km * 1000, css)
    }
    return 0
  }
  if (isBikeEstimationSport(sportType)) {
    const speed = sessionType
      ? bikeSpeedKphForSessionType(sessionType, preferences)
      : pickBikeSpeed('easy', preferences)
    return estimateDurationMinFromBikeSpeed(km, speed)
  }
  const pace = sessionType
    ? paceMinPerKmForSessionType(sessionType, preferences)
    : (resolvePaceMinPerKm([{ type: 'rpe', value: 'Easy' }], 'continuous', preferences) ??
      FALLBACK_PACES.easy)
  return Math.round(km * pace)
}

/** Estimate distance from duration using sport-appropriate athlete zones. */
export function estimateDistanceKmFromDurationMinutes(
  minutes: number,
  preferences?: AthletePreferences | null,
  sessionType?: SessionType | string,
  sportType?: WorkoutType | null,
): number {
  if (minutes <= 0) return 0
  if (sportType === SportEnum.SWIM) {
    const css = preferences?.swimCssSecPer100m
    if (typeof css === 'number' && css > 0) {
      return Math.round((estimateSwimDistanceMetersFromCss(minutes, css) / 1000) * 10) / 10
    }
    return 0
  }
  if (isBikeEstimationSport(sportType)) {
    const speed = sessionType
      ? bikeSpeedKphForSessionType(sessionType, preferences)
      : pickBikeSpeed('easy', preferences)
    return estimateDistanceKmFromBikeSpeed(minutes, speed)
  }
  const pace = sessionType
    ? paceMinPerKmForSessionType(sessionType, preferences)
    : (resolvePaceMinPerKm([{ type: 'rpe', value: 'Easy' }], 'continuous', preferences) ??
      FALLBACK_PACES.easy)
  return Math.round((minutes / pace) * 10) / 10
}

export function resolvePlannedWorkoutMetrics({
  plannedDistance,
  plannedDuration,
  structure,
  preferences,
  sportUsesDistance,
  sessionType,
  sportType,
  allowPaceEstimate = true,
}: {
  plannedDistance?: number
  plannedDuration?: number
  structure?: WorkoutStructure | null
  preferences?: AthletePreferences | null
  sportUsesDistance: boolean
  sessionType?: string
  sportType?: WorkoutType | null
  /** When false, do not invent the missing duration/distance from pace/speed zones. */
  allowPaceEstimate?: boolean
}): { plannedDistance?: number; plannedDuration?: number } {
  let dist = plannedDistance
  let dur = plannedDuration

  const hasStructure =
    structure &&
    (structure.warmup.length > 0 || structure.mainSet.length > 0 || structure.cooldown.length > 0)

  if (hasStructure && structure) {
    const estDist = estimateStructureDistanceKm(structure, preferences, sportType)
    const estDur = estimateStructureDurationMinutes(structure, preferences, sportType)
    if (estDist > 0) dist = dist ?? estDist
    if (estDur > 0) dur = dur ?? estDur
  }

  if (allowPaceEstimate && sportUsesDistance && dist && !dur) {
    const derived = estimateDurationMinutesFromDistanceKm(
      dist,
      preferences,
      sessionType,
      sportType,
    )
    if (derived > 0) dur = derived
  }
  if (allowPaceEstimate && sportUsesDistance && dur && !dist) {
    const derived = estimateDistanceKmFromDurationMinutes(
      dur,
      preferences,
      sessionType,
      sportType,
    )
    if (derived > 0) dist = derived
  }

  return {
    plannedDistance: dist && dist > 0 ? dist : undefined,
    plannedDuration: dur && dur > 0 ? dur : undefined,
  }
}

export function formatSegmentDurationLabel(minutes: number): string {
  if (minutes <= 0) return ''
  const totalSecs = Math.round(minutes * 60)
  const mins = Math.floor(totalSecs / 60)
  const secs = totalSecs % 60
  if (mins === 0) return `${secs}s`
  if (secs === 0) return `${mins} min`
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function describeEstimatedSegment(
  segment: Segment | undefined,
  role: 'work' | 'recovery',
  targets: Target[] | undefined,
  preferences?: AthletePreferences | null,
  sportType?: WorkoutType | null,
): string | null {
  const effective = effectiveIntervalSegment(segment, role, targets, sportType)
  if (!effective) return null

  const rate = resolveTravelRate(
    role === 'recovery' ? [recoveryTarget(targets)] : targets,
    role,
    preferences,
    sportType,
  )
  const minutes = segmentDurationMinutes(
    effective,
    rate.kind === 'pace' ? rate.paceMinPerKm : null,
    rate.kind === 'speed' ? rate.speedKph : null,
  )
  if (minutes <= 0) return null

  const isInferred = !segment || segment.value <= 0
  const duration = formatSegmentDurationLabel(minutes)
  const rateLabel =
    rate.kind === 'pace'
      ? `${formatPaceMinPerKm(rate.paceMinPerKm)}/km`
      : `${Math.round(rate.speedKph)} km/h`

  if (isInferred) {
    return `~${duration} (default ${formatSegment(effective)} @ ${rateLabel})`
  }
  if (segment!.mode === 'distance') {
    return `~${duration} at ${rateLabel}`
  }
  return `~${duration}`
}

export function formatIntervalBlockSummary(
  block: WorkoutBlock,
  sportType?: WorkoutType | null,
): string {
  const sport = sportType ?? 'RUN'
  const work = formatSegment(
    effectiveIntervalSegment(block.work, 'work', block.targets, sportType),
  )
  const recovery = formatIntervalRecoveryLabel(
    effectiveIntervalSegment(block.recovery, 'recovery', block.targets, sportType),
    block.targets,
    sport,
  )
  const workTarget = block.targets?.[0]
  const workLabel = workTarget ? formatTargets([workTarget]) : ''
  const reps = block.repetitions ?? 1

  if (!work && !workLabel) return `${reps} x interval`

  const main = work
    ? `${reps} x ${work}${workLabel ? ` @ ${workLabel}` : ''}`
    : `${reps} x ${workLabel}`

  if (!recovery) return main
  return `${main} · ${recovery} rest`
}

export function formatPlanBlockSummary(
  block: WorkoutBlock,
  sportType?: WorkoutType | null,
): string {
  if (block.type === 'INTERVAL') return formatIntervalBlockSummary(block, sportType)
  return formatBlockSummary(block)
}
