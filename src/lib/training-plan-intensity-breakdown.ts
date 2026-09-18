import { SessionType, WorkoutType } from '@prisma/client'
import type { TrainingPlanSessionDetail } from '@/lib/training-plan'
import {
  parseFtpPercent,
  parsePaceMinPerKm,
} from '@/lib/athlete-preferences'
import {
  ftpPercentToZoneId,
  toAthleteIntensityPrefZone,
  zoneIdFromZIndex,
  type IntensityZoneBounds,
  type IntensityZoneDef,
  resolveIntensityZones,
  INTENSITY_ZONE_RANK,
} from '@/lib/intensity-zones'
import {
  estimateBlockDurationMinutes,
  intervalRepMinutes,
} from '@/lib/workout-builder/segment-estimation'
import {
  intensityZonesFromText,
  type IntensityPrefZone,
} from '@/lib/workout-builder/missing-intensity-prefs'
import type { Target, WorkoutBlock, WorkoutStructure } from '@/lib/workout-builder/types'
import {
  hasStructureContent,
  parseStructure,
} from '@/lib/workout-builder/utils'
import { flattenStructure } from '@/lib/workout-builder/structure-list'
import { recoveryTarget } from '@/lib/workout-builder/target-helpers'

/** Buckets shown in plan week stats for Bike / Run. */
export type PlanIntensityBucket = 'easy' | 'tempo' | 'threshold' | 'vo2max'

export type PlanIntensityBreakdown = Record<PlanIntensityBucket, number>

export const PLAN_INTENSITY_BUCKETS: PlanIntensityBucket[] = [
  'easy',
  'tempo',
  'threshold',
  'vo2max',
]

export const PLAN_INTENSITY_BUCKET_LABEL: Record<PlanIntensityBucket, string> = {
  easy: 'Easy',
  tempo: 'Tempo',
  threshold: 'Threshold',
  vo2max: 'VO₂',
}

/**
 * Bike power zones as % FTP → intensity zone (coach bands or defaults).
 * Recovery <55% · Easy 55–75% · Tempo 76–90% · Threshold 91–105% ·
 * VO₂max 106–120% · Anaerobic >120% (folds to VO₂ in week-stats).
 */
export function bikeFtpPercentToIntensityZone(
  pct: number,
  zones?: IntensityZoneDef[] | IntensityZoneBounds | null,
): IntensityPrefZone {
  const resolved =
    Array.isArray(zones)
      ? zones
      : resolveIntensityZones(zones ?? undefined)
  return toAthleteIntensityPrefZone(ftpPercentToZoneId(pct, resolved))
}

const ZONE_RANK: Record<IntensityPrefZone, number> = {
  recovery: INTENSITY_ZONE_RANK.recovery,
  easy: INTENSITY_ZONE_RANK.easy,
  tempo: INTENSITY_ZONE_RANK.tempo,
  threshold: INTENSITY_ZONE_RANK.threshold,
  vo2max: INTENSITY_ZONE_RANK.vo2max,
}

function emptyBreakdown(): PlanIntensityBreakdown {
  return { easy: 0, tempo: 0, threshold: 0, vo2max: 0 }
}

/** Recovery folds into Easy; Anaerobic folds into VO₂ for week-stats display. */
export function toPlanIntensityBucket(
  zone: IntensityPrefZone | null | undefined,
): PlanIntensityBucket {
  if (!zone || zone === 'recovery' || zone === 'easy') return 'easy'
  return zone
}

/** Rough pace (min/km) → zone when athlete prefs are unavailable. */
function paceMinPerKmToZone(minPerKm: number): IntensityPrefZone {
  if (minPerKm <= 4.0) return 'vo2max'
  if (minPerKm <= 4.5) return 'threshold'
  if (minPerKm <= 5.5) return 'tempo'
  if (minPerKm <= 6.75) return 'easy'
  return 'recovery'
}

/** Rough bike watts → zone without FTP context. */
function wattsToZone(watts: number): IntensityPrefZone {
  if (watts >= 280) return 'vo2max'
  if (watts >= 240) return 'threshold'
  if (watts >= 200) return 'tempo'
  if (watts >= 160) return 'easy'
  return 'recovery'
}

/** Hardest zone wins when a target mentions several. */
export function primaryZoneFromText(
  value: string,
  zones?: IntensityZoneDef[] | IntensityZoneBounds | null,
): IntensityPrefZone | null {
  // Prefer explicit % FTP when present (e.g. "88% FTP", "95%").
  const pct = parseFtpPercent(value)
  if (pct != null) return bikeFtpPercentToIntensityZone(pct, zones)

  const found = intensityZonesFromText(value)
  if (found.length === 0) return null
  return found.reduce((best, z) =>
    ZONE_RANK[z] > ZONE_RANK[best] ? z : best,
  )
}

function zoneFromTarget(
  target: Target | undefined | null,
  sportType?: WorkoutType | null,
  zones?: IntensityZoneDef[] | IntensityZoneBounds | null,
): IntensityPrefZone | null {
  if (!target) return null
  const value = (target.value ?? '').trim()
  if (!value) return null

  // Bike powerZone stores % FTP (e.g. "85"), not Z1–Z6.
  if (target.type === 'powerZone') {
    const pct =
      parseFtpPercent(value) ?? parseFloat(value.replace(/[^\d.]/g, ''))
    if (Number.isFinite(pct) && pct > 0) {
      return bikeFtpPercentToIntensityZone(pct, zones)
    }
  }

  // Absolute watts text that includes "% FTP", or bare percent on bike.
  if (target.type === 'power' || sportType === WorkoutType.BIKE) {
    const pct = parseFtpPercent(value)
    if (pct != null) return bikeFtpPercentToIntensityZone(pct, zones)
  }

  if (target.type === 'heartRateZone') {
    const n = parseInt(value.replace(/\D/g, ''), 10)
    const id = zoneIdFromZIndex(n)
    if (id) return toAthleteIntensityPrefZone(id)
  }

  if (target.type === 'rpe') {
    const rpe = parseInt(value, 10)
    if (!Number.isNaN(rpe)) {
      if (rpe <= 2) return 'recovery'
      if (rpe <= 4) return 'easy'
      if (rpe <= 6) return 'tempo'
      if (rpe <= 8) return 'threshold'
      return 'vo2max'
    }
  }

  // Keywords first (Threshold, Easy, Z3, …).
  const fromText = primaryZoneFromText(value, zones)
  if (fromText) return fromText

  // Absolute pace / watts when labels are missing (common interval defaults).
  if (
    target.type === 'pace' ||
    /\/\s*km/i.test(value) ||
    /^\d{1,2}:\d{1,2}/.test(value)
  ) {
    const pace = parsePaceMinPerKm(value)
    if (pace != null) return paceMinPerKmToZone(pace)
  }

  if (target.type === 'power') {
    const watts = parseFloat(value.replace(/[^\d.]/g, ''))
    if (Number.isFinite(watts) && watts > 0) return wattsToZone(watts)
  }

  if (target.type === 'heartRate') {
    const hr = parseFloat(value.replace(/\D/g, ''))
    if (Number.isFinite(hr) && hr > 40) {
      if (hr >= 175) return 'vo2max'
      if (hr >= 165) return 'threshold'
      if (hr >= 150) return 'tempo'
      if (hr >= 135) return 'easy'
      return 'recovery'
    }
  }

  return null
}

/** Work intensity only — never mix in interval recovery targets. */
function zoneFromWorkTargets(
  targets: Target[] | undefined,
  sportType?: WorkoutType | null,
  zones?: IntensityZoneDef[] | IntensityZoneBounds | null,
): IntensityPrefZone | null {
  return zoneFromTarget(targets?.[0], sportType, zones)
}

function zoneFromRecoverySide(
  block: WorkoutBlock,
  sportType?: WorkoutType | null,
  zones?: IntensityZoneDef[] | IntensityZoneBounds | null,
): IntensityPrefZone {
  const fromTarget = zoneFromTarget(
    recoveryTarget(block.targets, sportType ?? WorkoutType.RUN),
    sportType,
    zones,
  )
  if (fromTarget) return fromTarget

  const description = block.recovery?.description?.trim() ?? ''
  if (description) {
    const fromDesc = primaryZoneFromText(description, zones)
    if (fromDesc) return fromDesc
    const lower = description.toLowerCase()
    if (
      lower.includes('walk') ||
      lower.includes('stand') ||
      lower.includes('jog') ||
      lower.includes('spin')
    ) {
      return 'recovery'
    }
  }

  return 'easy'
}

function zoneFromTargets(
  targets: Target[] | undefined,
  sportType?: WorkoutType | null,
  zones?: IntensityZoneDef[] | IntensityZoneBounds | null,
): IntensityPrefZone | null {
  if (!targets?.length) return null
  let best: IntensityPrefZone | null = null
  for (const t of targets) {
    const z = zoneFromTarget(t, sportType, zones)
    if (!z) continue
    if (!best || ZONE_RANK[z] > ZONE_RANK[best]) best = z
  }
  return best
}

export function sessionTypeIntensityZone(
  sessionType: SessionType | string,
): IntensityPrefZone {
  switch (sessionType) {
    case SessionType.RECOVERY_RUN:
      return 'recovery'
    case SessionType.EASY_RUN:
    case SessionType.LONG_RUN:
    case SessionType.CROSS_TRAINING:
      return 'easy'
    case SessionType.TEMPO:
    case SessionType.FARTLEK:
      return 'tempo'
    case SessionType.THRESHOLD:
    case SessionType.RACE_PACE:
    case SessionType.HILL_REPEATS:
    case SessionType.BRICK:
      return 'threshold'
    case SessionType.VO2_MAX:
    case SessionType.INTERVALS:
      return 'vo2max'
    default:
      return 'easy'
  }
}

function addMinutes(
  into: PlanIntensityBreakdown,
  bucket: PlanIntensityBucket,
  minutes: number,
) {
  if (minutes <= 0) return
  into[bucket] += minutes
}

/**
 * Interval work vs recovery must be attributed separately. Recovery (easy jog /
 * spin) must never inherit the work interval's hard zone.
 */
function classifyIntervalBlock(
  block: WorkoutBlock,
  sportType: WorkoutType,
  into: PlanIntensityBreakdown,
) {
  const reps = block.repetitions ?? 1
  const { work, recovery } = intervalRepMinutes(block, null, sportType)

  const workZone =
    zoneFromWorkTargets(block.targets, sportType) ??
    primaryZoneFromText(block.name ?? '') ??
    'threshold'

  const recoveryZone = zoneFromRecoverySide(block, sportType)

  addMinutes(into, toPlanIntensityBucket(workZone), reps * work)
  addMinutes(into, toPlanIntensityBucket(recoveryZone), reps * recovery)
}

function classifyBlock(
  block: WorkoutBlock,
  sportType: WorkoutType,
  into: PlanIntensityBreakdown,
) {
  const name = (block.name ?? '').toLowerCase()

  if (block.type === 'REST') {
    addMinutes(into, 'easy', block.time ?? 0)
    return
  }

  if (block.type === 'RECOVERY') {
    addMinutes(
      into,
      'easy',
      estimateBlockDurationMinutes(block, null, sportType),
    )
    return
  }

  if (block.type === 'INTERVAL') {
    classifyIntervalBlock(block, sportType, into)
    return
  }

  if (block.type === 'REPETITION') {
    const minutes = estimateBlockDurationMinutes(block, null, sportType)
    const workZone =
      zoneFromWorkTargets(block.targets, sportType) ??
      primaryZoneFromText(block.name ?? '') ??
      'threshold'
    addMinutes(into, toPlanIntensityBucket(workZone), minutes)
    return
  }

  // CONTINUOUS / PROGRESSIVE / FREE_TEXT
  const minutes = estimateBlockDurationMinutes(block, null, sportType)
  if (minutes <= 0 && block.type === 'FREE_TEXT') return

  // Warm-up / cool-down bookends stay easy even when stored in mainSet.
  if (name.includes('warm') || name.includes('cool')) {
    addMinutes(into, 'easy', minutes)
    return
  }

  const zone =
    zoneFromTargets(block.targets, sportType) ??
    zoneFromTarget(block.startIntensity, sportType) ??
    zoneFromTarget(block.endIntensity, sportType) ??
    primaryZoneFromText(block.name ?? '') ??
    (block.type === 'PROGRESSIVE' ? 'tempo' : 'easy')

  addMinutes(into, toPlanIntensityBucket(zone), minutes)
}

function breakdownFromStructure(
  structure: WorkoutStructure,
  sportType: WorkoutType,
): PlanIntensityBreakdown {
  const into = emptyBreakdown()
  for (const { block } of flattenStructure(structure)) {
    classifyBlock(block, sportType, into)
  }
  return into
}

function scaleBreakdown(
  breakdown: PlanIntensityBreakdown,
  factor: number,
): PlanIntensityBreakdown {
  if (factor === 1) return breakdown
  return {
    easy: breakdown.easy * factor,
    tempo: breakdown.tempo * factor,
    threshold: breakdown.threshold * factor,
    vo2max: breakdown.vo2max * factor,
  }
}

export function totalBreakdownMinutes(b: PlanIntensityBreakdown): number {
  return b.easy + b.tempo + b.threshold + b.vo2max
}

/** Tempo + Threshold + VO₂ — everything that is not easy/recovery. */
export function intensityMinutes(b: PlanIntensityBreakdown): number {
  return b.tempo + b.threshold + b.vo2max
}

export function mergeBreakdowns(
  ...parts: PlanIntensityBreakdown[]
): PlanIntensityBreakdown {
  const out = emptyBreakdown()
  for (const p of parts) {
    out.easy += p.easy
    out.tempo += p.tempo
    out.threshold += p.threshold
    out.vo2max += p.vo2max
  }
  return out
}

/**
 * When structure is missing, interval-style session types still include a lot of
 * easy time (WU / recovery / CD). Do not dump 100% into the hard zone.
 */
function breakdownFromSessionType(
  sessionType: SessionType | string,
  minutes: number,
): PlanIntensityBreakdown {
  const into = emptyBreakdown()
  if (minutes <= 0) return into

  switch (sessionType) {
    case SessionType.INTERVALS:
    case SessionType.VO2_MAX:
    case SessionType.HILL_REPEATS: {
      const hard = sessionTypeIntensityZone(sessionType)
      addMinutes(into, toPlanIntensityBucket(hard), minutes * 0.45)
      addMinutes(into, 'easy', minutes * 0.55)
      return into
    }
    case SessionType.FARTLEK: {
      addMinutes(into, 'tempo', minutes * 0.4)
      addMinutes(into, 'easy', minutes * 0.6)
      return into
    }
    default: {
      addMinutes(
        into,
        toPlanIntensityBucket(sessionTypeIntensityZone(sessionType)),
        minutes,
      )
      return into
    }
  }
}

/**
 * Attribute planned minutes for a Bike/Run session across Easy / Tempo /
 * Threshold / VO₂. Structure blocks win when present; otherwise session type.
 */
export function sessionIntensityBreakdown(
  session: Pick<
    TrainingPlanSessionDetail,
    'type' | 'sessionType' | 'structure' | 'plannedDuration'
  >,
): PlanIntensityBreakdown {
  if (session.type !== WorkoutType.RUN && session.type !== WorkoutType.BIKE) {
    return emptyBreakdown()
  }

  const planned =
    session.plannedDuration != null && session.plannedDuration > 0
      ? session.plannedDuration
      : 0

  let structure: WorkoutStructure | null = null
  if (session.structure) {
    try {
      structure = parseStructure(session.structure)
    } catch {
      structure = null
    }
  }

  if (structure && hasStructureContent(structure)) {
    const fromBlocks = breakdownFromStructure(structure, session.type)
    const attributed = totalBreakdownMinutes(fromBlocks)
    if (attributed > 0) {
      // Scale to planned duration when both exist so week totals match the hero time.
      if (planned > 0 && Math.abs(attributed - planned) / planned > 0.15) {
        return scaleBreakdown(fromBlocks, planned / attributed)
      }
      return fromBlocks
    }
  }

  return breakdownFromSessionType(
    (session.sessionType as SessionType) || SessionType.CUSTOM,
    planned,
  )
}

export function sessionsIntensityBreakdown(
  sessions: Pick<
    TrainingPlanSessionDetail,
    'type' | 'sessionType' | 'structure' | 'plannedDuration'
  >[],
): PlanIntensityBreakdown {
  return mergeBreakdowns(...sessions.map(sessionIntensityBreakdown))
}

export function formatBreakdownMinutes(minutes: number): string {
  if (minutes <= 0) return '0′'
  const rounded = Math.round(minutes)
  if (rounded < 60) return `${rounded}′`
  const h = Math.floor(rounded / 60)
  const m = rounded % 60
  if (m === 0) return `${h}h`
  return `${h}h ${m}′`
}
