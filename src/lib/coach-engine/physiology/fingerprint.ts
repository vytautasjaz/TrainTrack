import { clamp01, envelope } from './envelope'
import type {
  AthleteFingerprint,
  AthletePhysiologyModel,
  MetricEnvelope,
} from './types'

function toResponder(
  score0to100: number,
  confidence: number,
  asOf: string,
  trend: MetricEnvelope['trend'],
): MetricEnvelope {
  return envelope(clamp01(score0to100 / 100), confidence, trend, asOf)
}

/** Derive plan-facing fingerprint from APM profiles. */
export function buildAthleteFingerprint(
  model: AthletePhysiologyModel,
): AthleteFingerprint {
  const asOf = model.asOf
  const vol = model.aerobic.volumeTolerance
  const volResponderScore =
    model.aerobic.aerobicStrength.value * 0.5 +
    (vol.confidence * 100) * 0.15 +
    (100 - model.fatigue.overreachRisk.value) * 0.35

  return {
    athleteId: model.athleteId,
    asOf,
    schemaVersion: 1,
    volumeResponder: toResponder(
      volResponderScore,
      vol.confidence,
      asOf,
      vol.trend,
    ),
    frequencyResponder: toResponder(
      model.aerobic.frequencyTolerance.optimal * 12 +
        model.recovery.recoveryReliability.value * 0.4,
      model.aerobic.frequencyTolerance.confidence,
      asOf,
      'stable',
    ),
    thresholdResponder: toResponder(
      model.threshold.thresholdResponse.value * 0.55 +
        model.threshold.thresholdStrength.value * 0.45,
      model.threshold.thresholdResponse.confidence,
      asOf,
      model.threshold.thresholdResponse.trend,
    ),
    vo2Responder: toResponder(
      model.intensity.vo2Response.value * 0.6 +
        model.intensity.vo2Tolerance.value * 0.4,
      model.intensity.vo2Response.confidence,
      asOf,
      model.intensity.vo2Response.trend,
    ),
    longRunResponder: toResponder(
      model.durability.marathonReadiness.value * 0.45 +
        (model.durability.longRunTolerance.value / 40) * 55,
      model.durability.longRunTolerance.confidence,
      asOf,
      model.durability.longRunTolerance.trend,
    ),
    fatigueResistance: model.fatigue.fatigueResistance,
    recoverySpeed: model.recovery.recoverySpeed,
    injuryRiskVolumeKm: envelope(
      model.aerobic.volumeTolerance.upperLimit,
      model.aerobic.volumeTolerance.confidence,
      model.aerobic.volumeTolerance.trend,
      asOf,
    ),
  }
}
