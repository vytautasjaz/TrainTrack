import { collectAthleteData } from '@/lib/coach-engine/collect'
import { buildAthleteState, parseAthleteLevel } from '@/lib/coach-engine/state'
import { buildAthletePhysiologyModel } from './build-apm'
import { buildAthleteFingerprint } from './fingerprint'
import { mergeFingerprintWithPrior, applyPriorValuesToModel } from './merge'
import { predictResponse } from './predict'
import { calculateCapabilities, calculateGaps } from '@/lib/coach-engine/capability'
import { getDemandProfile } from '@/lib/coach-engine/demand'
import { resolveGoalProfile } from '@/lib/coach-engine/goal'
import {
  getLatestPhysiologySnapshot,
  listPhysiologySnapshots,
  savePhysiologySnapshotThrottled,
  type StoredPhysiologySnapshot,
} from './store'
import type {
  AthleteFingerprint,
  AthletePhysiologyModel,
  MetricEnvelope,
  MetricTrend,
  ResponsePrediction,
  ToleranceRange,
} from './types'
import type { AggregatedStreamFeatures } from './stream-features'
import {
  rateProfileMetric,
  type ProfileRating,
  type ProfileRatingContext,
  type TrainingTone,
} from './interpret'

export type PhysiologyMetricGroupId =
  | 'capacity'
  | 'quality'
  | 'recovery'
  | 'endurance'

export type { ProfileRating, TrainingTone }
/** @deprecated Prefer ProfileRating / TrainingTone */
export type PhysiologyRating = ProfileRating
/** @deprecated Prefer TrainingTone */
export type PhysiologyTone = TrainingTone

export type PhysiologyMetricCardVm = {
  id: string
  label: string
  /** Short label for compact tiles */
  shortLabel?: string
  value: number
  unit?: string
  previousValue: number | null
  trend: MetricTrend
  confidence: number
  explanation: string
  group: PhysiologyMetricGroupId
  /** Coach-style label + insight for UI. */
  rating: ProfileRating
  /** For tolerance cards */
  range?: { current: number; optimal: number; upperLimit: number }
}

export type PhysiologyTrendPoint = {
  asOf: string
  value: number
  /** Real DB snapshot vs live recompute vs inferred prior. */
  kind: 'snapshot' | 'live' | 'estimated'
}

export type PhysiologyTrendSeriesVm = {
  id: string
  label: string
  unit?: string
  /** Oldest → newest */
  points: PhysiologyTrendPoint[]
  /** Last − first over the series (null if < 2 points) */
  delta: number | null
  rating: ProfileRating
}

export type PhysiologyDashboardVm = {
  athleteId: string
  athleteName: string
  asOf: string | null
  source: string | null
  hasSnapshot: boolean
  cards: PhysiologyMetricCardVm[]
  fingerprint: {
    volumeResponder: number
    thresholdResponder: number
    vo2Responder: number
    longRunResponder: number
    frequencyResponder: number
  } | null
  prediction: ResponsePrediction | null
  streamFeatures: AggregatedStreamFeatures | null
  historyCount: number
  /** Snapshot-based sparklines (empty until enough history). */
  trends: PhysiologyTrendSeriesVm[]
}

function trendArrow(trend: MetricTrend): string {
  if (trend === 'improving') return 'improving'
  if (trend === 'declining') return 'declining'
  return 'stable'
}

function cardFromEnvelope(
  id: string,
  label: string,
  shortLabel: string,
  group: PhysiologyMetricGroupId,
  env: MetricEnvelope,
  explanation: string,
  unit?: string,
  ctx?: ProfileRatingContext,
): PhysiologyMetricCardVm {
  const displayValue = env.value
  return {
    id,
    label,
    shortLabel,
    group,
    value: displayValue,
    unit,
    previousValue: env.previousValue ?? null,
    trend: trendArrow(env.trend) as MetricTrend,
    confidence: env.confidence,
    explanation,
    rating: rateProfileMetric(id, displayValue, null, ctx),
  }
}

function cardFromTolerance(
  id: string,
  label: string,
  shortLabel: string,
  group: PhysiologyMetricGroupId,
  tol: ToleranceRange,
  explanation: string,
  unit: string,
): PhysiologyMetricCardVm {
  const range = {
    current: tol.current,
    optimal: tol.optimal,
    upperLimit: tol.upperLimit,
  }
  return {
    id,
    label,
    shortLabel,
    group,
    value: tol.optimal,
    unit,
    previousValue: null,
    trend: tol.trend,
    confidence: tol.confidence,
    explanation,
    range,
    rating: rateProfileMetric(id, tol.current, range),
  }
}

function buildCards(model: AthletePhysiologyModel): PhysiologyMetricCardVm[] {
  const ctx: ProfileRatingContext = {
    aerobicBase: model.aerobic.aerobicStrength.value,
    thresholdCapacity: model.threshold.thresholdStrength.value,
    vo2Fitness: model.intensity.vo2Response.value,
  }
  return [
    cardFromEnvelope(
      'aerobicStrength',
      'Aerobic base',
      'Base',
      'capacity',
      model.aerobic.aerobicStrength,
      'Your underlying easy-running engine.',
      undefined,
      ctx,
    ),
    cardFromEnvelope(
      'aerobicEfficiency',
      'Aerobic efficiency',
      'Efficiency',
      'capacity',
      model.aerobic.aerobicEfficiency,
      'How much pace you produce at a given effort / HR.',
    ),
    cardFromTolerance(
      'volumeTolerance',
      'Weekly volume',
      'Volume',
      'capacity',
      model.aerobic.volumeTolerance,
      'Current run kilometres vs your productive weekly range.',
      'km/wk',
    ),
    cardFromTolerance(
      'frequencyTolerance',
      'Running days',
      'Days',
      'capacity',
      model.aerobic.frequencyTolerance,
      'Run days per week vs your productive frequency.',
      'days',
    ),
    cardFromEnvelope(
      'thresholdStrength',
      'Threshold capacity',
      'Threshold',
      'quality',
      model.threshold.thresholdStrength,
      'How strong your controlled threshold work currently is.',
    ),
    cardFromEnvelope(
      'thresholdDurability',
      'Threshold repeatability',
      'Repeatability',
      'quality',
      model.threshold.thresholdDurability,
      'How consistently you can repeat threshold work without quality falling off.',
    ),
    cardFromEnvelope(
      'vo2Response',
      'VO₂ fitness',
      'VO₂',
      'quality',
      model.intensity.vo2Response,
      'Current high-intensity aerobic fitness.',
    ),
    cardFromEnvelope(
      'fatigueResistance',
      'Fatigue resistance',
      'Resistance',
      'recovery',
      model.fatigue.fatigueResistance,
      'How much training stress you absorb before quality drops.',
    ),
    cardFromEnvelope(
      'overreachRisk',
      'Overreach risk',
      'Risk',
      'recovery',
      model.fatigue.overreachRisk,
      'Lower is better — risk of load tipping into unproductive fatigue.',
    ),
    cardFromEnvelope(
      'recoverySpeed',
      'Recovery',
      'Recovery',
      'recovery',
      model.recovery.recoverySpeed,
      'How quickly performance returns after demanding training.',
    ),
    cardFromEnvelope(
      'longRunTolerance',
      'Long-run tolerance',
      'Long run',
      'endurance',
      model.durability.longRunTolerance,
      'Longest run distance you tolerate well.',
      'km',
    ),
    cardFromEnvelope(
      'marathonReadiness',
      'Marathon readiness',
      'Marathon',
      'endurance',
      model.durability.marathonReadiness,
      'Readiness for longer racing from volume, long runs, and consistency.',
    ),
  ]
}

type MetricExtractor = {
  id: string
  label: string
  unit?: string
  read: (model: AthletePhysiologyModel) => {
    value: number
    previousValue?: number | null
  }
}

const TREND_METRICS: MetricExtractor[] = [
  {
    id: 'aerobicStrength',
    label: 'Aerobic base',
    read: (m) => m.aerobic.aerobicStrength,
  },
  {
    id: 'thresholdStrength',
    label: 'Threshold capacity',
    read: (m) => m.threshold.thresholdStrength,
  },
  {
    id: 'vo2Response',
    label: 'VO₂ fitness',
    read: (m) => m.intensity.vo2Response,
  },
  {
    id: 'fatigueResistance',
    label: 'Fatigue resistance',
    read: (m) => m.fatigue.fatigueResistance,
  },
  {
    id: 'recoverySpeed',
    label: 'Recovery',
    read: (m) => m.recovery.recoverySpeed,
  },
  {
    id: 'marathonReadiness',
    label: 'Marathon readiness',
    read: (m) => m.durability.marathonReadiness,
  },
  {
    id: 'longRunTolerance',
    label: 'Long-run tolerance',
    unit: 'km',
    read: (m) => m.durability.longRunTolerance,
  },
  {
    id: 'volumeTolerance',
    label: 'Weekly volume',
    unit: 'km/wk',
    read: (m) => ({
      value: m.aerobic.volumeTolerance.current,
      previousValue: null,
    }),
  },
]

function buildTrendSeries(
  historyOldestFirst: StoredPhysiologySnapshot[],
  live: AthletePhysiologyModel,
): PhysiologyTrendSeriesVm[] {
  // Need at least two saved snapshots — don't invent a chart from one point + live/estimate.
  if (historyOldestFirst.length < 2) return []

  const ctx: ProfileRatingContext = {
    aerobicBase: live.aerobic.aerobicStrength.value,
    thresholdCapacity: live.threshold.thresholdStrength.value,
    vo2Fitness: live.intensity.vo2Response.value,
  }

  return TREND_METRICS.map((metric) => {
    const fromHistory: PhysiologyTrendPoint[] = historyOldestFirst.map((snap) => ({
      asOf: snap.asOf.toISOString(),
      value: metric.read(snap.model).value,
      kind: 'snapshot',
    }))

    const liveRead = metric.read(live)
    const liveAsOf = live.asOf
    const lastHist = fromHistory[fromHistory.length - 1]
    const series =
      lastHist &&
      Math.abs(lastHist.value - liveRead.value) < 0.05 &&
      lastHist.asOf.slice(0, 10) === liveAsOf.slice(0, 10)
        ? fromHistory
        : [
            ...fromHistory,
            { asOf: liveAsOf, value: liveRead.value, kind: 'live' as const },
          ]

    const first = series[0]?.value
    const last = series[series.length - 1]?.value
    const delta =
      first != null && last != null
        ? Math.round((last - first) * 10) / 10
        : null

    const range =
      metric.id === 'volumeTolerance'
        ? {
            current: live.aerobic.volumeTolerance.current,
            optimal: live.aerobic.volumeTolerance.optimal,
            upperLimit: live.aerobic.volumeTolerance.upperLimit,
          }
        : null

    return {
      id: metric.id,
      label: metric.label,
      unit: metric.unit,
      points: series,
      delta,
      rating: rateProfileMetric(
        metric.id,
        last ?? liveRead.value,
        range,
        ctx,
      ),
    }
  })
}

/**
 * Load or compute physiology dashboard for an athlete.
 * Cold start: builds APM from collect and may persist a throttled `recompute` snapshot.
 */
export async function getPhysiologyDashboard(
  athleteId: string,
): Promise<PhysiologyDashboardVm> {
  const data = await collectAthleteData(athleteId, { lookbackWeeks: 10 })
  const level = parseAthleteLevel('intermediate')
  const state = buildAthleteState(data, level)
  const stored = await getLatestPhysiologySnapshot(athleteId)
  const history = await listPhysiologySnapshots(athleteId, 12)

  let model = buildAthletePhysiologyModel({ state, data })
  model = applyPriorValuesToModel({ model, prior: stored?.model })
  const fingerprint: AthleteFingerprint = mergeFingerprintWithPrior({
    fresh: buildAthleteFingerprint(model),
    prior: stored?.fingerprint,
  })

  const goal = resolveGoalProfile({
    skillSlug: 'run-half-marathon',
    brief: { weekCount: 8, level, notes: '' },
    data,
  })
  const demand = getDemandProfile(goal.demandId)
  const caps = calculateCapabilities(state, data, goal)
  const gaps = calculateGaps(caps, demand.demands)
  const prediction: ResponsePrediction =
    stored?.prediction ??
    predictResponse({ gaps, fingerprint, model })

  if (!stored) {
    try {
      await savePhysiologySnapshotThrottled({
        athleteId,
        source: 'recompute',
        model,
        fingerprint,
        prediction,
      })
    } catch {
      // Dashboard still renders without persist.
    }
  }

  const historyOldestFirst = [...history].reverse()

  return {
    athleteId,
    athleteName: data.name,
    asOf: stored?.asOf.toISOString() ?? model.asOf,
    source: stored?.source ?? 'recompute',
    hasSnapshot: Boolean(stored),
    cards: buildCards(model),
    fingerprint: {
      volumeResponder: fingerprint.volumeResponder.value,
      thresholdResponder: fingerprint.thresholdResponder.value,
      vo2Responder: fingerprint.vo2Responder.value,
      longRunResponder: fingerprint.longRunResponder.value,
      frequencyResponder: fingerprint.frequencyResponder.value,
    },
    prediction,
    streamFeatures: data.streamFeatures ?? null,
    historyCount: history.length,
    trends: buildTrendSeries(historyOldestFirst, model),
  }
}
