import type {
  AthleteState,
  GoalProfile,
  MethodologyConstraint,
  MethodologySelection,
  PhaseProfile,
  PriorityProfile,
  TrainingModelId,
} from '@/lib/coach-engine/types'

const WEIGHTS = {
  goalFit: 0.2,
  athleteLevel: 0.1,
  phaseFit: 0.15,
  sportFit: 0.15,
  responseFit: 0.15,
  recoveryFit: 0.1,
  currentLoad: 0.05,
  timeFit: 0.05,
  dataConfidence: 0.05,
} as const

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n))
}

export type NorwegianEligibility = {
  eligible: boolean
  reasons: string[]
  proxyMode: boolean
}

/** Norwegian / double-threshold requires advanced athlete + recovery capacity. */
export function evaluateNorwegianEligibility(
  state: AthleteState,
  goal: GoalProfile,
): NorwegianEligibility {
  const reasons: string[] = []
  let eligible = true
  const proxyMode = state.metrics.thresholdPace.confidence < 0.8

  if (goal.level === 'beginner') {
    eligible = false
    reasons.push('beginner_level')
  }
  if (state.consistency < 0.6) {
    eligible = false
    reasons.push('low_consistency')
  }
  if (state.recentVolume.runningKmPerWeek < 35 && goal.demandId !== '5K_V1') {
    eligible = false
    reasons.push('insufficient_volume_base')
  }
  if (state.readiness.score < 0.55) {
    eligible = false
    reasons.push('low_readiness')
  }
  if (eligible) {
    reasons.push(proxyMode ? 'eligible_proxy_mode' : 'eligible_full')
  }
  return { eligible, reasons, proxyMode }
}

function scoreModel(args: {
  model: TrainingModelId
  state: AthleteState
  goal: GoalProfile
  phase: PhaseProfile
  priority: PriorityProfile
  norwegian: NorwegianEligibility
}): { score: number; reasons: string[]; constraints: MethodologyConstraint[] } {
  const { model, state, goal, phase, priority, norwegian } = args
  const reasons: string[] = []
  const constraints: MethodologyConstraint[] = ['protect_key_quality_session']

  let goalFit = 0.5
  let phaseFit = 0.5
  let athleteFit = 0.5
  let sportFit = 0.7
  let responseFit = 0.55
  let recoveryFit = state.readiness.score
  const loadFit = clamp01(1 - state.trainingLoad.cardiovascular / 120)
  const timeFit = 0.7
  const dataConf =
    (state.metrics.thresholdPace.confidence +
      state.metrics.weeklyVolumeKm.confidence) /
    2

  let risk = 0
  let complexity = 0

  switch (model) {
    case 'PYRAMIDAL':
      goalFit =
        goal.demandId === 'MARATHON_V1' || goal.demandId === 'HALF_V1'
          ? 0.9
          : goal.demandId === 'MULTI_BASE_V1'
            ? 0.85
            : 0.65
      phaseFit =
        phase.phase === 'BASE' || phase.phase === 'BUILD' ? 0.9 : 0.6
      athleteFit = goal.level === 'beginner' ? 0.9 : 0.75
      reasons.push('high_aerobic_volume_opportunity')
      if (goal.demandId === 'MARATHON_V1') reasons.push('long_distance_goal')
      constraints.push('limit_moderate_intensity_accumulation')
      break
    case 'POLARIZED':
      goalFit = goal.demandId === '5K_V1' ? 0.85 : 0.65
      phaseFit = phase.phase === 'BUILD' || phase.phase === 'PEAK' ? 0.8 : 0.55
      athleteFit =
        goal.level === 'advanced' || goal.level === 'elite' ? 0.85 : 0.45
      responseFit =
        priority.primary.adaptation === 'aerobic_capacity' ||
        priority.primary.adaptation === 'speed'
          ? 0.8
          : 0.5
      constraints.push('prefer_high_intensity_sparingly')
      reasons.push('polarized_high_low_split')
      if (goal.level === 'beginner') risk += 0.25
      break
    case 'THRESHOLD':
      goalFit =
        goal.demandId === 'HALF_V1' || priority.primary.adaptation === 'threshold'
          ? 0.88
          : 0.55
      phaseFit =
        phase.phase === 'BUILD' || phase.phase === 'PEAK' ? 0.85 : 0.45
      athleteFit =
        goal.level === 'advanced' || goal.level === 'elite' ? 0.8 : 0.4
      recoveryFit *= 0.9
      constraints.push('allow_controlled_threshold_density')
      reasons.push('threshold_event_relevance')
      if (state.readiness.score < 0.7) risk += 0.2
      complexity += 0.1
      break
    case 'RACE_SPECIFIC':
      goalFit = phase.weeksToRace != null && phase.weeksToRace <= 8 ? 0.95 : 0.4
      phaseFit =
        phase.phase === 'PEAK' || phase.phase === 'RACE' ? 0.95 : 0.35
      constraints.push('increase_race_specificity')
      reasons.push('race_proximity_specificity')
      break
    case 'BLOCK':
      goalFit = 0.55
      phaseFit = phase.phase === 'BUILD' ? 0.7 : 0.4
      athleteFit = goal.level === 'elite' ? 0.75 : 0.45
      complexity += 0.25
      reasons.push('concentrated_emphasis_optional')
      break
    case 'HYBRID':
      goalFit = 0.7
      phaseFit = 0.7
      athleteFit = 0.7
      reasons.push('balanced_hybrid_default')
      break
    case 'NORWEGIAN':
      if (!norwegian.eligible) {
        return {
          score: 0.05,
          reasons: norwegian.reasons,
          constraints: ['no_double_threshold'],
        }
      }
      goalFit =
        priority.primary.adaptation === 'threshold' ||
        goal.demandId === 'HALF_V1' ||
        goal.demandId === 'MARATHON_V1'
          ? 0.85
          : 0.55
      phaseFit =
        phase.phase === 'BASE' || phase.phase === 'BUILD' ? 0.85 : 0.5
      athleteFit = 0.85
      constraints.push('allow_controlled_threshold_density')
      if (norwegian.proxyMode) {
        // HR/proxy control only — keep single daily threshold, not doubles.
        constraints.push('require_lactate_or_proxy', 'no_double_threshold')
      } else {
        // True Norwegian: AM+PM controlled threshold on one day, easy next day.
        constraints.push('allow_double_threshold_day')
      }
      reasons.push(...norwegian.reasons)
      if (!norwegian.proxyMode) reasons.push('double_threshold_day_enabled')
      complexity += 0.3
      risk += norwegian.proxyMode ? 0.15 : 0.05
      break
  }

  const sport =
    goal.sport === 'RUN' || goal.sport === 'HYROX' || goal.sport === 'TRIATHLON'
      ? 0.85
      : 0.6
  sportFit = sport

  const raw =
    goalFit * WEIGHTS.goalFit +
    athleteFit * WEIGHTS.athleteLevel +
    phaseFit * WEIGHTS.phaseFit +
    sportFit * WEIGHTS.sportFit +
    responseFit * WEIGHTS.responseFit +
    recoveryFit * WEIGHTS.recoveryFit +
    loadFit * WEIGHTS.currentLoad +
    timeFit * WEIGHTS.timeFit +
    dataConf * WEIGHTS.dataConfidence

  const score = clamp01(raw - risk - complexity * 0.5)
  return {
    score: Math.round(score * 100) / 100,
    reasons,
    constraints: [...new Set(constraints)],
  }
}

const ALL_MODELS: TrainingModelId[] = [
  'PYRAMIDAL',
  'POLARIZED',
  'THRESHOLD',
  'RACE_SPECIFIC',
  'BLOCK',
  'HYBRID',
  'NORWEGIAN',
]

/** Deterministic methodology selection with confidence and alternatives. */
export function selectMethodology(args: {
  state: AthleteState
  goal: GoalProfile
  phase: PhaseProfile
  priority: PriorityProfile
  lockedModel?: TrainingModelId | null
}): MethodologySelection {
  const norwegian = evaluateNorwegianEligibility(args.state, args.goal)

  if (args.lockedModel) {
    const locked = scoreModel({
      model: args.lockedModel,
      ...args,
      norwegian,
    })
    let constraints = [...locked.constraints]
    const reasonCodes = ['coach_override', ...locked.reasons]
    // Explicit Norwegian choice: enable same-day doubles when the athlete
    // is not a beginner (even if auto-score was marginal).
    if (
      args.lockedModel === 'NORWEGIAN' &&
      args.goal.level !== 'beginner'
    ) {
      constraints = constraints.filter((c) => c !== 'no_double_threshold')
      if (!constraints.includes('allow_controlled_threshold_density')) {
        constraints.push('allow_controlled_threshold_density')
      }
      if (!constraints.includes('allow_double_threshold_day')) {
        constraints.push('allow_double_threshold_day')
      }
      if (!reasonCodes.includes('double_threshold_day_enabled')) {
        reasonCodes.push('double_threshold_day_enabled')
      }
    }
    return {
      selectedModel: args.lockedModel,
      confidence: Math.min(0.95, locked.score + 0.15),
      alternatives: [],
      reasonCodes,
      constraints: [...new Set(constraints)],
      norwegianEligible: norwegian.eligible,
    }
  }

  const scored = ALL_MODELS.map((model) => {
    const result = scoreModel({ model, ...args, norwegian })
    return { model, ...result }
  }).sort((a, b) => b.score - a.score)

  const best = scored[0]!
  const second = scored[1]
  const margin = second ? best.score - second.score : best.score
  const dataConf =
    (args.state.metrics.thresholdPace.confidence +
      args.state.metrics.weeklyVolumeKm.confidence) /
    2
  const confidence = clamp01(best.score * 0.7 + margin * 0.5 + dataConf * 0.3)

  return {
    selectedModel: best.model,
    confidence: Math.round(confidence * 100) / 100,
    alternatives: scored.slice(1, 4).map((s) => ({
      model: s.model,
      score: s.score,
    })),
    reasonCodes: best.reasons,
    constraints: best.constraints,
    norwegianEligible: norwegian.eligible,
  }
}
