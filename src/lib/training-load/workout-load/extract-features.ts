import type { SessionType, WorkoutType } from '@prisma/client'
import type {
  Target,
  WorkoutBlock,
  WorkoutIncludeItem,
  WorkoutStructure,
} from '@/lib/workout-builder/types'
import {
  estimateBlockDurationMinutes,
  FALLBACK_PACES,
  intervalRepMinutes,
  segmentDistanceKmEstimated,
  segmentDurationMinutes,
} from '@/lib/workout-builder/segment-estimation'
import { progressiveMidpointTarget } from '@/lib/workout-builder/progressive'
import { hasStructureContent } from '@/lib/workout-builder/utils'
import {
  intensityBandFromTarget,
  intensityBandFromText,
} from '@/lib/training-load/workout-load/intensity-band'
import {
  SURFACE_FACTOR,
  TERRAIN_FACTOR,
} from '@/lib/training-load/workout-load/coefficients'
import type {
  AthleteLoadProfile,
  IntensityBand,
  RawWorkoutFeatures,
  SurfaceKind,
  TerrainKind,
  WorkoutLoadInput,
} from '@/lib/training-load/workout-load/types'

type Acc = {
  durationMin: number
  distanceKm: number
  byBandMin: Record<IntensityBand, number>
  byBandKm: Record<IntensityBand, number>
  repetitions: number
  accelerations: number
  strides: number
  hillRepetitions: number
}

function emptyBands(): Record<IntensityBand, number> {
  return {
    RECOVERY: 0,
    EASY: 0,
    STEADY: 0,
    TEMPO: 0,
    THRESHOLD: 0,
    HM_PACE: 0,
    MARATHON_PACE: 0,
    VO2: 0,
    SPEED: 0,
    SPRINT: 0,
  }
}

function paceForBand(band: IntensityBand): number {
  switch (band) {
    case 'RECOVERY':
      return FALLBACK_PACES.recovery
    case 'EASY':
    case 'STEADY':
      return FALLBACK_PACES.easy
    case 'TEMPO':
    case 'MARATHON_PACE':
      return FALLBACK_PACES.tempo
    case 'THRESHOLD':
    case 'HM_PACE':
      return FALLBACK_PACES.threshold
    case 'VO2':
    case 'SPEED':
    case 'SPRINT':
      return FALLBACK_PACES.vo2max
  }
}

function addPiece(
  acc: Acc,
  minutes: number,
  km: number,
  band: IntensityBand,
) {
  if (!(minutes > 0) && !(km > 0)) return
  let min = minutes
  let dist = km
  if (min <= 0 && dist > 0) {
    min = dist * paceForBand(band)
  }
  if (dist <= 0 && min > 0) {
    dist = min / paceForBand(band)
  }
  acc.durationMin += min
  acc.distanceKm += dist
  acc.byBandMin[band] += min
  acc.byBandKm[band] += dist
}

function sectionFallback(
  section: 'warmup' | 'mainSet' | 'cooldown',
  sessionType: SessionType,
): IntensityBand {
  if (section === 'warmup' || section === 'cooldown') return 'EASY'
  switch (sessionType) {
    case 'RECOVERY_RUN':
      return 'RECOVERY'
    case 'EASY_RUN':
    case 'LONG_RUN':
      return 'EASY'
    case 'TEMPO':
    case 'FARTLEK':
      return 'TEMPO'
    case 'THRESHOLD':
      return 'THRESHOLD'
    case 'VO2_MAX':
    case 'INTERVALS':
    case 'HILL_REPEATS':
      return 'VO2'
    case 'RACE_PACE':
      return 'HM_PACE'
    default:
      return 'EASY'
  }
}

function workBand(
  targets: Target[] | undefined,
  fallback: IntensityBand,
): IntensityBand {
  return intensityBandFromTarget(targets?.[0], fallback)
}

function recoveryBand(targets: Target[] | undefined): IntensityBand {
  return intensityBandFromTarget(targets?.[1], 'RECOVERY')
}

function addBlock(
  acc: Acc,
  block: WorkoutBlock,
  section: 'warmup' | 'mainSet' | 'cooldown',
  sport: WorkoutType,
  sessionType: SessionType,
) {
  const name = (block.name ?? '').toLowerCase()
  const bookend =
    section === 'warmup' ||
    section === 'cooldown' ||
    name.includes('warm') ||
    name.includes('cool')
  let fallback = bookend
    ? 'EASY'
    : block.type === 'RECOVERY' || block.type === 'REST'
      ? 'RECOVERY'
      : sectionFallback(section, sessionType)

  if (name.includes('threshold') || name.includes('tempo')) {
    fallback = name.includes('tempo') ? 'TEMPO' : 'THRESHOLD'
  }
  if (/\bhm\b|half/.test(name)) fallback = 'HM_PACE'
  if (/marathon|\bmp\b/.test(name)) fallback = 'MARATHON_PACE'
  if (/vo2|vo₂/.test(name)) fallback = 'VO2'

  if (block.type === 'INTERVAL' || block.type === 'REPETITION') {
    const reps = Math.max(1, block.repetitions ?? 1)
    const { work, recovery } = intervalRepMinutes(block, null, sport)
    const wBand = workBand(block.targets, fallback)
    const rBand = recoveryBand(block.targets)
    const workKm =
      block.work != null
        ? segmentDistanceKmEstimated(block.work, paceForBand(wBand)) * reps
        : 0
    const recKm =
      block.recovery != null
        ? segmentDistanceKmEstimated(block.recovery, paceForBand(rBand)) *
          Math.max(0, reps - 1)
        : 0
    addPiece(acc, reps * work, workKm, wBand)
    addPiece(acc, Math.max(0, reps - 1) * recovery, recKm, rBand)
    acc.repetitions += reps
    if (wBand === 'SPEED' || wBand === 'SPRINT' || wBand === 'VO2') {
      acc.accelerations += reps
    }
    return
  }

  if (block.type === 'PROGRESSIVE') {
    const mid = progressiveMidpointTarget(block)
    const band = intensityBandFromTarget(mid ?? block.targets?.[0], 'STEADY')
    const minutes = estimateBlockDurationMinutes(block, null, sport)
    const km =
      typeof block.distance === 'number' && block.distance > 0
        ? block.distanceUnit === 'm'
          ? block.distance / 1000
          : block.distance
        : minutes / paceForBand(band)
    addPiece(acc, minutes, km, band)
    return
  }

  const band = workBand(block.targets, fallback)
  const minutes = estimateBlockDurationMinutes(block, null, sport)
  let km = 0
  if (typeof block.distance === 'number' && block.distance > 0) {
    km = block.distanceUnit === 'm' ? block.distance / 1000 : block.distance
  } else if (block.work) {
    km = segmentDistanceKmEstimated(block.work, paceForBand(band))
  } else if (minutes > 0) {
    km = minutes / paceForBand(band)
  }
  addPiece(acc, minutes, km, band)
}

function addInclude(acc: Acc, item: WorkoutIncludeItem) {
  const reps = Math.max(1, item.repetitions ?? 1)
  const workBand: IntensityBand =
    item.kind === 'hill_sprint'
      ? 'SPRINT'
      : item.kind === 'strides' || item.kind === 'pickup'
        ? 'SPEED'
        : item.kind === 'drill'
          ? 'EASY'
          : intensityBandFromText(item.title, 'SPEED')
  const workMin = segmentDurationMinutes(item.work, paceForBand(workBand))
  const workKm = segmentDistanceKmEstimated(item.work, paceForBand(workBand))
  const recMin = item.recovery
    ? segmentDurationMinutes(item.recovery, FALLBACK_PACES.recovery)
    : 0
  const recKm = item.recovery
    ? segmentDistanceKmEstimated(item.recovery, FALLBACK_PACES.recovery)
    : 0
  addPiece(acc, reps * workMin, reps * workKm, workBand)
  addPiece(acc, Math.max(0, reps - 1) * recMin, Math.max(0, reps - 1) * recKm, 'RECOVERY')
  acc.repetitions += reps
  if (item.kind === 'strides' || item.kind === 'pickup') {
    acc.strides += reps
    acc.accelerations += reps
  }
  if (item.kind === 'hill_sprint') {
    acc.hillRepetitions += reps
    acc.accelerations += reps
  }
}

function emptyFeatures(
  sport: WorkoutType,
  sessionType: SessionType,
): RawWorkoutFeatures {
  return {
    durationMin: 0,
    distanceKm: 0,
    easyMin: 0,
    recoveryMin: 0,
    steadyMin: 0,
    tempoMin: 0,
    thresholdMin: 0,
    vo2Min: 0,
    speedMin: 0,
    sprintMin: 0,
    racePaceMin: 0,
    marathonPaceMin: 0,
    hmPaceMin: 0,
    easyKm: 0,
    recoveryKm: 0,
    steadyKm: 0,
    tempoKm: 0,
    thresholdKm: 0,
    vo2Km: 0,
    speedKm: 0,
    racePaceKm: 0,
    elevationGainM: 0,
    elevationLossM: 0,
    repetitions: 0,
    accelerations: 0,
    strides: 0,
    hillRepetitions: 0,
    strengthVolume: 0,
    jumps: 0,
    surfaceFactor: SURFACE_FACTOR.ROAD,
    terrainFactor: TERRAIN_FACTOR.FLAT,
    sport,
    sessionType,
    raceSpecific: false,
  }
}

function finalize(
  acc: Acc,
  sport: WorkoutType,
  sessionType: SessionType,
  athlete: AthleteLoadProfile | null | undefined,
  tags: string[],
  title: string,
): RawWorkoutFeatures {
  const surface: SurfaceKind = athlete?.surface ?? 'ROAD'
  const terrain: TerrainKind = athlete?.terrain ?? 'FLAT'
  const hm = acc.byBandMin.HM_PACE
  const mp = acc.byBandMin.MARATHON_PACE
  const raceSpecific =
    tags.some((t) => /hm-specific|mp-specific|race-pace|race-day/i.test(t)) ||
    /hm|marathon|race/i.test(title) ||
    hm + mp > 0

  return {
    durationMin: Math.round(acc.durationMin * 10) / 10,
    distanceKm: Math.round(acc.distanceKm * 100) / 100,
    easyMin: acc.byBandMin.EASY,
    recoveryMin: acc.byBandMin.RECOVERY,
    steadyMin: acc.byBandMin.STEADY,
    tempoMin: acc.byBandMin.TEMPO,
    thresholdMin: acc.byBandMin.THRESHOLD,
    vo2Min: acc.byBandMin.VO2,
    speedMin: acc.byBandMin.SPEED,
    sprintMin: acc.byBandMin.SPRINT,
    racePaceMin: hm + mp,
    marathonPaceMin: mp,
    hmPaceMin: hm,
    easyKm: acc.byBandKm.EASY,
    recoveryKm: acc.byBandKm.RECOVERY,
    steadyKm: acc.byBandKm.STEADY,
    tempoKm: acc.byBandKm.TEMPO,
    thresholdKm: acc.byBandKm.THRESHOLD,
    vo2Km: acc.byBandKm.VO2,
    speedKm: acc.byBandKm.SPEED + acc.byBandKm.SPRINT,
    racePaceKm: acc.byBandKm.HM_PACE + acc.byBandKm.MARATHON_PACE,
    elevationGainM: athlete?.elevationGainM ?? 0,
    elevationLossM: athlete?.elevationLossM ?? 0,
    repetitions: acc.repetitions,
    accelerations: acc.accelerations,
    strides: acc.strides,
    hillRepetitions: acc.hillRepetitions,
    strengthVolume: 0,
    jumps: 0,
    surfaceFactor: SURFACE_FACTOR[surface],
    terrainFactor: TERRAIN_FACTOR[terrain],
    sport,
    sessionType,
    raceSpecific,
  }
}

/**
 * Derive raw load features from builder structure (source of truth).
 * Falls back to planned duration/distance + session type when structure is empty.
 */
export function extractRawFeatures(input: WorkoutLoadInput): RawWorkoutFeatures {
  const sport = input.sport
  const sessionType = input.sessionType
  const tags = input.tags ?? []
  const title = input.title ?? ''
  const athlete = input.athlete

  if (hasStructureContent(input.structure ?? null)) {
    const structure = input.structure as WorkoutStructure
    const acc: Acc = {
      durationMin: 0,
      distanceKm: 0,
      byBandMin: emptyBands(),
      byBandKm: emptyBands(),
      repetitions: 0,
      accelerations: 0,
      strides: 0,
      hillRepetitions: 0,
    }
    for (const block of structure.warmup) {
      addBlock(acc, block, 'warmup', sport, sessionType)
    }
    for (const block of structure.mainSet) {
      addBlock(acc, block, 'mainSet', sport, sessionType)
    }
    for (const block of structure.cooldown) {
      addBlock(acc, block, 'cooldown', sport, sessionType)
    }
    for (const item of structure.includeItems ?? []) {
      addInclude(acc, item)
    }
    return finalize(acc, sport, sessionType, athlete, tags, title)
  }

  // Flat fallback: treat whole session as one intensity band.
  const band = sectionFallback('mainSet', sessionType)
  const duration =
    input.plannedDurationMin && input.plannedDurationMin > 0
      ? input.plannedDurationMin
      : 45
  const distance =
    input.plannedDistanceKm && input.plannedDistanceKm > 0
      ? input.plannedDistanceKm
      : duration / paceForBand(band)
  const acc: Acc = {
    durationMin: 0,
    distanceKm: 0,
    byBandMin: emptyBands(),
    byBandKm: emptyBands(),
    repetitions: 0,
    accelerations: 0,
    strides: 0,
    hillRepetitions: 0,
  }
  addPiece(acc, duration, distance, band)
  return finalize(acc, sport, sessionType, athlete, tags, title)
}

/** Build features from an explicit intensity distribution (tests / tooling). */
export function featuresFromDistribution(args: {
  sport: WorkoutType
  sessionType: SessionType
  pieces: Array<{ band: IntensityBand; minutes: number; km?: number }>
  tags?: string[]
  title?: string
  athlete?: AthleteLoadProfile | null
}): RawWorkoutFeatures {
  const acc: Acc = {
    durationMin: 0,
    distanceKm: 0,
    byBandMin: emptyBands(),
    byBandKm: emptyBands(),
    repetitions: 0,
    accelerations: 0,
    strides: 0,
    hillRepetitions: 0,
  }
  for (const p of args.pieces) {
    addPiece(acc, p.minutes, p.km ?? 0, p.band)
  }
  return finalize(
    acc,
    args.sport,
    args.sessionType,
    args.athlete,
    args.tags ?? [],
    args.title ?? '',
  )
}
