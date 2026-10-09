import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { SessionType, WorkoutType } from '@prisma/client'
import { calculateGaps } from '@/lib/coach-engine/capability'
import {
  calculateCapacity,
  capacityCeilingForWeek,
  stubCapacityEnvelope,
  stubCapacityProfile,
} from '@/lib/coach-engine/capacity'
import {
  resolveSportArchitecture,
  sportArchitectureIdForDemand,
  findSportInterferenceErrors,
} from '@/lib/coach-engine/sport-architecture'
import { getDemandProfile } from '@/lib/coach-engine/demand'
import { buildDraftFromCollected } from '@/lib/coach-engine/pipeline'
import { planDraftOutputSchema } from '@/lib/ai/skills/types'
import { validateWorkoutProposal, applyAdaptations, proposalToSession } from '@/lib/coach-engine/validate'
import { getWorkoutById } from '@/lib/coach-engine/library'
import { estimateStructureDistanceKm } from '@/lib/workout-builder/segment-estimation'
import { validateWeekComprehensive } from '@/lib/coach-engine/plan-score'
import { buildWeeklyArchitecture } from '@/lib/coach-engine/weekly'
import { buildPhaseProfile } from '@/lib/coach-engine/periodization'
import { buildAthleteState } from '@/lib/coach-engine/state'
import { calculateLimitingFactors } from '@/lib/coach-engine/limiting-factors'
import { selectMethodology, evaluateNorwegianEligibility } from '@/lib/coach-engine/methodology'
import { calculateDoseProfile, calculateTrainingBudget } from '@/lib/coach-engine/dose'
import { canProgressTo, buildProgressiveAdaptations, findCandidatesForSlotV2, pickProgressiveCandidateV2 } from '@/lib/coach-engine/library-v2'
import {
  compareResponse,
  expectedResponseForSession,
  missedWorkoutAction,
} from '@/lib/coach-engine/learning'
import { decideReadinessAction } from '@/lib/coach-engine/safety'
import type {
  CapacityProfile,
  CollectedAthleteData,
  GoalProfile,
} from '@/lib/coach-engine/types'
import { ADAPTATION_KEYS } from '@/lib/coach-engine/types'
import { calculateCapabilities } from '@/lib/coach-engine/capability'
import { selectPriorities } from '@/lib/coach-engine/priority'

function fixtureData(): CollectedAthleteData {
  return {
    athleteId: 'ath_test',
    name: 'Test Athlete',
    paces: { easy: 5.5, tempo: 4.8, threshold: 4.5, vo2: 4.0 },
    bikeFtpWatts: null,
    swimCssSecPer100m: null,
    hr: { max: 190, resting: 50 },
    races: [
      {
        name: 'City Marathon',
        date: '2027-04-18',
        type: 'MARATHON',
        sport: 'RUN',
        priority: 'A',
        goal: '3:45',
      },
    ],
    recentSessions: [
      {
        date: '2026-10-01',
        type: WorkoutType.RUN,
        title: 'Easy',
        status: 'COMPLETED',
        plannedDistanceKm: 8,
        plannedDurationMin: 45,
        actualDistanceKm: 8.2,
        actualDurationMin: 46,
        rpe: 5,
        estimatedTss: 40,
      },
    ],
    weekSummaries: [
      {
        weekStart: '2026-09-29',
        planned: 5,
        completed: 4,
        skipped: 0,
        plannedDistanceKm: 42,
        completedDistanceKm: 38,
        estimatedTss: 220,
      },
      {
        weekStart: '2026-09-22',
        planned: 5,
        completed: 5,
        skipped: 0,
        plannedDistanceKm: 40,
        completedDistanceKm: 40,
        estimatedTss: 210,
      },
      {
        weekStart: '2026-09-15',
        planned: 4,
        completed: 3,
        skipped: 1,
        plannedDistanceKm: 35,
        completedDistanceKm: 30,
        estimatedTss: 180,
      },
      {
        weekStart: '2026-09-08',
        planned: 5,
        completed: 4,
        skipped: 0,
        plannedDistanceKm: 38,
        completedDistanceKm: 36,
        estimatedTss: 200,
      },
    ],
  }
}

function marathonGoal(): GoalProfile {
  return {
    sport: WorkoutType.RUN,
    type: 'race',
    demandId: 'MARATHON_V1',
    race: { name: 'Marathon', date: '2027-04-18', priority: 'A' },
    target: { type: 'time', valueLabel: '3:45' },
    weekCount: 12,
    level: 'intermediate',
    notes: '',
    daysPerWeek: 5,
    longRunDay: 5,
    raceWeekday: 6,
    availableDays: [],
    currentWeeklyKm: 40,
    firstWeekKm: 38,
  }
}

describe('gap analysis', () => {
  it('computes gap as demand minus capability (floored at 0)', () => {
    const demands = getDemandProfile('MARATHON_V1').demands
    const capabilities = {
      capabilities: Object.fromEntries(
        ADAPTATION_KEYS.map((k) => [k, 0.7]),
      ) as Record<(typeof ADAPTATION_KEYS)[number], number>,
      confidence: 0.5,
    }
    const gaps = calculateGaps(capabilities, demands)
    for (const row of gaps.rows) {
      assert.equal(
        row.gap,
        Math.round(Math.max(0, row.demand - row.capability) * 100) / 100,
      )
    }
    assert.ok(gaps.gaps.aerobic_durability > gaps.gaps.speed)
  })
})

describe('limiting factors', () => {
  it('ranks limiting factors with primary on top', () => {
    const data = fixtureData()
    const state = buildAthleteState(data, 'intermediate')
    const goal = marathonGoal()
    const demand = getDemandProfile(goal.demandId)
    const caps = calculateCapabilities(state, data, goal)
    const gaps = calculateGaps(caps, demand.demands)
    const phase = buildPhaseProfile({
      goal,
      priority: { primary: { adaptation: 'aerobic_durability', score: 0.5 }, secondary: [] },
    })
    const limiting = calculateLimitingFactors({ gaps, demand, phase })
    assert.ok(limiting.factors.length === ADAPTATION_KEYS.length)
    assert.equal(limiting.primary.adaptation, limiting.factors[0]!.adaptation)
    assert.ok(limiting.primary.score >= limiting.factors.at(-1)!.score)
  })
})

describe('methodology', () => {
  it('is deterministic for the same inputs', () => {
    const data = fixtureData()
    const state = buildAthleteState(data, 'intermediate')
    const goal = marathonGoal()
    const demand = getDemandProfile(goal.demandId)
    const caps = calculateCapabilities(state, data, goal)
    const gaps = calculateGaps(caps, demand.demands)
    const phase = buildPhaseProfile({
      goal,
      priority: { primary: { adaptation: 'aerobic_durability', score: 0.8 }, secondary: [] },
    })
    const priority = selectPriorities({ gaps, demand, phase, state })
    const a = selectMethodology({ state, goal, phase, priority })
    const b = selectMethodology({ state, goal, phase, priority })
    assert.equal(a.selectedModel, b.selectedModel)
    assert.equal(a.confidence, b.confidence)
  })

  it('blocks Norwegian for beginners', () => {
    const data = fixtureData()
    const state = buildAthleteState(data, 'beginner')
    const goal = { ...marathonGoal(), level: 'beginner' as const }
    const elig = evaluateNorwegianEligibility(state, goal)
    assert.equal(elig.eligible, false)
  })
})

describe('dose', () => {
  it('includes deload weeks for long blocks', () => {
    const data = fixtureData()
    const state = buildAthleteState(data, 'intermediate')
    const goal = marathonGoal()
    const capacity = calculateCapacity(state, goal)
    const budget = calculateTrainingBudget({ brief: {}, capacity, state })
    const dose = calculateDoseProfile({ state, goal, capacity, budget })
    assert.ok(dose.deloadWeekIndexes.length >= 1)
    assert.ok(dose.volumeScaleByWeek.length === goal.weekCount)
    assert.ok(dose.optTss >= dose.medTss)
  })

  it('makes recovery weeks ~90% of prior loading (≈10% volume cut)', () => {
    const data = fixtureData()
    const state = buildAthleteState(data, 'intermediate')
    const goal = marathonGoal()
    const capacity = calculateCapacity(state, goal)
    const budget = calculateTrainingBudget({ brief: {}, capacity, state })
    const dose = calculateDoseProfile({ state, goal, capacity, budget })
    for (const w of dose.deloadWeekIndexes) {
      const prev = dose.volumeScaleByWeek[w - 1]
      const cur = dose.volumeScaleByWeek[w]
      assert.ok(prev != null && cur != null)
      assert.ok(
        cur <= prev * 0.92,
        `deload week ${w + 1} scale ${cur} not recovery vs prior ${prev}`,
      )
      assert.ok(
        cur >= prev * 0.86,
        `deload week ${w + 1} cut too hard (${cur} vs ${prev})`,
      )
    }
  })
})

describe('week blueprints', () => {
  it('assigns one phase per week without mid-week splits', async () => {
    const { buildWeekBlueprints } = await import('@/lib/coach-engine/blueprint')
    const { selectPriorities } = await import('@/lib/coach-engine/priority')
    const data = fixtureData()
    const state = buildAthleteState(data, 'advanced')
    const goal = {
      ...marathonGoal(),
      demandId: 'HALF_V1' as const,
      weekCount: 10,
      level: 'advanced' as const,
      firstWeekKm: 55,
      currentWeeklyKm: 55,
    }
    const capacity = calculateCapacity(state, goal)
    const budget = calculateTrainingBudget({ brief: {}, capacity, state })
    const dose = calculateDoseProfile({ state, goal, capacity, budget })
    const demand = getDemandProfile(goal.demandId)
    const capabilities = calculateCapabilities(state, data, goal)
    const gaps = calculateGaps(capabilities, demand.demands)
    const phase = buildPhaseProfile({
      goal,
      priority: {
        primary: { adaptation: 'threshold', score: 0.8 },
        secondary: [],
      },
      weekIndex: 5,
      dose,
    })
    const priority = selectPriorities({ gaps, demand, phase, state })
    const bps = buildWeekBlueprints({ goal, dose, priority, capacity })
    assert.equal(bps.length, 10)
    assert.equal(bps[bps.length - 1]!.phase, 'RACE')
    assert.ok(bps.some((b) => b.isDeload))
    // Peak week (penultimate) keeps a real long; race week does not.
    assert.ok(bps[8]!.longRunMinMinutes >= 55)
    assert.ok(bps[9]!.isRaceWeek)
    // Deload volume below prior week
    for (const bp of bps.filter((b) => b.isDeload)) {
      const prev = bps[bp.weekIndex - 1]
      assert.ok(prev)
      assert.ok(bp.targetKm <= prev.targetKm * 0.92)
      assert.ok(bp.qualitySessions === 0)
    }
    // No loading-week jump above ~10%
    for (let w = 1; w < bps.length; w += 1) {
      const prev = bps[w - 1]!
      const cur = bps[w]!
      if (cur.isDeload || cur.isRaceWeek || prev.isDeload) continue
      assert.ok(
        cur.targetKm <= prev.targetKm * 1.15,
        `W${w + 1} target ${cur.targetKm} jumps from ${prev.targetKm}`,
      )
    }
    // HM: early/adaptation longs stay aerobic/steady; progressive only late (no MP longs).
    for (const bp of bps) {
      if (
        bp.intensityBand === 'adaptation' ||
        bp.label === 'Base' ||
        bp.label === 'Adaptation' ||
        bp.isDeload ||
        bp.isTaper ||
        bp.isRaceWeek
      ) {
        assert.ok(
          bp.preferAerobicLong ||
            bp.longIntensityProfile === 'steady_finish',
          `early/recovery week ${bp.weekIndex} long should stay aerobic`,
        )
      }
    }
    assert.ok(
      bps.every(
        (b) =>
          b.longIntensityProfile !== 'race_specific' ||
          b.preferRaceSpecific,
      ),
      'HM race-specific long only when race-pace phase is on',
    )
  })

  it('discrete roadmaps: 16w adapts, 8w goes specific, 6w gated by readiness', async () => {
    const {
      describeRoadmap,
      determinePreparationPathway,
      planCapabilityForWeekCount,
    } = await import('@/lib/coach-engine/preparation-roadmap')

    assert.equal(planCapabilityForWeekCount(16), 'FULL_DEVELOPMENT')
    assert.equal(planCapabilityForWeekCount(12), 'DEVELOPMENT_AND_SPECIFICITY')
    assert.equal(planCapabilityForWeekCount(8), 'SPECIFIC_BLOCK')
    assert.equal(planCapabilityForWeekCount(4), 'RACE_PREPARATION')
    assert.equal(planCapabilityForWeekCount(2), 'TAPER')

    const r16 = describeRoadmap(16)
    assert.equal(r16.weeks[0]!.band, 'adaptation')
    assert.equal(r16.weeks[8]!.band, 'specific') // W9
    assert.equal(r16.weeks[14]!.band, 'taper')

    const r8 = describeRoadmap(8)
    assert.equal(r8.weeks[0]!.band, 'specific')
    assert.equal(r8.weeks[1]!.band, 'specific')
    assert.ok(!r8.weeks.some((w) => w.band === 'adaptation'))
    assert.ok(!r8.weeks.some((w) => w.band === 'engine'))

    const r6 = describeRoadmap(6)
    assert.equal(r6.weeks[0]!.band, 'specific')
    assert.equal(r6.weeks[2]!.band, 'peak')
    assert.equal(r6.weeks[5]!.band, 'race')

    const ok8 = determinePreparationPathway({
      weekCount: 8,
      currentWeeklyKm: 48,
      recentLongestRunKm: 24,
      demandId: 'MARATHON_V1',
    })
    assert.equal(ok8.allowed, true)
    assert.equal(ok8.depth, 'SPECIFIC_BLOCK')

    const bad8 = determinePreparationPathway({
      weekCount: 8,
      currentWeeklyKm: 22,
      recentLongestRunKm: 12,
      demandId: 'MARATHON_V1',
    })
    assert.equal(bad8.allowed, false)
    assert.ok(bad8.suggestions.length >= 1)

    const medium8 = determinePreparationPathway({
      weekCount: 8,
      currentWeeklyKm: 32,
      recentLongestRunKm: 16,
      demandId: 'MARATHON_V1',
    })
    assert.equal(medium8.allowed, false, '8w requires high readiness')
  })

  it('marathon 16w: slow intensity ramp — early weeks easy, no VO2', async () => {
    const { buildWeekBlueprints } = await import('@/lib/coach-engine/blueprint')
    const { adaptationShare } = await import(
      '@/lib/coach-engine/intensity-ramp'
    )
    assert.ok(adaptationShare(16) > adaptationShare(8))

    const data = fixtureData()
    const state = buildAthleteState(data, 'beginner')
    const goal: GoalProfile = {
      ...marathonGoal(),
      weekCount: 16,
      level: 'beginner',
      daysPerWeek: 3,
      target: { type: 'time', valueLabel: '4:30' },
      currentWeeklyKm: 29,
      firstWeekKm: 29,
    }
    const capacity = calculateCapacity(state, goal)
    const budget = calculateTrainingBudget({ brief: {}, capacity, state })
    const dose = calculateDoseProfile({ state, goal, capacity, budget })
    const demand = getDemandProfile(goal.demandId)
    const capabilities = calculateCapabilities(state, data, goal)
    const gaps = calculateGaps(capabilities, demand.demands)
    const phase = buildPhaseProfile({
      goal,
      priority: {
        primary: { adaptation: 'long_run_tolerance', score: 0.9 },
        secondary: [],
      },
      weekIndex: 0,
      dose,
    })
    const priority = selectPriorities({ gaps, demand, phase, state })
    const bps = buildWeekBlueprints({ goal, dose, priority, capacity })

    // W1–W2: adaptation, no formal quality / no VO2 / no MP.
    for (const bp of bps.slice(0, 2)) {
      if (bp.isDeload) continue
      assert.equal(bp.intensityBand, 'adaptation', `W${bp.weekIndex + 1}`)
      assert.equal(bp.qualitySessions, 0, `W${bp.weekIndex + 1} quality`)
      assert.equal(bp.allowVo2, false)
      assert.equal(bp.preferRaceSpecific, false)
      assert.ok(bp.preferStrides)
    }
    // First ~4 loading weeks stay off race-specific.
    const early = bps.filter(
      (b) => !b.isDeload && !b.isTaper && !b.isRaceWeek && b.weekIndex < 5,
    )
    assert.ok(early.every((b) => !b.preferRaceSpecific && !b.allowVo2))
    // Specific / peak appear later.
    const specificOrPeak = bps.filter(
      (b) => b.intensityBand === 'specific' || b.intensityBand === 'peak',
    )
    assert.ok(specificOrPeak.length >= 3)
    assert.ok(specificOrPeak.every((b) => b.weekIndex >= 7))

    // Ready 8w specific block: specificity from week 1 (not a compressed 16w base).
    const ready8: GoalProfile = {
      ...goal,
      weekCount: 8,
      level: 'advanced',
      daysPerWeek: 5,
      currentWeeklyKm: 55,
      firstWeekKm: 52,
    }
    const ready8Bps = buildWeekBlueprints({
      goal: ready8,
      dose: calculateDoseProfile({
        state: buildAthleteState(data, 'advanced'),
        goal: ready8,
        capacity: calculateCapacity(buildAthleteState(data, 'advanced'), ready8),
        budget,
      }),
      priority,
      capacity: calculateCapacity(buildAthleteState(data, 'advanced'), ready8),
    })
    assert.ok(
      ready8Bps
        .filter((b) => !b.isDeload && !b.isRaceWeek && !b.isTaper)
        .every((b) => b.intensityBand === 'specific' || b.intensityBand === 'peak'),
      'ready 8w should be specific/peak, not adaptation/base',
    )
    // Unready 8w: no quality campaign.
    const unready8: GoalProfile = { ...goal, weekCount: 8 }
    const unready8Bps = buildWeekBlueprints({
      goal: unready8,
      dose: calculateDoseProfile({
        state,
        goal: unready8,
        capacity: calculateCapacity(state, unready8),
        budget,
      }),
      priority,
      capacity: calculateCapacity(state, unready8),
    })
    assert.ok(
      unready8Bps
        .filter((b) => !b.isDeload && !b.isRaceWeek && !b.isTaper)
        .every((b) => b.qualitySessions === 0),
      'unready 8w must not run a specificity/quality campaign',
    )
  })

  it('marathon 16w: taller long wave, MP turn-on, soft race week', async () => {
    const { buildWeekBlueprints } = await import('@/lib/coach-engine/blueprint')
    const data = fixtureData()
    const state = buildAthleteState(data, 'advanced')
    const goal: GoalProfile = {
      ...marathonGoal(),
      weekCount: 16,
      level: 'advanced',
      target: { type: 'time', valueLabel: '2:30' },
      currentWeeklyKm: 70,
      firstWeekKm: 58,
    }
    const capacity = calculateCapacity(state, goal)
    const budget = calculateTrainingBudget({ brief: {}, capacity, state })
    const dose = calculateDoseProfile({ state, goal, capacity, budget })
    const demand = getDemandProfile(goal.demandId)
    const capabilities = calculateCapabilities(state, data, goal)
    const gaps = calculateGaps(capabilities, demand.demands)
    const phase = buildPhaseProfile({
      goal,
      priority: {
        primary: { adaptation: 'threshold', score: 0.8 },
        secondary: [],
      },
      weekIndex: 8,
      dose,
    })
    const priority = selectPriorities({ gaps, demand, phase, state })
    const bps = buildWeekBlueprints({ goal, dose, priority, capacity })
    assert.equal(bps.length, 16)
    assert.ok(bps[bps.length - 1]!.isRaceWeek)
    assert.ok(bps[bps.length - 1]!.volumeScale <= 0.4)
    assert.ok(bps[bps.length - 1]!.targetKm < goal.firstWeekKm! * 0.7)

    const peakLong = Math.max(
      ...bps
        .filter((b) => !b.isDeload && !b.isRaceWeek)
        .map((b) => b.longRunTargetKm),
    )
    assert.ok(
      peakLong >= 33,
      `expected marathon peak long ≥33 km for advanced, got ${peakLong}`,
    )

    const raceSpecificWeeks = bps.filter(
      (b) => b.preferRaceSpecific && !b.isRaceWeek && !b.isDeload,
    )
    assert.ok(
      raceSpecificWeeks.length >= 4,
      'marathon should turn on race-specific / MP for several weeks',
    )
    assert.ok(raceSpecificWeeks.some((b) => !b.preferAerobicLong))

    for (const bp of bps.filter((b) => b.isDeload)) {
      assert.equal(bp.qualitySessions, 0)
      assert.equal(bp.thresholdVolumeTargetMin, null)
    }
  })

  it('session load class distinguishes easy long from race-specific long', async () => {
    const {
      classifyLongIntensity,
      weeklyStressBudget,
      loadCost,
    } = await import('@/lib/coach-engine/session-load')
    assert.equal(classifyLongIntensity('aerobic'), 'HIGH')
    assert.equal(classifyLongIntensity('race_specific'), 'VERY_HIGH')
    assert.ok(weeklyStressBudget('advanced') > weeklyStressBudget('beginner'))
    assert.ok(
      loadCost('VERY_HIGH') > loadCost('HIGH'),
      'very-high sessions cost more than high',
    )
  })

  it('marathon beginner 16w: meets preparation standard (50km week + 30km long)', async () => {
    const { buildWeekBlueprints } = await import('@/lib/coach-engine/blueprint')
    const {
      getMarathonPreparationStandard,
      validateMarathonLongRunDurability,
    } = await import('@/lib/coach-engine/long-run-target')
    const standard = getMarathonPreparationStandard({ level: 'beginner' })
    assert.equal(standard.minimumPeakWeeklyKm, 50)
    assert.equal(standard.minimumPeakLongRunKm, 30)

    const data = fixtureData()
    const state = buildAthleteState(data, 'beginner')
    const goal: GoalProfile = {
      ...marathonGoal(),
      weekCount: 16,
      level: 'beginner',
      daysPerWeek: 3,
      target: { type: 'time', valueLabel: '4:30' },
      currentWeeklyKm: 29,
      firstWeekKm: 29,
    }
    const capacity = calculateCapacity(state, goal)
    assert.ok(
      (capacity.envelope?.maxPeakKm ?? 0) >= standard.minimumPeakWeeklyKm,
      `envelope peak ${capacity.envelope?.maxPeakKm} below minimum ${standard.minimumPeakWeeklyKm}`,
    )
    const budget = calculateTrainingBudget({ brief: {}, capacity, state })
    const dose = calculateDoseProfile({ state, goal, capacity, budget })
    const demand = getDemandProfile(goal.demandId)
    const capabilities = calculateCapabilities(state, data, goal)
    const gaps = calculateGaps(capabilities, demand.demands)
    const phase = buildPhaseProfile({
      goal,
      priority: {
        primary: { adaptation: 'long_run_tolerance', score: 0.9 },
        secondary: [],
      },
      weekIndex: 8,
      dose,
    })
    const priority = selectPriorities({ gaps, demand, phase, state })
    const bps = buildWeekBlueprints({ goal, dose, priority, capacity })

    const peakLong = Math.max(
      ...bps.filter((b) => !b.isRaceWeek).map((b) => b.longRunTargetKm),
    )
    const peakWeek = Math.max(
      ...bps.filter((b) => !b.isRaceWeek).map((b) => b.targetKm),
    )
    assert.ok(
      peakLong >= 30,
      `beginner marathon peak long ≥30 km, got ${peakLong}`,
    )
    assert.ok(
      peakWeek >= 50,
      `beginner marathon peak week ≥50 km, got ${peakWeek}`,
    )

    const validation = validateMarathonLongRunDurability({
      level: 'beginner',
      longRunKmByWeek: bps.map((b) => b.longRunTargetKm),
      weeklyKmByWeek: bps.map((b) => b.targetKm),
      raceWeekIndex: bps.find((b) => b.isRaceWeek)?.weekIndex,
      daysPerWeek: goal.daysPerWeek,
    })
    assert.ok(validation.meetsMinimumStandard, validation.warnings.join('; '))
    assert.ok(
      validation.runsOver30Km >= 1,
      `expected ≥1 run ≥30 km, got ${validation.runsOver30Km}`,
    )
    assert.ok(
      validation.runsOver28Km >= 3,
      `expected ≥3 runs ≥28 km (durability phase), got ${validation.runsOver28Km}`,
    )
    assert.ok(
      validation.maxLongRunWeeklyRatio <= 0.55,
      `3d marathon max LR/week ratio should be ≤55%, got ${validation.maxLongRunWeeklyRatio}`,
    )
    const mpLongWeeks = bps.filter((b) => b.longRunMpKm >= 4)
    assert.ok(
      mpLongWeeks.length >= 1,
      `expected peak-phase MP-under-fatigue long (≥4 km MP), got ${mpLongWeeks.map((b) => `W${b.weekIndex + 1}:${b.longRunMpKm}`).join(',')}`,
    )

    // Recovery must not create a fake low baseline for the next jump.
    for (let i = 1; i < bps.length; i += 1) {
      const prev = bps[i - 1]!
      const cur = bps[i]!
      if (prev.isDeload && !cur.isDeload && !cur.isRaceWeek && !cur.isTaper) {
        const lastLoading = [...bps]
          .slice(0, i)
          .reverse()
          .find((b) => !b.isDeload && !b.isRaceWeek)
        if (lastLoading) {
          assert.ok(
            cur.targetKm <= lastLoading.targetKm * 1.15 + 0.2,
            `W${i + 1} rebound ${lastLoading.targetKm}→${cur.targetKm} after recovery`,
          )
        }
      }
    }
  })

  it('assessMarathonFeasibility flags insufficient preparation time', async () => {
    const { assessMarathonFeasibility } = await import(
      '@/lib/coach-engine/long-run-target'
    )
    const ok = assessMarathonFeasibility({
      level: 'beginner',
      weekCount: 16,
      currentWeeklyKm: 30,
      recentLongestRunKm: 16,
    })
    assert.equal(ok.feasible, true)
    assert.equal(ok.pathway, 'standard')

    const short = assessMarathonFeasibility({
      level: 'beginner',
      weekCount: 8,
      currentWeeklyKm: 15,
      recentLongestRunKm: 10,
    })
    assert.equal(short.feasible, false)
    assert.ok(short.recommendedWeekCount != null && short.recommendedWeekCount > 8)
  })

  it('marathon long slots never pick bike endurance rides', async () => {
    const { findCandidatesForSlotV2 } = await import(
      '@/lib/coach-engine/library-v2'
    )
    const { WorkoutType } = await import('@prisma/client')
    const candidates = findCandidatesForSlotV2(
      {
        dayOfWeek: 6,
        stimulus: 'long',
        hard: true,
        isKeySession: true,
        availableMinutes: 150,
        primaryAdaptation: 'long_run_tolerance',
        preferRaceSpecific: false,
        doubleThreshold: false,
        modality: 'run',
      },
      {
        sportFocus: WorkoutType.RUN,
        demandId: 'MARATHON_V1',
        preferAerobicLong: true,
        limit: 8,
      },
    )
    assert.ok(candidates.length > 0)
    assert.ok(
      candidates.every((c) => c.sport === WorkoutType.RUN),
      `bike leaked into marathon long candidates: ${candidates.map((c) => c.id).join(',')}`,
    )
  })

  it('HM THRESHOLD plan: base weeks are threshold-first, longs mostly aerobic', async () => {
    const { buildWeekBlueprints } = await import('@/lib/coach-engine/blueprint')
    const { pickLongIntensityProfile } = await import(
      '@/lib/coach-engine/long-run-target'
    )
    const { longProfileMatch } = await import(
      '@/lib/coach-engine/long-run-target'
    )
    const data = fixtureData()
    const state = buildAthleteState(data, 'advanced')
    const goal: GoalProfile = {
      ...marathonGoal(),
      demandId: 'HALF_V1',
      weekCount: 12,
      level: 'advanced',
      target: { type: 'time', valueLabel: '1:12' },
      currentWeeklyKm: 60,
      firstWeekKm: 50,
    }
    const capacity = calculateCapacity(state, goal)
    const budget = calculateTrainingBudget({ brief: {}, capacity, state })
    const dose = calculateDoseProfile({ state, goal, capacity, budget })
    const demand = getDemandProfile(goal.demandId)
    const capabilities = calculateCapabilities(state, data, goal)
    const gaps = calculateGaps(capabilities, demand.demands)
    const phase = buildPhaseProfile({
      goal,
      priority: {
        primary: { adaptation: 'threshold', score: 0.8 },
        secondary: [],
      },
      weekIndex: 2,
      dose,
    })
    const priority = selectPriorities({ gaps, demand, phase, state })
    const bps = buildWeekBlueprints({ goal, dose, priority, capacity })

    const baseWeeks = bps.filter((b) => b.phase === 'BASE' && !b.isDeload)
    assert.ok(baseWeeks.length >= 2)
    for (const bp of baseWeeks) {
      assert.equal(
        bp.preferRaceSpecific,
        false,
        `base week ${bp.weekIndex} should not prefer race-pace quality`,
      )
      assert.equal(bp.preferAerobicLong, true)
    }

    // Race-pace quality only late in the plan.
    const firstRaceWeek = bps.find(
      (b) => b.preferRaceSpecific && !b.isRaceWeek && !b.isDeload && !b.isTaper,
    )
    assert.ok(firstRaceWeek, 'expected some race-specific weeks late')
    assert.ok(
      firstRaceWeek!.weekIndex >= 5,
      `race-pace turned on too early at week ${firstRaceWeek!.weekIndex}`,
    )

    // Taper must cut volume meaningfully.
    const taper = bps.find((b) => b.isTaper && !b.isRaceWeek)
    const peak = bps.filter((b) => !b.isDeload && !b.isTaper && !b.isRaceWeek).at(-1)
    assert.ok(taper && peak)
    assert.ok(
      taper!.targetKm <= peak!.targetKm * 0.85,
      `taper ${taper!.targetKm} not enough cut vs peak ${peak!.targetKm}`,
    )

    // Aerobic profile must reject fartlek/threshold longs.
    assert.equal(
      longProfileMatch(
        ['long-run', 'fartlek', 'threshold', 'aerobic'],
        'RUN_LONG_FARTLEK',
        'aerobic',
      ),
      false,
    )
    assert.equal(
      pickLongIntensityProfile({
        kind: 'base',
        preferRaceSpecific: false,
        weekIndex: 0,
        distanceClimbed: false,
      }),
      'aerobic',
    )
  })

  it('HM advanced 1:12: long-run km progresses and respects weekly ratio', async () => {
    const { buildWeekBlueprints } = await import('@/lib/coach-engine/blueprint')
    const data = fixtureData()
    const state = buildAthleteState(data, 'advanced')
    const goal: GoalProfile = {
      ...marathonGoal(),
      demandId: 'HALF_V1',
      weekCount: 12,
      level: 'advanced',
      target: { type: 'time', valueLabel: '1:12' },
      currentWeeklyKm: 70,
      firstWeekKm: 50,
    }
    const capacity = calculateCapacity(state, goal)
    const budget = calculateTrainingBudget({ brief: {}, capacity, state })
    const dose = calculateDoseProfile({ state, goal, capacity, budget })
    const demand = getDemandProfile(goal.demandId)
    const capabilities = calculateCapabilities(state, data, goal)
    const gaps = calculateGaps(capabilities, demand.demands)
    const phase = buildPhaseProfile({
      goal,
      priority: {
        primary: { adaptation: 'threshold', score: 0.8 },
        secondary: [],
      },
      weekIndex: 5,
      dose,
    })
    const priority = selectPriorities({ gaps, demand, phase, state })
    const bps = buildWeekBlueprints({ goal, dose, priority, capacity })

    const loading = bps.filter((b) => !b.isDeload && !b.isRaceWeek)
    assert.ok(loading[0]!.longRunTargetKm >= 16)
    const peakLong = Math.max(...loading.map((b) => b.longRunTargetKm))
    assert.ok(peakLong >= 20, `peak long ${peakLong} too short for 1:12 advanced`)
    assert.ok(peakLong <= 32, `peak long ${peakLong} too long vs weekly ratio`)

    // Flat 14 km forever is the bug — require progression.
    const uniqueLongs = new Set(loading.map((b) => b.longRunTargetKm))
    assert.ok(uniqueLongs.size >= 3, `longs did not progress: ${[...uniqueLongs]}`)

    for (const bp of loading) {
      assert.ok(
        bp.longRunTargetKm / bp.targetKm <= 0.4,
        `W${bp.weekIndex + 1} long ${bp.longRunTargetKm} is ${((bp.longRunTargetKm / bp.targetKm) * 100).toFixed(0)}% of week`,
      )
    }

    // Rebound is vs last loading week (not the cut deload baseline).
    for (let w = 1; w < bps.length - 1; w += 1) {
      const prev = bps[w - 1]!
      const cur = bps[w]!
      if (cur.isRaceWeek || !prev.isDeload) continue
      const lastLoading = [...bps]
        .slice(0, w)
        .reverse()
        .find((b) => !b.isDeload && !b.isRaceWeek)
      if (!lastLoading) continue
      assert.ok(
        cur.targetKm <= lastLoading.targetKm * 1.15 + 0.2,
        `W${w + 1} rebound ${lastLoading.targetKm}→${cur.targetKm} after recovery`,
      )
    }
  })
})

describe('capacity', () => {
  it('does not set weekly km/tss below recent volume', () => {
    const state = buildAthleteState(fixtureData(), 'intermediate')
    const capacity = calculateCapacity(state, marathonGoal())
    assert.ok(capacity.maxWeeklyKm >= state.recentVolume.runningKmPerWeek)
    assert.ok(capacity.maxWeeklyTss >= state.recentVolume.avgWeeklyTss)
  })

  it('separates present capacity from progressive peak envelope', () => {
    const state = buildAthleteState(fixtureData(), 'intermediate')
    const goal = { ...marathonGoal(), weekCount: 12, firstWeekKm: 50 }
    const capacity = calculateCapacity(state, goal)
    assert.ok(capacity.envelope)
    assert.equal(capacity.envelope.weekCount, 12)
    assert.ok(
      capacity.envelope.maxPeakKm > capacity.maxWeeklyKm,
      `peak ${capacity.envelope.maxPeakKm} should exceed present ${capacity.maxWeeklyKm}`,
    )
    const w0 = capacityCeilingForWeek(capacity, 0)
    const mid = capacityCeilingForWeek(
      capacity,
      Math.floor(goal.weekCount / 2),
    )
    assert.ok(
      mid.maxKm >= w0.maxKm,
      `mid-block ceiling ${mid.maxKm} should be ≥ week-0 ${w0.maxKm}`,
    )
    const race = capacityCeilingForWeek(capacity, goal.weekCount - 1)
    assert.equal(race.kind, 'race')
    assert.ok(race.maxKm < capacity.envelope.maxPeakKm)
  })

  it('envelope deload weeks sit below prior loading ceiling', () => {
    const state = buildAthleteState(fixtureData(), 'intermediate')
    const goal = { ...marathonGoal(), weekCount: 12 }
    const capacity = calculateCapacity(state, goal)
    const deload = capacity.envelope.weeks.find((w) => w.kind === 'deload')
    assert.ok(deload, 'expected a provisional deload week')
    if (deload.weekIndex === 0) return
    const prev = capacity.envelope.weeks[deload.weekIndex - 1]!
    assert.ok(
      deload.maxKm <= prev.maxKm,
      `deload W${deload.weekIndex + 1} ${deload.maxKm} > prior ${prev.maxKm}`,
    )
  })

  it('respects declared daysPerWeek for session cap', () => {
    const state = buildAthleteState(fixtureData(), 'intermediate')
    const hm = calculateCapacity(state, {
      ...marathonGoal(),
      demandId: 'HALF_V1',
      daysPerWeek: 3,
      weekCount: 10,
    })
    assert.equal(hm.maxSessionsPerWeek, 3)
    assert.equal(hm.maxHardSessionsPerWeek, 1)

    // Marathon preparation standard may schedule a 4th easy on high-volume weeks.
    const marathon = calculateCapacity(state, {
      ...marathonGoal(),
      daysPerWeek: 3,
      weekCount: 16,
    })
    assert.equal(marathon.maxSessionsPerWeek, 4)
  })
})

describe('sport architecture', () => {
  it('gives HYROX station + run channels instead of run-only volume', () => {
    const arch = resolveSportArchitecture({
      demandId: 'HYROX_V1',
      level: 'advanced',
    })
    assert.equal(arch.id, 'hyrox')
    assert.equal(arch.primaryUnit, 'strength_stations')
    assert.ok(arch.usesStationVolume)
    assert.ok(arch.channels.some((c) => c.unit === 'run_km'))
    assert.ok(arch.channels.some((c) => c.unit === 'strength_stations'))
    assert.ok(arch.interferenceRules.some((r) => r.a === 'run' && r.b === 'hyrox'))
  })

  it('gives multi-sport bike minutes + swim meters + run km', () => {
    const arch = resolveSportArchitecture({
      demandId: 'MULTI_BASE_V1',
      level: 'intermediate',
    })
    assert.equal(arch.id, 'multi_sport')
    assert.ok(arch.usesMultiSportMix)
    assert.ok(arch.channels.some((c) => c.unit === 'bike_minutes'))
    assert.ok(arch.channels.some((c) => c.unit === 'swim_meters'))
    assert.ok(arch.channels.some((c) => c.unit === 'run_km'))
  })

  it('HYROX blueprints carry station volume and shorter longs', async () => {
    const { buildWeekBlueprints } = await import('@/lib/coach-engine/blueprint')
    const state = buildAthleteState(fixtureData(), 'advanced')
    const goal: GoalProfile = {
      ...marathonGoal(),
      sport: WorkoutType.HYROX,
      demandId: 'HYROX_V1',
      level: 'advanced',
      weekCount: 10,
      firstWeekKm: 28,
      currentWeeklyKm: 28,
    }
    const capacity = calculateCapacity(state, goal)
    assert.equal(capacity.architectureId, 'hyrox')
    assert.ok(capacity.modalityCaps.some((c) => c.unit === 'strength_stations'))
    const budget = calculateTrainingBudget({ brief: {}, capacity, state })
    const dose = calculateDoseProfile({ state, goal, capacity, budget })
    const bps = buildWeekBlueprints({
      goal,
      dose,
      priority: {
        primary: { adaptation: 'max_strength', score: 0.9 },
        secondary: [{ adaptation: 'aerobic_capacity', score: 0.6 }],
      },
      capacity,
    })
    assert.equal(bps[0]!.architectureId, 'hyrox')
    assert.ok(
      (bps[0]!.stationVolumeTarget ?? 0) > 0,
      'expected station volume target',
    )
    const loading = bps.filter((b) => !b.isDeload && !b.isRaceWeek && !b.isTaper)
    for (const bp of loading) {
      if (bp.longRunTargetKm > 0 && bp.targetKm > 0) {
        assert.ok(
          bp.longRunTargetKm / bp.targetKm <= 0.32,
          `HYROX long ${bp.longRunTargetKm} too large vs week ${bp.targetKm}`,
        )
      }
    }
  })

  it('multi-sport weekly schedule includes bike and swim slots', () => {
    const state = buildAthleteState(fixtureData(), 'intermediate')
    const goal: GoalProfile = {
      ...marathonGoal(),
      sport: WorkoutType.TRIATHLON,
      demandId: 'MULTI_BASE_V1',
      level: 'intermediate',
      weekCount: 8,
      daysPerWeek: 6,
      firstWeekKm: 25,
      currentWeeklyKm: 25,
    }
    const capacity = calculateCapacity(state, goal)
    assert.equal(sportArchitectureIdForDemand(goal.demandId), 'multi_sport')
    const phase = buildPhaseProfile({
      goal,
      priority: {
        primary: { adaptation: 'aerobic_capacity', score: 0.8 },
        secondary: [],
      },
    })
    const architecture = buildWeeklyArchitecture({
      priority: {
        primary: { adaptation: 'aerobic_capacity', score: 0.8 },
        secondary: [],
      },
      capacity,
      phase,
      daysPerWeek: 6,
      longRunDay: 6,
      level: 'intermediate',
      targetKm: 30,
      architectureId: 'multi_sport',
    })
    const stimuli = new Set(architecture.slots.map((s) => s.stimulus))
    assert.ok(stimuli.has('bike'), `missing bike: ${[...stimuli]}`)
    assert.ok(stimuli.has('swim'), `missing swim: ${[...stimuli]}`)
  })

  it('flags hard-run ↔ HYROX adjacency via sport interference rules', () => {
    const arch = resolveSportArchitecture({ demandId: 'HYROX_V1' })
    const errors = findSportInterferenceErrors(
      [
        {
          weekIndex: 0,
          dayOfWeek: 1,
          type: WorkoutType.RUN,
          sessionType: SessionType.THRESHOLD,
          title: 'Threshold',
          description: null,
          plannedDistance: 10,
          plannedDuration: 50,
          coachNotes: null,
          tags: ['threshold'],
          candidateId: 'x',
          primaryAdaptation: 'threshold',
          estimatedTss: 60,
          isKeySession: true,
        },
        {
          weekIndex: 0,
          dayOfWeek: 2,
          type: WorkoutType.HYROX,
          sessionType: SessionType.CUSTOM,
          title: 'Stations',
          description: null,
          plannedDistance: null,
          plannedDuration: 55,
          coachNotes: null,
          tags: ['hyrox', 'stations'],
          candidateId: 'y',
          primaryAdaptation: 'max_strength',
          estimatedTss: 50,
          isKeySession: true,
        },
      ],
      arch,
    )
    assert.ok(errors.some((e) => e.type === 'INTERFERENCE'))
  })
})

describe('weekly schedule', () => {
  it('places long run on preferred day and respects daysPerWeek', () => {
    const state = buildAthleteState(fixtureData(), 'intermediate')
    const goal = { ...marathonGoal(), daysPerWeek: 4, longRunDay: 6 }
    const capacity = calculateCapacity(state, goal)
    const phase = buildPhaseProfile({
      goal,
      priority: {
        primary: { adaptation: 'aerobic_durability', score: 0.8 },
        secondary: [],
      },
    })
    const architecture = buildWeeklyArchitecture({
      priority: {
        primary: { adaptation: 'aerobic_durability', score: 0.8 },
        secondary: [],
      },
      capacity,
      phase,
      daysPerWeek: 4,
      longRunDay: 6,
      level: 'intermediate',
      targetKm: 45,
    })
    const active = architecture.slots.filter((s) => s.stimulus !== 'rest')
    assert.ok(active.length <= 4)
    assert.ok(active.length >= 3)
    const long = architecture.slots.find((s) => s.stimulus === 'long')
    assert.equal(long?.dayOfWeek, 6)
    const hard = architecture.slots.filter((s) => s.hard)
    assert.ok(hard.every((s) => Math.abs(s.dayOfWeek - 6) > 1 || Math.abs(s.dayOfWeek - 6) === 6))
  })

  it('does not fill every available day when user marks 7 days open', () => {
    const state = buildAthleteState(fixtureData(), 'intermediate')
    const goal = {
      ...marathonGoal(),
      daysPerWeek: 7,
      availableDays: [0, 1, 2, 3, 4, 5, 6],
      longRunDay: 6,
      currentWeeklyKm: 45,
      firstWeekKm: 42,
    }
    const capacity = calculateCapacity(state, goal)
    assert.ok(capacity.maxSessionsPerWeek <= 5)
    const phase = buildPhaseProfile({
      goal,
      priority: {
        primary: { adaptation: 'threshold', score: 0.8 },
        secondary: [],
      },
    })
    const architecture = buildWeeklyArchitecture({
      priority: {
        primary: { adaptation: 'threshold', score: 0.8 },
        secondary: [],
      },
      capacity,
      phase,
      daysPerWeek: 7,
      availableDays: [0, 1, 2, 3, 4, 5, 6],
      longRunDay: 6,
      level: 'intermediate',
      qualitySessions: 2,
      targetKm: 48,
    })
    const active = architecture.slots.filter((s) => s.stimulus !== 'rest')
    assert.ok(
      active.length <= 5,
      `7 open days should not force a full calendar, got ${active.length}`,
    )
    assert.ok(active.length >= 3)
  })

  it('never places quality sessions on consecutive days', () => {
    const state = buildAthleteState(fixtureData(), 'advanced')
    const goal = {
      ...marathonGoal(),
      daysPerWeek: 6,
      level: 'advanced' as const,
      longRunDay: 6,
      currentWeeklyKm: 70,
    }
    const capacity = calculateCapacity(state, goal)
    const phase = buildPhaseProfile({
      goal,
      priority: {
        primary: { adaptation: 'threshold', score: 0.8 },
        secondary: [{ adaptation: 'aerobic_capacity', score: 0.5 }],
      },
    })
    const architecture = buildWeeklyArchitecture({
      priority: {
        primary: { adaptation: 'threshold', score: 0.8 },
        secondary: [{ adaptation: 'aerobic_capacity', score: 0.5 }],
      },
      capacity,
      phase,
      daysPerWeek: 6,
      longRunDay: 6,
      level: 'advanced',
      qualitySessions: 2,
      preferRaceSpecific: true,
      targetKm: 65,
    })
    const qualities = architecture.slots
      .filter((s) => s.stimulus === 'quality' && s.hard)
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
    if (qualities.length >= 2) {
      const a = qualities[0]!.dayOfWeek
      const b = qualities[1]!.dayOfWeek
      const gap = Math.min(Math.abs(a - b), 7 - Math.abs(a - b))
      assert.ok(gap >= 2, `qualities on ${a} and ${b} are back-to-back`)
      // Day after first quality must not be hard quality.
      const after = architecture.slots.find((s) => s.dayOfWeek === (a + 1) % 7)
      assert.ok(after)
      assert.ok(
        after!.stimulus === 'easy' ||
          after!.stimulus === 'recovery' ||
          after!.stimulus === 'rest' ||
          after!.stimulus === 'strength',
        `day after quality should be easy/recovery/rest, got ${after!.stimulus}`,
      )
      assert.equal(after!.hard, false)
    }
  })

  it('prefers Tue+Thu rhythm over sparse Mon+Wed when long is weekend', () => {
    const state = buildAthleteState(fixtureData(), 'advanced')
    const goal = {
      ...marathonGoal(),
      daysPerWeek: 5,
      level: 'advanced' as const,
      longRunDay: 5, // Saturday
      availableDays: [0, 1, 2, 3, 4, 5],
      currentWeeklyKm: 65,
    }
    const capacity = calculateCapacity(state, goal)
    const phase = buildPhaseProfile({
      goal,
      priority: {
        primary: { adaptation: 'threshold', score: 0.8 },
        secondary: [{ adaptation: 'aerobic_durability', score: 0.5 }],
      },
    })
    const architecture = buildWeeklyArchitecture({
      priority: {
        primary: { adaptation: 'threshold', score: 0.8 },
        secondary: [{ adaptation: 'aerobic_durability', score: 0.5 }],
      },
      capacity,
      phase,
      daysPerWeek: 5,
      longRunDay: 5,
      availableDays: [0, 1, 2, 3, 4, 5],
      level: 'advanced',
      qualitySessions: 2,
      preferRaceSpecific: true,
      targetKm: 60,
      longIntensityProfile: 'aerobic',
    })
    const qualities = architecture.slots
      .filter((s) => s.stimulus === 'quality' && s.hard)
      .map((s) => s.dayOfWeek)
      .sort((a, b) => a - b)
    assert.ok(qualities.length >= 2, `expected 2 qualities, got ${qualities}`)
    const key = qualities.slice(0, 2).join(',')
    // Classic mid-week rhythms — not Mon+Wed (0,2) which leaves the week sparse.
    assert.ok(
      key === '1,3' || key === '0,3' || key === '1,4' || key === '2,4',
      `expected Tue+Thu-style rhythm, got days ${key}`,
    )
    assert.notEqual(key, '0,2')
  })

  it('allows quality the day before an easy long, but not before a hard long', () => {
    const state = buildAthleteState(fixtureData(), 'advanced')
    const baseGoal = {
      ...marathonGoal(),
      daysPerWeek: 5,
      level: 'advanced' as const,
      longRunDay: 5,
      availableDays: [1, 2, 3, 4, 5],
      currentWeeklyKm: 70,
    }
    const capacity = calculateCapacity(state, baseGoal)
    const priority = {
      primary: { adaptation: 'threshold' as const, score: 0.8 },
      secondary: [{ adaptation: 'aerobic_durability' as const, score: 0.5 }],
    }
    const phase = buildPhaseProfile({ goal: baseGoal, priority })

    const hardLong = buildWeeklyArchitecture({
      priority,
      capacity,
      phase,
      daysPerWeek: 5,
      longRunDay: 5,
      availableDays: [1, 2, 3, 4, 5],
      level: 'advanced',
      qualitySessions: 2,
      targetKm: 65,
      longIntensityProfile: 'race_specific',
    })
    const hardQs = hardLong.slots
      .filter((s) => s.stimulus === 'quality' && s.hard)
      .map((s) => s.dayOfWeek)
    // Friday (4) immediately before Sat long should be avoided with race-specific long.
    assert.ok(!hardQs.includes(4), `quality on Fri before hard long: ${hardQs}`)
  })

  it('Norwegian double-threshold: same-day quality + mandatory recovery next day', () => {
    const state = buildAthleteState(fixtureData(), 'advanced')
    const goal = {
      ...marathonGoal(),
      daysPerWeek: 6,
      level: 'advanced' as const,
      longRunDay: 6,
      currentWeeklyKm: 80,
    }
    const capacity = calculateCapacity(state, goal)
    const priority = {
      primary: { adaptation: 'threshold' as const, score: 0.9 },
      secondary: [{ adaptation: 'aerobic_capacity' as const, score: 0.4 }],
    }
    const phase = buildPhaseProfile({ goal, priority })
    const methodology = selectMethodology({
      state,
      goal,
      phase,
      priority,
      lockedModel: 'NORWEGIAN',
    })
    assert.ok(
      methodology.constraints.includes('allow_double_threshold_day'),
      `expected allow_double_threshold_day, got ${methodology.constraints.join(',')}`,
    )
    assert.ok(!methodology.constraints.includes('no_double_threshold'))

    const architecture = buildWeeklyArchitecture({
      priority,
      capacity,
      phase,
      methodology,
      daysPerWeek: 6,
      longRunDay: 6,
      level: 'advanced',
      qualitySessions: 2,
      targetKm: 75,
    })
    const dt = architecture.slots.filter((s) => s.doubleThreshold)
    assert.ok(dt.length >= 1, 'expected at least one double-threshold day')
    for (const day of dt) {
      assert.equal(day.stimulus, 'quality')
      assert.equal(day.hard, true)
      const after = architecture.slots.find(
        (s) => s.dayOfWeek === (day.dayOfWeek + 1) % 7,
      )
      assert.ok(after, 'missing day after DT')
      if (after!.stimulus !== 'long' && after!.stimulus !== 'race') {
        assert.equal(
          after!.stimulus,
          'recovery',
          `day after DT (${day.dayOfWeek}) must be recovery, got ${after!.stimulus}`,
        )
        assert.equal(after!.hard, false)
        assert.equal(after!.doubleThreshold, false)
      }
    }
  })
})

describe('validator', () => {
  it('keeps description and structure in sync after adaptations', () => {
    const base = getWorkoutById('RUN_THRESHOLD_03')
    assert.ok(base)
    const adapted = applyAdaptations(base!, {
      intervalCount: 4,
      intervalDurationMin: 8,
      recoveryMin: 2,
      durationMin: null,
      distanceKm: null,
    })
    const main = adapted.structure?.mainSet.find(
      (b) => b.type === 'INTERVAL' || b.type === 'REPETITION',
    )
    assert.ok(main)
    assert.equal(main!.repetitions, 4)
    assert.equal(main!.work?.value, 8)
    assert.equal(main!.recovery?.value, 2)
    // No stale cardSummary override — card derives from blocks.
    assert.equal(adapted.structure?.cardSummary?.essence, undefined)
    // Description matches the real prescription (not "Entry threshold: 6×3′").
    assert.match(adapted.description, /4\s*[x×]8/i)
    assert.doesNotMatch(adapted.description, /6\s*[x×]3/i)
    assert.doesNotMatch(adapted.description, /Entry threshold/i)
  })

  it('keeps long-run planned distance aligned with structure blocks', () => {
    const session = proposalToSession({
      weekIndex: 10,
      dayOfWeek: 5,
      proposal: {
        selectedWorkoutId: 'RUN_LONG_04',
        adaptations: {
          intervalCount: null,
          intervalDurationMin: null,
          recoveryMin: null,
          durationMin: null,
          distanceKm: null,
        },
        reason: 'test',
      },
      volumeScale: 0.75,
      longRunMinMinutes: 82,
    })
    assert.ok(session)
    const est = estimateStructureDistanceKm(
      session!.structure!,
      null,
      WorkoutType.RUN,
    )
    assert.ok(est > 0)
    assert.ok(
      Math.abs((session!.plannedDistance ?? 0) - est) < 0.15,
      `planned ${session!.plannedDistance} != structure ${est}`,
    )
    // Must not invent ~14.8 km via duration/5.5 while blocks still say 20 km.
    assert.ok(
      (session!.plannedDistance ?? 0) < 20,
      'volume scale should shrink distance',
    )
    const easy = session!.structure?.mainSet.find((b) => b.name === 'Easy')
    assert.ok(easy)
    assert.ok(
      Math.abs((easy!.distance ?? 0) - 12 * 0.75) < 0.2 ||
        (easy!.distance ?? 0) < 12,
    )
  })

  it('rejects proposals that exceed mechanical capacity', () => {
    const capacity: CapacityProfile = {
      ...stubCapacityProfile({
        maxWeeklyKm: 40,
        maxWeeklyTss: 200,
        weekCount: 8,
      }),
      remainingCapacity: { overall: 5, mechanical: 5 },
    }
    const result = validateWorkoutProposal({
      proposal: {
        selectedWorkoutId: 'RUN_LONG_02',
        adaptations: {
          intervalCount: null,
          intervalDurationMin: null,
          recoveryMin: null,
          durationMin: 95,
          distanceKm: 20,
        },
        reason: 'test',
      },
      slotAvailableMinutes: 100,
      capacity,
      hardSlot: false,
    })
    assert.equal(result.valid, false)
  })

  it('enforces back-to-back hard into a valid repaired week or fails', async () => {
    const { enforceWeekValidity } = await import(
      '@/lib/coach-engine/enforce-week'
    )
    const data = fixtureData()
    const state = buildAthleteState(data, 'beginner')
    const goal = { ...marathonGoal(), level: 'beginner' as const, weekCount: 8 }
    const capacity = calculateCapacity(state, goal)
    capacity.maxWeeklyTss = 400
    capacity.maxWeeklyKm = 80
    capacity.maxHardSessionsPerWeek = 2
    capacity.envelope = stubCapacityEnvelope(80, 400, goal.weekCount)
    const phase = buildPhaseProfile({
      goal,
      priority: { primary: { adaptation: 'speed', score: 0.8 }, secondary: [] },
    })
    const architecture = buildWeeklyArchitecture({
      priority: { primary: { adaptation: 'speed', score: 0.8 }, secondary: [] },
      capacity,
      phase,
    })
    const sessions = architecture.slots
      .filter((slot) => slot.stimulus !== 'rest')
      .map((slot) => ({
        weekIndex: 0,
        dayOfWeek: slot.dayOfWeek,
        type: WorkoutType.RUN,
        sessionType:
          slot.stimulus === 'long'
            ? SessionType.LONG_RUN
            : slot.hard
              ? SessionType.THRESHOLD
              : SessionType.EASY_RUN,
        title: slot.stimulus === 'long' ? 'Long' : slot.hard ? 'Hard' : 'Easy',
        description: null,
        plannedDistance: slot.stimulus === 'long' ? 18 : slot.hard ? 12 : 8,
        plannedDuration: slot.stimulus === 'long' ? 95 : slot.hard ? 70 : 45,
        coachNotes: null,
        tags: slot.hard ? ['threshold'] : [],
        candidateId: 'RUN_THRESHOLD_01',
        primaryAdaptation:
          slot.stimulus === 'long'
            ? ('long_run_tolerance' as const)
            : slot.hard
              ? ('threshold' as const)
              : ('aerobic_capacity' as const),
        estimatedTss: slot.hard ? 70 : 35,
        isKeySession: slot.hard || slot.stimulus === 'long',
      }))

    // Force consecutive hard days.
    const hardDays = sessions
      .filter((s) => s.sessionType === SessionType.THRESHOLD)
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
    if (hardDays.length >= 2) {
      hardDays[1]!.dayOfWeek = hardDays[0]!.dayOfWeek + 1
    }

    const enforced = enforceWeekValidity({
      sessions,
      capacity,
      architecture,
      priority: { primary: { adaptation: 'speed', score: 0.8 }, secondary: [] },
      methodology: {
        selectedModel: 'PYRAMIDAL',
        confidence: 0.5,
        alternatives: [],
        reasonCodes: [],
        constraints: [],
        norwegianEligible: false,
      },
    })
    assert.equal(enforced.ok, true)
    assert.ok(enforced.repairsApplied >= 1)
    const stillHard = enforced.sessions
      .filter(
        (s) =>
          s.sessionType === SessionType.THRESHOLD ||
          s.tags.includes('threshold'),
      )
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
    for (let i = 0; i < stillHard.length - 1; i += 1) {
      assert.notEqual(
        stillHard[i + 1]!.dayOfWeek - stillHard[i]!.dayOfWeek,
        1,
        'repaired week still has consecutive hard days',
      )
    }
  })

  it('flags back-to-back hard before long via comprehensive validator', () => {
    const data = fixtureData()
    const state = buildAthleteState(data, 'beginner')
    const goal = { ...marathonGoal(), level: 'beginner' as const, weekCount: 8 }
    const capacity = calculateCapacity(state, goal)
    capacity.maxWeeklyTss = 50
    const phase = buildPhaseProfile({
      goal,
      priority: { primary: { adaptation: 'speed', score: 0.8 }, secondary: [] },
    })
    const architecture = buildWeeklyArchitecture({
      priority: { primary: { adaptation: 'speed', score: 0.8 }, secondary: [] },
      capacity,
      phase,
    })
    const sessions = architecture.slots.map((slot) => ({
      weekIndex: 0,
      dayOfWeek: slot.dayOfWeek,
      type: WorkoutType.RUN,
      sessionType: SessionType.THRESHOLD,
      title: 'Hard',
      description: null,
      plannedDistance: 15,
      plannedDuration: 70,
      coachNotes: null,
      tags: [],
      candidateId: 'RUN_THRESHOLD_01',
      primaryAdaptation: 'threshold' as const,
      estimatedTss: 80,
      isKeySession: slot.hard || slot.stimulus === 'long',
    }))
    const result = validateWeekComprehensive({
      sessions,
      capacity,
      architecture,
      priority: { primary: { adaptation: 'speed', score: 0.8 }, secondary: [] },
      methodology: {
        selectedModel: 'PYRAMIDAL',
        confidence: 0.5,
        alternatives: [],
        reasonCodes: [],
        constraints: [],
        norwegianEligible: false,
      },
    })
    assert.equal(result.valid, false)
  })
})

describe('library progression', () => {
  it('allows known progression edges', () => {
    assert.equal(canProgressTo('RUN_THRESHOLD_03', 'RUN_THRESHOLD_06'), true)
    assert.equal(canProgressTo('RUN_THRESHOLD_03', 'RUN_VO2_01'), false)
  })

  it('climbs interval count when repeating the same template', () => {
    const candidate = {
      id: 'RUN_THRESHOLD_04',
      intervalCount: 10,
      durationMin: 65,
    } as import('@/lib/coach-engine/types').CandidateWorkout
    const week0 = buildProgressiveAdaptations({
      candidate,
      weekIndex: 0,
      previousWorkoutId: 'RUN_THRESHOLD_03',
      athleteLevel: 'intermediate',
    })
    assert.equal(week0.intervalCount, 6)
    const week1 = buildProgressiveAdaptations({
      candidate,
      weekIndex: 1,
      previousWorkoutId: 'RUN_THRESHOLD_04',
      previousAdaptations: week0,
      athleteLevel: 'intermediate',
    })
    assert.equal(week1.intervalCount, 8)
    const week2 = buildProgressiveAdaptations({
      candidate,
      weekIndex: 2,
      previousWorkoutId: 'RUN_THRESHOLD_04',
      previousAdaptations: week1,
      athleteLevel: 'intermediate',
    })
    assert.equal(week2.intervalCount, 10)
  })

  it('scales sample dose down more for beginners', () => {
    const candidate = {
      id: 'RUN_THRESHOLD_04',
      intervalCount: 10,
      durationMin: 65,
      recoveryMin: 2,
    } as import('@/lib/coach-engine/types').CandidateWorkout
    const beginner = buildProgressiveAdaptations({
      candidate,
      weekIndex: 0,
      athleteLevel: 'beginner',
    })
    const advanced = buildProgressiveAdaptations({
      candidate,
      weekIndex: 0,
      athleteLevel: 'advanced',
    })
    assert.equal(beginner.intervalCount, 4)
    assert.equal(advanced.intervalCount, null)
    assert.ok((beginner.intervalCount ?? 99) < candidate.intervalCount!)
  })

  it('stays on the same 1k template until the ladder finishes', () => {
    const slot = {
      dayOfWeek: 1,
      stimulus: 'quality' as const,
      primaryAdaptation: 'threshold' as const,
      availableMinutes: 70,
      hard: true,
      isKeySession: true,
    }
    // Systematic threshold ladder: 6×3 → 5×5 → 4×8 …
    const start = pickProgressiveCandidateV2({
      slot,
      weekIndex: 0,
      previousWorkoutId: 'RUN_THRESHOLD_03',
    })
    assert.equal(start.candidate.id, 'RUN_THRESHOLD_06')

    const mid = pickProgressiveCandidateV2({
      slot,
      weekIndex: 1,
      previousWorkoutId: start.candidate.id,
      previousAdaptations: start.adaptations,
    })
    assert.ok(
      mid.candidate.id === 'RUN_THRESHOLD_06' ||
        mid.candidate.id === 'RUN_THRESHOLD_01',
      `unexpected mid step ${mid.candidate.id}`,
    )

    const peak = pickProgressiveCandidateV2({
      slot,
      weekIndex: 2,
      previousWorkoutId: mid.candidate.id,
      previousAdaptations: mid.adaptations,
    })
    assert.ok(
      [
        'RUN_THRESHOLD_06',
        'RUN_THRESHOLD_01',
        'RUN_THRESHOLD_02',
        'RUN_THRESHOLD_10',
        'RUN_THRESHOLD_11',
      ].includes(peak.candidate.id),
      `unexpected peak step ${peak.candidate.id}`,
    )

    const after = pickProgressiveCandidateV2({
      slot,
      weekIndex: 3,
      previousWorkoutId: peak.candidate.id,
      previousAdaptations: peak.adaptations,
      recentIds: [peak.candidate.id],
    })
    assert.notEqual(after.candidate.id, 'RUN_THRESHOLD_03')
  })

  it('prefers a different library workout over repeating last week', () => {
    const slot = {
      dayOfWeek: 1,
      stimulus: 'quality' as const,
      primaryAdaptation: 'threshold' as const,
      availableMinutes: 60,
      hard: true,
      isKeySession: true,
    }
    const next = findCandidatesForSlotV2(slot, {
      previousWorkoutId: 'RUN_THRESHOLD_01',
      limit: 3,
    })
    assert.ok(next.length > 0)
    assert.notEqual(next[0]!.id, 'RUN_THRESHOLD_01')
  })

  it('late adaptation / early engine prefer continuous aerobic fartlek', () => {
    const slot = {
      dayOfWeek: 1,
      stimulus: 'quality' as const,
      primaryAdaptation: 'aerobic_durability' as const,
      availableMinutes: 55,
      hard: true,
      isKeySession: true,
    }
    const adapt = pickProgressiveCandidateV2({
      slot,
      weekIndex: 3,
      intensityBand: 'adaptation',
      qualityIndex: 0,
      thresholdVolumeTargetMin: 16,
      athleteLevel: 'intermediate',
    })
    assert.match(adapt.reason, /aerobic_fartlek/)
    assert.match(
      adapt.candidate.title,
      /fartlek/i,
      `expected aerobic fartlek, got ${adapt.candidate.id} ${adapt.candidate.title}`,
    )
    assert.doesNotMatch(adapt.candidate.title, /threshold fartlek/i)

    const earlyEngine = pickProgressiveCandidateV2({
      slot,
      weekIndex: 4,
      intensityBand: 'engine',
      qualityIndex: 0,
      thresholdVolumeTargetMin: 18,
      athleteLevel: 'intermediate',
    })
    assert.match(earlyEngine.reason, /aerobic_fartlek/)
    assert.ok(
      /float|aerobic fartlek|2′|3′/i.test(earlyEngine.candidate.title) ||
        earlyEngine.candidate.tags.some((t) => /float|continuous/i.test(t)),
      `expected float fartlek, got ${earlyEngine.candidate.title}`,
    )
  })

  it('engine band prefers 1 km threshold over cruise tempo', () => {
    const slot = {
      dayOfWeek: 1,
      stimulus: 'quality' as const,
      primaryAdaptation: 'threshold' as const,
      availableMinutes: 70,
      hard: true,
      isKeySession: true,
    }
    const picked = pickProgressiveCandidateV2({
      slot,
      weekIndex: 6, // mid engine → threshold_1k (weekIndex >= 5, week % 4 !== 3)
      intensityBand: 'engine',
      qualityIndex: 0,
      thresholdVolumeTargetMin: 20,
      athleteLevel: 'intermediate',
    })
    assert.match(
      picked.candidate.title,
      /1\s*km|1K|1000/i,
      `expected 1 km threshold, got ${picked.candidate.id} ${picked.candidate.title}`,
    )
    assert.match(picked.reason, /threshold_1k/)
  })

  it('second engine quality can be VO2 400/300 when allowed', () => {
    const slot = {
      dayOfWeek: 3,
      stimulus: 'quality' as const,
      primaryAdaptation: 'aerobic_capacity' as const,
      availableMinutes: 60,
      hard: true,
      isKeySession: false,
    }
    const picked = pickProgressiveCandidateV2({
      slot,
      weekIndex: 6,
      intensityBand: 'engine',
      qualityIndex: 1,
      allowVo2: true,
      thresholdVolumeTargetMin: 16,
      athleteLevel: 'advanced',
    })
    assert.ok(
      picked.candidate.sessionType === 'VO2_MAX' ||
        /300|400|VO2/i.test(picked.candidate.title) ||
        /vo2|300m|400m/i.test(picked.candidate.tags.join(' ')),
      `expected VO2/short distance, got ${picked.candidate.id} ${picked.candidate.title}`,
    )
  })
})

describe('learning', () => {
  it('does not blindly reschedule missed key sessions', () => {
    assert.equal(
      missedWorkoutAction({
        missedIsKey: true,
        daysUntilLong: 1,
        readinessScore: 0.5,
      }),
      'skip_stimulus',
    )
  })

  it('compares expected vs actual response', () => {
    const expected = expectedResponseForSession({
      weekIndex: 0,
      dayOfWeek: 1,
      type: WorkoutType.RUN,
      sessionType: SessionType.THRESHOLD,
      title: 'T',
      description: null,
      plannedDistance: 10,
      plannedDuration: 60,
      coachNotes: null,
      tags: [],
      candidateId: 'RUN_THRESHOLD_01',
      primaryAdaptation: 'threshold',
      estimatedTss: 70,
      isKeySession: true,
    })
    const cmp = compareResponse(expected, {
      actualRpe: 9.5,
      completion: 1,
      actualTss: 70,
      feltHarder: true,
      missed: false,
    })
    assert.equal(cmp.recommendedAction, 'reduce_next_hard')
  })
})

describe('readiness', () => {
  it('never claims high readiness confidence without data', () => {
    const state = buildAthleteState(fixtureData(), 'intermediate')
    assert.ok(state.readiness.confidence < 0.8)
    assert.ok(state.metrics.thresholdPace.confidence <= 0.7)
    assert.ok(decideReadinessAction(state) === 'keep' || decideReadinessAction(state) === 'reduce')
  })
})

describe('critic safe repairs', () => {
  it('maps known blocker codes and demotes excess threshold', async () => {
    const { applyCriticSafeRepairs, resolveCriticRepairCode } = await import(
      '@/lib/coach-engine/ai-multi'
    )
    assert.equal(resolveCriticRepairCode('too_many_threshold'), 'EXCESS_THRESHOLD')
    assert.equal(resolveCriticRepairCode('MIDWEEK_PHASE_SPLIT'), null)

    const sessions = [0, 1, 2].flatMap((day) => [
      {
        weekIndex: 0,
        dayOfWeek: day * 2,
        type: WorkoutType.RUN,
        sessionType: SessionType.THRESHOLD,
        title: `Threshold ${day}`,
        description: null,
        plannedDistance: 12,
        plannedDuration: 60,
        coachNotes: null,
        tags: ['threshold'],
        candidateId: `T${day}`,
        primaryAdaptation: 'threshold' as const,
        estimatedTss: 70,
        isKeySession: day === 0,
      },
    ])
    const result = applyCriticSafeRepairs({
      sessions,
      blueprints: [
        {
          weekIndex: 0,
          phase: 'BUILD' as const,
          label: 'Build',
          isDeload: false,
          isTaper: false,
          isRaceWeek: false,
          volumeScale: 1,
          targetKm: 50,
          longRunMinMinutes: 80,
          longRunTargetKm: 18,
          longIntensityProfile: 'aerobic',
          longRunMpKm: 0,
          intensityBand: 'engine' as const,
          qualityBudgetMin: 20,
          qualitySessions: 2,
          preferRaceSpecific: false,
          preferAerobicLong: true,
          preferStrides: false,
          allowVo2: true,
          thresholdVolumeTargetMin: 20,
          architectureId: 'run_endurance',
          modalityVolumes: [],
          stationVolumeTarget: null,
          bikeMinutesTarget: null,
          swimMetersTarget: null,
        },
      ],
      critic: {
        issues: [
          {
            week_index: 0,
            severity: 'blocker',
            code: 'EXCESS_THRESHOLD',
            message: '3 threshold days',
            suggested_fix: 'Demote one',
          },
        ],
        overall_score: 40,
        summary: 'Too much threshold',
      },
    })
    assert.ok(result.changed)
    assert.deepEqual(result.repairsApplied, ['EXCESS_THRESHOLD'])
    const stillThreshold = result.sessions.filter(
      (s) => s.sessionType === SessionType.THRESHOLD,
    )
    assert.ok(stillThreshold.length <= 2)
  })

  it('leaves unknown codes advisory and does not invent score authority', async () => {
    const { applyCriticSafeRepairs } = await import(
      '@/lib/coach-engine/ai-multi'
    )
    const sessions = [
      {
        weekIndex: 0,
        dayOfWeek: 1,
        type: WorkoutType.RUN,
        sessionType: SessionType.EASY_RUN,
        title: 'Easy',
        description: null,
        plannedDistance: 8,
        plannedDuration: 45,
        coachNotes: null,
        tags: ['easy'],
        candidateId: 'E1',
        primaryAdaptation: 'aerobic_capacity' as const,
        estimatedTss: 30,
        isKeySession: false,
      },
    ]
    const result = applyCriticSafeRepairs({
      sessions,
      blueprints: [],
      critic: {
        issues: [
          {
            week_index: 0,
            severity: 'warn',
            code: 'MIDWEEK_PHASE_SPLIT',
            message: 'Phase label oddity',
            suggested_fix: 'Ignore in repair',
          },
        ],
        overall_score: 55,
        summary: 'Advisory only',
      },
    })
    assert.equal(result.changed, false)
    assert.equal(result.repairsApplied.length, 0)
    assert.equal(result.advisoryIssues.length, 1)
    assert.equal(result.sessions[0]!.title, 'Easy')
  })

  it('inserts race day when critic flags RACE_WEEK_NO_RACE', async () => {
    const { applyCriticSafeRepairs } = await import(
      '@/lib/coach-engine/ai-multi'
    )
    const goal = marathonGoal()
    const result = applyCriticSafeRepairs({
      sessions: [
        {
          weekIndex: 7,
          dayOfWeek: 1,
          type: WorkoutType.RUN,
          sessionType: SessionType.EASY_RUN,
          title: 'Easy',
          description: null,
          plannedDistance: 6,
          plannedDuration: 35,
          coachNotes: null,
          tags: ['easy'],
          candidateId: 'E',
          primaryAdaptation: 'aerobic_capacity',
          estimatedTss: 25,
          isKeySession: false,
        },
      ],
      blueprints: [
        {
          weekIndex: 7,
          phase: 'RACE' as const,
          label: 'Taper / race',
          isDeload: false,
          isTaper: false,
          isRaceWeek: true,
          volumeScale: 0.35,
          targetKm: 15,
          longRunMinMinutes: 20,
          longRunTargetKm: 0,
          longIntensityProfile: 'aerobic',
          longRunMpKm: 0,
          intensityBand: 'race' as const,
          qualityBudgetMin: 8,
          qualitySessions: 1,
          preferRaceSpecific: true,
          preferAerobicLong: true,
          preferStrides: true,
          allowVo2: false,
          thresholdVolumeTargetMin: 6,
          architectureId: 'run_endurance',
          modalityVolumes: [],
          stationVolumeTarget: null,
          bikeMinutesTarget: null,
          swimMetersTarget: null,
        },
      ],
      critic: {
        issues: [
          {
            week_index: 7,
            severity: 'blocker',
            code: 'RACE_WEEK_NO_RACE',
            message: 'No race session',
            suggested_fix: 'Add race day',
          },
        ],
        overall_score: 30,
        summary: 'Missing race',
      },
      goal,
    })
    assert.ok(result.changed)
    assert.ok(result.repairsApplied.includes('RACE_WEEK_NO_RACE'))
    assert.ok(
      result.sessions.some((s) => s.tags.includes('race-day')),
      'expected race-day session',
    )
  })
})

describe('safety intake gate', () => {
  it('blocks active illness before planning', async () => {
    const { evaluateSafetyIntake, CoachEngineSafetyError } = await import(
      '@/lib/coach-engine/safety-intake'
    )
    const gate = evaluateSafetyIntake({
      brief: { illness: 'active' },
    })
    assert.equal(gate.blocked, true)
    assert.equal(gate.decision, 'block')
    assert.ok(gate.flags.some((f) => f.code === 'ILLNESS_ACTIVE'))
    await assert.rejects(
      async () => {
        throw new CoachEngineSafetyError(gate)
      },
      (err: unknown) =>
        err instanceof CoachEngineSafetyError &&
        err.code === 'COACH_ENGINE_SAFETY',
    )
  })

  it('blocks severe injury without medical clearance', async () => {
    const { evaluateSafetyIntake } = await import(
      '@/lib/coach-engine/safety-intake'
    )
    const gate = evaluateSafetyIntake({
      brief: {
        injurySeverity: 'severe',
        injuryLocation: 'achilles',
        medicalClearance: false,
      },
    })
    assert.equal(gate.blocked, true)
    assert.ok(gate.flags.some((f) => f.code === 'INJURY_SEVERE'))
  })

  it('constrains mild injury / injury focus instead of only adapting later', async () => {
    const { evaluateSafetyIntake, applySafetyConstraintsToCapacity } =
      await import('@/lib/coach-engine/safety-intake')
    const gate = evaluateSafetyIntake({
      brief: { focus: 'injury', notes: 'mild knee niggle' },
    })
    assert.equal(gate.blocked, false)
    assert.ok(
      gate.decision === 'constrain' || gate.decision === 'require_review',
    )
    assert.ok(gate.constraints.includes('max_one_hard_session'))
    const state = buildAthleteState(fixtureData(), 'intermediate')
    const capacity = calculateCapacity(state, marathonGoal())
    const capped = applySafetyConstraintsToCapacity(capacity, {
      ...gate,
      constraints: [...gate.constraints, 'reduce_volume'],
    })
    assert.ok(capped.maxWeeklyKm <= capacity.maxWeeklyKm)
    assert.ok(capped.maxHardSessionsPerWeek <= 1)
  })

  it('blocks high RED-S without clearance and pregnancy without clearance', async () => {
    const { evaluateSafetyIntake } = await import(
      '@/lib/coach-engine/safety-intake'
    )
    const reds = evaluateSafetyIntake({
      brief: { redsRisk: 'high', medicalClearance: false },
    })
    assert.equal(reds.blocked, true)
    const preg = evaluateSafetyIntake({
      brief: { pregnancyStatus: 'pregnant' },
    })
    assert.equal(preg.blocked, true)
    assert.ok(preg.flags.some((f) => f.code === 'PREGNANCY_NO_CLEARANCE'))
  })

  it('blocks escalating pain with moderate injury', async () => {
    const { evaluateSafetyIntake } = await import(
      '@/lib/coach-engine/safety-intake'
    )
    const gate = evaluateSafetyIntake({
      brief: {
        injurySeverity: 'moderate',
        painEscalating: true,
        injuryLocation: 'shin',
      },
    })
    assert.equal(gate.blocked, true)
    assert.ok(gate.flags.some((f) => f.code === 'PAIN_ESCALATING'))
  })

  it('draft pipeline refuses generation when safety blocks', async () => {
    await assert.rejects(
      async () =>
        buildDraftFromCollected({
          data: fixtureData(),
          skillSlug: 'run-half-marathon',
          brief: {
            weekCount: 8,
            level: 'intermediate',
            daysPerWeek: 4,
            firstWeekKm: 35,
            illness: 'active',
          },
          allowAi: false,
        }),
      (err: unknown) =>
        err instanceof Error && err.name === 'CoachEngineSafetyError',
    )
  })
})

describe('marathon race-specific selection', () => {
  it('prefers MP samples over HM-only for marathon demand', () => {
    const slot = {
      dayOfWeek: 1,
      stimulus: 'quality' as const,
      primaryAdaptation: 'threshold' as const,
      availableMinutes: 70,
      hard: true,
      isKeySession: true,
      preferRaceSpecific: true,
    }
    const list = findCandidatesForSlotV2(slot, {
      sportFocus: WorkoutType.RUN,
      preferRaceSpecific: true,
      demandId: 'MARATHON_V1',
      limit: 6,
    })
    assert.ok(list.length > 0)
    assert.ok(
      list.every(
        (c) =>
          c.tags.some((t) => /mp-specific|marathon/i.test(t)) ||
          /MP_|LONG_06/i.test(c.id),
      ),
      `expected MP/marathon samples, got ${list.map((c) => c.id).join(',')}`,
    )
    assert.ok(
      list.every(
        (c) =>
          !(
            c.tags.some((t) => /hm-specific/i.test(t)) &&
            !c.tags.some((t) => /mp-specific|marathon/i.test(t))
          ),
      ),
    )
  })

  it('gates advanced-elite interval benchmarks by athlete level', () => {
    const slot = {
      dayOfWeek: 1,
      stimulus: 'quality' as const,
      primaryAdaptation: 'aerobic_capacity' as const,
      availableMinutes: 90,
      hard: true,
      isKeySession: true,
      preferRaceSpecific: false,
    }
    const beginner = findCandidatesForSlotV2(slot, {
      sportFocus: WorkoutType.RUN,
      athleteLevel: 'beginner',
      limit: 12,
    })
    assert.ok(
      !beginner.some((c) => /INTERVAL_07|BENCHMARK_NOR_02|BENCHMARK_ETH_02/i.test(c.id)),
      'beginner must not see elite/advanced high-volume intervals',
    )
    const elite = findCandidatesForSlotV2(slot, {
      sportFocus: WorkoutType.RUN,
      athleteLevel: 'elite',
      limit: 20,
    })
    assert.ok(
      elite.some((c) => c.id === 'RUN_INTERVAL_01' || c.id === 'RUN_INTERVAL_07'),
      'elite pool should include distance-interval samples',
    )
  })

  it('race week keeps pre-race easy volume short', () => {
    const state = buildAthleteState(fixtureData(), 'intermediate')
    const goal = marathonGoal()
    const capacity = calculateCapacity(state, goal)
    const architecture = buildWeeklyArchitecture({
      priority: {
        primary: { adaptation: 'threshold', score: 0.8 },
        secondary: [],
      },
      capacity,
      phase: {
        ...buildPhaseProfile({
          goal,
          priority: {
            primary: { adaptation: 'threshold', score: 0.8 },
            secondary: [],
          },
        }),
        phase: 'RACE',
        volumeScale: 0.32,
        isTaper: true,
        isDeload: false,
      },
      daysPerWeek: 5,
      longRunDay: 5,
      level: 'intermediate',
      qualitySessions: 1,
      preferRaceSpecific: true,
      isRaceWeek: true,
      raceDurationMin: 150,
      raceWeekday: 6,
    })
    const preRace = architecture.slots.filter(
      (s) => s.dayOfWeek < 6 && s.stimulus !== 'rest',
    )
    for (const s of preRace) {
      if (s.stimulus === 'easy' || s.stimulus === 'recovery') {
        assert.ok(
          s.availableMinutes <= 40,
          `easy day ${s.dayOfWeek} still ${s.availableMinutes}′`,
        )
      }
      if (s.stimulus === 'quality') {
        assert.ok(s.availableMinutes <= 35)
        assert.ok(s.preferRaceSpecific)
      }
    }
  })
})

describe('AI-off draft fallback', () => {
  it('returns a schema-valid PlanDraftOutput with methodology meta', async () => {
    const result = await buildDraftFromCollected({
      data: fixtureData(),
      skillSlug: 'run-marathon',
      brief: { weekCount: 8, level: 'intermediate', notes: '' },
      allowAi: false,
    })
    assert.equal(result.usedAi, false)
    assert.ok(result.draft.sessions.length >= 8)
    assert.equal(result.draft.weekCount, 8)
    assert.ok(result.meta.methodology.selectedModel)
    assert.ok(result.guidelines.includes('Why this plan'))
    assert.equal(result.decisionTrace.steps.length, 7)
    assert.ok(result.decisionTrace.steps.some((s) => s.id === 'safety'))
    assert.ok(result.decisionTrace.steps[0]!.facts.length >= 3)
    assert.ok(result.guidelines.includes('Decision log'))
    assert.equal(result.meta.safetyGate?.decision, 'clear')
    const parsed = planDraftOutputSchema.safeParse(result.draft)
    assert.equal(parsed.success, true, JSON.stringify(parsed.error?.format()))
  })

  it('builds coherent weekly load without cloning or spikes', async () => {
    const result = await buildDraftFromCollected({
      data: fixtureData(),
      skillSlug: 'run-half-marathon',
      brief: {
        weekCount: 12,
        level: 'intermediate',
        daysPerWeek: 4,
        firstWeekKm: 40,
        currentWeeklyKm: 40,
        notes: '',
      },
      allowAi: false,
    })

    const byWeek = new Map<number, typeof result.draft.sessions>()
    for (const s of result.draft.sessions) {
      const list = byWeek.get(s.weekIndex) ?? []
      list.push(s)
      byWeek.set(s.weekIndex, list)
    }

    const weekMinutes: number[] = []
    const weekKm: number[] = []
    for (let w = 0; w < result.draft.weekCount; w += 1) {
      const sessions = byWeek.get(w) ?? []
      const minutes = sessions.reduce(
        (sum, s) => sum + (s.plannedDuration ?? 0),
        0,
      )
      const km = sessions.reduce((sum, s) => sum + (s.plannedDistance ?? 0), 0)
      weekMinutes.push(minutes)
      weekKm.push(km)

      const thresholdish = sessions.filter(
        (s) =>
          (s.sessionType === 'THRESHOLD' ||
            s.sessionType === 'TEMPO' ||
            (s.tags ?? []).some((t) => /threshold|norwegian/i.test(t))) &&
          !(s.tags ?? []).some((t) => /race-day|hm-specific/i.test(t)),
      )
      assert.ok(
        thresholdish.length <= 2,
        `week ${w + 1} has ${thresholdish.length} threshold sessions`,
      )

      const long = sessions.find((s) => s.sessionType === 'LONG_RUN')
      const isRaceWeek = w === result.draft.weekCount - 1
      if (!isRaceWeek) {
        assert.ok(long, `week ${w + 1} missing long run`)
        assert.ok(
          (long!.plannedDuration ?? 0) >= 45,
          `week ${w + 1} long run ${long!.plannedDuration}min too short`,
        )
      }
    }

    // Peak week (penultimate) must keep a long; race week must include race.
    const peakSessions = byWeek.get(result.draft.weekCount - 2) ?? []
    assert.ok(
      peakSessions.some((s) => s.sessionType === 'LONG_RUN'),
      'peak week has no long run',
    )
    const raceSessions = byWeek.get(result.draft.weekCount - 1) ?? []
    assert.ok(
      raceSessions.some(
        (s) =>
          (s.tags ?? []).includes('race-day') ||
          /race:/i.test(s.title) ||
          s.sessionType === 'RACE_PACE',
      ),
      'race week has no race session',
    )
    const raceDay = raceSessions.find((s) =>
      (s.tags ?? []).includes('race-day'),
    )
    assert.ok(raceDay, 'race-day tag missing')
    assert.ok(
      Math.abs((raceDay!.plannedDistance ?? 0) - 21.1) < 0.2,
      `race distance ${raceDay!.plannedDistance} should be 21.1 km (not WU+race)`,
    )
    // Default race weekday is Sunday (6) — nothing after it in the final week.
    assert.equal(raceDay!.dayOfWeek, 6)
    assert.ok(
      raceSessions.every((s) => s.dayOfWeek <= raceDay!.dayOfWeek),
      'workouts scheduled after race day',
    )
    assert.ok(
      !raceSessions.some(
        (s) =>
          s.dayOfWeek < raceDay!.dayOfWeek &&
          ((s.tags ?? []).some((t) => /post-race/i.test(t)) ||
            /post-race/i.test(s.title)),
      ),
      'post-race workout scheduled before race',
    )

    // No loading-week km jump > ~18% (the 62→82 class of bug).
    // Allow a little headroom for structure/estimation noise after schedule changes.
    for (let w = 1; w < weekKm.length - 1; w += 1) {
      const prev = weekKm[w - 1]!
      const cur = weekKm[w]!
      if (prev < 30) continue
      const prevPhase = (result.draft.phases ?? []).find(
        (p) => (w - 1) * 7 >= p.startDay && (w - 1) * 7 <= p.endDay,
      )
      const afterDeload =
        prevPhase?.phase === 'RECOVERY' || prevPhase?.label === 'Recovery'
      if (afterDeload) continue
      assert.ok(
        cur <= prev * 1.18,
        `week ${w + 1} km jump ${prev}→${cur}`,
      )
    }

    // Long runs should not be tagged as threshold/norwegian quality by default.
    const longs = result.draft.sessions.filter((s) => s.sessionType === 'LONG_RUN')
    for (const long of longs) {
      assert.ok(
        !(long.tags ?? []).some((t) => /^threshold$/i.test(t)),
        `long run tagged threshold: ${long.candidateId}`,
      )
    }

    // Phase blocks must not split a calendar week (startDay % 7 === 0).
    for (const phase of result.draft.phases ?? []) {
      assert.equal(
        phase.startDay % 7,
        0,
        `phase ${phase.label} starts mid-week at day ${phase.startDay}`,
      )
    }

    // No overnight doubling of weekly minutes (except deliberate post-deload rebound / taper).
    for (let w = 1; w < weekMinutes.length - 2; w += 1) {
      const prev = weekMinutes[w - 1]!
      const cur = weekMinutes[w]!
      if (prev < 60) continue
      const prevPhase = (result.draft.phases ?? []).find(
        (p) => (w - 1) * 7 >= p.startDay && (w - 1) * 7 <= p.endDay,
      )
      const afterDeload =
        prevPhase?.phase === 'RECOVERY' || prevPhase?.label === 'Recovery'
      const ratio = cur / prev
      assert.ok(
        ratio < (afterDeload ? 1.7 : 1.45),
        `week ${w + 1} load jump ${prev}→${cur} (${ratio.toFixed(2)}x)`,
      )
    }

    // Deload weeks should be meaningfully lighter than prior loading week.
    for (let w = 1; w < weekKm.length - 2; w += 1) {
      const phase = (result.draft.phases ?? []).find(
        (p) => w * 7 >= p.startDay && w * 7 <= p.endDay,
      )
      if (phase?.phase !== 'RECOVERY' && phase?.label !== 'Recovery') continue
      const prev = weekKm[w - 1]!
      const cur = weekKm[w]!
      if (prev < 20) continue
      assert.ok(
        cur <= prev * 1.0 + 0.5,
        `recovery week ${w + 1} km ${cur} not lighter than prior ${prev}`,
      )
      assert.ok(
        cur >= prev * 0.55,
        `recovery week ${w + 1} km ${cur} cut too deep vs prior ${prev}`,
      )
    }

    // Running sessions should usually carry distance from structure.
    const runs = result.draft.sessions.filter((s) => s.type === 'RUN')
    const withDistance = runs.filter(
      (s) => s.plannedDistance != null && s.plannedDistance > 0,
    )
    assert.ok(
      withDistance.length / Math.max(1, runs.length) >= 0.5,
      `only ${withDistance.length}/${runs.length} runs have distance`,
    )

    // Interval samples must not collapse to absurd durations (e.g. 10×1km @ 29').
    const intervalish = runs.filter(
      (s) =>
        s.candidateId?.includes('THRESHOLD') ||
        s.candidateId?.includes('VO2'),
    )
    for (const s of intervalish) {
      // Race-week sharpening is intentionally short; skip the floor there.
      if ((s.tags ?? []).includes('race-day')) continue
      if (s.weekIndex === result.draft.weekCount - 1) {
        assert.ok(
          (s.plannedDuration ?? 0) >= 25,
          `${s.candidateId} race-week sharpening ${s.plannedDuration} too short`,
        )
        continue
      }
      assert.ok(
        (s.plannedDuration ?? 0) >= 32,
        `${s.candidateId} duration ${s.plannedDuration} unrealistic`,
      )
      // Subtitle / card copy must match real structure (no stale free-text).
      assert.equal(s.structure?.cardSummary?.essence, undefined)
      const main = s.structure?.mainSet?.find(
        (b) => b.type === 'INTERVAL' || b.type === 'REPETITION',
      )
      if (main?.repetitions != null && main.work?.mode === 'time') {
        assert.match(
          s.description ?? '',
          new RegExp(`${main.repetitions}\\s*[x×]${main.work.value}`, 'i'),
          `description "${s.description}" != structure ${main.repetitions}x${main.work.value}`,
        )
      }
    }
  })

  it('places race on the requested weekday with nothing after', async () => {
    const result = await buildDraftFromCollected({
      data: fixtureData(),
      skillSlug: 'run-half-marathon',
      brief: {
        weekCount: 8,
        level: 'intermediate',
        daysPerWeek: 5,
        longRunDay: 5,
        raceWeekday: 5, // Saturday race
        firstWeekKm: 40,
        currentWeeklyKm: 40,
        notes: '',
      },
      allowAi: false,
    })
    const lastWeek = result.draft.sessions.filter(
      (s) => s.weekIndex === result.draft.weekCount - 1,
    )
    const race = lastWeek.find((s) => (s.tags ?? []).includes('race-day'))
    assert.ok(race, 'missing race-day')
    assert.equal(race!.dayOfWeek, 5)
    assert.ok(lastWeek.every((s) => s.dayOfWeek <= 5))
    assert.ok(!lastWeek.some((s) => s.dayOfWeek === 6))
  })

  it('varies quality prescriptions across weeks', async () => {
    const result = await buildDraftFromCollected({
      data: fixtureData(),
      skillSlug: 'run-half-marathon',
      brief: {
        weekCount: 8,
        level: 'intermediate',
        daysPerWeek: 5,
        notes: '',
      },
      allowAi: false,
    })
    const keys = result.draft.sessions
      .filter(
        (s) =>
          s.sessionType === 'THRESHOLD' ||
          s.sessionType === 'TEMPO' ||
          s.sessionType === 'VO2_MAX' ||
          s.sessionType === 'INTERVALS' ||
          s.sessionType === 'LONG_RUN',
      )
      .map((s) => `${s.weekIndex}:${s.candidateId}:${s.plannedDuration}`)
    assert.ok(keys.length >= 3, `expected several quality/long sessions, got ${keys.length}`)
    assert.ok(new Set(keys).size >= 2, `sessions did not vary: ${keys}`)
  })

  it('marathon draft uses MP work and a real race-week taper', async () => {
    const result = await buildDraftFromCollected({
      data: fixtureData(),
      skillSlug: 'run-marathon',
      brief: {
        weekCount: 16,
        level: 'advanced',
        daysPerWeek: 5,
        firstWeekKm: 58,
        currentWeeklyKm: 65,
        notes: '',
      },
      allowAi: false,
    })

    const mpish = result.draft.sessions.filter(
      (s) =>
        (s.candidateId ?? '').includes('MP_') ||
        (s.tags ?? []).some((t) => /mp-specific|marathon/i.test(t)),
    )
    assert.ok(
      mpish.length >= 3,
      `expected several MP/marathon-specific sessions, got ${mpish.length}`,
    )

    const longs = result.draft.sessions.filter(
      (s) =>
        s.sessionType === 'LONG_RUN' &&
        s.weekIndex < result.draft.weekCount - 1,
    )
    const peakLongKm = Math.max(
      ...longs.map((s) => s.plannedDistance ?? 0),
      0,
    )
    assert.ok(
      peakLongKm >= 30,
      `expected marathon peak long ≥30 km, got ${peakLongKm}`,
    )
    const weekKm = new Map<number, number>()
    for (const s of result.draft.sessions) {
      if ((s.tags ?? []).includes('race-day')) continue
      weekKm.set(
        s.weekIndex,
        (weekKm.get(s.weekIndex) ?? 0) + (s.plannedDistance ?? 0),
      )
    }
    const peakWeekKm = Math.max(...weekKm.values(), 0)
    assert.ok(
      peakWeekKm >= 48,
      `expected marathon peak training week ≥48 km, got ${peakWeekKm}`,
    )

    const raceWeek = result.draft.sessions.filter(
      (s) => s.weekIndex === result.draft.weekCount - 1,
    )
    const raceKm = raceWeek.reduce(
      (sum, s) => sum + (s.plannedDistance ?? 0),
      0,
    )
    assert.ok(
      raceKm <= 75,
      `race week total ${raceKm} km is not a taper (expected ≤75 with race)`,
    )
    const trainingKm = raceWeek
      .filter((s) => !(s.tags ?? []).includes('race-day'))
      .reduce((sum, s) => sum + (s.plannedDistance ?? 0), 0)
    assert.ok(
      trainingKm <= 35,
      `race-week training ${trainingKm} km still too high before race`,
    )
  })

  it('HM race week is sharpening + race, not a full quality week', async () => {
    const result = await buildDraftFromCollected({
      data: fixtureData(),
      skillSlug: 'run-half-marathon',
      brief: {
        weekCount: 12,
        level: 'advanced',
        daysPerWeek: 5,
        firstWeekKm: 50,
        currentWeeklyKm: 60,
        notes: '',
      },
      allowAi: false,
      lockedModel: 'THRESHOLD',
    })
    const last = result.draft.weekCount - 1
    const raceWeek = result.draft.sessions.filter((s) => s.weekIndex === last)
    const training = raceWeek.filter((s) => !(s.tags ?? []).includes('race-day'))
    const trainingKm = training.reduce(
      (sum, s) => sum + (s.plannedDistance ?? 0),
      0,
    )
    assert.ok(
      trainingKm <= 35,
      `HM race-week training ${trainingKm} km too high`,
    )
    const fullQuality = training.filter(
      (s) =>
        (s.plannedDuration ?? 0) >= 50 &&
        (s.sessionType === 'THRESHOLD' ||
          s.sessionType === 'RACE_PACE' ||
          s.sessionType === 'VO2_MAX'),
    )
    assert.ok(
      fullQuality.length === 0,
      `race week still has full quality: ${fullQuality.map((s) => s.title).join(', ')}`,
    )
    assert.ok(
      !training.some((s) => s.sessionType === 'LONG_RUN'),
      'race week should not keep a long run',
    )
  })
})

describe('capability calibration', () => {
  it('raises confidence and scores when history outcomes are strong', () => {
    const sparse: CollectedAthleteData = {
      ...fixtureData(),
      weekSummaries: [],
      recentSessions: [],
      paces: { easy: null, tempo: null, threshold: null, vo2: null },
    }
    const rich = fixtureData()
    rich.weekSummaries = rich.weekSummaries.map((w) => ({
      ...w,
      completed: w.planned,
      skipped: 0,
      completedDistanceKm: w.plannedDistanceKm,
    }))
    rich.recentSessions = [
      {
        date: '2026-10-01',
        type: WorkoutType.RUN,
        title: 'Threshold 5x5',
        status: 'COMPLETED',
        plannedDistanceKm: 12,
        plannedDurationMin: 60,
        actualDistanceKm: 12,
        actualDurationMin: 60,
        rpe: 7,
        estimatedTss: 75,
      },
      {
        date: '2026-09-28',
        type: WorkoutType.RUN,
        title: 'Long run',
        status: 'COMPLETED',
        plannedDistanceKm: 22,
        plannedDurationMin: 120,
        actualDistanceKm: 22.5,
        actualDurationMin: 122,
        rpe: 6,
        estimatedTss: 110,
      },
      {
        date: '2026-09-25',
        type: WorkoutType.RUN,
        title: 'Easy',
        status: 'COMPLETED',
        plannedDistanceKm: 10,
        plannedDurationMin: 55,
        actualDistanceKm: 10,
        actualDurationMin: 55,
        rpe: 4,
        estimatedTss: 45,
      },
    ]

    const goal = marathonGoal()
    const sparseCaps = calculateCapabilities(
      buildAthleteState(sparse, 'intermediate'),
      sparse,
      goal,
    )
    const richCaps = calculateCapabilities(
      buildAthleteState(rich, 'intermediate'),
      rich,
      goal,
    )

    assert.ok(
      richCaps.confidence > sparseCaps.confidence,
      `expected rich confidence ${richCaps.confidence} > sparse ${sparseCaps.confidence}`,
    )
    assert.ok(
      richCaps.capabilities.long_run_tolerance >
        sparseCaps.capabilities.long_run_tolerance,
    )
    assert.ok(
      richCaps.capabilities.threshold >= sparseCaps.capabilities.threshold,
    )
  })

  it('does not treat pace presence as equal to high-confidence pace', () => {
    const data = fixtureData()
    const goal = marathonGoal()
    const state = buildAthleteState(data, 'intermediate')
    const highConf = {
      ...state,
      metrics: {
        ...state.metrics,
        thresholdPace: {
          value: 4.5,
          source: 'lab_test' as const,
          confidence: 0.95,
        },
      },
    }
    const lowConf = {
      ...state,
      metrics: {
        ...state.metrics,
        thresholdPace: {
          value: 4.5,
          source: 'estimated_from_history' as const,
          confidence: 0.35,
        },
      },
    }
    const high = calculateCapabilities(highConf, data, goal)
    const low = calculateCapabilities(lowConf, data, goal)
    assert.ok(high.confidence >= low.confidence)
    assert.ok(
      high.capabilities.threshold >= low.capabilities.threshold - 0.01,
    )
  })
})

describe('scenario suite', () => {
  it('race-date / race-weekday conflict still places race on requested weekday', async () => {
    // Available Mon/Wed/Fri only, but race on Sunday — race must win.
    const result = await buildDraftFromCollected({
      data: {
        ...fixtureData(),
        races: [
          {
            name: 'City Half',
            date: '2026-11-01',
            type: 'HALF',
            sport: 'RUN',
            priority: 'A',
            goal: '1:45',
          },
          {
            name: 'Conflict 10K',
            date: '2026-10-18',
            type: '10K',
            sport: 'RUN',
            priority: 'B',
            goal: null,
          },
        ],
      },
      skillSlug: 'run-half-marathon',
      brief: {
        weekCount: 8,
        level: 'intermediate',
        daysPerWeek: 3,
        longRunDay: 4,
        raceWeekday: 6,
        availableDays: '0,2,4',
        firstWeekKm: 30,
        currentWeeklyKm: 30,
      },
      allowAi: false,
    })
    const last = result.draft.weekCount - 1
    const race = result.draft.sessions.find(
      (s) =>
        s.weekIndex === last && (s.tags ?? []).includes('race-day'),
    )
    assert.ok(race, 'missing race-day')
    assert.equal(race!.dayOfWeek, 6)
    assert.equal(result.audit.inputs.goal.raceDate, '2026-11-01')
    assert.ok(result.audit.validation.weeks.every((w) => w.ok))
  })

  it('sparse history lowers capability confidence and still drafts', async () => {
    const sparse = {
      ...fixtureData(),
      weekSummaries: [],
      recentSessions: [],
      paces: { easy: null, tempo: null, threshold: null, vo2: null },
    }
    const result = await buildDraftFromCollected({
      data: sparse,
      skillSlug: 'run-half-marathon',
      brief: {
        weekCount: 6,
        level: 'intermediate',
        daysPerWeek: 4,
        firstWeekKm: 25,
        currentWeeklyKm: 25,
      },
      allowAi: false,
    })
    assert.ok(result.draft.sessions.length >= 6)
    assert.ok(
      result.audit.inputs.capabilityConfidence < 0.55,
      `sparse confidence ${result.audit.inputs.capabilityConfidence}`,
    )
    assert.equal(result.audit.inputs.history.weekSummaryCount, 0)
    assert.ok(result.audit.engineVersion)
    assert.ok(result.audit.libraryVersion)
  })

  it('low-confidence readiness demotes hard slots', () => {
    const data = {
      ...fixtureData(),
      recentSessions: Array.from({ length: 6 }, (_, i) => ({
        date: `2026-09-${20 + i}`,
        type: WorkoutType.RUN,
        title: 'Hard',
        status: 'COMPLETED',
        plannedDistanceKm: 10,
        plannedDurationMin: 50,
        actualDistanceKm: 10,
        actualDurationMin: 50,
        rpe: 9,
        estimatedTss: 80,
      })),
    }
    const state = buildAthleteState(data, 'intermediate')
    assert.ok(state.readiness.score < 0.65)
    const action = decideReadinessAction(state)
    assert.ok(action === 'reduce' || action === 'easy' || action === 'cancel')
  })

  it('injury flags appear in audit constraints on a constrained draft', async () => {
    const result = await buildDraftFromCollected({
      data: fixtureData(),
      skillSlug: 'run-half-marathon',
      brief: {
        weekCount: 6,
        level: 'intermediate',
        daysPerWeek: 4,
        firstWeekKm: 35,
        currentWeeklyKm: 35,
        injurySeverity: 'mild',
        injuryLocation: 'knee',
        focus: 'injury',
      },
      allowAi: false,
    })
    assert.ok(
      result.meta.safetyGate?.decision === 'constrain' ||
        result.meta.safetyGate?.decision === 'require_review',
    )
    assert.ok(result.audit.constraints.safety.length >= 1)
    assert.ok(
      result.audit.constraints.safety.includes('max_one_hard_session') ||
        result.capacity.maxHardSessionsPerWeek <= 1,
    )
  })

  it('locked Norwegian forces model and double-threshold constraints', async () => {
    const result = await buildDraftFromCollected({
      data: {
        ...fixtureData(),
        weekSummaries: fixtureData().weekSummaries.map((w) => ({
          ...w,
          plannedDistanceKm: 55,
          completedDistanceKm: 52,
          completed: w.planned,
        })),
      },
      skillSlug: 'run-half-marathon',
      brief: {
        weekCount: 8,
        level: 'advanced',
        daysPerWeek: 5,
        firstWeekKm: 55,
        currentWeeklyKm: 55,
      },
      allowAi: false,
      lockedModel: 'NORWEGIAN',
    })
    assert.equal(result.meta.methodology.selectedModel, 'NORWEGIAN')
    assert.equal(result.audit.lockedModel, 'NORWEGIAN')
    assert.ok(
      result.meta.methodology.constraints.includes(
        'allow_double_threshold_day',
      ),
    )
    assert.ok(
      result.audit.constraints.methodology.includes(
        'allow_double_threshold_day',
      ),
    )
  })

  it('unusual availability keeps training on declared days', async () => {
    const allowed = new Set([0, 2, 4])
    const result = await buildDraftFromCollected({
      data: fixtureData(),
      skillSlug: 'run-half-marathon',
      brief: {
        weekCount: 6,
        level: 'intermediate',
        daysPerWeek: 3,
        longRunDay: 4,
        raceWeekday: 4,
        availableDays: '0,2,4',
        firstWeekKm: 28,
        currentWeeklyKm: 28,
      },
      allowAi: false,
    })
    const midWeek = result.draft.sessions.filter(
      (s) =>
        s.weekIndex === 2 && !(s.tags ?? []).includes('race-day'),
    )
    assert.ok(midWeek.length >= 2)
    for (const s of midWeek) {
      assert.ok(
        allowed.has(s.dayOfWeek),
        `session on day ${s.dayOfWeek} outside ${[...allowed]}`,
      )
    }
  })

  it('non-running sports draft HYROX and multi-sport plans', async () => {
    const hyrox = await buildDraftFromCollected({
      data: fixtureData(),
      skillSlug: 'hyrox-general',
      brief: {
        weekCount: 8,
        level: 'intermediate',
        daysPerWeek: 4,
        firstWeekKm: 30,
        currentWeeklyKm: 30,
        division: 'open',
      },
      allowAi: false,
    })
    assert.ok(hyrox.draft.sessions.length >= 8)
    assert.equal(hyrox.audit.inputs.goal.demandId, 'HYROX_V1')
    assert.ok(
      hyrox.draft.sessions.some(
        (s) =>
          s.type === WorkoutType.HYROX ||
          (s.tags ?? []).some((t) => /hyrox|station|compromised/i.test(t)),
      ),
      'expected HYROX/station sessions',
    )

    const multi = await buildDraftFromCollected({
      data: {
        ...fixtureData(),
        bikeFtpWatts: 220,
        swimCssSecPer100m: 95,
      },
      skillSlug: 'multi-sport-base',
      brief: {
        weekCount: 6,
        level: 'intermediate',
        daysPerWeek: 5,
        firstWeekKm: 25,
        currentWeeklyKm: 25,
        emphasis: 'balanced',
      },
      allowAi: false,
    })
    assert.ok(multi.draft.sessions.length >= 6)
    const sports = new Set(multi.draft.sessions.map((s) => s.type))
    assert.ok(
      sports.has(WorkoutType.BIKE) || sports.has(WorkoutType.SWIM),
      `multi-sport types: ${[...sports].join(',')}`,
    )
  })

  it('audit stores inputs, versions, constraints, and validation', async () => {
    const result = await buildDraftFromCollected({
      data: fixtureData(),
      skillSlug: 'run-marathon',
      brief: {
        weekCount: 8,
        level: 'intermediate',
        daysPerWeek: 4,
        firstWeekKm: 40,
        currentWeeklyKm: 40,
      },
      allowAi: false,
    })
    assert.equal(result.audit.schemaVersion, 1)
    assert.ok(result.audit.engineVersion.length >= 3)
    assert.ok(result.audit.libraryVersion.length >= 3)
    assert.equal(result.audit.skillSlug, 'run-marathon')
    assert.equal(result.audit.inputs.goal.weekCount, 8)
    assert.ok(result.audit.validation.planScore > 0)
    assert.ok(result.audit.validation.weeks.length >= 1)
    assert.ok(result.audit.validation.weeks.every((w) => w.ok))
    assert.ok(Array.isArray(result.audit.constraints.methodology))
  })

  it('repairs LONG_RUN_MIN by bumping the long run to the architecture floor', async () => {
    const { enforceWeekValidity } = await import(
      '@/lib/coach-engine/enforce-week'
    )
    const data = fixtureData()
    const state = buildAthleteState(data, 'intermediate')
    const goal = marathonGoal()
    const capacity = calculateCapacity(state, goal)
    capacity.maxWeeklyTss = 500
    capacity.maxWeeklyKm = 90
    capacity.envelope = stubCapacityEnvelope(90, 500, goal.weekCount)
    const priority = {
      primary: { adaptation: 'long_run_tolerance' as const, score: 0.8 },
      secondary: [],
    }
    const phase = buildPhaseProfile({ goal, priority })
    const architecture = buildWeeklyArchitecture({
      priority,
      capacity,
      phase,
    })
    const sessions = [
      {
        weekIndex: 0,
        dayOfWeek: 1,
        type: WorkoutType.RUN,
        sessionType: SessionType.EASY_RUN,
        title: 'Easy',
        description: null,
        plannedDistance: 8,
        plannedDuration: 45,
        coachNotes: null,
        tags: ['easy'],
        candidateId: null,
        primaryAdaptation: 'aerobic_capacity' as const,
        estimatedTss: 30,
        isKeySession: false,
      },
      {
        weekIndex: 0,
        dayOfWeek: 3,
        type: WorkoutType.RUN,
        sessionType: SessionType.EASY_RUN,
        title: 'Easy',
        description: null,
        plannedDistance: 8,
        plannedDuration: 45,
        coachNotes: null,
        tags: ['easy'],
        candidateId: null,
        primaryAdaptation: 'aerobic_capacity' as const,
        estimatedTss: 30,
        isKeySession: false,
      },
      {
        weekIndex: 0,
        dayOfWeek: 5,
        type: WorkoutType.RUN,
        sessionType: SessionType.LONG_RUN,
        title: 'Long',
        description: null,
        plannedDistance: 7,
        plannedDuration: 39,
        coachNotes: null,
        tags: ['long'],
        candidateId: null,
        primaryAdaptation: 'long_run_tolerance' as const,
        estimatedTss: 35,
        isKeySession: true,
      },
    ]
    const before = validateWeekComprehensive({
      sessions,
      capacity,
      architecture,
      priority,
      methodology: {
        selectedModel: 'PYRAMIDAL',
        confidence: 0.7,
        alternatives: [],
        reasonCodes: [],
        constraints: [],
        norwegianEligible: false,
      },
      weekIndex: 0,
    })
    assert.equal(before.valid, false)
    assert.ok(
      (before.valid ? [] : before.errors).some((e) => e.type === 'LONG_RUN_MIN'),
    )

    const enforced = enforceWeekValidity({
      sessions,
      capacity,
      architecture,
      priority,
      methodology: {
        selectedModel: 'PYRAMIDAL',
        confidence: 0.7,
        alternatives: [],
        reasonCodes: [],
        constraints: [],
        norwegianEligible: false,
      },
      weekIndex: 0,
    })
    assert.equal(enforced.ok, true)
    const long = enforced.sessions.find(
      (s) => s.sessionType === SessionType.LONG_RUN,
    )
    assert.ok(long)
    assert.ok(
      (long!.plannedDuration ?? 0) >= 45,
      `long still ${long!.plannedDuration}min after repair`,
    )
  })
})
