import { SeasonPhase } from '@prisma/client'
import type {
  AthleteState,
  CapacityProfile,
  GoalProfile,
  SportVolumeChannel,
  WeeklyCapacityEnvelope,
  WeeklyCapacityWeek,
} from '@/lib/coach-engine/types'
import {
  modalityCapsFromChannels,
  resolveSportArchitecture,
  scaleArchitectureChannels,
  scaleModalityVolumesForWeek,
  sportArchitectureIdForDemand,
} from '@/lib/coach-engine/sport-architecture'
import {
  getMarathonPreparationStandard,
  isHighLevelEnduranceGoal,
} from '@/lib/coach-engine/long-run-target'

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

const LEVEL_SESSION_CAPS: Record<GoalProfile['level'], number> = {
  beginner: 4,
  intermediate: 5,
  advanced: 6,
  elite: 7,
}

const LEVEL_HARD_CAPS: Record<GoalProfile['level'], number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 2,
  elite: 3,
}

/** How far weekly volume may grow above present baseline by level / demand. */
export function progressivePeakMultiplier(args: {
  level: GoalProfile['level']
  demandId?: string | null
  weekCount: number
}): number {
  const isMarathon = args.demandId === 'MARATHON_V1'
  // Marathon peaks must support ~50–55+ km weeks hosting 30–35 km durability longs.
  const byLevel: Record<GoalProfile['level'], number> = isMarathon
    ? { beginner: 2.1, intermediate: 2.2, advanced: 2.35, elite: 2.5 }
    : { beginner: 1.18, intermediate: 1.28, advanced: 1.38, elite: 1.48 }
  let mult = byLevel[args.level]
  // Short blocks cannot climb as far.
  if (args.weekCount <= 8) mult = Math.min(mult, isMarathon ? 1.45 : 1.22)
  else if (args.weekCount <= 10) mult = Math.min(mult, isMarathon ? 1.65 : 1.3)
  else if (args.weekCount <= 12 && isMarathon) mult = Math.min(mult, 1.9)
  return mult
}

export function resolveCapacityBaselineKm(
  state: AthleteState,
  goal: GoalProfile,
): number {
  const historyKm = state.recentVolume.runningKmPerWeek
  const declaredKm = goal.currentWeeklyKm
  if (declaredKm != null && historyKm < 8) return declaredKm
  if (declaredKm != null) {
    return Math.round((historyKm * 0.6 + declaredKm * 0.4) * 10) / 10
  }
  return Math.max(20, historyKm || 25)
}

/**
 * Build a week-by-week allowable envelope.
 * - baseline: present training
 * - build: ≤ +safeProgression vs prior loading
 * - deload: ~deloadRatio of prior loading
 * - peak: ceiling at maxPeakKm
 * - taper/race: reduced training ceilings
 */
export function buildWeeklyCapacityEnvelope(args: {
  baselineKm: number
  baselineTss: number
  maxPeakKm: number
  maxPeakTss: number
  weekCount: number
  deloadWeekIndexes?: number[]
  taperWeekIndexes?: number[]
  phases?: SeasonPhase[]
  safeProgressionRatio?: number
  deloadRatio?: number
  readinessFactor?: number
  /** Non-run channels (bike/swim/stations) scaled per week. */
  sportChannels?: SportVolumeChannel[]
}): WeeklyCapacityEnvelope {
  const safeProgressionRatio = args.safeProgressionRatio ?? 1.08
  const deloadRatio = args.deloadRatio ?? 0.9
  const readiness = args.readinessFactor ?? 1
  const weekCount = Math.max(1, args.weekCount)
  const deloadSet = new Set(args.deloadWeekIndexes ?? [])
  const taperSet = new Set(args.taperWeekIndexes ?? [])

  // Provisional deloads if none provided (matches dose: every 4th week).
  if (deloadSet.size === 0 && weekCount >= 6) {
    for (let w = 0; w < weekCount; w += 1) {
      const fromEnd = weekCount - 1 - w
      if ((w + 1) % 4 === 0 && fromEnd > 1) deloadSet.add(w)
    }
  }

  const weeks: WeeklyCapacityWeek[] = []
  let lastLoadingKm = args.baselineKm
  let lastLoadingTss = args.baselineTss

  for (let w = 0; w < weekCount; w += 1) {
    const fromEnd = weekCount - 1 - w
    const phase = args.phases?.[w]
    const isRace =
      phase === SeasonPhase.RACE || fromEnd === 0
    const isTaper =
      !isRace &&
      (fromEnd === 1 ||
        taperSet.has(w) ||
        (phase === SeasonPhase.PEAK && fromEnd <= 1))
    const isDeload =
      !isRace && !isTaper && (deloadSet.has(w) || phase === SeasonPhase.RECOVERY)

    let kind: WeeklyCapacityWeek['kind'] = 'build'
    let targetKm: number
    let maxKm: number
    let targetTss: number
    let maxTss: number

    if (w === 0 && !isRace && !isDeload) {
      kind = 'baseline'
      targetKm = args.baselineKm
      // First week may sit slightly above baseline (readiness / declared blend).
      maxKm = Math.min(
        args.maxPeakKm,
        Math.round(args.baselineKm * safeProgressionRatio * readiness * 10) /
          10,
      )
      targetTss = args.baselineTss
      maxTss = Math.min(
        args.maxPeakTss,
        Math.round(args.baselineTss * safeProgressionRatio * readiness),
      )
      lastLoadingKm = targetKm
      lastLoadingTss = targetTss
    } else if (isRace) {
      kind = 'race'
      // Sharpening only — race distance is additive outside this ceiling.
      targetKm = Math.round(args.baselineKm * 0.35 * 10) / 10
      maxKm = Math.round(args.maxPeakKm * 0.42 * 10) / 10
      targetTss = Math.round(args.baselineTss * 0.35)
      maxTss = Math.round(args.maxPeakTss * 0.45)
    } else if (isTaper) {
      kind = 'taper'
      targetKm = Math.round(lastLoadingKm * 0.72 * 10) / 10
      maxKm = Math.round(lastLoadingKm * 0.85 * 10) / 10
      targetTss = Math.round(lastLoadingTss * 0.72)
      maxTss = Math.round(lastLoadingTss * 0.88)
    } else if (isDeload) {
      kind = 'deload'
      targetKm = Math.round(lastLoadingKm * deloadRatio * 10) / 10
      maxKm = Math.round(lastLoadingKm * (deloadRatio + 0.05) * 10) / 10
      targetTss = Math.round(lastLoadingTss * deloadRatio)
      maxTss = Math.round(lastLoadingTss * (deloadRatio + 0.05))
    } else {
      const progress = weekCount <= 1 ? 1 : w / (weekCount - 1)
      const climbTarget = Math.round(
        (args.baselineKm +
          (args.maxPeakKm - args.baselineKm) * progress) *
          10,
      ) / 10
      const fromProgression =
        Math.round(lastLoadingKm * safeProgressionRatio * 10) / 10
      targetKm = Math.min(args.maxPeakKm, climbTarget, fromProgression)
      // Hard ceiling: safe progression + small validation slack, never above peak.
      maxKm =
        Math.round(
          Math.min(args.maxPeakKm, fromProgression * 1.05) * 10,
        ) / 10
      const climbTss = Math.round(
        args.baselineTss +
          (args.maxPeakTss - args.baselineTss) * progress,
      )
      const tssFromProg = Math.round(lastLoadingTss * safeProgressionRatio)
      targetTss = Math.min(args.maxPeakTss, climbTss, tssFromProg)
      maxTss = Math.min(args.maxPeakTss, Math.round(tssFromProg * 1.05))
      lastLoadingKm = targetKm
      lastLoadingTss = targetTss

      // Late block near peak.
      if (progress >= 0.72 && fromEnd > 1) kind = 'peak'
      else kind = 'build'
    }

    const volumeScale =
      args.baselineKm > 0 ? targetKm / args.baselineKm : 1
    weeks.push({
      weekIndex: w,
      kind,
      targetKm,
      targetTss,
      maxKm: Math.max(targetKm, maxKm),
      maxTss: Math.max(targetTss, maxTss),
      modalityVolumes: args.sportChannels?.length
        ? scaleModalityVolumesForWeek(args.sportChannels, volumeScale, kind)
        : undefined,
    })
  }

  return {
    baselineKm: args.baselineKm,
    baselineTss: args.baselineTss,
    maxPeakKm: args.maxPeakKm,
    maxPeakTss: args.maxPeakTss,
    safeProgressionRatio,
    deloadRatio,
    weekCount,
    weeks,
  }
}

/** Present-week capacity + progressive envelope for the full plan. */
export function calculateCapacity(
  state: AthleteState,
  goal: GoalProfile,
): CapacityProfile {
  const baselineKm = resolveCapacityBaselineKm(state, goal)
  const progression = 1.08
  const readinessFactor = 0.85 + state.readiness.score * 0.2
  const consistencyFactor = 0.9 + state.consistency * 0.15

  // Present capacity: what the athlete can absorb *now* (next training week).
  const maxWeeklyKm =
    Math.round(
      Math.max(baselineKm, baselineKm * progression * readinessFactor) * 10,
    ) / 10
  const baselineTss = Math.max(
    40,
    state.recentVolume.avgWeeklyTss || Math.round(baselineKm * 4.5) || 55,
  )
  const maxWeeklyTss = Math.max(
    baselineTss,
    Math.round(baselineTss * progression * readinessFactor),
  )

  const peakMult = progressivePeakMultiplier({
    level: goal.level,
    demandId: goal.demandId,
    weekCount: goal.weekCount,
  })
  // Progressive envelope baseline may include declared first-week / current volume
  // so later weeks can grow above present maxWeeklyKm without being flat-capped.
  const planningBaselineKm = Math.max(
    baselineKm,
    goal.firstWeekKm ?? 0,
    goal.currentWeeklyKm ?? 0,
  )
  const planningBaselineTss = Math.max(
    baselineTss,
    Math.round(planningBaselineKm * 4.5),
  )
  // Future progressive capacity — deliberately above present maxWeeklyKm.
  // Marathon: envelope must be able to host the preparation-standard peak week.
  const marathonPeakFloorKm =
    goal.demandId === 'MARATHON_V1' && goal.weekCount >= 12
      ? getMarathonPreparationStandard({
          level: goal.level,
          highLevel: isHighLevelEnduranceGoal(goal),
        }).targetPeakWeeklyKm
      : 0
  const maxPeakKm =
    Math.round(
      Math.max(
        maxWeeklyKm,
        planningBaselineKm * peakMult * Math.max(0.95, readinessFactor),
        marathonPeakFloorKm,
      ) * 10,
    ) / 10
  const maxPeakTss = Math.round(
    Math.max(
      maxWeeklyTss,
      planningBaselineTss * peakMult * Math.max(0.95, readinessFactor),
      marathonPeakFloorKm > 0 ? Math.round(marathonPeakFloorKm * 4.5) : 0,
    ),
  )

  const overallCapacity = clamp(
    Math.round((maxWeeklyTss / 1.2) * consistencyFactor),
    40,
    140,
  )
  const mechanicalCapacity = clamp(
    Math.round((maxWeeklyKm / 0.7) * readinessFactor),
    30,
    120,
  )
  const cardioCapacity = clamp(Math.round(overallCapacity * 0.95), 35, 130)

  const usedEstimate = clamp(
    Math.round(
      (state.trainingLoad.cardiovascular + state.trainingLoad.mechanical) / 2,
    ),
    0,
    overallCapacity,
  )

  const levelCap = LEVEL_SESSION_CAPS[goal.level]
  let availabilityCeiling = Math.min(
    7,
    Math.max(3, goal.daysPerWeek || levelCap),
  )
  // Standard marathon preparation (~50 km peak) needs room for a 4th easy run.
  if (goal.demandId === 'MARATHON_V1' && goal.weekCount >= 12) {
    availabilityCeiling = Math.max(availabilityCeiling, 4)
  }
  // HYROX / multi need concurrent modalities — don't collapse to run-km session math.
  const architectureFloor =
    goal.demandId === 'MULTI_BASE_V1'
      ? 5
      : goal.demandId === 'HYROX_V1'
        ? 4
        : goal.demandId === 'MARATHON_V1' && goal.weekCount >= 12
          ? 4
          : 3
  // Honor declared availability (daysPerWeek). Volume shapes km/TSS caps, not
  // whether the athlete may use the days they said they have.
  // Marathon standard weeks may schedule one extra easy beyond a 3-day declaration.
  const maxSessionsPerWeek = Math.min(
    levelCap,
    Math.max(availabilityCeiling, architectureFloor),
  )
  const maxHardSessionsPerWeek = Math.min(
    LEVEL_HARD_CAPS[goal.level],
    maxSessionsPerWeek <= 3 ? 1 : LEVEL_HARD_CAPS[goal.level],
  )

  const architectureId = sportArchitectureIdForDemand(goal.demandId)
  const architecture = resolveSportArchitecture({
    demandId: goal.demandId,
    level: goal.level,
  })
  const sportChannels = scaleArchitectureChannels(architecture, {
    runKmBaseline: planningBaselineKm,
    readinessFactor,
  })
  // HYROX / multi: run peak is secondary — prefer architecture channel peak.
  const runChannel = sportChannels.find((c) => c.unit === 'run_km')
  const sportAwarePeakKm =
    architectureId === 'run_endurance'
      ? maxPeakKm
      : Math.min(
          maxPeakKm,
          runChannel?.peakMax ?? maxPeakKm,
        )

  const envelope = buildWeeklyCapacityEnvelope({
    // Envelope climb starts from planning volume (declared or history), not a
    // depressed present-only figure that would flatten the whole block.
    baselineKm: planningBaselineKm,
    baselineTss: planningBaselineTss,
    maxPeakKm: sportAwarePeakKm,
    maxPeakTss,
    weekCount: goal.weekCount,
    safeProgressionRatio: progression,
    deloadRatio: 0.9,
    readinessFactor,
    sportChannels,
  })

  return {
    weeklyCapacity: {
      overall: overallCapacity,
      cardiovascular: cardioCapacity,
      mechanical: mechanicalCapacity,
    },
    remainingCapacity: {
      overall: Math.max(0, overallCapacity - usedEstimate),
      mechanical: Math.max(
        0,
        mechanicalCapacity - state.trainingLoad.mechanical,
      ),
    },
    /** Present / next-week capacity (not a plan-wide flat ceiling). */
    maxWeeklyKm,
    maxWeeklyTss,
    maxSessionsPerWeek,
    maxHardSessionsPerWeek,
    envelope,
    architectureId,
    modalityCaps: modalityCapsFromChannels(sportChannels),
  }
}

/** Look up the weekly envelope ceiling (falls back to present capacity). */
export function capacityCeilingForWeek(
  capacity: CapacityProfile,
  weekIndex: number,
): { maxKm: number; maxTss: number; kind: WeeklyCapacityWeek['kind'] | 'present' } {
  const week = capacity.envelope?.weeks?.[weekIndex]
  if (week) {
    return { maxKm: week.maxKm, maxTss: week.maxTss, kind: week.kind }
  }
  return {
    maxKm: capacity.maxWeeklyKm,
    maxTss: capacity.maxWeeklyTss,
    kind: 'present',
  }
}

/** Rebuild envelope after dose assigns real deload/taper weeks. */
export function refreshCapacityEnvelope(
  capacity: CapacityProfile,
  args: {
    weekCount: number
    deloadWeekIndexes: number[]
    taperWeekIndexes: number[]
    phases?: SeasonPhase[]
  },
): CapacityProfile {
  const env = capacity.envelope
  const architecture = resolveSportArchitecture({
    demandId:
      capacity.architectureId === 'hyrox'
        ? 'HYROX_V1'
        : capacity.architectureId === 'multi_sport'
          ? 'MULTI_BASE_V1'
          : 'HALF_V1',
  })
  const sportChannels = scaleArchitectureChannels(architecture, {
    runKmBaseline: env?.baselineKm ?? capacity.maxWeeklyKm / 1.08,
  })
  const envelope = buildWeeklyCapacityEnvelope({
    baselineKm: env?.baselineKm ?? capacity.maxWeeklyKm / 1.08,
    baselineTss: env?.baselineTss ?? capacity.maxWeeklyTss / 1.08,
    maxPeakKm: env?.maxPeakKm ?? capacity.maxWeeklyKm * 1.35,
    maxPeakTss: env?.maxPeakTss ?? capacity.maxWeeklyTss * 1.35,
    weekCount: args.weekCount,
    deloadWeekIndexes: args.deloadWeekIndexes,
    taperWeekIndexes: args.taperWeekIndexes,
    phases: args.phases,
    safeProgressionRatio: env?.safeProgressionRatio ?? 1.08,
    deloadRatio: env?.deloadRatio ?? 0.9,
    sportChannels,
  })
  return {
    ...capacity,
    envelope,
    modalityCaps: modalityCapsFromChannels(sportChannels),
  }
}

/** Minimal envelope for tests / stubs that only set present caps. */
export function stubCapacityEnvelope(
  maxWeeklyKm: number,
  maxWeeklyTss: number,
  weekCount = 12,
): WeeklyCapacityEnvelope {
  return buildWeeklyCapacityEnvelope({
    baselineKm: maxWeeklyKm / 1.08,
    baselineTss: maxWeeklyTss / 1.08,
    maxPeakKm: maxWeeklyKm * 1.35,
    maxPeakTss: maxWeeklyTss * 1.35,
    weekCount,
  })
}

/** Full CapacityProfile stub for unit tests. */
export function stubCapacityProfile(args: {
  maxWeeklyKm: number
  maxWeeklyTss: number
  maxSessionsPerWeek?: number
  maxHardSessionsPerWeek?: number
  weekCount?: number
  architectureId?: CapacityProfile['architectureId']
}): CapacityProfile {
  const architectureId = args.architectureId ?? 'run_endurance'
  return {
    weeklyCapacity: { overall: 100, cardiovascular: 90, mechanical: 80 },
    remainingCapacity: { overall: 50, mechanical: 40 },
    maxWeeklyKm: args.maxWeeklyKm,
    maxWeeklyTss: args.maxWeeklyTss,
    maxSessionsPerWeek: args.maxSessionsPerWeek ?? 5,
    maxHardSessionsPerWeek: args.maxHardSessionsPerWeek ?? 2,
    envelope: stubCapacityEnvelope(
      args.maxWeeklyKm,
      args.maxWeeklyTss,
      args.weekCount ?? 12,
    ),
    architectureId,
    modalityCaps: [],
  }
}
