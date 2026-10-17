import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { WorkoutType } from '@prisma/client'
import { buildAthleteState } from '@/lib/coach-engine/state'
import { calculateCapacity } from '@/lib/coach-engine/capacity'
import { evaluateNorwegianEligibility } from '@/lib/coach-engine/methodology'
import { calculateCapabilities, calculateGaps } from '@/lib/coach-engine/capability'
import { getDemandProfile } from '@/lib/coach-engine/demand'
import { updateFingerprintFromResponses } from '@/lib/coach-engine/learning'
import { buildDraftFromCollected } from '@/lib/coach-engine/pipeline'
import {
  aggregateStreamFeatures,
  applyPhysiologyToCapacity,
  buildAthleteFingerprint,
  buildAthletePhysiologyModel,
  extractSessionStreamFeatures,
  mergeFingerprintWithPrior,
  norwegianBlockedByPhysiology,
  predictResponse,
} from '@/lib/coach-engine/physiology'
import type { CollectedAthleteData, GoalProfile } from '@/lib/coach-engine/types'

function fixtureData(overrides?: Partial<CollectedAthleteData>): CollectedAthleteData {
  return {
    athleteId: 'ath_apm',
    name: 'APM Athlete',
    paces: { easy: 5.5, tempo: 4.8, threshold: 4.5, vo2: 4.0 },
    bikeFtpWatts: null,
    swimCssSecPer100m: null,
    hr: { max: 190, resting: 48 },
    races: [
      {
        name: 'City HM',
        date: '2027-03-01',
        type: 'HALF',
        sport: 'RUN',
        priority: 'A',
        goal: '1:35',
      },
    ],
    recentSessions: [
      {
        date: '2026-10-01',
        type: WorkoutType.RUN,
        title: 'Easy',
        status: 'COMPLETED',
        plannedDistanceKm: 10,
        plannedDurationMin: 55,
        actualDistanceKm: 10,
        actualDurationMin: 54,
        rpe: 5,
        estimatedTss: 45,
      },
      {
        date: '2026-10-03',
        type: WorkoutType.RUN,
        title: 'Threshold 3x10',
        status: 'COMPLETED',
        plannedDistanceKm: 12,
        plannedDurationMin: 60,
        actualDistanceKm: 12,
        actualDurationMin: 60,
        rpe: 7,
        estimatedTss: 70,
      },
      {
        date: '2026-10-05',
        type: WorkoutType.RUN,
        title: 'Long run',
        status: 'COMPLETED',
        plannedDistanceKm: 22,
        plannedDurationMin: 120,
        actualDistanceKm: 22,
        actualDurationMin: 118,
        rpe: 6,
        estimatedTss: 90,
      },
    ],
    weekSummaries: [
      {
        weekStart: '2026-09-29',
        planned: 5,
        completed: 5,
        skipped: 0,
        plannedDistanceKm: 55,
        completedDistanceKm: 55,
        estimatedTss: 280,
      },
      {
        weekStart: '2026-09-22',
        planned: 5,
        completed: 4,
        skipped: 1,
        plannedDistanceKm: 50,
        completedDistanceKm: 48,
        estimatedTss: 250,
      },
      {
        weekStart: '2026-09-15',
        planned: 5,
        completed: 5,
        skipped: 0,
        plannedDistanceKm: 52,
        completedDistanceKm: 52,
        estimatedTss: 260,
      },
      {
        weekStart: '2026-09-08',
        planned: 4,
        completed: 4,
        skipped: 0,
        plannedDistanceKm: 45,
        completedDistanceKm: 45,
        estimatedTss: 220,
      },
    ],
    ...overrides,
  }
}

function halfGoal(): GoalProfile {
  return {
    sport: WorkoutType.RUN,
    type: 'race',
    demandId: 'HALF_V1',
    race: { name: 'City HM', date: '2027-03-01', priority: 'A' },
    target: { type: 'time', valueLabel: '1:35' },
    weekCount: 12,
    level: 'advanced',
    notes: '',
    daysPerWeek: 5,
    longRunDay: 6,
    raceWeekday: 6,
    availableDays: [1, 2, 3, 4, 6],
    currentWeeklyKm: 55,
    firstWeekKm: 50,
  }
}

describe('Athlete Physiology Model Phase I', () => {
  it('builds APM with envelopes and tolerances from collect/state', () => {
    const data = fixtureData()
    const state = buildAthleteState(data, 'advanced')
    const model = buildAthletePhysiologyModel({ state, data })

    assert.equal(model.schemaVersion, 1)
    assert.equal(model.athleteId, 'ath_apm')
    assert.ok(model.aerobic.aerobicStrength.value > 40)
    assert.ok(model.aerobic.aerobicStrength.confidence > 0)
    assert.ok(model.aerobic.aerobicStrength.confidence < 1)
    assert.ok(model.aerobic.volumeTolerance.optimal >= model.aerobic.volumeTolerance.current)
    assert.ok(
      model.aerobic.volumeTolerance.upperLimit >=
        model.aerobic.volumeTolerance.optimal,
    )
    assert.ok(model.threshold.thresholdStrength.value > 40)
    assert.ok(model.fatigue.overreachRisk.value >= 0)
    assert.ok(model.durability.longRunTolerance.value >= 12)
  })

  it('ignores bike distance when deriving run volume for APM', () => {
    const data = fixtureData({
      recentSessions: [
        {
          date: '2026-10-01',
          type: WorkoutType.RUN,
          title: 'Easy',
          status: 'COMPLETED',
          plannedDistanceKm: 10,
          plannedDurationMin: 55,
          actualDistanceKm: 10,
          actualDurationMin: 54,
          rpe: 5,
          estimatedTss: 45,
        },
        {
          date: '2026-10-02',
          type: WorkoutType.BIKE,
          title: 'Long ride',
          status: 'COMPLETED',
          plannedDistanceKm: 80,
          plannedDurationMin: 180,
          actualDistanceKm: 80,
          actualDurationMin: 175,
          rpe: 6,
          estimatedTss: 120,
        },
      ],
      weekSummaries: [
        {
          weekStart: '2026-09-29',
          planned: 6,
          completed: 6,
          skipped: 0,
          plannedDistanceKm: 35,
          completedDistanceKm: 35,
          runPlanned: 4,
          runCompleted: 4,
          runDaysCompleted: 4,
          estimatedTss: 280,
        },
      ],
    })
    const state = buildAthleteState(data, 'intermediate')
    assert.ok(state.recentVolume.runningKmPerWeek <= 40)
    const model = buildAthletePhysiologyModel({ state, data })
    assert.ok(model.aerobic.volumeTolerance.current <= 45)
    assert.ok(model.aerobic.volumeTolerance.upperLimit < 100)
  })

  it('derives fingerprint responders in 0–1 range', () => {
    const data = fixtureData()
    const state = buildAthleteState(data, 'advanced')
    const model = buildAthletePhysiologyModel({ state, data })
    const fp = buildAthleteFingerprint(model)

    for (const key of [
      'volumeResponder',
      'thresholdResponder',
      'vo2Responder',
      'longRunResponder',
      'frequencyResponder',
    ] as const) {
      assert.ok(fp[key].value >= 0 && fp[key].value <= 1, key)
    }
    assert.ok(fp.injuryRiskVolumeKm.value > 0)
  })

  it('soft-caps capacity peak when volume upper limit binds', () => {
    const data = fixtureData({
      weekSummaries: [
        {
          weekStart: '2026-09-29',
          planned: 4,
          completed: 4,
          skipped: 0,
          plannedDistanceKm: 30,
          completedDistanceKm: 30,
          estimatedTss: 150,
        },
        {
          weekStart: '2026-09-22',
          planned: 4,
          completed: 3,
          skipped: 1,
          plannedDistanceKm: 28,
          completedDistanceKm: 22,
          estimatedTss: 120,
        },
      ],
    })
    const state = buildAthleteState(data, 'intermediate')
    const goal = halfGoal()
    goal.level = 'intermediate'
    goal.currentWeeklyKm = 30
    const model = buildAthletePhysiologyModel({ state, data })
    // Force a tight upper limit for the test.
    model.aerobic.volumeTolerance.upperLimit = 40
    model.aerobic.volumeTolerance.confidence = 0.8

    const base = calculateCapacity(state, goal)
    const applied = applyPhysiologyToCapacity({
      capacity: base,
      model,
      goal,
    })

    assert.ok(applied.peakKmCapped)
    assert.ok(applied.capacity.envelope.maxPeakKm <= 40)
  })

  it('blocks Norwegian when overreach risk is high', () => {
    const data = fixtureData()
    const state = buildAthleteState(data, 'advanced')
    const model = buildAthletePhysiologyModel({ state, data })
    model.fatigue.overreachRisk.value = 80
    model.fatigue.overreachRisk.confidence = 0.7

    const gate = norwegianBlockedByPhysiology(model)
    assert.equal(gate.blocked, true)
    assert.ok(gate.reasons.includes('apm_high_overreach_risk'))

    const norwegian = evaluateNorwegianEligibility(state, halfGoal(), model)
    assert.equal(norwegian.eligible, false)
    assert.ok(norwegian.reasons.includes('apm_high_overreach_risk'))
  })

  it('predicts recovery intervention under high overreach', () => {
    const data = fixtureData()
    const state = buildAthleteState(data, 'advanced')
    const model = buildAthletePhysiologyModel({ state, data })
    model.fatigue.overreachRisk.value = 75
    model.fatigue.overreachRisk.confidence = 0.8
    const fp = buildAthleteFingerprint(model)
    const demand = getDemandProfile('HALF_V1')
    const caps = calculateCapabilities(state, data, halfGoal())
    const gaps = calculateGaps(caps, demand.demands)
    const prediction = predictResponse({ gaps, fingerprint: fp, model })
    assert.equal(prediction.primaryIntervention, 'recovery')
  })

  it('nudges fingerprint from expected vs actual outcomes', () => {
    const data = fixtureData()
    const state = buildAthleteState(data, 'advanced')
    const model = buildAthletePhysiologyModel({ state, data })
    const fp = buildAthleteFingerprint(model)
    const before = fp.thresholdResponder.value
    const next = updateFingerprintFromResponses(fp, [
      { adaptation: 'threshold', interpretation: 'overperformed' },
      { adaptation: 'threshold', interpretation: 'overperformed' },
    ])
    assert.ok(next.thresholdResponder.value > before)
    assert.ok(next.thresholdResponder.previousValue != null)
    assert.ok(
      (next.thresholdResponder.previousValue as number) >= before,
    )
  })

  it('merges prior fingerprint responders with confidence weighting', () => {
    const data = fixtureData()
    const state = buildAthleteState(data, 'advanced')
    const model = buildAthletePhysiologyModel({ state, data })
    const fresh = buildAthleteFingerprint(model)
    const prior = {
      ...fresh,
      thresholdResponder: {
        ...fresh.thresholdResponder,
        value: 0.95,
        confidence: 0.8,
      },
    }
    const merged = mergeFingerprintWithPrior({ fresh, prior })
    assert.ok(merged.thresholdResponder.value > fresh.thresholdResponder.value)
    assert.equal(merged.thresholdResponder.previousValue, 0.95)
  })

  it('extracts HR drift and pace@HR from packed Strava streams', () => {
    const n = 40
    const time = Array.from({ length: n }, (_, i) => i * 30)
    const heartrate = Array.from({ length: n }, (_, i) =>
      i < n / 2 ? 140 : 150,
    )
    // Constant ~5:00/km → 10 km/h → 2.778 m/s; distance grows linearly.
    const distance = Array.from({ length: n }, (_, i) => i * (1000 / 12))
    const features = extractSessionStreamFeatures({
      heartrate: { values: heartrate, time, distance },
      altitude: { values: distance.map(() => 10), time, distance },
    })
    assert.ok(features)
    assert.ok(features!.hrDriftPct != null && features!.hrDriftPct > 5)
    assert.ok(features!.paceAtHrMinPerKm != null)
    const agg = aggregateStreamFeatures([features!])
    assert.ok(agg.withHrCount === 1)
    assert.ok(agg.aerobicEfficiencyScore != null)
  })

  it('uses stream features for aerobic efficiency when present', () => {
    const data = fixtureData()
    data.streamFeatures = {
      sessionCount: 4,
      withHrCount: 4,
      meanHrDriftPct: 3,
      meanPaceAtHrMinPerKm: 5.1,
      meanLatePaceDecayPct: 2,
      aerobicEfficiencyScore: 78,
      lateRunResistanceScore: 72,
      confidence: 0.7,
    }
    const state = buildAthleteState(data, 'advanced')
    const model = buildAthletePhysiologyModel({ state, data })
    assert.equal(model.aerobic.aerobicEfficiency.value, 78)
    assert.ok(model.aerobic.aerobicEfficiency.confidence >= 0.7)
    assert.ok(model.durability.fatigueResistanceLateRun.value > 50)
  })

  it('draft with priorFingerprint biases response prediction vs cold start', async () => {
    const data = fixtureData()
    const cold = await buildDraftFromCollected({
      data,
      skillSlug: 'run-half-marathon',
      brief: {
        weekCount: 8,
        level: 'advanced',
        daysPerWeek: 5,
        currentWeeklyKm: 55,
      },
      allowAi: false,
      skipPhysiologyStore: true,
    })
    const prior = {
      ...cold.physiology.fingerprint,
      volumeResponder: {
        ...cold.physiology.fingerprint.volumeResponder,
        value: 0.95,
        confidence: 0.85,
      },
      thresholdResponder: {
        ...cold.physiology.fingerprint.thresholdResponder,
        value: 0.2,
        confidence: 0.85,
      },
      vo2Responder: {
        ...cold.physiology.fingerprint.vo2Responder,
        value: 0.15,
        confidence: 0.85,
      },
    }
    const warm = await buildDraftFromCollected({
      data,
      skillSlug: 'run-half-marathon',
      brief: {
        weekCount: 8,
        level: 'advanced',
        daysPerWeek: 5,
        currentWeeklyKm: 55,
      },
      allowAi: false,
      skipPhysiologyStore: true,
      priorFingerprint: prior,
    })
    assert.ok(warm.physiology.fingerprint.volumeResponder.value >= 0.5)
    assert.ok(
      warm.audit.physiology?.fingerprint.volumeResponder != null ||
        warm.meta.physiology != null,
    )
    assert.ok(warm.physiology.snapshot.responsePrediction.primaryIntervention)
    // Warm merge should keep elevated volume responder signal.
    assert.ok(
      warm.physiology.fingerprint.volumeResponder.value >
        cold.physiology.fingerprint.volumeResponder.value * 0.9,
    )
  })
})
