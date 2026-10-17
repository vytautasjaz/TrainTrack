import type { AdaptationKey, GapAnalysis } from '@/lib/coach-engine/types'
import { clamp01 } from './envelope'
import type {
  AthleteFingerprint,
  AthletePhysiologyModel,
  ResponseIntervention,
  ResponsePrediction,
} from './types'

function largestGap(gaps: GapAnalysis): AdaptationKey | null {
  let best: AdaptationKey | null = null
  let bestVal = -1
  for (const [key, value] of Object.entries(gaps.gaps) as [
    AdaptationKey,
    number,
  ][]) {
    if (value > bestVal) {
      bestVal = value
      best = key
    }
  }
  return best
}

/**
 * Same gap ≠ same intervention — bias by fingerprint + overreach.
 * Soft influence only when confidence is low.
 */
export function predictResponse(args: {
  gaps: GapAnalysis
  fingerprint: AthleteFingerprint
  model: AthletePhysiologyModel
}): ResponsePrediction {
  const { gaps, fingerprint: fp, model } = args
  const rationale: string[] = []
  const overreach = model.fatigue.overreachRisk.value
  const recovery = model.recovery.recoverySpeed.value

  if (overreach >= 65 || recovery < 40) {
    rationale.push(
      overreach >= 65 ? 'high_overreach_risk' : 'low_recovery_speed',
    )
    return {
      primaryIntervention: 'recovery',
      secondaryIntervention: 'volume',
      rationale,
      confidence: clamp01(
        0.45 + model.fatigue.overreachRisk.confidence * 0.4,
      ),
    }
  }

  const gapKey = largestGap(gaps)
  const candidates: { intervention: ResponseIntervention; score: number }[] = [
    { intervention: 'volume', score: fp.volumeResponder.value },
    { intervention: 'frequency', score: fp.frequencyResponder.value },
    { intervention: 'threshold', score: fp.thresholdResponder.value },
    { intervention: 'vo2', score: fp.vo2Responder.value },
    { intervention: 'long_run', score: fp.longRunResponder.value },
  ]

  // Gap → preferred stimulus family
  if (gapKey === 'threshold') {
    candidates.find((c) => c.intervention === 'threshold')!.score += 0.25
    candidates.find((c) => c.intervention === 'volume')!.score += 0.1
    rationale.push('gap_threshold')
  } else if (gapKey === 'aerobic_capacity' || gapKey === 'speed') {
    candidates.find((c) => c.intervention === 'vo2')!.score += 0.2
    rationale.push(`gap_${gapKey}`)
  } else if (
    gapKey === 'aerobic_durability' ||
    gapKey === 'long_run_tolerance'
  ) {
    candidates.find((c) => c.intervention === 'long_run')!.score += 0.2
    candidates.find((c) => c.intervention === 'volume')!.score += 0.15
    rationale.push(`gap_${gapKey}`)
  } else if (gapKey === 'running_economy') {
    candidates.find((c) => c.intervention === 'frequency')!.score += 0.15
    candidates.find((c) => c.intervention === 'volume')!.score += 0.1
    rationale.push('gap_running_economy')
  } else {
    rationale.push(gapKey ? `gap_${gapKey}` : 'gap_unknown')
  }

  // Prefer volume over VO2 when VO2 tolerance is weak
  if (model.intensity.vo2Tolerance.value < 45) {
    candidates.find((c) => c.intervention === 'vo2')!.score -= 0.2
    rationale.push('low_vo2_tolerance')
  }

  candidates.sort((a, b) => b.score - a.score)
  const primary = candidates[0]!
  const secondary = candidates[1]

  const conf = clamp01(
    (fp.volumeResponder.confidence +
      fp.thresholdResponder.confidence +
      model.fatigue.overreachRisk.confidence) /
      3,
  )

  if (primary.score < 0.35) {
    return {
      primaryIntervention: 'maintain',
      rationale: [...rationale, 'low_responder_signal'],
      confidence: conf * 0.7,
    }
  }

  return {
    primaryIntervention: primary.intervention,
    secondaryIntervention:
      secondary && secondary.score >= 0.4
        ? secondary.intervention
        : undefined,
    rationale,
    confidence: Math.round(conf * 100) / 100,
  }
}
