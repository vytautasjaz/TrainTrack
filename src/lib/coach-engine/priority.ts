import {
  ADAPTATION_KEYS,
  type AdaptationKey,
  type AthleteState,
  type GapAnalysis,
  type PhaseProfile,
  type PriorityProfile,
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
    case 'RECOVERY':
    case 'TRANSITION':
      return 0.3
    default:
      return 0.55
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

/** Score priorities: 1 primary + up to 2 secondary adaptations. */
export function selectPriorities(args: {
  gaps: GapAnalysis
  demand: RaceDemandProfile
  phase: PhaseProfile
  state: AthleteState
}): PriorityProfile {
  const readiness = args.state.readiness.score
  const scored = ADAPTATION_KEYS.map((key) => {
    const gap = args.gaps.gaps[key]
    const importance = args.demand.importance[key]
    const phase = phaseRelevance(key, args.phase.phase)
    const train = trainability(key)
    const timeRelevance = 1
    const readinessCompat =
      key === 'speed' || key === 'max_strength'
        ? readiness
        : 0.7 + readiness * 0.3
    const score = clamp01(
      gap * importance * phase * train * timeRelevance * readinessCompat,
    )
    return { adaptation: key, score: Math.round(score * 100) / 100 }
  }).sort((a, b) => b.score - a.score)

  const primary = scored[0]!
  const secondary = scored.slice(1, 3).filter((s) => s.score >= 0.15)

  return { primary, secondary }
}
