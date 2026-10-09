/**
 * Marathon (and long-prep HM) intensity ramp.
 *
 * Driven by discrete preparation roadmaps (not 16w ÷ N compression).
 * Rule: longer preparation → slower intensity ramp; short blocks start specific
 * but must not invent fitness the athlete does not have.
 */
import type { AthleteLevel } from '@/lib/coach-engine/types'
import {
  adaptationShareFromRoadmap,
  classifyMarathonReadiness,
  resolveRoadmapBand,
  type AthleteReadinessTier,
} from '@/lib/coach-engine/preparation-roadmap'

export type IntensityBand =
  | 'adaptation'
  | 'engine'
  | 'specific'
  | 'peak'
  | 'taper'
  | 'race'
  | 'recovery'

export type WeekIntensityBudget = {
  band: IntensityBand
  /** Formal hard quality slots (0 = easy + optional strides only). */
  qualitySessions: number
  /** Soft ceiling on quality work minutes (threshold / MP / VO2). */
  qualityBudgetMin: number
  /** Dose target passed to library threshold fitting (null = no quality dose). */
  thresholdVolumeTargetMin: number | null
  allowVo2: boolean
  preferRaceSpecific: boolean
  /** Prefer strides / neuromuscular over true threshold. */
  preferStrides: boolean
  reason: string
}

/** @deprecated Prefer adaptationShareFromRoadmap — kept for call sites/tests. */
export function adaptationShare(weekCount: number): number {
  return adaptationShareFromRoadmap(weekCount)
}

function budgetForBand(args: {
  band: IntensityBand
  weekIndex: number
  weekCount: number
  level: AthleteLevel
  daysPerWeek: number
  isMarathon: boolean
}): WeekIntensityBudget {
  const { band, weekIndex, weekCount, level, isMarathon } = args
  const beginner = level === 'beginner'
  const days = args.daysPerWeek
  const maxQ = days <= 4 || beginner ? 1 : 2
  const fromEnd = weekCount - 1 - weekIndex

  switch (band) {
    case 'race':
      return {
        band,
        qualitySessions: 1,
        qualityBudgetMin: 8,
        thresholdVolumeTargetMin: 6,
        allowVo2: false,
        preferRaceSpecific: true,
        preferStrides: false,
        reason: 'Race week: short sharpening only',
      }
    case 'recovery':
      return {
        band,
        qualitySessions: 0,
        qualityBudgetMin: 0,
        thresholdVolumeTargetMin: null,
        allowVo2: false,
        preferRaceSpecific: false,
        preferStrides: false,
        reason: 'Recovery: drop intensity, keep easy volume',
      }
    case 'taper':
      return {
        band,
        qualitySessions: 1,
        qualityBudgetMin: 12,
        thresholdVolumeTargetMin: 10,
        allowVo2: false,
        preferRaceSpecific: true,
        preferStrides: true,
        reason: 'Taper: brief race-pace touch, mostly easy',
      }
    case 'adaptation': {
      // First two calendar weeks of longer blocks: strides only.
      const early = weekIndex <= 1 || (weekCount >= 16 && weekIndex <= 2)
      if (early) {
        return {
          band,
          qualitySessions: 0,
          qualityBudgetMin: 5,
          thresholdVolumeTargetMin: null,
          allowVo2: false,
          preferRaceSpecific: false,
          preferStrides: true,
          reason:
            'Adaptation: easy + strides only — build the athlete, not specificity',
        }
      }
      return {
        band,
        qualitySessions: 1,
        qualityBudgetMin: beginner ? 12 : 16,
        // Dose ≈ float fartlek work minutes (not true threshold).
        thresholdVolumeTargetMin: beginner ? 12 : 16,
        allowVo2: false,
        preferRaceSpecific: false,
        preferStrides: false,
        reason:
          'Adaptation late: continuous aerobic fartlek (below threshold, float recoveries)',
      }
    }
    case 'engine': {
      const mid = weekCount >= 12 ? weekIndex >= Math.floor(weekCount * 0.35) : true
      // Second quality day in engine weeks can be VO2 (even marathon) once base is in.
      const vo2Ok =
        mid && !beginner && days >= 4 && (weekCount < 16 || weekIndex >= 4)
      return {
        band,
        qualitySessions: mid && !beginner && days >= 5 ? Math.min(2, maxQ) : 1,
        qualityBudgetMin: mid ? (beginner ? 18 : 22) : beginner ? 16 : 20,
        thresholdVolumeTargetMin: mid ? (beginner ? 16 : 20) : beginner ? 14 : 18,
        allowVo2: vo2Ok,
        preferRaceSpecific: false,
        preferStrides: false,
        reason: mid
          ? 'Engine: 1 km threshold development (+ optional VO2)'
          : 'Engine early: continuous aerobic fartlek → then threshold',
      }
    }
    case 'specific':
      return {
        band,
        qualitySessions: maxQ,
        qualityBudgetMin: beginner ? 26 : 30,
        thresholdVolumeTargetMin: isMarathon ? 16 : 18,
        // Second quality can be VO2 / speed; first stays race-specific or threshold.
        allowVo2: !beginner && days >= 4,
        preferRaceSpecific: true,
        preferStrides: false,
        reason: 'Specific: race-pace / longer threshold + optional VO2',
      }
    case 'peak':
      return {
        band,
        qualitySessions: maxQ,
        qualityBudgetMin: beginner ? 28 : 32,
        thresholdVolumeTargetMin: fromEnd === 2 ? 18 : 20,
        allowVo2: false,
        preferRaceSpecific: true,
        preferStrides: false,
        reason: 'Peak: marathon-specific specificity, minimal VO2',
      }
  }
}

/**
 * Which quality *shape* should fill this week's intensity budget.
 * Dose (minutes) stays in thresholdVolumeTargetMin — this picks the recipe.
 */
export type QualityShape =
  | 'strides'
  | 'aerobic_fartlek'
  | 'threshold_1k'
  | 'threshold_2k'
  | 'threshold_time'
  | 'vo2_short'
  | 'race_specific'
  | 'cruise'

export function qualityShapeForSlot(args: {
  band: IntensityBand
  /** 0 = first quality session of the week, 1 = second, … */
  qualityIndex: number
  allowVo2: boolean
  weekIndex: number
  preferRaceSpecific?: boolean
}): QualityShape {
  const { band, qualityIndex, allowVo2, weekIndex } = args
  const second = qualityIndex >= 1

  switch (band) {
    case 'adaptation':
      // Very early weeks stay strides-only (qualitySessions=0); once quality
      // opens, use continuous aerobic fartlek — not threshold yet.
      return weekIndex <= 1 ? 'strides' : 'aerobic_fartlek'
    case 'recovery':
      return 'strides'
    case 'taper':
    case 'race':
      return args.preferRaceSpecific ? 'race_specific' : 'strides'
    case 'engine':
      if (second && allowVo2) return 'vo2_short'
      // Early engine: keep building with float fartleks; mid+ → 1 km threshold.
      if (weekIndex < 5) return 'aerobic_fartlek'
      return weekIndex % 4 === 3 ? 'threshold_time' : 'threshold_1k'
    case 'specific':
      if (second && allowVo2 && weekIndex % 2 === 1) return 'vo2_short'
      // Keep 1 km / 2 km threshold in the rotation — not only MP every week.
      if (args.preferRaceSpecific && !second) {
        if (weekIndex % 3 === 0) return 'threshold_1k'
        if (weekIndex % 3 === 1) return 'threshold_2k'
        return 'race_specific'
      }
      return weekIndex % 2 === 0 ? 'threshold_1k' : 'threshold_2k'
    case 'peak':
      if (args.preferRaceSpecific) return 'race_specific'
      return weekIndex % 2 === 0 ? 'threshold_2k' : 'threshold_1k'
    default:
      return 'threshold_1k'
  }
}

/** Tag / id matchers for a quality shape (used by library selection). */
export function qualityShapeMatchers(shape: QualityShape): {
  id: RegExp
  tag: RegExp
  sessionTypes?: string[]
} {
  switch (shape) {
    case 'strides':
      return {
        id: /STRIDE|SPEED_0[14]|RECOVERY_0[45]/i,
        tag: /stride|neuromuscular|sharpen/i,
      }
    case 'aerobic_fartlek':
      return {
        // Exclude FARTLEK_04 (threshold fartlek) — that belongs later.
        id: /FARTLEK_0[235678]/i,
        tag: /float|continuous|early-prep/i,
        sessionTypes: ['FARTLEK'],
      }
    case 'threshold_1k':
      return {
        id: /THRESHOLD_1[0-5]|THRESHOLD_0[47]|INTERVAL_08|BENCHMARK_NOR_01/i,
        tag: /1k|1000m|distance-intervals/i,
        sessionTypes: ['THRESHOLD', 'INTERVALS'],
      }
    case 'threshold_2k':
      return {
        id: /THRESHOLD_0[589]|THRESHOLD_16|INTERVAL_10/i,
        tag: /2\s*km|1\.5|long-reps|long.intervals/i,
        sessionTypes: ['THRESHOLD', 'INTERVALS'],
      }
    case 'threshold_time':
      return {
        id: /THRESHOLD_0[1236]|FARTLEK_0[34]/i,
        tag: /threshold|cruise/i,
        sessionTypes: ['THRESHOLD', 'FARTLEK'],
      }
    case 'vo2_short':
      return {
        id: /VO2_0[1-9]|VO2_3|VO2_4|INTERVAL_0[49]|SPEED_0[123]/i,
        tag: /vo2|300m|400m|short-intervals|speed/i,
        sessionTypes: ['VO2_MAX', 'INTERVALS'],
      }
    case 'race_specific':
      return {
        id: /MP_|HM_SPECIFIC|RACE_PACE/i,
        tag: /mp-specific|hm-specific|race-pace|marathon/i,
        sessionTypes: ['RACE_PACE', 'TEMPO'],
      }
    case 'cruise':
      return {
        id: /TEMPO_|DURABILITY_/i,
        tag: /tempo|cruise|durability/i,
        sessionTypes: ['TEMPO'],
      }
  }
}

/**
 * Resolve intensity / quality budget for one week from the discrete roadmap.
 */
export function resolveEnduranceIntensityBudget(args: {
  weekIndex: number
  weekCount: number
  isDeload: boolean
  isTaper: boolean
  isRaceWeek: boolean
  level: AthleteLevel
  daysPerWeek?: number | null
  /** Marathon gets the full slow ramp; HM is slightly faster. */
  demandId?: string | null
  currentWeeklyKm?: number | null
  recentLongestRunKm?: number | null
  readiness?: AthleteReadinessTier
}): WeekIntensityBudget {
  const {
    weekIndex,
    weekCount,
    isDeload,
    isTaper,
    isRaceWeek,
    level,
    demandId,
  } = args
  const isMarathon = demandId === 'MARATHON_V1'
  const days = args.daysPerWeek ?? 5

  const readiness =
    args.readiness ??
    classifyMarathonReadiness({
      currentWeeklyKm: args.currentWeeklyKm ?? 30,
      recentLongestRunKm: args.recentLongestRunKm ?? 16,
      level,
    })

  // HM: threshold-first early; race-pace only in the later ~half (not full marathon MP ramp).
  let band = resolveRoadmapBand({
    weekIndex,
    weekCount,
    readiness: isMarathon ? readiness : readiness === 'low' ? 'medium' : readiness,
    isDeload,
    isTaper,
    isRaceWeek,
  })
  if (!isMarathon && demandId === 'HALF_V1') {
    if (band === 'adaptation' && weekIndex >= 1) band = 'engine'
    if (
      band === 'specific' &&
      weekIndex < Math.floor(weekCount * 0.45)
    ) {
      band = 'engine'
    }
  }

  // Unready short marathon windows: do not run a specificity campaign.
  // Preserve fitness with easy + strides until the athlete extends preparation.
  if (
    isMarathon &&
    weekCount <= 8 &&
    readiness !== 'high' &&
    !isRaceWeek &&
    !isTaper &&
    !isDeload
  ) {
    return {
      band: 'adaptation',
      qualitySessions: 0,
      qualityBudgetMin: 5,
      thresholdVolumeTargetMin: null,
      allowVo2: false,
      preferRaceSpecific: false,
      preferStrides: true,
      reason:
        'Insufficient preparation window — easy/strides only (not a standard marathon pathway)',
    }
  }

  return budgetForBand({
    band,
    weekIndex,
    weekCount,
    level,
    daysPerWeek: days,
    isMarathon,
  })
}

/** True when this week must not schedule VO2max work. */
export function intensityBudgetBlocksVo2(budget: WeekIntensityBudget): boolean {
  return !budget.allowVo2
}
