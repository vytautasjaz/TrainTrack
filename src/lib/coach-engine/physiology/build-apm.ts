import type {
  AthleteLevel,
  AthleteState,
  CollectedAthleteData,
} from '@/lib/coach-engine/types'
import {
  avg,
  clamp,
  clamp01,
  envelope,
  mapStateTrend,
  tolerance,
  trendFromDelta,
} from './envelope'
import type { AthletePhysiologyModel } from './types'

const LEVEL_BASE: Record<AthleteLevel, number> = {
  beginner: 35,
  intermediate: 52,
  advanced: 68,
  elite: 82,
}

function isThresholdishTitle(title: string): boolean {
  return /threshold|tempo|cruise|norwegian|lactate|lt2|sweet.?spot/i.test(title)
}

function isVo2ishTitle(title: string): boolean {
  return /vo2|v\.?o\.?2|interval|rep|speed|track/i.test(title)
}

function isLongishTitle(title: string, km: number | null): boolean {
  if (/long|lsr|endurance run/i.test(title)) return true
  return km != null && km >= 18
}

/**
 * Phase I heuristics from existing collect + state.
 * No wearable streams required. Low history → low confidence, not blocked plans.
 */
export function buildAthletePhysiologyModel(args: {
  state: AthleteState
  data: CollectedAthleteData
  asOf?: string
}): AthletePhysiologyModel {
  const asOf = args.asOf ?? new Date().toISOString()
  const { state, data } = args
  const weeks = data.weekSummaries
  const recent4 = weeks.slice(0, 4)
  const older4 = weeks.slice(4, 8)
  const recentKm = avg(recent4.map((w) => w.completedDistanceKm))
  const olderKm = avg(older4.map((w) => w.completedDistanceKm))
  const peakKm = Math.max(
    0,
    ...weeks.slice(0, 8).map((w) => w.completedDistanceKm),
  )
  const volumeTrend = trendFromDelta(recentKm, olderKm || recentKm * 0.95)
  const stateTrend = mapStateTrend(state.performanceTrend.running)

  const sessionsPerWeek = state.recentVolume.sessionsPerWeek
  const consistency = state.consistency
  const readiness = state.readiness.score
  const hasThresholdPace = state.metrics.thresholdPace.value != null
  const thresholdPaceConf = state.metrics.thresholdPace.confidence
  const volumeConf = state.metrics.weeklyVolumeKm.confidence

  const historyWeeks = Math.min(8, weeks.length)
  // Cap below 1.0 — mixed-sport / sparse weeks should not claim certainty.
  const baseConf = clamp01(0.2 + historyWeeks * 0.06 + volumeConf * 0.2)

  // ── Aerobic strength (0–100) — run volume only ──────────────────
  const levelBase = LEVEL_BASE[state.level]
  const volumeScore = clamp((recentKm / 70) * 40, 0, 40)
  const consistencyScore = consistency * 15
  const runRaceCount = data.races.filter(
    (r) =>
      r.sport === 'RUN' ||
      /MARATHON|HALF|5K|10K|FIVE|TEN/i.test(r.type),
  ).length
  const raceBonus = Math.min(10, runRaceCount * 4)
  const paceBonus = hasThresholdPace ? 8 * thresholdPaceConf : 0
  const aerobicStrength = clamp(
    levelBase * 0.45 + volumeScore + consistencyScore + raceBonus + paceBonus,
    0,
    100,
  )

  // ── Aerobic efficiency — Stage K streams preferred, else proxy ─
  const hrRest = data.hr.resting
  const hrMax = data.hr.max
  const streams = data.streamFeatures
  let efficiency = 50
  let efficiencyConf = 0.2
  if (
    streams?.aerobicEfficiencyScore != null &&
    streams.confidence >= 0.3
  ) {
    efficiency = streams.aerobicEfficiencyScore
    efficiencyConf = streams.confidence
  } else if (hrRest != null && hrMax != null && hrMax > hrRest) {
    const reserve = (hrMax - hrRest) / hrMax
    efficiency = clamp(40 + reserve * 50 + (hasThresholdPace ? 8 : 0), 0, 100)
    efficiencyConf = 0.35
  } else if (hasThresholdPace && data.paces.easy != null) {
    const ratio = data.paces.threshold! / data.paces.easy
    // Closer paces at threshold vs easy ≈ less economy gap (rough).
    efficiency = clamp(45 + (1.15 - Math.min(1.3, ratio)) * 80, 0, 100)
    efficiencyConf = 0.3
  }

  // ── Volume tolerance (run km/week only) ─────────────────────────
  const currentVol = Math.max(recentKm, state.recentVolume.runningKmPerWeek)
  const optimalVol = Math.max(
    currentVol * 1.12,
    Math.min(peakKm * 1.05 || currentVol * 1.2, currentVol * 1.35),
  )
  const upperVol = Math.max(
    optimalVol * 1.12,
    peakKm > 0 ? peakKm * 1.08 : currentVol * 1.4,
  )
  // Soft injury-style ceiling from consistency / readiness.
  const safetyCap =
    currentVol > 0
      ? currentVol * (1.25 + consistency * 0.2 + readiness * 0.15)
      : upperVol
  const volumeUpper = Math.min(upperVol, safetyCap)

  // ── Frequency tolerance (run days/week) ─────────────────────────
  const runDaysPerWeek = avg(
    recent4.map((w) => w.runDaysCompleted ?? w.runCompleted ?? 0),
  )
  const currentFreq = clamp(
    runDaysPerWeek > 0 ? runDaysPerWeek : sessionsPerWeek || 3,
    2,
    7,
  )
  const optimalFreq = clamp(
    Math.round(currentFreq + (consistency >= 0.75 ? 1 : 0.5)),
    currentFreq,
    7,
  )
  const upperFreq = clamp(
    Math.max(optimalFreq, currentFreq + (readiness >= 0.7 ? 1 : 0)),
    3,
    7,
  )

  // ── Threshold profile ───────────────────────────────────────────
  const thresholdSessions = data.recentSessions.filter((s) =>
    isThresholdishTitle(s.title),
  )
  const thresholdStrength = clamp(
    (hasThresholdPace ? 55 + thresholdPaceConf * 25 : 40) +
      Math.min(15, thresholdSessions.length * 4) +
      (state.level === 'advanced' || state.level === 'elite' ? 8 : 0),
    0,
    100,
  )
  const thresholdDurability = clamp(
    40 +
      Math.min(25, thresholdSessions.length * 6) +
      consistency * 20 +
      (recentKm >= 40 ? 10 : recentKm >= 25 ? 5 : 0),
    0,
    100,
  )
  const completedRatio =
    recent4.length === 0
      ? 0.6
      : avg(
          recent4.map((w) =>
            w.planned > 0 ? w.completed / w.planned : consistency,
          ),
        )
  const thresholdResponse = clamp(
    45 + completedRatio * 30 + readiness * 20,
    0,
    100,
  )

  // ── Intensity / VO2 ─────────────────────────────────────────────
  const vo2Sessions = data.recentSessions.filter((s) =>
    isVo2ishTitle(s.title),
  )
  const vo2Completion =
    vo2Sessions.length === 0
      ? 0.7
      : avg(
          vo2Sessions.map((s) => {
            if (s.status === 'SKIPPED' || s.status === 'MISSED') return 0.2
            if (s.plannedDurationMin && s.actualDurationMin) {
              return clamp01(s.actualDurationMin / s.plannedDurationMin)
            }
            return s.status === 'COMPLETED' ? 1 : 0.6
          }),
        )
  const highRpeAfterHard = data.recentSessions
    .filter((s) => isVo2ishTitle(s.title) || isThresholdishTitle(s.title))
    .map((s) => s.rpe)
    .filter((r): r is number => r != null)
  const avgHardRpe =
    highRpeAfterHard.length > 0 ? avg(highRpeAfterHard) : 6.5
  const vo2Tolerance = clamp(
    35 + vo2Completion * 40 + (avgHardRpe <= 7.5 ? 15 : 5) + readiness * 10,
    0,
    100,
  )
  const vo2Response = clamp(
    40 + vo2Completion * 25 + (state.level === 'beginner' ? -10 : 5),
    0,
    100,
  )
  const speedResponse = clamp(
    40 + (state.level === 'elite' || state.level === 'advanced' ? 20 : 5),
    0,
    100,
  )

  // ── Fatigue ─────────────────────────────────────────────────────
  const missedShare =
    recent4.length === 0
      ? 0.2
      : avg(
          recent4.map((w) => {
            const total = w.planned || 1
            return w.skipped / total
          }),
        )
  const loadPressure =
    (state.trainingLoad.cardiovascular + state.trainingLoad.mechanical) / 200
  const fatigueResistance = clamp(
    35 + consistency * 35 + readiness * 25 - missedShare * 20,
    0,
    100,
  )
  const fatigueAccumulation = clamp(
    30 + loadPressure * 40 + (1 - readiness) * 25 + missedShare * 15,
    0,
    100,
  )
  const overreachRisk = clamp(
    15 +
      loadPressure * 35 +
      (1 - consistency) * 25 +
      (1 - readiness) * 30 +
      missedShare * 20 +
      (peakKm > 0 && recentKm > peakKm * 0.95 && consistency < 0.7 ? 15 : 0),
    0,
    100,
  )

  // ── Recovery ────────────────────────────────────────────────────
  const recoverySpeed = clamp(
    40 + readiness * 40 + consistency * 15 - loadPressure * 15,
    0,
    100,
  )
  const rpeVariance = (() => {
    const rpes = data.recentSessions
      .map((s) => s.rpe)
      .filter((r): r is number => r != null)
    if (rpes.length < 3) return 1.5
    const mean = avg(rpes)
    return Math.sqrt(avg(rpes.map((r) => (r - mean) ** 2)))
  })()
  const recoveryReliability = clamp(
    70 - rpeVariance * 12 + consistency * 20,
    0,
    100,
  )

  // ── Durability (run long sessions only) ─────────────────────────
  const longSessions = data.recentSessions.filter(
    (s) =>
      s.type === 'RUN' &&
      isLongishTitle(s.title, s.actualDistanceKm ?? s.plannedDistanceKm),
  )
  const longestKm = Math.max(
    0,
    ...longSessions.map(
      (s) => s.actualDistanceKm ?? s.plannedDistanceKm ?? 0,
    ),
    recentKm > 0 ? recentKm * 0.4 : 0,
  )
  const longRunTolerance = clamp(
    Math.max(12, longestKm * 1.05 || recentKm * 0.45 || 14),
    10,
    45,
  )
  const lateRunProxy = clamp(
    45 + consistency * 25 + (longestKm >= 25 ? 15 : longestKm >= 18 ? 8 : 0),
    0,
    100,
  )
  const lateRun =
    streams?.lateRunResistanceScore != null && streams.confidence >= 0.3
      ? clamp(
          streams.lateRunResistanceScore * 0.7 + lateRunProxy * 0.3,
          0,
          100,
        )
      : lateRunProxy
  const lateRunConf =
    streams?.lateRunResistanceScore != null && streams.confidence >= 0.3
      ? streams.confidence
      : clamp01(0.2 + longSessions.length * 0.08)
  const marathonReadiness = clamp(
    aerobicStrength * 0.35 +
      (longRunTolerance / 35) * 30 +
      consistency * 20 +
      (thresholdStrength / 100) * 15,
    0,
    100,
  )

  const volTolConf = clamp01(baseConf + (peakKm > 0 ? 0.1 : 0))
  const freqTolConf = clamp01(0.3 + historyWeeks * 0.05)

  return {
    athleteId: state.athleteId,
    asOf,
    schemaVersion: 1,
    aerobic: {
      aerobicStrength: envelope(
        aerobicStrength,
        baseConf,
        volumeTrend,
        asOf,
      ),
      aerobicEfficiency: envelope(
        efficiency,
        efficiencyConf,
        stateTrend,
        asOf,
      ),
      volumeTolerance: tolerance(
        currentVol || 25,
        Math.max(optimalVol, (currentVol || 25) * 1.1),
        Math.max(volumeUpper, (currentVol || 25) * 1.25),
        volTolConf,
        volumeTrend,
        asOf,
      ),
      frequencyTolerance: tolerance(
        currentFreq,
        optimalFreq,
        upperFreq,
        freqTolConf,
        'stable',
        asOf,
      ),
    },
    threshold: {
      thresholdStrength: envelope(
        thresholdStrength,
        clamp01(0.25 + thresholdPaceConf * 0.5 + thresholdSessions.length * 0.05),
        stateTrend,
        asOf,
      ),
      thresholdDurability: envelope(
        thresholdDurability,
        clamp01(0.25 + thresholdSessions.length * 0.08),
        'stable',
        asOf,
      ),
      thresholdResponse: envelope(
        thresholdResponse,
        clamp01(0.3 + completedRatio * 0.3),
        'stable',
        asOf,
      ),
    },
    intensity: {
      vo2Tolerance: envelope(
        vo2Tolerance,
        clamp01(0.2 + vo2Sessions.length * 0.1),
        'stable',
        asOf,
      ),
      vo2Response: envelope(
        vo2Response,
        clamp01(0.2 + vo2Sessions.length * 0.08),
        'stable',
        asOf,
      ),
      speedResponse: envelope(speedResponse, 0.25, 'stable', asOf),
    },
    fatigue: {
      fatigueResistance: envelope(
        fatigueResistance,
        clamp01(0.35 + historyWeeks * 0.05),
        stateTrend,
        asOf,
      ),
      fatigueAccumulationRate: envelope(
        fatigueAccumulation,
        clamp01(0.3 + historyWeeks * 0.05),
        'stable',
        asOf,
      ),
      overreachRisk: envelope(
        overreachRisk,
        clamp01(0.4 + historyWeeks * 0.05),
        overreachRisk > 60 ? 'declining' : 'stable',
        asOf,
      ),
    },
    recovery: {
      recoverySpeed: envelope(
        recoverySpeed,
        clamp01(0.35 + state.readiness.confidence * 0.4),
        stateTrend,
        asOf,
      ),
      recoveryReliability: envelope(
        recoveryReliability,
        clamp01(0.25 + (data.recentSessions.length >= 6 ? 0.25 : 0.1)),
        'stable',
        asOf,
      ),
    },
    durability: {
      longRunTolerance: envelope(
        longRunTolerance,
        clamp01(0.25 + longSessions.length * 0.1),
        volumeTrend,
        asOf,
      ),
      fatigueResistanceLateRun: envelope(
        lateRun,
        lateRunConf,
        streams?.meanLatePaceDecayPct != null &&
          streams.meanLatePaceDecayPct < 2
          ? 'improving'
          : streams?.meanLatePaceDecayPct != null &&
              streams.meanLatePaceDecayPct > 6
            ? 'declining'
            : 'stable',
        asOf,
      ),
      marathonReadiness: envelope(
        marathonReadiness,
        clamp01(0.3 + (recentKm >= 30 ? 0.2 : 0) + (longestKm >= 20 ? 0.15 : 0)),
        volumeTrend,
        asOf,
      ),
    },
  }
}
