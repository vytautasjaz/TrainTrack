/**
 * Athlete Physiology Model (APM) — Phase I types.
 * Spec: docs/ai-coach-engine/athlete-physiology-model.md
 */

export type MetricTrend = 'improving' | 'stable' | 'declining'

/** Shared envelope for every APM scalar metric. */
export type MetricEnvelope = {
  /** Usually 0–100 unless noted (e.g. injuryRiskVolumeKm). */
  value: number
  /** 0–1 data confidence. */
  confidence: number
  trend: MetricTrend
  lastUpdated: string
  previousValue?: number | null
}

/** Volume (km/week) or frequency (days/week) tolerance band. */
export type ToleranceRange = {
  current: number
  optimal: number
  upperLimit: number
  confidence: number
  trend: MetricTrend
  lastUpdated: string
}

export type AerobicProfile = {
  aerobicStrength: MetricEnvelope
  aerobicEfficiency: MetricEnvelope
  volumeTolerance: ToleranceRange
  frequencyTolerance: ToleranceRange
}

export type ThresholdProfile = {
  thresholdStrength: MetricEnvelope
  thresholdDurability: MetricEnvelope
  /** Updated by learning; Phase I seeds from consistency + completion. */
  thresholdResponse: MetricEnvelope
}

export type IntensityProfile = {
  vo2Tolerance: MetricEnvelope
  vo2Response: MetricEnvelope
  speedResponse: MetricEnvelope
}

export type FatigueProfile = {
  fatigueResistance: MetricEnvelope
  /** Higher = fatigues faster. */
  fatigueAccumulationRate: MetricEnvelope
  overreachRisk: MetricEnvelope
}

export type RecoveryProfile = {
  recoverySpeed: MetricEnvelope
  recoveryReliability: MetricEnvelope
}

export type DurabilityProfile = {
  /** Effective max long-run km. */
  longRunTolerance: MetricEnvelope
  fatigueResistanceLateRun: MetricEnvelope
  marathonReadiness: MetricEnvelope
}

export type AthletePhysiologyModel = {
  athleteId: string
  asOf: string
  schemaVersion: 1
  aerobic: AerobicProfile
  threshold: ThresholdProfile
  intensity: IntensityProfile
  fatigue: FatigueProfile
  recovery: RecoveryProfile
  durability: DurabilityProfile
}

/**
 * Compact plan-facing personalization vector.
 * Response tendencies are 0–1 (stored as MetricEnvelope.value).
 */
export type AthleteFingerprint = {
  athleteId: string
  asOf: string
  schemaVersion: 1
  volumeResponder: MetricEnvelope
  frequencyResponder: MetricEnvelope
  thresholdResponder: MetricEnvelope
  vo2Responder: MetricEnvelope
  longRunResponder: MetricEnvelope
  fatigueResistance: MetricEnvelope
  recoverySpeed: MetricEnvelope
  /** Soft weekly km risk threshold (not 0–100). */
  injuryRiskVolumeKm: MetricEnvelope
}

export type ResponseIntervention =
  | 'volume'
  | 'frequency'
  | 'threshold'
  | 'vo2'
  | 'long_run'
  | 'recovery'
  | 'maintain'

export type ResponsePrediction = {
  primaryIntervention: ResponseIntervention
  secondaryIntervention?: ResponseIntervention
  rationale: string[]
  confidence: number
}

/** Compact audit / meta snapshot (avoid bloating JSON). */
export type PhysiologyAuditSnapshot = {
  schemaVersion: 1
  asOf: string
  aerobicStrength: number
  volumeTolerance: { current: number; optimal: number; upperLimit: number }
  frequencyTolerance: { current: number; optimal: number; upperLimit: number }
  thresholdStrength: number
  overreachRisk: number
  recoverySpeed: number
  marathonReadiness: number
  fingerprint: {
    volumeResponder: number
    thresholdResponder: number
    vo2Responder: number
    longRunResponder: number
    fatigueResistance: number
  }
  responsePrediction: ResponsePrediction
  applied: {
    capacityPeakKmCapped: boolean
    norwegianBlockedByOverreach: boolean
    priorityBiased: boolean
  }
}
