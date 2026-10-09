/**
 * Preparation depth + discrete roadmaps by program length.
 *
 * Rule: never proportionally compress a 16-week plan into 8 weeks.
 * Shorter blocks drop base-building and keep specificity — and must be gated
 * by athlete readiness so we do not pretend fitness can be built from nothing.
 */
import type { AthleteLevel } from '@/lib/coach-engine/types'
import type { IntensityBand } from '@/lib/coach-engine/intensity-ramp'

/** What the available weeks can realistically accomplish. */
export type PreparationDepth =
  | 'FULL_DEVELOPMENT'
  | 'DEVELOPMENT_AND_SPECIFICITY'
  | 'BUILD_AND_SPECIFICITY'
  | 'SPECIFIC_BLOCK'
  | 'RACE_PREPARATION'
  | 'SHARPENING'
  | 'TAPER'
  | 'RACE_WEEK'

export type AthleteReadinessTier = 'high' | 'medium' | 'low'

export type PreparationPathway = {
  depth: PreparationDepth
  /** False when length + readiness cannot support a standard marathon pathway. */
  allowed: boolean
  readiness: AthleteReadinessTier
  /** Human-readable pathway label for Why-this-plan / guidelines. */
  summary: string
  warnings: string[]
  /** Suggested alternatives when not allowed. */
  suggestions: string[]
}

/**
 * Canonical capability by program length (upper bound of what is possible).
 * Readiness may still downgrade or block the pathway.
 */
export function planCapabilityForWeekCount(weekCount: number): PreparationDepth {
  if (weekCount >= 20) return 'FULL_DEVELOPMENT'
  if (weekCount >= 16) return 'FULL_DEVELOPMENT'
  if (weekCount >= 12) return 'DEVELOPMENT_AND_SPECIFICITY'
  if (weekCount >= 10) return 'BUILD_AND_SPECIFICITY'
  if (weekCount >= 6) return 'SPECIFIC_BLOCK'
  if (weekCount >= 4) return 'RACE_PREPARATION'
  if (weekCount >= 3) return 'SHARPENING'
  if (weekCount >= 2) return 'TAPER'
  return 'RACE_WEEK'
}

/**
 * Marathon readiness from current volume + long run (not medical clearance).
 * Used to choose pathway aggressiveness inside a given week count.
 */
export function classifyMarathonReadiness(args: {
  currentWeeklyKm: number
  recentLongestRunKm: number
  level?: AthleteLevel
}): AthleteReadinessTier {
  const week = Math.max(0, args.currentWeeklyKm || 0)
  const long = Math.max(0, args.recentLongestRunKm || 0)
  // High: already near marathon-specific block entry.
  if (week >= 45 && long >= 22) return 'high'
  if (week >= 40 && long >= 20) return 'high'
  // Medium: can build with a full/development block; fragile for short specifics.
  if (week >= 32 && long >= 16) return 'medium'
  if (week >= 28 && long >= 14) return 'medium'
  return 'low'
}

/**
 * Two-dimensional pathway: weeks available × athlete readiness.
 */
export function determinePreparationPathway(args: {
  weekCount: number
  currentWeeklyKm: number
  recentLongestRunKm: number
  level?: AthleteLevel
  demandId?: string | null
}): PreparationPathway {
  const readiness = classifyMarathonReadiness({
    currentWeeklyKm: args.currentWeeklyKm,
    recentLongestRunKm: args.recentLongestRunKm,
    level: args.level,
  })
  const depth = planCapabilityForWeekCount(args.weekCount)
  const warnings: string[] = []
  const suggestions: string[] = []
  let allowed = true
  let summary = ''

  const isMarathon = args.demandId == null || args.demandId === 'MARATHON_V1'

  if (!isMarathon) {
    return {
      depth,
      allowed: true,
      readiness,
      summary: `${args.weekCount}-week endurance block (${depth})`,
      warnings,
      suggestions,
    }
  }

  switch (depth) {
    case 'FULL_DEVELOPMENT':
      summary =
        readiness === 'low'
          ? `${args.weekCount}-week full development — extended adaptation for low current volume`
          : `${args.weekCount}-week full development pathway (base → build → specific → peak → taper)`
      if (readiness === 'low' && args.currentWeeklyKm < 22) {
        warnings.push(
          'Current volume is low for a marathon — early weeks stay almost entirely easy/adaptation.',
        )
      }
      break
    case 'DEVELOPMENT_AND_SPECIFICITY':
      summary = `${args.weekCount}-week compressed development + specificity (no long pure base)`
      if (readiness === 'low') {
        warnings.push(
          '12-week marathon with low readiness: expect conservative volume; peak durability may be limited.',
        )
      }
      break
    case 'BUILD_AND_SPECIFICITY':
      summary = `${args.weekCount}-week build + specificity block`
      if (readiness === 'low') {
        allowed = false
        warnings.push(
          `Preparation insufficient for a standard ${args.weekCount}-week marathon pathway from ~${Math.round(args.currentWeeklyKm)} km/week.`,
        )
        suggestions.push(
          'Extend preparation to ≥12–16 weeks',
          'Lower peak volume / race goal',
          'Consider a half marathon first',
        )
      }
      break
    case 'SPECIFIC_BLOCK':
      summary = `${args.weekCount}-week marathon-specific block (not full fitness development)`
      // ≤8 weeks: only high-readiness athletes get a standard specific block.
      if (readiness !== 'high') {
        allowed = false
        warnings.push(
          `Current preparation is insufficient for a standard ${args.weekCount}-week marathon pathway (~${Math.round(args.currentWeeklyKm)} km/week, ~${Math.round(args.recentLongestRunKm)} km long).`,
        )
        suggestions.push(
          'Extend preparation to ≥12–16 weeks',
          'Reduce race goal / choose low-volume exception',
          'Choose a half marathon first',
          'Postpone the race until weekly volume and long run are closer to race demands',
        )
      }
      break
    case 'RACE_PREPARATION':
      summary = `${args.weekCount}-week race-preparation block (not a marathon training plan)`
      if (readiness !== 'high') {
        allowed = false
        warnings.push(
          `${args.weekCount} weeks is race preparation, not marathon training — athlete needs an existing marathon base.`,
        )
        suggestions.push(
          'Only proceed if already training near race volume',
          'Otherwise postpone or pick a shorter race',
        )
      } else {
        warnings.push(
          'This is a race-preparation / sharpening block — it cannot meaningfully build new marathon fitness.',
        )
      }
      break
    case 'SHARPENING':
      summary = `${args.weekCount}-week sharpening — preserve fitness, optimize race readiness`
      if (readiness !== 'high') {
        allowed = false
        warnings.push(
          'Sharpening block only makes sense with high readiness already in place.',
        )
        suggestions.push(
          'Extend preparation',
          'Choose a shorter race',
        )
      }
      break
    case 'TAPER':
      summary =
        'Taper / race-readiness only — cannot meaningfully build marathon fitness'
      warnings.push(
        'We cannot meaningfully build marathon fitness in 2 weeks. This plan preserves fitness and optimizes race readiness.',
      )
      if (readiness !== 'high') {
        allowed = false
        suggestions.push('Extend preparation to ≥12–16 weeks')
      }
      break
    case 'RACE_WEEK':
      summary = 'Race week only'
      break
  }

  return { depth, allowed, readiness, summary, warnings, suggestions }
}

/**
 * Discrete week roles for canonical program lengths.
 * Index = weekIndex (0-based). Recovery/taper/race slots match coaching intent;
 * blueprint still honors live isDeload/isTaper/isRaceWeek flags when present.
 */
const ROADMAPS: Record<number, IntensityBand[]> = {
  // 16w full pathway
  16: [
    'adaptation', // W1
    'adaptation', // W2
    'adaptation', // W3
    'recovery', // W4
    'engine', // W5
    'engine', // W6
    'engine', // W7
    'recovery', // W8
    'specific', // W9
    'specific', // W10
    'specific', // W11
    'recovery', // W12
    'peak', // W13
    'peak', // W14
    'taper', // W15
    'race', // W16
  ],
  // 12w compressed — real recoveries at W4/W8 (not a fake mid-block "Recovery" label)
  12: [
    'adaptation', // W1
    'engine', // W2
    'engine', // W3
    'recovery', // W4
    'specific', // W5
    'specific', // W6
    'specific', // W7
    'recovery', // W8
    'peak', // W9
    'peak', // W10
    'taper', // W11
    'race', // W12
  ],
  // 10w build → specific
  10: [
    'engine', // W1 Adaptation/Build
    'engine', // W2
    'specific', // W3
    'recovery', // W4
    'specific', // W5
    'specific', // W6
    'peak', // W7
    'peak', // W8 (recovery/peak bridge — volume held via blueprints)
    'taper', // W9
    'race', // W10
  ],
  // 8w ready: specific block (no fake base) — unready athletes are gated out.
  8: [
    'specific',
    'specific',
    'specific',
    'recovery',
    'peak',
    'peak',
    'taper',
    'race',
  ],
  // 6w ready: specific → peak → taper
  6: ['specific', 'specific', 'peak', 'recovery', 'taper', 'race'],
  // 4w race prep
  4: ['specific', 'peak', 'taper', 'race'],
  // 3w sharpen
  3: ['specific', 'taper', 'race'],
  // 2w taper
  2: ['taper', 'race'],
  // 1w race
  1: ['race'],
  // 20w — longer base
  20: [
    'adaptation',
    'adaptation',
    'adaptation',
    'adaptation',
    'recovery',
    'engine',
    'engine',
    'engine',
    'recovery',
    'engine',
    'specific',
    'specific',
    'recovery',
    'specific',
    'specific',
    'peak',
    'peak',
    'peak',
    'taper',
    'race',
  ],
  // 24w — full development with deep base
  24: [
    'adaptation',
    'adaptation',
    'adaptation',
    'adaptation',
    'recovery',
    'adaptation',
    'engine',
    'engine',
    'recovery',
    'engine',
    'engine',
    'engine',
    'recovery',
    'specific',
    'specific',
    'specific',
    'recovery',
    'specific',
    'peak',
    'peak',
    'peak',
    'taper',
    'taper',
    'race',
  ],
}

const CANONICAL_LENGTHS = Object.keys(ROADMAPS)
  .map(Number)
  .sort((a, b) => a - b)

function nearestRoadmapLength(weekCount: number): number {
  if (ROADMAPS[weekCount]) return weekCount
  // Prefer the next-shorter canonical length (do not stretch a longer base template).
  let best = CANONICAL_LENGTHS[0]!
  for (const n of CANONICAL_LENGTHS) {
    if (n <= weekCount) best = n
    else break
  }
  // If longer than all, use longest.
  if (weekCount > CANONICAL_LENGTHS[CANONICAL_LENGTHS.length - 1]!) {
    return CANONICAL_LENGTHS[CANONICAL_LENGTHS.length - 1]!
  }
  return best
}

/**
 * Resolve the intended band for a week from the discrete roadmap.
 * Live deload/taper/race flags win over the static template.
 */
export function resolveRoadmapBand(args: {
  weekIndex: number
  weekCount: number
  readiness?: AthleteReadinessTier
  isDeload?: boolean
  isTaper?: boolean
  isRaceWeek?: boolean
}): IntensityBand {
  if (args.isRaceWeek) return 'race'
  if (args.isDeload) return 'recovery'
  if (args.isTaper) return 'taper'

  const templateLen = nearestRoadmapLength(args.weekCount)
  const template = ROADMAPS[templateLen]!
  // Map weekIndex into template by relative position (band sequence), not volume.
  const t =
    args.weekCount <= 1
      ? 0
      : args.weekIndex / Math.max(1, args.weekCount - 1)
  const mapped = Math.min(
    template.length - 1,
    Math.round(t * (template.length - 1)),
  )
  let band = template[mapped]!

  // Low readiness on full/development blocks: keep early weeks in adaptation.
  const readiness = args.readiness ?? 'medium'
  if (
    readiness === 'low' &&
    args.weekCount >= 12 &&
    args.weekIndex <= Math.floor(args.weekCount * 0.2) &&
    (band === 'engine' || band === 'specific')
  ) {
    band = 'adaptation'
  }
  // High readiness on full blocks: allow engine one week earlier after W2.
  if (
    readiness === 'high' &&
    args.weekCount >= 16 &&
    args.weekIndex >= 2 &&
    args.weekIndex <= 3 &&
    band === 'adaptation'
  ) {
    band = 'engine'
  }

  return band
}

/**
 * Recovery week indexes from the discrete roadmap (0-based).
 * Excludes taper/race weeks — those are handled separately.
 */
export function roadmapDeloadWeekIndexes(weekCount: number): number[] {
  const out: number[] = []
  for (let w = 0; w < weekCount; w += 1) {
    const fromEnd = weekCount - 1 - w
    if (fromEnd <= 1) continue
    const band = resolveRoadmapBand({ weekIndex: w, weekCount })
    if (band === 'recovery') out.push(w)
  }
  return out
}

/** Fraction of roadmap weeks that are pure adaptation (for tests / diagnostics). */
export function adaptationShareFromRoadmap(weekCount: number): number {
  const template = ROADMAPS[nearestRoadmapLength(weekCount)]!
  const adapt = template.filter((b) => b === 'adaptation').length
  return adapt / Math.max(1, template.length)
}

export function describeRoadmap(weekCount: number): {
  weekCount: number
  depth: PreparationDepth
  weeks: Array<{ week: number; band: IntensityBand }>
} {
  const len = nearestRoadmapLength(weekCount)
  const template = ROADMAPS[len]!
  // Expand/contract description to requested weekCount via resolveRoadmapBand.
  const weeks = Array.from({ length: weekCount }, (_, i) => ({
    week: i + 1,
    band: resolveRoadmapBand({ weekIndex: i, weekCount }),
  }))
  return {
    weekCount,
    depth: planCapabilityForWeekCount(weekCount),
    weeks,
  }
}
