import {
  ADAPTATION_KEYS,
  type AdaptationKey,
  type AdaptationScores,
  type AthleteState,
  type CapabilityProfile,
  type CollectedAthleteData,
  type CollectedSession,
  type GoalProfile,
} from '@/lib/coach-engine/types'

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n))
}

function blank(score: number): AdaptationScores {
  const out = {} as AdaptationScores
  for (const key of ADAPTATION_KEYS) out[key] = score
  return out
}

function levelBase(level: GoalProfile['level']): number {
  switch (level) {
    case 'beginner':
      return 0.45
    case 'advanced':
      return 0.72
    case 'elite':
      return 0.82
    default:
      return 0.6
  }
}

function avg(nums: number[]): number {
  if (!nums.length) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function stdev(nums: number[]): number {
  if (nums.length < 2) return 0
  const mean = avg(nums)
  const variance = avg(nums.map((n) => (n - mean) ** 2))
  return Math.sqrt(variance)
}

/**
 * Outcome-derived signals from recent weeks / sessions.
 * Used to calibrate capability heuristics beyond declared level + km + pace-present.
 */
export type CapabilityOutcomeSignals = {
  /** Share of planned sessions completed (0–1). */
  completionRate: number
  /** Skip density (0–1). */
  skipRate: number
  /** Mean RPE of recent logged sessions (null if none). */
  avgRpe: number | null
  /** Sessions completed with RPE ≥ 7 (proxy for quality tolerance). */
  hardSessionCompletions: number
  /** Longest recent completed run km. */
  longestRunKm: number
  /** Coefficient of variation of weekly completed km (0 = stable). */
  volumeCv: number
  /** Improving / declining / stable / unknown mapped to −1…1. */
  trendSignal: number
  /** How much history we trust (0–1). */
  historyWeight: number
}

export function deriveCapabilityOutcomeSignals(
  state: AthleteState,
  data: CollectedAthleteData,
): CapabilityOutcomeSignals {
  const weeks = data.weekSummaries.slice(0, 8)
  const planned = weeks.reduce((s, w) => s + w.planned, 0)
  const completed = weeks.reduce((s, w) => s + w.completed, 0)
  const skipped = weeks.reduce((s, w) => s + w.skipped, 0)
  const completionRate =
    planned > 0 ? clamp01(completed / planned) : state.consistency
  const skipRate = planned > 0 ? clamp01(skipped / planned) : 0

  const logged = data.recentSessions.filter(
    (s) => s.status === 'COMPLETED' || (s.actualDistanceKm ?? 0) > 0,
  )
  const rpes = logged
    .map((s) => s.rpe)
    .filter((r): r is number => r != null && r > 0)
  const avgRpe = rpes.length ? avg(rpes) : null
  const hardSessionCompletions = logged.filter(
    (s) => (s.rpe ?? 0) >= 7 || (s.estimatedTss ?? 0) >= 70,
  ).length

  const longestRunKm = Math.max(
    0,
    ...logged.map((s) => s.actualDistanceKm ?? s.plannedDistanceKm ?? 0),
  )

  const weeklyKm = weeks.map((w) => w.completedDistanceKm).filter((k) => k > 0)
  const meanKm = avg(weeklyKm)
  const volumeCv =
    meanKm > 0 ? Math.min(1.5, stdev(weeklyKm) / meanKm) : 1

  const trendSignal =
    state.performanceTrend.running === 'improving'
      ? 1
      : state.performanceTrend.running === 'declining'
        ? -1
        : state.performanceTrend.running === 'stable'
          ? 0.25
          : 0

  const historyWeight = clamp01(
    weeks.length / 6 +
      Math.min(0.35, logged.length / 20) +
      (state.metrics.weeklyVolumeKm.confidence > 0.5 ? 0.15 : 0),
  )

  return {
    completionRate,
    skipRate,
    avgRpe,
    hardSessionCompletions,
    longestRunKm,
    volumeCv,
    trendSignal,
    historyWeight,
  }
}

function paceQuality(
  confidence: number,
  present: boolean,
): number {
  if (!present) return 0
  // Confidence matters more than binary presence.
  return 0.05 + confidence * 0.2
}

function inferSessionAdaptation(session: CollectedSession): AdaptationKey | null {
  const title = `${session.title}`.toLowerCase()
  if (/long|lsr|endurance/.test(title)) return 'long_run_tolerance'
  if (/threshold|tempo|cruise/.test(title)) return 'threshold'
  if (/vo2|interval|speed|rep/.test(title)) return 'speed'
  if (/easy|recovery|aerobic/.test(title)) return 'aerobic_capacity'
  if (/strength|gym|lift/.test(title)) return 'max_strength'
  if ((session.estimatedTss ?? 0) >= 70 || (session.rpe ?? 0) >= 7) {
    return 'threshold'
  }
  if ((session.actualDistanceKm ?? session.plannedDistanceKm ?? 0) >= 16) {
    return 'long_run_tolerance'
  }
  return 'aerobic_durability'
}

function outcomeNudgeFromSessions(
  data: CollectedAthleteData,
): Partial<Record<AdaptationKey, number>> {
  const nudges: Partial<Record<AdaptationKey, number>> = {}
  const sessions = data.recentSessions.slice(0, 16)
  for (const session of sessions) {
    const key = inferSessionAdaptation(session)
    if (!key) continue
    const completed =
      session.status === 'COMPLETED' ||
      (session.actualDistanceKm ?? 0) > 0 ||
      (session.actualDurationMin ?? 0) > 0
    if (!completed) {
      nudges[key] = (nudges[key] ?? 0) - 0.012
      continue
    }
    const plannedKm = session.plannedDistanceKm
    const actualKm = session.actualDistanceKm
    const completion =
      plannedKm != null && plannedKm > 0 && actualKm != null
        ? clamp01(actualKm / plannedKm)
        : 1
    const rpe = session.rpe
    // On-track: finished most of the work without extreme RPE.
    if (completion >= 0.9 && (rpe == null || rpe <= 8)) {
      nudges[key] = (nudges[key] ?? 0) + 0.01
    } else if (completion < 0.7 || (rpe != null && rpe >= 9)) {
      nudges[key] = (nudges[key] ?? 0) - 0.015
    }
  }
  return nudges
}

/**
 * Heuristic capability scores (0–1), calibrated with outcome signals.
 * Declared level / weekly km / pace presence remain priors; history outcomes
 * reweight when historyWeight is high.
 */
export function calculateCapabilities(
  state: AthleteState,
  data: CollectedAthleteData,
  goal: GoalProfile,
): CapabilityProfile {
  const base = levelBase(goal.level)
  const outcomes = deriveCapabilityOutcomeSignals(state, data)
  const hw = outcomes.historyWeight
  // Prior weight shrinks as we gather real outcomes.
  const priorW = 1 - hw * 0.55
  const outcomeW = 1 - priorW

  const volume = clamp01(state.recentVolume.runningKmPerWeek / 55)
  const consistency = state.consistency
  const completionBoost = (outcomes.completionRate - 0.75) * 0.25
  const skipPenalty = outcomes.skipRate * 0.2
  const rpeEase =
    outcomes.avgRpe == null
      ? 0
      : clamp01((6.5 - outcomes.avgRpe) / 5) * 0.12
  const hardTol = clamp01(outcomes.hardSessionCompletions / 6) * 0.15
  const longTolOutcome = clamp01(outcomes.longestRunKm / 28)
  const stability = clamp01(1 - outcomes.volumeCv) * 0.12
  const trend = outcomes.trendSignal * 0.06

  const thresholdPaceQ = paceQuality(
    state.metrics.thresholdPace.confidence,
    data.paces.threshold != null,
  )
  const easyPaceQ = paceQuality(
    state.metrics.easyPace.confidence,
    data.paces.easy != null,
  )
  const vo2Present = data.paces.vo2 != null ? 0.08 : 0

  const priorBlend = (parts: number[]) =>
    clamp01(parts.reduce((a, b) => a + b, 0))

  const caps = blank(base)

  const aerobicPrior = priorBlend([
    base * 0.45,
    volume * 0.25,
    consistency * 0.15,
    vo2Present,
    easyPaceQ * 0.4,
  ])
  const aerobicOutcome = priorBlend([
    0.45 + completionBoost + rpeEase + stability + trend,
    volume * 0.35,
    hardTol * 0.4,
  ])
  caps.aerobic_capacity = clamp01(
    aerobicPrior * priorW + aerobicOutcome * outcomeW,
  )

  const thresholdPrior = priorBlend([
    base * 0.4,
    volume * 0.15,
    consistency * 0.15,
    thresholdPaceQ,
  ])
  const thresholdOutcome = priorBlend([
    0.4 + completionBoost - skipPenalty + hardTol + trend,
    volume * 0.2,
    thresholdPaceQ * 0.8,
  ])
  caps.threshold = clamp01(
    thresholdPrior * priorW + thresholdOutcome * outcomeW,
  )

  const durabilityPrior = priorBlend([
    base * 0.35,
    volume * 0.35,
    consistency * 0.2,
  ])
  const durabilityOutcome = priorBlend([
    0.4 + completionBoost + stability + trend,
    volume * 0.4,
    longTolOutcome * 0.25,
  ])
  caps.aerobic_durability = clamp01(
    durabilityPrior * priorW + durabilityOutcome * outcomeW,
  )

  const economyPrior = priorBlend([
    base * 0.45,
    easyPaceQ,
    consistency * 0.2,
    volume * 0.1,
  ])
  const economyOutcome = priorBlend([
    0.45 + rpeEase + completionBoost * 0.5 + stability,
    easyPaceQ,
  ])
  caps.running_economy = clamp01(
    economyPrior * priorW + economyOutcome * outcomeW,
  )

  const longPrior = priorBlend([
    base * 0.3,
    volume * 0.4,
    consistency * 0.2,
  ])
  const longOutcome = priorBlend([
    0.35 + longTolOutcome * 0.45 + completionBoost + trend,
    volume * 0.3,
  ])
  caps.long_run_tolerance = clamp01(
    longPrior * priorW + longOutcome * outcomeW,
  )

  const speedPrior = priorBlend([
    base * 0.45,
    vo2Present,
    consistency * 0.15,
    volume * 0.1,
  ])
  const speedOutcome = priorBlend([
    0.4 + hardTol + completionBoost * 0.5 + trend,
    vo2Present,
  ])
  caps.speed = clamp01(speedPrior * priorW + speedOutcome * outcomeW)

  const strengthPrior = priorBlend([
    base * 0.45,
    goal.demandId === 'HYROX_V1' ? 0.12 : 0,
    consistency * 0.2,
    volume * 0.08,
  ])
  const strengthOutcome = priorBlend([
    0.42 + hardTol * 0.5 + completionBoost * 0.4,
    goal.demandId === 'HYROX_V1' ? 0.1 : 0,
  ])
  caps.max_strength = clamp01(
    strengthPrior * priorW + strengthOutcome * outcomeW,
  )

  const nudges = outcomeNudgeFromSessions(data)
  for (const key of ADAPTATION_KEYS) {
    const delta = nudges[key] ?? 0
    if (delta !== 0) {
      caps[key] = clamp01(caps[key] + delta * (0.5 + hw))
    }
  }

  const confidence = clamp01(
    0.18 +
      hw * 0.45 +
      state.metrics.thresholdPace.confidence * 0.12 +
      state.metrics.weeklyVolumeKm.confidence * 0.12 +
      consistency * 0.12 +
      (outcomes.avgRpe != null ? 0.08 : 0),
  )

  return {
    capabilities: roundScores(caps),
    confidence: Math.round(confidence * 100) / 100,
  }
}

function roundScores(scores: AdaptationScores): AdaptationScores {
  const out = {} as AdaptationScores
  for (const key of ADAPTATION_KEYS) {
    out[key] = Math.round(scores[key] * 100) / 100
  }
  return out
}

export function calculateGaps(
  capabilities: CapabilityProfile,
  demands: AdaptationScores,
): import('@/lib/coach-engine/types').GapAnalysis {
  const gaps = {} as AdaptationScores
  const rows: {
    key: AdaptationKey
    demand: number
    capability: number
    gap: number
  }[] = []

  for (const key of ADAPTATION_KEYS) {
    const demand = demands[key]
    const capability = capabilities.capabilities[key]
    const gap = Math.round(Math.max(0, demand - capability) * 100) / 100
    gaps[key] = gap
    rows.push({ key, demand, capability, gap })
  }

  rows.sort((a, b) => b.gap - a.gap)
  return { gaps, rows }
}
