import { DELOAD_VOLUME_RATIO } from '@/lib/coach-engine/deload'
import { roadmapDeloadWeekIndexes } from '@/lib/coach-engine/preparation-roadmap'
import type {
  AthleteState,
  CapacityProfile,
  DoseProfile,
  GoalProfile,
  PhaseProfile,
  TrainingBudget,
} from '@/lib/coach-engine/types'

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

/** Time / recovery budget from brief notes heuristics + capacity. */
export function calculateTrainingBudget(args: {
  brief: Record<string, unknown>
  capacity: CapacityProfile
  state: AthleteState
}): TrainingBudget {
  const notes =
    typeof args.brief.notes === 'string' ? args.brief.notes.toLowerCase() : ''
  let availableMinutes = args.capacity.maxSessionsPerWeek * 55
  if (notes.includes('limited') || notes.includes('busy')) {
    availableMinutes = Math.round(availableMinutes * 0.75)
  }
  if (notes.includes('high volume') || notes.includes('lots of time')) {
    availableMinutes = Math.round(availableMinutes * 1.15)
  }
  return {
    availableMinutesPerWeek: availableMinutes,
    maxHardMinutesPerWeek: Math.round(
      availableMinutes * (0.15 + args.state.readiness.score * 0.1),
    ),
    recoveryDaysRequired: args.state.readiness.score < 0.6 ? 2 : 1,
  }
}

/**
 * Weekly volume curve with recovery weeks (~90% of prior ≈ 10% cut)
 * and a true taper into race week (intensity drops more than volume on deloads).
 */
export function calculateDoseProfile(args: {
  state: AthleteState
  goal: GoalProfile
  capacity: CapacityProfile
  budget: TrainingBudget
}): DoseProfile {
  const env = args.capacity.envelope
  // Dose curves climb toward progressive peak — not present-week maxWeeklyKm.
  const peakKm = Math.max(
    1,
    env?.maxPeakKm ?? args.capacity.maxWeeklyKm,
  )
  const peakTss = Math.max(
    1,
    env?.maxPeakTss ?? args.capacity.maxWeeklyTss,
  )
  const presentKm = Math.max(1, args.capacity.maxWeeklyKm)
  const progression = env?.safeProgressionRatio ?? 1.08
  const deloadRatio = env?.deloadRatio ?? DELOAD_VOLUME_RATIO

  const baseTss = Math.max(
    40,
    args.state.recentVolume.avgWeeklyTss || args.capacity.maxWeeklyTss * 0.7,
  )
  const medTss = Math.round(baseTss * 0.85)
  const optTss = Math.round(Math.min(peakTss, baseTss * 1.05))
  const mrdTss = Math.round(Math.min(peakTss * 1.05, baseTss * 1.2))
  const targetWeeklyTss = optTss
  const targetWeeklyKm =
    args.goal.firstWeekKm ??
    args.goal.currentWeeklyKm ??
    presentKm

  const deloadWeekIndexes: number[] = []
  const taperWeekIndexes: number[] = []
  const volumeScaleByWeek: number[] = []

  const firstKm = args.goal.firstWeekKm
  const firstScale =
    firstKm != null && peakKm > 0
      ? clamp(firstKm / peakKm, 0.75, 1.0)
      : clamp(presentKm / peakKm, 0.75, 0.95)

  // Endurance races: recovery weeks come from ROADMAP_BY_DURATION, not "every 4th".
  const useRoadmapDeloads =
    args.goal.demandId === 'MARATHON_V1' || args.goal.demandId === 'HALF_V1'
  const roadmapDeloads = useRoadmapDeloads
    ? new Set(roadmapDeloadWeekIndexes(args.goal.weekCount))
    : null

  for (let w = 0; w < args.goal.weekCount; w += 1) {
    const weeksFromEnd = args.goal.weekCount - 1 - w
    const progress = w / Math.max(1, args.goal.weekCount - 1)
    let scale = firstScale + progress * (1.05 - firstScale)

    const isScheduledDeload = roadmapDeloads
      ? roadmapDeloads.has(w)
      : // Non-endurance fallback: every 4th week except last 2.
        (w + 1) % 4 === 0 && weeksFromEnd > 1 && args.goal.weekCount >= 6

    if (weeksFromEnd === 0 && args.goal.type === 'race') {
      taperWeekIndexes.push(w)
      scale = 0.45
    } else if (weeksFromEnd === 1 && args.goal.type === 'race') {
      taperWeekIndexes.push(w)
      scale = 0.7
    } else if (isScheduledDeload) {
      deloadWeekIndexes.push(w)
      const prev = volumeScaleByWeek[w - 1] ?? scale
      // Recovery: ~10% volume cut; intensity is reduced in blueprint/weekly slots.
      scale = Math.round(prev * deloadRatio * 100) / 100
    } else {
      const prev = volumeScaleByWeek[w - 1]
      if (prev != null && !deloadWeekIndexes.includes(w - 1)) {
        scale = Math.min(scale, prev * progression)
      }
    }

    if (args.state.readiness.score < 0.6) {
      scale = Math.min(scale, 0.95)
    }

    volumeScaleByWeek.push(Math.round(scale * 100) / 100)
  }

  return {
    medTss,
    optTss,
    mrdTss,
    targetWeeklyTss,
    targetWeeklyKm,
    volumeScaleByWeek,
    deloadWeekIndexes,
    taperWeekIndexes,
  }
}

/** Apply dose flags onto a phase for a given week. */
export function applyDoseToPhase(
  phase: PhaseProfile,
  dose: DoseProfile,
  weekIndex: number,
): PhaseProfile {
  const isDeload = dose.deloadWeekIndexes.includes(weekIndex)
  const isTaper = dose.taperWeekIndexes.includes(weekIndex)
  return {
    ...phase,
    isDeload: isDeload || phase.isDeload,
    isTaper: isTaper || phase.isTaper,
    volumeScale: dose.volumeScaleByWeek[weekIndex] ?? phase.volumeScale ?? 1,
    weekObjectives: [
      ...phase.weekObjectives,
      ...(isDeload ? ['Recovery week: ~75% of prior volume'] : []),
      ...(isTaper ? ['Taper: protect freshness for race'] : []),
    ],
  }
}

export function isMinimumViableWeek(phase: PhaseProfile): boolean {
  return Boolean(phase.isDeload || phase.isTaper || phase.phase === 'RECOVERY')
}
