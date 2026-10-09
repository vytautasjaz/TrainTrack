import {
  ADAPTATION_KEYS,
  type AdaptationKey,
  type GapAnalysis,
  type LimitingFactor,
  type LimitingFactorProfile,
  type PhaseProfile,
  type RaceDemandProfile,
} from '@/lib/coach-engine/types'

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n))
}

function phaseRelevance(key: AdaptationKey, phase: PhaseProfile['phase']): number {
  switch (phase) {
    case 'BASE':
      if (key === 'aerobic_capacity' || key === 'aerobic_durability') return 1
      if (key === 'long_run_tolerance') return 0.85
      if (key === 'max_strength') return 0.7
      return 0.45
    case 'BUILD':
      if (key === 'threshold' || key === 'aerobic_durability') return 1
      if (key === 'long_run_tolerance') return 0.9
      return 0.55
    case 'PEAK':
      if (key === 'threshold' || key === 'speed' || key === 'aerobic_capacity')
        return 1
      if (key === 'long_run_tolerance') return 0.7
      return 0.4
    case 'RACE':
      return key === 'running_economy' || key === 'threshold' ? 0.7 : 0.35
    default:
      return 0.5
  }
}

function trainability(key: AdaptationKey): number {
  switch (key) {
    case 'aerobic_durability':
    case 'long_run_tolerance':
      return 0.95
    case 'threshold':
      return 0.9
    case 'aerobic_capacity':
      return 0.85
    case 'speed':
      return 0.75
    case 'running_economy':
      return 0.7
    case 'max_strength':
      return 0.8
    default:
      return 0.7
  }
}

/** Rank limiting factors: gap × phase relevance × trainability × importance. */
export function calculateLimitingFactors(args: {
  gaps: GapAnalysis
  demand: RaceDemandProfile
  phase: PhaseProfile
}): LimitingFactorProfile {
  const factors: LimitingFactor[] = ADAPTATION_KEYS.map((key) => {
    const gap = args.gaps.gaps[key]
    const pr = phaseRelevance(key, args.phase.phase)
    const tr = trainability(key)
    const importance = args.demand.importance[key]
    const score = clamp01(gap * pr * tr * importance)
    return {
      adaptation: key,
      score: Math.round(score * 100) / 100,
      gap,
      phaseRelevance: pr,
      trainability: tr,
    }
  }).sort((a, b) => b.score - a.score)

  return {
    factors,
    primary: factors[0]!,
  }
}
