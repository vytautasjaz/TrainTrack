import { SeasonPhase } from '@prisma/client'
import type { GoalProfile, PhaseProfile, PriorityProfile } from '@/lib/coach-engine/types'
import {
  assignWeekPhases,
  buildPlanPhasesFromBlueprints,
  buildWeekBlueprints,
  blueprintToPhaseProfile,
} from '@/lib/coach-engine/blueprint'
import type { DoseProfile } from '@/lib/coach-engine/types'

export {
  assignWeekPhases,
  buildWeekBlueprints,
  buildPlanPhasesFromBlueprints,
  blueprintToPhaseProfile,
} from '@/lib/coach-engine/blueprint'

/** @deprecated Prefer blueprintToPhaseProfile — kept for call sites. */
export function buildPhaseProfile(args: {
  goal: GoalProfile
  priority: PriorityProfile
  weekIndex?: number
  dose?: DoseProfile
}): PhaseProfile {
  const weekIndex = args.weekIndex ?? 0
  if (args.dose) {
    const bps = buildWeekBlueprints({
      goal: args.goal,
      dose: args.dose,
      priority: args.priority,
    })
    const bp = bps[weekIndex] ?? bps[0]!
    return blueprintToPhaseProfile(bp, args.priority)
  }

  const weekCount = args.goal.weekCount
  const fromEnd = weekCount - 1 - weekIndex
  let phase: SeasonPhase = SeasonPhase.BUILD
  if (fromEnd === 0) phase = SeasonPhase.RACE
  else if (fromEnd === 1) phase = SeasonPhase.PEAK
  else if ((weekIndex + 1) % 4 === 0) phase = SeasonPhase.RECOVERY
  else if (weekIndex / Math.max(1, weekCount - 1) < 0.35) phase = SeasonPhase.BASE
  else if (weekIndex / Math.max(1, weekCount - 1) < 0.72) phase = SeasonPhase.BUILD
  else phase = SeasonPhase.PEAK

  return {
    phase,
    phaseGoal: phase === SeasonPhase.BASE ? 'aerobic_base' : 'race_specific_endurance',
    weeksToRace: fromEnd,
    weekObjectives: [`Emphasize ${args.priority.primary.adaptation}`],
    isDeload: phase === SeasonPhase.RECOVERY,
    isTaper: fromEnd <= 1,
    volumeScale: fromEnd === 0 ? 0.45 : fromEnd === 1 ? 0.7 : 1,
  }
}

/** Week-aligned phase blocks (no mid-week Base/Build splits). */
export function buildPlanPhases(goal: GoalProfile, dose?: DoseProfile, priority?: PriorityProfile) {
  if (dose && priority) {
    return buildPlanPhasesFromBlueprints(
      goal,
      buildWeekBlueprints({ goal, dose, priority }),
    )
  }
  // Fallback without dose: week-snapped approximate blocks
  const weeks = goal.weekCount
  const phases = assignWeekPhases({
    weekCount: weeks,
    deloadWeekIndexes: Array.from({ length: weeks }, (_, w) => w).filter(
      (w) => (w + 1) % 4 === 0 && w < weeks - 2,
    ),
    taperWeekIndexes: weeks > 1 ? [weeks - 2] : [],
  })
  const fake = phases.map((phase, weekIndex) => ({
    weekIndex,
    phase,
    label:
      phase === SeasonPhase.RECOVERY
        ? 'Recovery'
        : phase === SeasonPhase.RACE
          ? 'Taper / race'
          : phase === SeasonPhase.BASE
            ? 'Base'
            : phase === SeasonPhase.BUILD
              ? 'Build'
              : 'Peak',
    isDeload: phase === SeasonPhase.RECOVERY,
    isTaper: weekIndex === weeks - 2,
    isRaceWeek: phase === SeasonPhase.RACE,
    volumeScale: 1,
    targetKm: 50,
    longRunMinMinutes: 70,
    longRunTargetKm: 18,
    longIntensityProfile: 'aerobic' as const,
    longRunMpKm: 0,
    intensityBand: 'engine' as const,
    qualityBudgetMin: 20,
    qualitySessions: 1,
    preferRaceSpecific: false,
    preferAerobicLong: true,
    preferStrides: false,
    allowVo2: true,
    thresholdVolumeTargetMin: 24,
    architectureId: 'run_endurance' as const,
    modalityVolumes: [],
    stationVolumeTarget: null,
    bikeMinutesTarget: null,
    swimMetersTarget: null,
  }))
  return buildPlanPhasesFromBlueprints(goal, fake)
}
