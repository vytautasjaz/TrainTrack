import { clamp01 } from './envelope'
import type {
  AthleteFingerprint,
  AthletePhysiologyModel,
  MetricEnvelope,
} from './types'

const RESPONDER_KEYS = [
  'volumeResponder',
  'frequencyResponder',
  'thresholdResponder',
  'vo2Responder',
  'longRunResponder',
] as const

type ResponderKey = (typeof RESPONDER_KEYS)[number]

function mergeEnvelope(
  fresh: MetricEnvelope,
  prior: MetricEnvelope | undefined,
  minPriorConf = 0.35,
): MetricEnvelope {
  if (!prior || prior.confidence < minPriorConf) {
    return {
      ...fresh,
      previousValue: prior?.value ?? fresh.previousValue ?? null,
    }
  }
  // Confidence-weighted blend; prior learning pulls fresh compute.
  const wPrior = clamp01(prior.confidence * 0.65)
  const wFresh = 1 - wPrior
  const value = Math.round((fresh.value * wFresh + prior.value * wPrior) * 1000) / 1000
  return {
    value,
    confidence: Math.min(0.95, Math.max(fresh.confidence, prior.confidence)),
    trend:
      value > (prior.value ?? value) + 0.02
        ? 'improving'
        : value < (prior.value ?? value) - 0.02
          ? 'declining'
          : prior.trend === 'stable'
            ? fresh.trend
            : prior.trend,
    lastUpdated: fresh.lastUpdated,
    previousValue: prior.value,
  }
}

/**
 * Merge a stored fingerprint into a freshly computed one so learning survives
 * across drafts. Fresh APM still wins on risk/capacity summaries when prior
 * confidence is low.
 */
export function mergeFingerprintWithPrior(args: {
  fresh: AthleteFingerprint
  prior: AthleteFingerprint | null | undefined
}): AthleteFingerprint {
  const { fresh, prior } = args
  if (!prior) return fresh

  const next: AthleteFingerprint = {
    ...fresh,
    asOf: fresh.asOf,
  }

  for (const key of RESPONDER_KEYS) {
    next[key] = mergeEnvelope(fresh[key], prior[key])
  }

  next.fatigueResistance = mergeEnvelope(
    fresh.fatigueResistance,
    prior.fatigueResistance,
  )
  next.recoverySpeed = mergeEnvelope(fresh.recoverySpeed, prior.recoverySpeed)
  next.injuryRiskVolumeKm = {
    ...fresh.injuryRiskVolumeKm,
    previousValue: prior.injuryRiskVolumeKm.value,
  }

  return next
}

/** Apply previous envelope values onto a freshly built APM for UI trends. */
export function applyPriorValuesToModel(args: {
  model: AthletePhysiologyModel
  prior: AthletePhysiologyModel | null | undefined
}): AthletePhysiologyModel {
  const { model, prior } = args
  if (!prior) return model

  const stamp = (
    fresh: MetricEnvelope,
    old: MetricEnvelope | undefined,
  ): MetricEnvelope => ({
    ...fresh,
    previousValue: old?.value ?? fresh.previousValue ?? null,
  })

  return {
    ...model,
    aerobic: {
      ...model.aerobic,
      aerobicStrength: stamp(
        model.aerobic.aerobicStrength,
        prior.aerobic.aerobicStrength,
      ),
      aerobicEfficiency: stamp(
        model.aerobic.aerobicEfficiency,
        prior.aerobic.aerobicEfficiency,
      ),
      volumeTolerance: model.aerobic.volumeTolerance,
      frequencyTolerance: model.aerobic.frequencyTolerance,
    },
    threshold: {
      thresholdStrength: stamp(
        model.threshold.thresholdStrength,
        prior.threshold.thresholdStrength,
      ),
      thresholdDurability: stamp(
        model.threshold.thresholdDurability,
        prior.threshold.thresholdDurability,
      ),
      thresholdResponse: stamp(
        model.threshold.thresholdResponse,
        prior.threshold.thresholdResponse,
      ),
    },
    intensity: {
      vo2Tolerance: stamp(
        model.intensity.vo2Tolerance,
        prior.intensity.vo2Tolerance,
      ),
      vo2Response: stamp(
        model.intensity.vo2Response,
        prior.intensity.vo2Response,
      ),
      speedResponse: stamp(
        model.intensity.speedResponse,
        prior.intensity.speedResponse,
      ),
    },
    fatigue: {
      fatigueResistance: stamp(
        model.fatigue.fatigueResistance,
        prior.fatigue.fatigueResistance,
      ),
      fatigueAccumulationRate: stamp(
        model.fatigue.fatigueAccumulationRate,
        prior.fatigue.fatigueAccumulationRate,
      ),
      overreachRisk: stamp(
        model.fatigue.overreachRisk,
        prior.fatigue.overreachRisk,
      ),
    },
    recovery: {
      recoverySpeed: stamp(
        model.recovery.recoverySpeed,
        prior.recovery.recoverySpeed,
      ),
      recoveryReliability: stamp(
        model.recovery.recoveryReliability,
        prior.recovery.recoveryReliability,
      ),
    },
    durability: {
      longRunTolerance: stamp(
        model.durability.longRunTolerance,
        prior.durability.longRunTolerance,
      ),
      fatigueResistanceLateRun: stamp(
        model.durability.fatigueResistanceLateRun,
        prior.durability.fatigueResistanceLateRun,
      ),
      marathonReadiness: stamp(
        model.durability.marathonReadiness,
        prior.durability.marathonReadiness,
      ),
    },
  }
}

export type { ResponderKey }
