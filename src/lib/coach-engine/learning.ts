import type {
  ActualResponse,
  AdaptationKey,
  AdaptationScores,
  ExpectedResponse,
  PlannedSession,
  ResponseComparison,
  CapabilityProfile,
} from '@/lib/coach-engine/types'
import { ADAPTATION_KEYS } from '@/lib/coach-engine/types'

export function expectedResponseForSession(
  session: PlannedSession,
): ExpectedResponse {
  const hard = Boolean(session.isKeySession) || session.estimatedTss >= 55
  return {
    expectedRpe: hard ? 7.5 : session.estimatedTss >= 35 ? 5.5 : 4,
    expectedCompletion: 1,
    expectedTss: session.estimatedTss,
    adaptationTarget: session.primaryAdaptation,
  }
}

export function compareResponse(
  expected: ExpectedResponse,
  actual: ActualResponse,
): ResponseComparison {
  if (actual.missed || actual.completion < 0.2) {
    return {
      rpeDelta: null,
      completionGap: 1 - actual.completion,
      interpretation: 'missed',
      recommendedAction: 'do_not_reschedule',
    }
  }
  const rpeDelta =
    actual.actualRpe != null ? actual.actualRpe - expected.expectedRpe : null
  if (rpeDelta != null && rpeDelta >= 1.5 && actual.completion >= 0.9) {
    return {
      rpeDelta,
      completionGap: 1 - actual.completion,
      interpretation: 'underperformed',
      recommendedAction: 'reduce_next_hard',
    }
  }
  if (actual.completion < 0.7) {
    return {
      rpeDelta,
      completionGap: 1 - actual.completion,
      interpretation: 'underperformed',
      recommendedAction: 'replan_week',
    }
  }
  if (rpeDelta != null && rpeDelta <= -1.2 && actual.completion >= 0.95) {
    return {
      rpeDelta,
      completionGap: 1 - actual.completion,
      interpretation: 'overperformed',
      recommendedAction: 'keep',
    }
  }
  return {
    rpeDelta,
    completionGap: 1 - actual.completion,
    interpretation: 'on_track',
    recommendedAction: 'keep',
  }
}

/** Nudge capability scores from repeated on-track / underperformed weeks. */
export function updateCapabilitiesFromResponses(
  current: CapabilityProfile,
  outcomes: { adaptation: AdaptationKey | null; interpretation: ResponseComparison['interpretation'] }[],
): CapabilityProfile {
  const next = { ...current.capabilities } as AdaptationScores
  for (const key of ADAPTATION_KEYS) {
    const related = outcomes.filter((o) => o.adaptation === key)
    if (!related.length) continue
    const onTrack = related.filter((o) => o.interpretation === 'on_track').length
    const under = related.filter((o) => o.interpretation === 'underperformed').length
    const delta = (onTrack * 0.01 - under * 0.015) / Math.max(1, related.length)
    next[key] = Math.min(1, Math.max(0, Math.round((next[key] + delta) * 100) / 100))
  }
  return {
    capabilities: next,
    confidence: Math.min(0.95, current.confidence + 0.02),
  }
}

/** Simple exponential decay toward baseline when untrained. */
export function applyAdaptationDecay(
  capabilities: CapabilityProfile,
  weeksSinceStimulus: Partial<Record<AdaptationKey, number>>,
): CapabilityProfile {
  const next = { ...capabilities.capabilities } as AdaptationScores
  for (const key of ADAPTATION_KEYS) {
    const weeks = weeksSinceStimulus[key] ?? 0
    if (weeks <= 2) continue
    const decay = Math.min(0.08, (weeks - 2) * 0.015)
    next[key] = Math.max(0.2, Math.round((next[key] - decay) * 100) / 100)
  }
  return { ...capabilities, capabilities: next }
}

/**
 * Missed key session: do not blindly move to next day.
 * Returns a simple replan hint for the remaining week.
 */
export function missedWorkoutAction(args: {
  missedIsKey: boolean
  daysUntilLong: number
  readinessScore: number
}): 'skip_stimulus' | 'reduce_later' | 'keep_schedule' {
  if (!args.missedIsKey) return 'keep_schedule'
  if (args.daysUntilLong <= 1 || args.readinessScore < 0.6) return 'skip_stimulus'
  return 'reduce_later'
}
