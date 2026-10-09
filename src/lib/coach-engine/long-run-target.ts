/**
 * Long-run engine: distance + intensity profile from athlete context.
 * Structure samples are scaled to preferredKm — catalog km is not the source of truth.
 *
 * Marathon durability: peak long-run is a planning target by athlete level, then
 * constrained by recent longest run, weekly volume, and safe week-to-week progression.
 * Cross-training can add CV load but must not replace key marathon running longs.
 */
import type { AthleteLevel, GoalProfile } from '@/lib/coach-engine/types'
import {
  determinePreparationPathway,
  type PreparationDepth,
} from '@/lib/coach-engine/preparation-roadmap'

export type LongIntensityProfile =
  | 'aerobic'
  | 'steady_finish'
  | 'progressive'
  | 'race_specific'
  | 'fast_finish'

export type LongRunRangeKm = {
  base: number
  peak: number
}

export type LongRunTarget = {
  preferredKm: number
  minKm: number
  maxKm: number
  intensityProfile: LongIntensityProfile
  /** Share of weekly target this long represents. */
  weeklyRatio: number
}

/** Planning defaults for marathon long-run durability (not medical rules). */
export type MarathonLongRunProfile = {
  peakLongRunKm: number
  peakLongRunMinKm: number
  peakLongRunMaxKm: number
  numberAbove30Km: number
  numberAbove28Km: number
  longestRunPhase: 'peak'
}

/**
 * Standard marathon preparation bar — minimum vs target.
 * Not a physiological law; plans below minimum should be flagged, not silently accepted.
 */
export type MarathonPreparationStandard = {
  minimumPeakWeeklyKm: number
  targetPeakWeeklyKm: number
  minimumPeakLongRunKm: number
  targetPeakLongRunKm: number
  minimumRunsOver30Km: number
  minimumRunsOver28Km: number
  /** Dedicated MP / race-pace sessions (not just long-run distance). */
  minimumMarathonSpecificSessions: number
}

export type MarathonLongRunValidation = {
  peakLongRunKm: number
  peakWeeklyKm: number
  runsOver30Km: number
  runsOver28Km: number
  maxLongRunWeeklyRatio: number
  longestRunBeforeRaceWeeks: number
  meetsMinimumStandard: boolean
  warnings: string[]
}

export type MarathonFeasibility = {
  feasible: boolean
  pathway: 'standard' | 'extended' | 'insufficient' | 'specific_block' | 'race_prep'
  reasons: string[]
  recommendedWeekCount: number | null
  /** Safe peak long reachable with +4 km / loading week from recent longest. */
  reachablePeakLongKm: number
  /** Safe peak week reachable at ~+10%/loading week from current volume. */
  reachablePeakWeeklyKm: number
  /** Discrete preparation depth for this week count × readiness. */
  preparationDepth: PreparationDepth
  readiness: 'high' | 'medium' | 'low'
}

/** Default TrainTrack marathon preparation standards by level. */
export function getMarathonPreparationStandard(args: {
  level: AthleteLevel
  highLevel?: boolean
}): MarathonPreparationStandard {
  const high = Boolean(args.highLevel)
  switch (args.level) {
    case 'beginner':
      return {
        minimumPeakWeeklyKm: 50,
        targetPeakWeeklyKm: 55,
        minimumPeakLongRunKm: 30,
        targetPeakLongRunKm: 32,
        // 30 km is an adaptation phase, not a single checkbox.
        minimumRunsOver30Km: 1,
        minimumRunsOver28Km: 3,
        minimumMarathonSpecificSessions: 2,
      }
    case 'intermediate':
      return {
        minimumPeakWeeklyKm: 50,
        targetPeakWeeklyKm: 60,
        minimumPeakLongRunKm: 32,
        targetPeakLongRunKm: 34,
        minimumRunsOver30Km: 2,
        minimumRunsOver28Km: 3,
        minimumMarathonSpecificSessions: 3,
      }
    case 'advanced':
      return high
        ? {
            minimumPeakWeeklyKm: 70,
            targetPeakWeeklyKm: 90,
            minimumPeakLongRunKm: 34,
            targetPeakLongRunKm: 35,
            minimumRunsOver30Km: 2,
            minimumRunsOver28Km: 5,
            minimumMarathonSpecificSessions: 4,
          }
        : {
            minimumPeakWeeklyKm: 60,
            targetPeakWeeklyKm: 75,
            minimumPeakLongRunKm: 33,
            targetPeakLongRunKm: 35,
            minimumRunsOver30Km: 2,
            minimumRunsOver28Km: 4,
            minimumMarathonSpecificSessions: 3,
          }
    case 'elite':
      return {
        minimumPeakWeeklyKm: 70,
        targetPeakWeeklyKm: 90,
        minimumPeakLongRunKm: 34,
        targetPeakLongRunKm: 35,
        minimumRunsOver30Km: 2,
        minimumRunsOver28Km: 5,
        minimumMarathonSpecificSessions: 4,
      }
  }
}

/**
 * Can this athlete reach the standard marathon preparation bar in the available weeks?
 * Feasibility ≠ standards: do not silently emit an under-prepared plan.
 */
export function assessMarathonFeasibility(args: {
  level: AthleteLevel
  highLevel?: boolean
  weekCount: number
  currentWeeklyKm: number
  recentLongestRunKm: number
  daysPerWeek?: number | null
}): MarathonFeasibility {
  const standard = getMarathonPreparationStandard({
    level: args.level,
    highLevel: args.highLevel,
  })
  const prep = determinePreparationPathway({
    weekCount: args.weekCount,
    currentWeeklyKm: args.currentWeeklyKm,
    recentLongestRunKm: args.recentLongestRunKm,
    level: args.level,
    demandId: 'MARATHON_V1',
  })
  const loadingWeeks = Math.max(
    1,
    args.weekCount -
      Math.floor(args.weekCount / 4) - // provisional deloads
      2, // taper + race
  )
  const startLong = Math.max(10, args.recentLongestRunKm || 14)
  const startWeek = Math.max(18, args.currentWeeklyKm || 20)
  // Short specific/race-prep blocks: do not pretend we can climb to full standards.
  const chaseFullStandard =
    prep.depth === 'FULL_DEVELOPMENT' ||
    prep.depth === 'DEVELOPMENT_AND_SPECIFICITY' ||
    prep.depth === 'BUILD_AND_SPECIFICITY'
  const reachablePeakLongKm = roundKm(
    Math.min(
      chaseFullStandard ? standard.targetPeakLongRunKm : startLong + loadingWeeks * 3,
      startLong + loadingWeeks * MAX_INCREASE_KM,
    ),
  )
  const reachablePeakWeeklyKm = roundKm(
    Math.min(
      chaseFullStandard
        ? standard.targetPeakWeeklyKm
        : startWeek * Math.pow(1.08, Math.max(1, loadingWeeks - 1)),
      startWeek * Math.pow(1.1, Math.max(1, loadingWeeks - 1)),
    ),
  )

  const reasons: string[] = [...prep.warnings]
  if (chaseFullStandard) {
    if (reachablePeakLongKm + 0.05 < standard.minimumPeakLongRunKm) {
      reasons.push(
        `From a ${startLong} km recent long, ~${loadingWeeks} loading weeks only reach ~${reachablePeakLongKm} km (need ≥${standard.minimumPeakLongRunKm} km).`,
      )
    }
    if (reachablePeakWeeklyKm + 0.05 < standard.minimumPeakWeeklyKm) {
      reasons.push(
        `From ${startWeek} km/week, ~${loadingWeeks} loading weeks only reach ~${reachablePeakWeeklyKm} km (need ≥${standard.minimumPeakWeeklyKm} km).`,
      )
    }
  }
  if (!prep.allowed) {
    for (const s of prep.suggestions) reasons.push(`Suggest: ${s}`)
  }

  const volumeOk =
    !chaseFullStandard ||
    (reachablePeakLongKm + 0.05 >= standard.minimumPeakLongRunKm &&
      reachablePeakWeeklyKm + 0.05 >= standard.minimumPeakWeeklyKm)
  const feasible = prep.allowed && volumeOk

  let pathway: MarathonFeasibility['pathway'] = 'standard'
  let recommendedWeekCount: number | null = null
  if (prep.depth === 'SPECIFIC_BLOCK' && prep.allowed) {
    pathway = 'specific_block'
  } else if (
    prep.depth === 'RACE_PREPARATION' ||
    prep.depth === 'SHARPENING' ||
    prep.depth === 'TAPER'
  ) {
    pathway = prep.allowed ? 'race_prep' : 'insufficient'
  } else if (!feasible) {
    const longGap = Math.max(0, standard.minimumPeakLongRunKm - startLong)
    const weeksForLong = Math.ceil(longGap / MAX_INCREASE_KM) + 4
    const weekGapRatio =
      startWeek > 0
        ? Math.log(standard.minimumPeakWeeklyKm / startWeek) / Math.log(1.1)
        : 12
    const weeksForVolume = Math.ceil(weekGapRatio) + 4
    recommendedWeekCount = Math.max(
      12,
      weeksForLong,
      weeksForVolume,
      args.weekCount,
    )
    pathway =
      recommendedWeekCount <= args.weekCount + 6 ? 'extended' : 'insufficient'
  }

  return {
    feasible,
    pathway,
    reasons,
    recommendedWeekCount,
    reachablePeakLongKm,
    reachablePeakWeeklyKm,
    preparationDepth: prep.depth,
    readiness: prep.readiness,
  }
}

const MAX_WEEKLY_RATIO_DEFAULT = 0.35
const MIN_WEEKLY_RATIO = 0.22
const MAX_INCREASE_KM = 4
const MAX_INCREASE_RATIO = 1.18

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

function roundKm(n: number): number {
  return Math.round(n * 2) / 2
}

function parseGoalTimeMinutes(valueLabel: string | null | undefined): number | null {
  if (!valueLabel) return null
  const parts = valueLabel
    .trim()
    .split(':')
    .map((p) => Number(p))
  if (parts.length < 2 || parts.some((n) => !Number.isFinite(n))) return null
  if (parts.length === 3) {
    return Math.round(parts[0]! * 60 + parts[1]! + parts[2]! / 60)
  }
  if (parts[0]! >= 1 && parts[0]! <= 12 && parts[1]! < 60) {
    return Math.round(parts[0]! * 60 + parts[1]!)
  }
  return Math.round(parts[0]! + parts[1]! / 60)
}

/** High-level HM/marathon athletes (goal time) get the taller peak band. */
export function isHighLevelEnduranceGoal(goal: GoalProfile): boolean {
  const mins = parseGoalTimeMinutes(goal.target?.valueLabel ?? null)
  if (mins == null) return false
  if (goal.demandId === 'HALF_V1') return mins <= 75 // ≤1:15
  if (goal.demandId === 'MARATHON_V1') return mins <= 160 // ≤2:40
  return false
}

/**
 * Marathon long-run durability defaults by level.
 * "Beginner" = beginner marathon runner (not necessarily new to running).
 */
export function getMarathonLongRunProfile(args: {
  level: AthleteLevel
  highLevel?: boolean
}): MarathonLongRunProfile {
  const standard = getMarathonPreparationStandard(args)
  return {
    peakLongRunKm: standard.targetPeakLongRunKm - 0.5,
    peakLongRunMinKm: standard.minimumPeakLongRunKm,
    peakLongRunMaxKm: standard.targetPeakLongRunKm,
    numberAbove30Km: standard.minimumRunsOver30Km,
    numberAbove28Km: standard.minimumRunsOver28Km,
    longestRunPhase: 'peak',
  }
}

/**
 * Hard ceiling: long-run share of weekly running volume.
 * These are ceilings the planner must respect (repair), not soft targets.
 */
export function maxLongRunWeeklyRatio(args: {
  demandId?: string | null
  daysPerWeek?: number | null
  weekIndex?: number
  level?: AthleteLevel | null
}): number {
  const isMarathon = args.demandId === 'MARATHON_V1'
  const days = args.daysPerWeek ?? 5
  const opening = (args.weekIndex ?? 99) <= 1
  const level = args.level ?? 'intermediate'

  if (!isMarathon) {
    return opening ? 0.4 : MAX_WEEKLY_RATIO_DEFAULT
  }

  // Prefer growing weekly volume / adding a 4th easy over concentrating load in one long.
  // Hard ceilings (repair if exceeded) — leave headroom for a 30 km long inside ~55–75 km weeks.
  if (level === 'beginner' || level === 'intermediate') {
    if (days <= 3) return opening ? 0.52 : 0.5
    if (days === 4) return opening ? 0.48 : 0.45
    return opening ? 0.42 : 0.4
  }
  // Advanced / elite: tighter midweek distribution, but still host ≥30 km longs.
  if (days <= 4) return opening ? 0.45 : 0.42
  return opening ? 0.42 : 0.4
}

export function getLongRunRangeKm(args: {
  level: AthleteLevel
  demandId?: string | null
  weeklyMileage: number
  highLevel?: boolean
}): LongRunRangeKm {
  const isMarathon = args.demandId === 'MARATHON_V1'
  const high = Boolean(args.highLevel)

  if (isMarathon) {
    const profile = getMarathonLongRunProfile({
      level: args.level,
      highLevel: high,
    })
    switch (args.level) {
      case 'beginner':
        return { base: 18, peak: profile.peakLongRunKm }
      case 'intermediate':
        return { base: 20, peak: profile.peakLongRunKm }
      case 'advanced':
        return { base: 22, peak: profile.peakLongRunKm }
      case 'elite':
        return { base: 24, peak: profile.peakLongRunKm }
    }
  }

  // Half marathon
  switch (args.level) {
    case 'beginner':
      return { base: 14, peak: 18 }
    case 'intermediate':
      return { base: 16, peak: 22 }
    case 'advanced':
      return high ? { base: 20, peak: 30 } : { base: 18, peak: 26 }
    case 'elite':
      return { base: 22, peak: 32 }
  }
}

function phaseFactor(
  kind: 'base' | 'build' | 'peak' | 'deload' | 'taper' | 'race',
): number {
  switch (kind) {
    case 'base':
      return 0.85
    case 'build':
      return 0.95
    case 'peak':
      return 1
    case 'deload':
      return 0.92
    case 'taper':
      return 0.68
    case 'race':
      return 0
  }
}

/**
 * Long-run PURPOSE progression (independent from distance).
 * Base = easy/steady · Build = progressive · Peak = occasional race-specific.
 * Never turn every long into fartlek/threshold "disguised quality".
 */
export function pickLongIntensityProfile(args: {
  kind: 'base' | 'build' | 'peak' | 'deload' | 'taper' | 'race'
  preferRaceSpecific: boolean
  weekIndex: number
  /** True when distance already climbed this week — keep intensity aerobic. */
  distanceClimbed: boolean
  /** Weeks until race (0 = race week). Peak MP-under-fatigue uses this. */
  fromEnd?: number
}): LongIntensityProfile {
  const { kind, preferRaceSpecific, weekIndex, distanceClimbed } = args
  const fromEnd = args.fromEnd ?? 99
  if (kind === 'deload' || kind === 'taper' || kind === 'race') return 'aerobic'

  // Never stack a distance climb with race-specific intensity in base/build.
  // Peak may still get a controlled race-specific long (MP/HM blocks).
  if (distanceClimbed && kind !== 'peak') return 'aerobic'

  if (kind === 'base') {
    // Mostly easy; one steady-finish every ~3 weeks.
    return weekIndex > 0 && weekIndex % 3 === 2 ? 'steady_finish' : 'aerobic'
  }

  if (kind === 'build') {
    // Early build: aerobic / steady / progressive — NOT race-pace longs yet.
    if (!preferRaceSpecific) {
      if (weekIndex % 3 === 0) return 'progressive'
      if (weekIndex % 3 === 1) return 'steady_finish'
      return 'aerobic'
    }
    // Late build: progressive primary; race-specific at most alternate weeks.
    return weekIndex % 2 === 0 ? 'progressive' : 'aerobic'
  }

  // Peak: prefer race-specific under fatigue on the key durability long
  // (fromEnd 2–3), even when distance steps up — that *is* the stimulus.
  if (preferRaceSpecific) {
    if (fromEnd === 2 || fromEnd === 3) return 'race_specific'
    if (distanceClimbed) return 'progressive'
    return weekIndex % 2 === 0 ? 'race_specific' : 'progressive'
  }
  return 'progressive'
}

/**
 * Suggested continuous MP km inside a long run (0 = aerobic/progressive only).
 * Progresses time-at-race-intensity under fatigue, not just long-run distance.
 */
export function marathonSpecificMpKmInLong(args: {
  kind: 'base' | 'build' | 'peak' | 'deload' | 'taper' | 'race'
  intensityProfile: LongIntensityProfile
  longRunKm: number
  weekIndex: number
  weekCount: number
}): number {
  if (
    args.kind === 'deload' ||
    args.kind === 'taper' ||
    args.kind === 'race' ||
    args.longRunKm < 18
  ) {
    return 0
  }
  if (args.intensityProfile !== 'race_specific') return 0
  const fromEnd = args.weekCount - 1 - args.weekIndex
  // Peak phase: grow MP block inside the long (under fatigue).
  if (args.kind === 'peak' || fromEnd <= 3) {
    if (args.longRunKm >= 28) return Math.min(10, Math.round(args.longRunKm * 0.32))
    if (args.longRunKm >= 24) return 6
    return 4
  }
  // Late build: shorter MP finish.
  if (args.kind === 'build' && fromEnd <= 8) {
    if (args.longRunKm >= 22) return 4
    return 3
  }
  return 0
}

/**
 * Compute preferred long-run km for one week.
 * Caps by weekly ratio, progressive overload, and recovery/taper cuts.
 */
export function calculateLongRunTarget(args: {
  level: AthleteLevel
  demandId?: string | null
  weeklyMileage: number
  kind: 'base' | 'build' | 'peak' | 'deload' | 'taper' | 'race'
  recentLongRunKm: number
  preferRaceSpecific: boolean
  weekIndex: number
  highLevel?: boolean
  daysPerWeek?: number | null
  weekCount?: number | null
}): LongRunTarget {
  if (args.kind === 'race') {
    return {
      preferredKm: 0,
      minKm: 0,
      maxKm: 0,
      intensityProfile: 'aerobic',
      weeklyRatio: 0,
    }
  }

  const range = getLongRunRangeKm({
    level: args.level,
    demandId: args.demandId,
    weeklyMileage: args.weeklyMileage,
    highLevel: args.highLevel,
  })

  let target = roundKm(
    range.base + (range.peak - range.base) * phaseFactor(args.kind),
  )
  // Opening week: start at the level base, not a discounted mid-range.
  if (args.kind === 'base' && args.weekIndex === 0) {
    target = range.base
  }

  const maxRatio = maxLongRunWeeklyRatio({
    demandId: args.demandId,
    daysPerWeek: args.daysPerWeek,
    weekIndex: args.weekIndex,
    level: args.level,
  })
  const ratioCap = roundKm(args.weeklyMileage * maxRatio)
  target = Math.min(target, ratioCap)

  // Progressive overload from recent long.
  const recent = Math.max(0, args.recentLongRunKm)
  if (recent > 0 && args.kind !== 'deload' && args.kind !== 'taper') {
    const capped = Math.min(
      recent + MAX_INCREASE_KM,
      roundKm(recent * MAX_INCREASE_RATIO),
    )
    // Allow climb toward phase target, but never jump more than +4 km / +18%.
    if (target > recent) {
      target = Math.min(target, capped)
    }
  }

  if (args.kind === 'deload' && recent > 0) {
    target = roundKm(recent * 0.9)
  }
  if (args.kind === 'taper' && recent > 0) {
    target = roundKm(recent * 0.68)
  }

  // Floor: keep a meaningful long even on smaller weeks.
  const floor = roundKm(
    Math.max(
      range.base * (args.kind === 'deload' ? 0.88 : args.kind === 'taper' ? 0.75 : 0.85),
      args.weeklyMileage * MIN_WEEKLY_RATIO,
    ),
  )
  target = clamp(target, Math.min(floor, ratioCap), Math.max(floor, ratioCap))
  target = clamp(target, 10, range.peak)

  const distanceClimbed =
    recent > 0 && target >= recent + 2 && args.kind !== 'deload'
  const fromEnd =
    args.weekCount != null && args.weekCount > 0
      ? args.weekCount - 1 - args.weekIndex
      : undefined
  const intensityProfile = pickLongIntensityProfile({
    kind: args.kind,
    preferRaceSpecific: args.preferRaceSpecific,
    weekIndex: args.weekIndex,
    distanceClimbed,
    fromEnd,
  })

  const weeklyRatio =
    args.weeklyMileage > 0 ? target / args.weeklyMileage : 0

  return {
    preferredKm: target,
    minKm: roundKm(target * 0.92),
    maxKm: roundKm(Math.min(target * 1.08, ratioCap, range.peak)),
    intensityProfile,
    weeklyRatio: Math.round(weeklyRatio * 100) / 100,
  }
}

/**
 * Plan-level marathon preparation checks (warnings, not hard medical rules).
 */
export function validateMarathonLongRunDurability(args: {
  level: AthleteLevel
  highLevel?: boolean
  /** Peak long-run km across non-race weeks. */
  longRunKmByWeek: number[]
  /** Weekly running km aligned with longRunKmByWeek (same indexes). */
  weeklyKmByWeek?: number[]
  raceWeekIndex?: number
  daysPerWeek?: number | null
}): MarathonLongRunValidation {
  const standard = getMarathonPreparationStandard({
    level: args.level,
    highLevel: args.highLevel,
  })
  const longs = args.longRunKmByWeek.filter((km) => km > 0)
  const peakLongRunKm = longs.length ? Math.max(...longs) : 0
  const runsOver30Km = longs.filter((km) => km >= 30).length
  const runsOver28Km = longs.filter((km) => km >= 28).length
  const weeks = (args.weeklyKmByWeek ?? []).filter((km, i) => {
    if (args.raceWeekIndex != null && i === args.raceWeekIndex) return false
    return km > 0
  })
  const peakWeeklyKm = weeks.length ? Math.max(...weeks) : 0

  let maxLongRunWeeklyRatio = 0
  if (args.weeklyKmByWeek?.length) {
    for (let i = 0; i < args.longRunKmByWeek.length; i += 1) {
      const lr = args.longRunKmByWeek[i] ?? 0
      const week = args.weeklyKmByWeek[i] ?? 0
      if (lr > 0 && week > 0) {
        maxLongRunWeeklyRatio = Math.max(maxLongRunWeeklyRatio, lr / week)
      }
    }
  }

  let longestRunBeforeRaceWeeks = 0
  if (args.raceWeekIndex != null && args.raceWeekIndex > 0) {
    let peakIdx = -1
    let peak = 0
    for (let i = 0; i < args.raceWeekIndex; i += 1) {
      const km = args.longRunKmByWeek[i] ?? 0
      if (km >= peak) {
        peak = km
        peakIdx = i
      }
    }
    if (peakIdx >= 0) {
      longestRunBeforeRaceWeeks = args.raceWeekIndex - peakIdx
    }
  }

  const warnings: string[] = []
  if (peakWeeklyKm + 0.05 < standard.minimumPeakWeeklyKm) {
    warnings.push(
      `MARATHON PREPARATION INSUFFICIENT — peak weekly running ${peakWeeklyKm} km is below the ${args.level} minimum (${standard.minimumPeakWeeklyKm} km; target ~${standard.targetPeakWeeklyKm} km).`,
    )
  }
  if (peakLongRunKm + 0.05 < standard.minimumPeakLongRunKm) {
    warnings.push(
      `MARATHON PREPARATION INSUFFICIENT — peak long run ${peakLongRunKm} km is below the ${args.level} minimum (${standard.minimumPeakLongRunKm} km; target ${standard.minimumPeakLongRunKm}–${standard.targetPeakLongRunKm} km).`,
    )
  }
  if (runsOver30Km < standard.minimumRunsOver30Km) {
    warnings.push(
      `Marathon plan has ${runsOver30Km} run(s) ≥30 km; ${args.level} minimum expects ≥${standard.minimumRunsOver30Km}.`,
    )
  }
  if (runsOver28Km < standard.minimumRunsOver28Km) {
    warnings.push(
      `Marathon plan has ${runsOver28Km} run(s) ≥28 km; ${args.level} minimum expects ≥${standard.minimumRunsOver28Km} (peak durability is a phase, not one checkbox).`,
    )
  }
  // 3-run weeks naturally concentrate more in the long; raise the bars slightly.
  const lowFrequency = (args.daysPerWeek ?? 5) <= 3
  const warnRatio = lowFrequency ? 0.5 : 0.45
  const severeRatio = lowFrequency ? 0.55 : 0.5
  if (maxLongRunWeeklyRatio > severeRatio) {
    warnings.push(
      `SEVERE: long run reaches ${(maxLongRunWeeklyRatio * 100).toFixed(0)}% of weekly running volume — marathon-specific durability may be insufficient; raise weekly volume or add easy frequency.`,
    )
  } else if (maxLongRunWeeklyRatio > warnRatio) {
    warnings.push(
      `Long run reaches ${(maxLongRunWeeklyRatio * 100).toFixed(0)}% of weekly running volume — unusually large share; prefer adding easy running over growing only the long.`,
    )
  }

  const meetsMinimumStandard =
    peakWeeklyKm + 0.05 >= standard.minimumPeakWeeklyKm &&
    peakLongRunKm + 0.05 >= standard.minimumPeakLongRunKm &&
    runsOver30Km >= standard.minimumRunsOver30Km &&
    runsOver28Km >= standard.minimumRunsOver28Km

  return {
    peakLongRunKm,
    peakWeeklyKm,
    runsOver30Km,
    runsOver28Km,
    maxLongRunWeeklyRatio: Math.round(maxLongRunWeeklyRatio * 100) / 100,
    longestRunBeforeRaceWeeks,
    meetsMinimumStandard,
    warnings,
  }
}

/** Tag / id filters for long-run family selection. */
export function longProfileMatch(
  tags: string[],
  id: string,
  profile: LongIntensityProfile,
): boolean {
  const joined = `${tags.join(' ')} ${id}`.toLowerCase()
  switch (profile) {
    case 'aerobic':
      // Strict: no fartlek / threshold / race-pace disguised as "easy long".
      return (
        !/threshold|tempo|hm-specific|mp-specific|race-pace|norwegian|fartlek/i.test(
          joined,
        ) &&
        !/LONG_06|LONG_07|LONG_1[1-5]|PROG_1[1-5]|FARTLEK/i.test(id) &&
        (/easy|aerobic|long-run/i.test(joined) || /LONG_0[1-5]|LONG_08/i.test(id))
      )
    case 'steady_finish':
      return (
        (/steady|progression|progressive/i.test(joined) ||
          /LONG_09|LONG_10|PROG_/i.test(id)) &&
        !/fartlek|threshold|hm-specific|mp-specific/i.test(joined)
      )
    case 'progressive':
      return (
        (/progress/i.test(joined) || /LONG_1[0-5]|PROG_/i.test(id)) &&
        !/fartlek|threshold.?block/i.test(joined)
      )
    case 'race_specific':
      return (
        /hm-specific|mp-specific|race-pace|marathon/i.test(joined) ||
        /LONG_06|LONG_1[3-5]|BENCHMARK_(HM|MARATHON)/i.test(id)
      )
    case 'fast_finish':
      return (
        (/hm-specific|mp-specific|progress|steady|fast.?finish/i.test(joined) ||
          /LONG_06|LONG_1[0-5]|PROG_/i.test(id)) &&
        !/fartlek/i.test(joined)
      )
  }
}
