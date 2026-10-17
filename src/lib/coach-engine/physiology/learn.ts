import { SessionType, WorkoutType } from '@prisma/client'
import type { AdaptationKey } from '@/lib/coach-engine/types'
import { collectAthleteData } from '@/lib/coach-engine/collect'
import { buildAthleteState, parseAthleteLevel } from '@/lib/coach-engine/state'
import {
  compareResponse,
  expectedResponseForSession,
  updateFingerprintFromResponses,
} from '@/lib/coach-engine/learning'
import type { PlannedSession } from '@/lib/coach-engine/types'
import { buildAthletePhysiologyModel } from './build-apm'
import { buildAthleteFingerprint } from './fingerprint'
import { mergeFingerprintWithPrior } from './merge'
import { predictResponse } from './predict'
import { calculateCapabilities, calculateGaps } from '@/lib/coach-engine/capability'
import { getDemandProfile } from '@/lib/coach-engine/demand'
import { resolveGoalProfile } from '@/lib/coach-engine/goal'
import {
  getLatestPhysiologySnapshot,
  savePhysiologySnapshot,
  savePhysiologySnapshotThrottled,
} from './store'
import type { AthleteFingerprint, ResponsePrediction } from './types'

export function adaptationKeyFromSessionType(
  sessionType: SessionType,
): AdaptationKey | null {
  switch (sessionType) {
    case SessionType.THRESHOLD:
    case SessionType.TEMPO:
    case SessionType.RACE_PACE:
      return 'threshold'
    case SessionType.VO2_MAX:
    case SessionType.INTERVALS:
    case SessionType.HILL_REPEATS:
      return 'aerobic_capacity'
    case SessionType.LONG_RUN:
      return 'long_run_tolerance'
    case SessionType.EASY_RUN:
    case SessionType.RECOVERY_RUN:
    case SessionType.FARTLEK:
      return 'aerobic_durability'
    case SessionType.STRENGTH:
      return 'max_strength'
    default:
      return null
  }
}

/**
 * Light weekly learning after a completed calendar workout.
 * Throttled to one snapshot per athlete per UTC day.
 */
export async function recordPhysiologyLearningWeek(args: {
  athleteId: string
  sessionType: SessionType
  title: string
  tags: string[]
  plannedDistanceKm: number | null
  plannedDurationMin: number | null
  actualRpe: number | null
  isKeySession: boolean
  estimatedTss?: number
  level?: string | null
  planId?: string | null
}): Promise<{ saved: boolean }> {
  const data = await collectAthleteData(args.athleteId, { lookbackWeeks: 8 })
  const level = parseAthleteLevel(args.level ?? 'intermediate')
  const state = buildAthleteState(data, level)
  const model = buildAthletePhysiologyModel({ state, data })
  const stored = await getLatestPhysiologySnapshot(args.athleteId)
  let fingerprint = mergeFingerprintWithPrior({
    fresh: buildAthleteFingerprint(model),
    prior: stored?.fingerprint,
  })

  const adaptation =
    adaptationKeyFromSessionType(args.sessionType) ?? 'aerobic_durability'
  const planned: PlannedSession = {
    weekIndex: 0,
    dayOfWeek: 0,
    type: WorkoutType.RUN,
    sessionType: args.sessionType,
    title: args.title,
    description: null,
    plannedDistance: args.plannedDistanceKm,
    plannedDuration: args.plannedDurationMin,
    coachNotes: null,
    tags: args.tags,
    candidateId: 'calendar',
    primaryAdaptation: adaptation,
    estimatedTss: args.estimatedTss ?? 50,
    isKeySession: args.isKeySession,
  }
  const expected = expectedResponseForSession(planned)
  const comparison = compareResponse(expected, {
    actualRpe: args.actualRpe,
    completion: 1,
    actualTss: null,
    feltHarder: (args.actualRpe ?? 0) >= 8,
    missed: false,
  })
  fingerprint = updateFingerprintFromResponses(fingerprint, [
    { adaptation, interpretation: comparison.interpretation },
  ])

  const goal = resolveGoalProfile({
    skillSlug: 'run-half-marathon',
    brief: { weekCount: 8, level, notes: '' },
    data,
  })
  const demand = getDemandProfile(goal.demandId)
  const caps = calculateCapabilities(state, data, goal)
  const gaps = calculateGaps(caps, demand.demands)
  const prediction: ResponsePrediction = predictResponse({
    gaps,
    fingerprint,
    model,
  })

  const saved = await savePhysiologySnapshotThrottled({
    athleteId: args.athleteId,
    source: 'learning_week',
    model,
    fingerprint,
    prediction,
    planId: args.planId ?? null,
  })
  return { saved: Boolean(saved) }
}

/**
 * Batch learning from recent completed sessions (mesocycle / adapt path).
 * Always writes a learning_phase snapshot (not day-throttled).
 */
export async function recordPhysiologyLearningPhase(args: {
  athleteId: string
  planId: string
  level?: string | null
  lookbackDays?: number
}): Promise<{ saved: boolean; outcomeCount: number }> {
  const lookbackDays = args.lookbackDays ?? 28
  const data = await collectAthleteData(args.athleteId, {
    lookbackWeeks: Math.ceil(lookbackDays / 7) + 1,
  })
  const level = parseAthleteLevel(args.level ?? 'intermediate')
  const state = buildAthleteState(data, level)
  const model = buildAthletePhysiologyModel({ state, data })
  const stored = await getLatestPhysiologySnapshot(args.athleteId)
  let fingerprint: AthleteFingerprint = mergeFingerprintWithPrior({
    fresh: buildAthleteFingerprint(model),
    prior: stored?.fingerprint,
  })

  const cutoff = Date.now() - lookbackDays * 24 * 60 * 60 * 1000
  const outcomes: {
    adaptation: AdaptationKey | null
    interpretation: ReturnType<typeof compareResponse>['interpretation']
  }[] = []

  for (const s of data.recentSessions) {
    const ts = Date.parse(s.date)
    if (!Number.isFinite(ts) || ts < cutoff) continue
    const adaptation = adaptationKeyFromTitle(s.title)
    if (s.status === 'SKIPPED' || s.status === 'MISSED') {
      outcomes.push({ adaptation, interpretation: 'missed' })
      continue
    }
    if (s.status !== 'COMPLETED') continue
    const sessionType = guessSessionTypeFromTitle(s.title)
    const planned: PlannedSession = {
      weekIndex: 0,
      dayOfWeek: 0,
      type: s.type,
      sessionType,
      title: s.title,
      description: null,
      plannedDistance: s.plannedDistanceKm,
      plannedDuration: s.plannedDurationMin,
      coachNotes: null,
      tags: [],
      candidateId: 'history',
      primaryAdaptation: adaptation,
      estimatedTss: s.estimatedTss ?? 45,
      isKeySession: Boolean(adaptation && adaptation !== 'aerobic_durability'),
    }
    const expected = expectedResponseForSession(planned)
    const completion =
      s.plannedDurationMin && s.actualDurationMin
        ? Math.min(1.2, s.actualDurationMin / s.plannedDurationMin)
        : 1
    const comparison = compareResponse(expected, {
      actualRpe: s.rpe,
      completion,
      actualTss: s.estimatedTss,
      feltHarder: (s.rpe ?? 0) >= 8,
      missed: false,
    })
    outcomes.push({ adaptation, interpretation: comparison.interpretation })
  }

  if (outcomes.length) {
    fingerprint = updateFingerprintFromResponses(fingerprint, outcomes)
  }

  const goal = resolveGoalProfile({
    skillSlug: 'run-half-marathon',
    brief: { weekCount: 8, level, notes: '' },
    data,
  })
  const demand = getDemandProfile(goal.demandId)
  const caps = calculateCapabilities(state, data, goal)
  const gaps = calculateGaps(caps, demand.demands)
  const prediction = predictResponse({ gaps, fingerprint, model })

  await savePhysiologySnapshot({
    athleteId: args.athleteId,
    source: 'learning_phase',
    model,
    fingerprint,
    prediction,
    planId: args.planId,
  })
  return { saved: true, outcomeCount: outcomes.length }
}

function adaptationKeyFromTitle(title: string): AdaptationKey | null {
  if (/threshold|tempo|cruise|norwegian/i.test(title)) return 'threshold'
  if (/vo2|interval|rep|track/i.test(title)) return 'aerobic_capacity'
  if (/long/i.test(title)) return 'long_run_tolerance'
  if (/easy|recovery/i.test(title)) return 'aerobic_durability'
  if (/strength|gym/i.test(title)) return 'max_strength'
  return 'aerobic_durability'
}

function guessSessionTypeFromTitle(title: string): SessionType {
  if (/threshold|tempo|cruise/i.test(title)) return SessionType.THRESHOLD
  if (/vo2|interval/i.test(title)) return SessionType.VO2_MAX
  if (/long/i.test(title)) return SessionType.LONG_RUN
  if (/recovery/i.test(title)) return SessionType.RECOVERY_RUN
  if (/strength/i.test(title)) return SessionType.STRENGTH
  return SessionType.EASY_RUN
}
