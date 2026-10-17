import type {
  AdaptationKey,
  AthleteState,
  CapacityProfile,
  GoalProfile,
  PriorityProfile,
} from '@/lib/coach-engine/types'
import { buildWeeklyCapacityEnvelope } from '@/lib/coach-engine/capacity'
import {
  modalityCapsFromChannels,
  resolveSportArchitecture,
  scaleArchitectureChannels,
} from '@/lib/coach-engine/sport-architecture'
import type {
  AthleteFingerprint,
  AthletePhysiologyModel,
  PhysiologyAuditSnapshot,
  ResponsePrediction,
} from './types'

const MIN_CONF = 0.35

export type ApmCapacityApplication = {
  capacity: CapacityProfile
  peakKmCapped: boolean
  sessionsCapped: boolean
}

/**
 * Soft-cap peak volume / sessions from APM tolerances when confidence is usable.
 * Never expands capacity beyond what calculateCapacity already set (safety-first).
 */
export function applyPhysiologyToCapacity(args: {
  capacity: CapacityProfile
  model: AthletePhysiologyModel
  goal: GoalProfile
}): ApmCapacityApplication {
  const { capacity, model, goal } = args
  const vol = model.aerobic.volumeTolerance
  const freq = model.aerobic.frequencyTolerance
  const overreach = model.fatigue.overreachRisk

  // Marathon standard blocks keep deterministic capacity / long-run gates.
  // APM still influences methodology + priorities; volume soft-caps are for
  // shorter / non-marathon goals where undercutting peak is safer.
  if (goal.demandId === 'MARATHON_V1' && goal.weekCount >= 12) {
    return { capacity, peakKmCapped: false, sessionsCapped: false }
  }

  let maxPeakKm = capacity.envelope.maxPeakKm
  let maxWeeklyKm = capacity.maxWeeklyKm
  let peakKmCapped = false
  let sessionsCapped = false

  if (vol.confidence >= MIN_CONF && vol.upperLimit > 0) {
    if (maxPeakKm > vol.upperLimit) {
      maxPeakKm = vol.upperLimit
      peakKmCapped = true
    }
    // Present week soft ceiling toward optimal when overreach elevated.
    if (overreach.value >= 55 && overreach.confidence >= MIN_CONF) {
      const soft = Math.max(vol.current, vol.optimal * 0.95)
      if (maxWeeklyKm > soft) {
        maxWeeklyKm = Math.round(soft * 10) / 10
        peakKmCapped = true
      }
    }
  }

  let maxSessions = capacity.maxSessionsPerWeek
  if (freq.confidence >= MIN_CONF) {
    const freqCap = Math.floor(freq.upperLimit)
    if (freqCap >= 3 && maxSessions > freqCap) {
      maxSessions = freqCap
      sessionsCapped = true
    }
  }

  if (!peakKmCapped && !sessionsCapped) {
    return { capacity, peakKmCapped: false, sessionsCapped: false }
  }

  const architecture = resolveSportArchitecture({
    demandId: goal.demandId,
    level: goal.level,
  })
  const readinessFactor = 0.9
  const sportChannels = scaleArchitectureChannels(architecture, {
    runKmBaseline: capacity.envelope.baselineKm,
    readinessFactor,
  })

  const envelope = buildWeeklyCapacityEnvelope({
    baselineKm: capacity.envelope.baselineKm,
    baselineTss: capacity.envelope.baselineTss,
    maxPeakKm,
    maxPeakTss: Math.round(maxPeakKm * 4.5),
    weekCount: capacity.envelope.weekCount,
    safeProgressionRatio: capacity.envelope.safeProgressionRatio,
    deloadRatio: capacity.envelope.deloadRatio,
    readinessFactor,
    sportChannels: capacity.envelope.weeks.some((w) => w.modalityVolumes)
      ? sportChannels
      : undefined,
  })

  return {
    capacity: {
      ...capacity,
      maxWeeklyKm,
      maxSessionsPerWeek: maxSessions,
      maxHardSessionsPerWeek: Math.min(
        capacity.maxHardSessionsPerWeek,
        maxSessions <= 3 ? 1 : capacity.maxHardSessionsPerWeek,
      ),
      envelope,
      modalityCaps: capacity.modalityCaps
        ? modalityCapsFromChannels(sportChannels)
        : capacity.modalityCaps,
    },
    peakKmCapped,
    sessionsCapped,
  }
}

const INTERVENTION_TO_ADAPTATION: Record<
  string,
  AdaptationKey | null
> = {
  volume: 'aerobic_durability',
  frequency: 'aerobic_capacity',
  threshold: 'threshold',
  vo2: 'aerobic_capacity',
  long_run: 'long_run_tolerance',
  recovery: null,
  maintain: null,
}

/**
 * Soft boost of priority scores matching response prediction.
 * Does not invent a new primary when confidence is low.
 */
export function applyPhysiologyToPriorities(args: {
  priority: PriorityProfile
  prediction: ResponsePrediction
}): { priority: PriorityProfile; biased: boolean } {
  const { priority, prediction } = args
  if (prediction.confidence < MIN_CONF) {
    return { priority, biased: false }
  }
  const target = INTERVENTION_TO_ADAPTATION[prediction.primaryIntervention]
  if (!target) return { priority, biased: false }

  const boost = 0.08 * prediction.confidence
  let primary = { ...priority.primary }
  let secondary = priority.secondary.map((s) => ({ ...s }))
  let biased = false

  if (primary.adaptation === target) {
    primary = {
      ...primary,
      score: Math.min(1, Math.round((primary.score + boost) * 100) / 100),
    }
    biased = true
  } else {
    const hit = secondary.find((s) => s.adaptation === target)
    if (hit) {
      hit.score = Math.min(1, Math.round((hit.score + boost) * 100) / 100)
      // Promote if it overtakes primary by a clear margin.
      if (hit.score > primary.score + 0.05) {
        secondary = [
          primary,
          ...secondary.filter((s) => s.adaptation !== target),
        ].slice(0, 2)
        primary = { adaptation: target, score: hit.score }
      }
      biased = true
    }
  }

  return { priority: { primary, secondary }, biased }
}

/** Extra Norwegian gate from overreach / recovery (OR with existing eligibility). */
export function norwegianBlockedByPhysiology(
  model: AthletePhysiologyModel,
): { blocked: boolean; reasons: string[] } {
  const reasons: string[] = []
  if (
    model.fatigue.overreachRisk.value >= 62 &&
    model.fatigue.overreachRisk.confidence >= MIN_CONF
  ) {
    reasons.push('apm_high_overreach_risk')
  }
  if (
    model.recovery.recoverySpeed.value < 38 &&
    model.recovery.recoverySpeed.confidence >= MIN_CONF
  ) {
    reasons.push('apm_low_recovery_speed')
  }
  if (
    model.threshold.thresholdDurability.value < 40 &&
    model.threshold.thresholdDurability.confidence >= 0.4
  ) {
    reasons.push('apm_low_threshold_durability')
  }
  return { blocked: reasons.length > 0, reasons }
}

export function buildPhysiologyAuditSnapshot(args: {
  model: AthletePhysiologyModel
  fingerprint: AthleteFingerprint
  prediction: ResponsePrediction
  peakKmCapped: boolean
  norwegianBlockedByOverreach: boolean
  priorityBiased: boolean
}): PhysiologyAuditSnapshot {
  const { model, fingerprint: fp, prediction } = args
  return {
    schemaVersion: 1,
    asOf: model.asOf,
    aerobicStrength: model.aerobic.aerobicStrength.value,
    volumeTolerance: {
      current: model.aerobic.volumeTolerance.current,
      optimal: model.aerobic.volumeTolerance.optimal,
      upperLimit: model.aerobic.volumeTolerance.upperLimit,
    },
    frequencyTolerance: {
      current: model.aerobic.frequencyTolerance.current,
      optimal: model.aerobic.frequencyTolerance.optimal,
      upperLimit: model.aerobic.frequencyTolerance.upperLimit,
    },
    thresholdStrength: model.threshold.thresholdStrength.value,
    overreachRisk: model.fatigue.overreachRisk.value,
    recoverySpeed: model.recovery.recoverySpeed.value,
    marathonReadiness: model.durability.marathonReadiness.value,
    fingerprint: {
      volumeResponder: fp.volumeResponder.value,
      thresholdResponder: fp.thresholdResponder.value,
      vo2Responder: fp.vo2Responder.value,
      longRunResponder: fp.longRunResponder.value,
      fatigueResistance: fp.fatigueResistance.value,
    },
    responsePrediction: prediction,
    applied: {
      capacityPeakKmCapped: args.peakKmCapped,
      norwegianBlockedByOverreach: args.norwegianBlockedByOverreach,
      priorityBiased: args.priorityBiased,
    },
  }
}

/** Summarize APM for Why-this-plan guidelines. */
export function formatPhysiologySummary(
  snapshot: PhysiologyAuditSnapshot,
): string {
  const lines = [
    'Athlete Physiology Model (Phase I):',
    `- Aerobic strength ${Math.round(snapshot.aerobicStrength)} · overreach risk ${Math.round(snapshot.overreachRisk)} · recovery ${Math.round(snapshot.recoverySpeed)}`,
    `- Volume tolerance ${snapshot.volumeTolerance.current} → opt ${snapshot.volumeTolerance.optimal} (cap ${snapshot.volumeTolerance.upperLimit} km)`,
    `- Response bias: ${snapshot.responsePrediction.primaryIntervention}${snapshot.responsePrediction.secondaryIntervention ? ` / ${snapshot.responsePrediction.secondaryIntervention}` : ''} (conf ${snapshot.responsePrediction.confidence})`,
  ]
  const applied: string[] = []
  if (snapshot.applied.capacityPeakKmCapped) applied.push('volume cap')
  if (snapshot.applied.norwegianBlockedByOverreach)
    applied.push('Norwegian gated')
  if (snapshot.applied.priorityBiased) applied.push('priority bias')
  if (applied.length) lines.push(`- Applied: ${applied.join(', ')}`)
  return lines.join('\n')
}

export function physiologyInfluencesNorwegian(
  state: AthleteState,
  model: AthletePhysiologyModel | null | undefined,
): string[] {
  if (!model) return []
  void state
  return norwegianBlockedByPhysiology(model).reasons
}
