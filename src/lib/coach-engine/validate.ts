import type {
  CapacityProfile,
  CandidateWorkout,
  PlannedSession,
  ValidationError,
  ValidationResult,
  WeeklyArchitecture,
  WorkoutAdaptations,
  WorkoutProposal,
} from '@/lib/coach-engine/types'
import { estimateCandidateTss, getWorkoutById } from '@/lib/coach-engine/library'
import {
  reconcileCoachNotesWithSession,
  scaleStructureVolume,
  syncCopyFromStructure,
} from '@/lib/coach-engine/session-copy'
import type { WorkoutBlock, WorkoutStructure } from '@/lib/workout-builder/types'
import {
  estimateStructureDistanceKm,
  estimateStructureDurationMinutes,
} from '@/lib/workout-builder/segment-estimation'
import type { AthletePreferences } from '@/lib/athlete-preferences'

const LOAD_RANK = { low: 1, medium: 2, high: 3 } as const

function adaptStructureBlocks(
  structure: WorkoutStructure | null | undefined,
  adaptations: WorkoutAdaptations,
): WorkoutStructure | null {
  if (!structure) return structure ?? null
  const intervalCount = adaptations.intervalCount
  const intervalDurationMin = adaptations.intervalDurationMin
  const recoveryMin = adaptations.recoveryMin
  if (
    intervalCount == null &&
    intervalDurationMin == null &&
    recoveryMin == null
  ) {
    return structure
  }

  const patchBlock = (block: WorkoutBlock): WorkoutBlock => {
    if (block.type !== 'INTERVAL' && block.type !== 'REPETITION') return block
    const next = { ...block }
    if (intervalCount != null) next.repetitions = intervalCount
    if (intervalDurationMin != null && next.work?.mode === 'time') {
      const unit = next.work.unit
      next.work = {
        ...next.work,
        value: unit === 'sec' ? Math.round(intervalDurationMin * 60) : intervalDurationMin,
      }
    }
    if (recoveryMin != null && next.recovery?.mode === 'time') {
      const unit = next.recovery.unit
      next.recovery = {
        ...next.recovery,
        value: unit === 'sec' ? Math.round(recoveryMin * 60) : recoveryMin,
      }
    }
    return next
  }

  const mainSet = structure.mainSet.map((b, i) => {
    const isPrimaryInterval =
      (b.type === 'INTERVAL' || b.type === 'REPETITION') &&
      structure.mainSet.findIndex(
        (x) => x.type === 'INTERVAL' || x.type === 'REPETITION',
      ) === i
    return isPrimaryInterval ? patchBlock(b) : b
  })

  return { ...structure, mainSet }
}

/**
 * Materialize duration/distance from adapted structure when possible.
 * `null` adaptation fields mean “keep sample default” (never wipe catalog distance).
 * Description + card summary are always rebuilt from the final structure.
 */
export function applyAdaptations(
  candidate: CandidateWorkout,
  adaptations: WorkoutAdaptations,
  preferences?: AthletePreferences | null,
): CandidateWorkout {
  const intervalCount = adaptations.intervalCount ?? candidate.intervalCount
  const adaptedStructure = adaptStructureBlocks(
    candidate.structure,
    adaptations,
  )
  const synced = syncCopyFromStructure({
    structure: adaptedStructure,
    sport: candidate.sport,
    title: candidate.title,
    fallbackDescription: candidate.description,
  })

  let durationMin = adaptations.durationMin ?? candidate.durationMin
  let distanceKm = adaptations.distanceKm ?? candidate.distanceKm

  if (synced.structure) {
    const estDur = estimateStructureDurationMinutes(
      synced.structure,
      preferences,
      candidate.sport,
    )
    const estDist = estimateStructureDistanceKm(
      synced.structure,
      preferences,
      candidate.sport,
    )
    if (estDur > 0) durationMin = estDur
    if (estDist != null && estDist > 0) distanceKm = estDist
  }

  return {
    ...candidate,
    title: synced.title,
    description: synced.description,
    durationMin,
    distanceKm,
    intervalCount,
    intervalDurationMin:
      adaptations.intervalDurationMin ?? candidate.intervalDurationMin,
    recoveryMin: adaptations.recoveryMin ?? candidate.recoveryMin,
    structure: synced.structure,
  }
}

export function proposalToSession(args: {
  weekIndex: number
  dayOfWeek: number
  proposal: WorkoutProposal
  reason?: string
  preferences?: AthletePreferences | null
  /** Soft floor for long-run duration (minutes). */
  longRunMinMinutes?: number | null
  /** Preferred long-run distance (km) — scales structure by distance. */
  longRunTargetKm?: number | null
  /** Apply weekly volume scale to duration/distance (recovery / taper). */
  volumeScale?: number | null
}): PlannedSession | null {
  const base = getWorkoutById(args.proposal.selectedWorkoutId)
  if (!base) return null
  const adapted = applyAdaptations(
    base,
    args.proposal.adaptations,
    args.preferences,
  )
  let durationMin = adapted.durationMin
  let distanceKm = adapted.distanceKm
  let structure = adapted.structure ?? null
  let title = adapted.title
  let description = adapted.description
  const isRace =
    adapted.tags.some((t) => /race-day/i.test(t)) ||
    (adapted.family === 'race' && /race day/i.test(adapted.title))
  const isLong =
    adapted.sessionType === 'LONG_RUN' ||
    adapted.primaryAdaptation === 'long_run_tolerance' ||
    adapted.primaryAdaptation === 'aerobic_durability'

  const scale = args.volumeScale
  let appliedScale = 1
  if (
    scale != null &&
    scale < 0.98 &&
    !isRace &&
    (isLong ||
      adapted.difficulty === 'easy' ||
      adapted.sessionType === 'EASY_RUN' ||
      adapted.sessionType === 'RECOVERY_RUN')
  ) {
    appliedScale = scale
  }

  // Scale the real blocks first — never invent km from duration/5.5.
  if (structure && Math.abs(appliedScale - 1) >= 0.02) {
    structure = scaleStructureVolume(structure, appliedScale)
  }

  if (isLong && args.longRunTargetKm != null && args.longRunTargetKm > 0) {
    if (structure) {
      const estDist = estimateStructureDistanceKm(
        structure,
        args.preferences,
        adapted.sport,
      )
      if (estDist != null && estDist > 0) {
        const factor = args.longRunTargetKm / estDist
        if (Math.abs(factor - 1) >= 0.04) {
          structure = scaleStructureVolume(structure, factor)
        }
      }
    } else if (distanceKm != null && distanceKm > 0) {
      const factor = args.longRunTargetKm / distanceKm
      distanceKm = args.longRunTargetKm
      durationMin = Math.max(20, Math.round(durationMin * factor))
    } else {
      distanceKm = args.longRunTargetKm
      durationMin = Math.max(
        durationMin,
        Math.round(args.longRunTargetKm * 5.2),
      )
    }
  } else if (isLong && args.longRunMinMinutes != null && args.longRunMinMinutes > 0) {
    if (structure) {
      const est = estimateStructureDurationMinutes(
        structure,
        args.preferences,
        adapted.sport,
      )
      if (est > 0 && est < args.longRunMinMinutes) {
        structure = scaleStructureVolume(
          structure,
          args.longRunMinMinutes / est,
        )
      }
    } else {
      durationMin = Math.max(durationMin, args.longRunMinMinutes)
      if (distanceKm == null || distanceKm <= 0) {
        distanceKm = Math.round((durationMin / 5.5) * 10) / 10
      }
    }
  }

  if (structure) {
    const synced = syncCopyFromStructure({
      structure,
      sport: adapted.sport,
      title,
      fallbackDescription: description,
      // Keep description aligned with full scaled structure (distance + blocks).
      includeAllBlocks: true,
    })
    structure = synced.structure
    title = synced.title
    description = synced.description
    if (structure) {
      const estDur = estimateStructureDurationMinutes(
        structure,
        args.preferences,
        adapted.sport,
      )
      const estDist = estimateStructureDistanceKm(
        structure,
        args.preferences,
        adapted.sport,
      )
      if (estDur > 0) durationMin = estDur
      if (estDist != null && estDist > 0) distanceKm = estDist
    }
  } else if (Math.abs(appliedScale - 1) >= 0.02) {
    durationMin = Math.max(20, Math.round(durationMin * appliedScale))
    if (distanceKm != null && distanceKm > 0) {
      distanceKm = Math.round(distanceKm * appliedScale * 10) / 10
    }
  }

  return {
    weekIndex: args.weekIndex,
    dayOfWeek: args.dayOfWeek,
    type: adapted.sport,
    sessionType: adapted.sessionType,
    title,
    description,
    plannedDistance: distanceKm,
    plannedDuration: durationMin > 0 ? durationMin : null,
    coachNotes: reconcileCoachNotesWithSession({
      title,
      description,
      sessionType: adapted.sessionType,
      coachNotes:
        structure?.coachNotes ||
        args.proposal.reason ||
        args.reason ||
        null,
      structure,
    }),
    tags: adapted.tags,
    candidateId: adapted.id,
    primaryAdaptation: adapted.primaryAdaptation,
    estimatedTss: estimateCandidateTss({
      ...adapted,
      durationMin,
      distanceKm,
    }),
    structure,
    swimStructure: adapted.swimStructure ?? null,
  }
}

function loadTooHigh(
  candidate: CandidateWorkout,
  capacity: CapacityProfile,
): boolean {
  if (
    LOAD_RANK[candidate.mechanicalLoad] >= 3 &&
    capacity.remainingCapacity.mechanical < 15
  ) {
    return true
  }
  if (
    LOAD_RANK[candidate.cardiovascularLoad] >= 3 &&
    capacity.remainingCapacity.overall < 12
  ) {
    return true
  }
  return false
}

/** Validate a single adapted workout against hard constraints. */
export function validateWorkoutProposal(args: {
  proposal: WorkoutProposal
  slotAvailableMinutes: number
  capacity: CapacityProfile
  hardSlot: boolean
}): ValidationResult {
  const errors: ValidationError[] = []
  const base = getWorkoutById(args.proposal.selectedWorkoutId)
  if (!base) {
    return {
      valid: false,
      errors: [
        {
          type: 'UNKNOWN_WORKOUT',
          message: `Workout ${args.proposal.selectedWorkoutId} is not in the library.`,
        },
      ],
    }
  }

  const adapted = applyAdaptations(base, args.proposal.adaptations)

  // Structure-derived duration may exceed slot minutes — allow generous slack
  // rather than rejecting valid threshold sessions into a broken fallback.
  if (adapted.durationMin > args.slotAvailableMinutes + 45) {
    errors.push({
      type: 'DURATION',
      message: `Duration ${adapted.durationMin}min exceeds available ${args.slotAvailableMinutes}min.`,
    })
  }

  if (adapted.durationMin < 0 || adapted.durationMin > 240) {
    errors.push({
      type: 'DURATION_BOUNDS',
      message: `Duration ${adapted.durationMin}min is out of bounds.`,
    })
  }

  if (
    adapted.intervalCount != null &&
    (adapted.intervalCount < 1 || adapted.intervalCount > 30)
  ) {
    errors.push({
      type: 'INTERVAL_COUNT',
      message: `Interval count ${adapted.intervalCount} is out of bounds.`,
    })
  }

  if (loadTooHigh(adapted, args.capacity)) {
    errors.push({
      type: 'MECHANICAL_LOAD',
      message: 'Selected workout exceeds current mechanical/cardio capacity.',
    })
  }

  if (
    !args.hardSlot &&
    adapted.difficulty === 'hard' &&
    base.difficulty !== 'hard'
  ) {
    errors.push({
      type: 'HARD_SESSION',
      message: 'Easy/recovery slot cannot be escalated to a hard session.',
    })
  }

  return errors.length ? { valid: false, errors } : { valid: true }
}

function isThresholdLike(session: PlannedSession): boolean {
  // Longs may carry threshold tags (e.g. MP finish) but are not a threshold *day*
  // for weekly MAX_THRESHOLD — that cap is for quality sessions only.
  if (
    session.sessionType === 'LONG_RUN' ||
    session.sessionType === 'EASY_RUN' ||
    session.sessionType === 'RECOVERY_RUN' ||
    session.tags.includes('race-day')
  ) {
    return false
  }
  return (
    session.sessionType === 'THRESHOLD' ||
    session.sessionType === 'TEMPO' ||
    session.primaryAdaptation === 'threshold' ||
    session.tags.some((t) => /threshold|norwegian/i.test(t))
  )
}

/** Minimum long-run duration (minutes) outside race/taper weeks. */
export function longRunMinMinutesForArchitecture(
  architectureId: CapacityProfile['architectureId'] | null | undefined,
): number {
  if (architectureId === 'hyrox') return 30
  if (architectureId === 'multi_sport') return 35
  return 45
}

export function isLongRunSession(session: PlannedSession): boolean {
  return (
    session.sessionType === 'LONG_RUN' ||
    session.primaryAdaptation === 'long_run_tolerance'
  )
}

/** Validate a full week of planned sessions against weekly caps. */
export function validateWeeklyPlan(args: {
  sessions: PlannedSession[]
  capacity: CapacityProfile
  architecture: WeeklyArchitecture
  /** When set, use progressive envelope ceilings for this week. */
  weekIndex?: number
}): ValidationResult {
  const errors: ValidationError[] = []
  const active = args.sessions.filter((s) => s.type !== 'REST')
  // Availability is day-based: race-day is a goal event (not a training-day
  // budget item), and Norwegian AM+PM doubles share one training day.
  const trainingDays = new Set(
    active
      .filter((s) => !s.tags.includes('race-day'))
      .map((s) => s.dayOfWeek),
  ).size
  if (trainingDays > args.capacity.maxSessionsPerWeek) {
    errors.push({
      type: 'MAX_SESSIONS',
      message: `Week has ${trainingDays} training days; max is ${args.capacity.maxSessionsPerWeek}.`,
    })
  }

  // Count hard DAYS from materialized sessions (AM+PM = one day).
  // Architecture intent alone must not fail a week after sessions were repaired.
  const hardDays = new Set(
    active
      .filter((s) => {
        if (s.tags.includes('race-day')) return false
        if (s.sessionType === 'LONG_RUN' || s.sessionType === 'EASY_RUN') {
          return false
        }
        return (
          Boolean(s.isKeySession) ||
          s.sessionType === 'THRESHOLD' ||
          s.sessionType === 'TEMPO' ||
          s.sessionType === 'VO2_MAX' ||
          s.sessionType === 'INTERVALS' ||
          s.sessionType === 'RACE_PACE' ||
          s.sessionType === 'FARTLEK' ||
          s.tags.some((t) =>
            /threshold|vo2|hm-specific|quality|norwegian|fartlek/i.test(t),
          )
        )
      })
      .map((s) => s.dayOfWeek),
  )
  if (hardDays.size > args.capacity.maxHardSessionsPerWeek) {
    errors.push({
      type: 'MAX_HARD',
      message: `Week has ${hardDays.size} hard days; max is ${args.capacity.maxHardSessionsPerWeek}.`,
    })
  }

  const thresholdish = active.filter(isThresholdLike)
  const thresholdDays = new Set(thresholdish.map((s) => s.dayOfWeek))
  // Double-threshold AM+PM share a day and count as one threshold dose.
  const maxThresholdDays = active.some((s) =>
    s.tags.some((t) => /double-threshold/i.test(t)),
  )
    ? Math.max(2, args.capacity.maxHardSessionsPerWeek)
    : 2
  if (thresholdDays.size > maxThresholdDays) {
    errors.push({
      type: 'MAX_THRESHOLD',
      message: `Week has ${thresholdDays.size} threshold days; max is ${maxThresholdDays}.`,
    })
  }

  const long = active.find(
    (s) =>
      s.sessionType === 'LONG_RUN' ||
      s.primaryAdaptation === 'long_run_tolerance',
  )
  const longMinMinutes = longRunMinMinutesForArchitecture(
    args.capacity.architectureId,
  )
  if (
    long &&
    (long.plannedDuration ?? 0) > 0 &&
    (long.plannedDuration ?? 0) < longMinMinutes
  ) {
    const isRaceWeek =
      args.architecture.phase.isTaper ||
      args.architecture.phase.phase === 'RACE'
    if (!isRaceWeek) {
      errors.push({
        type: 'LONG_RUN_MIN',
        message: `Long run ${long.plannedDuration}min is below the ${longMinMinutes}min minimum outside race/taper weeks.`,
      })
    }
  }

  for (const s of active) {
    const notes = s.coachNotes?.toLowerCase() ?? ''
    const title = s.title.toLowerCase()
    const structureHasMp = /marathon\s*pace|\bmp\b/.test(
      JSON.stringify(s.structure ?? {}).toLowerCase(),
    )
    if (
      (s.sessionType === 'LONG_RUN' || s.sessionType === 'EASY_RUN') &&
      /\beasy\b/.test(title) &&
      /marathon\s*pace/.test(notes) &&
      !structureHasMp
    ) {
      errors.push({
        type: 'METADATA_CONTRADICTION',
        message: `Workout metadata contradicts coach notes for "${s.title}".`,
      })
    }
  }

  // Race-day load is additive and expected — caps apply to training only.
  const training = active.filter((s) => !s.tags.includes('race-day'))
  const weeklyTss = training.reduce((sum, s) => sum + s.estimatedTss, 0)
  const weeklyKm = training.reduce((sum, s) => sum + (s.plannedDistance ?? 0), 0)

  const weekIdx =
    args.weekIndex ??
    args.sessions.find((s) => s.weekIndex != null)?.weekIndex ??
    0
  const envelopeWeek = args.capacity.envelope?.weeks?.[weekIdx]
  // Progressive envelope > present flat caps. Small slack for estimation noise.
  const tssCap = envelopeWeek
    ? envelopeWeek.maxTss * 1.08
    : args.capacity.maxWeeklyTss * 1.15
  const kmCap = envelopeWeek
    ? envelopeWeek.maxKm * 1.1
    : args.capacity.maxWeeklyKm * 1.2

  if (weeklyTss > tssCap) {
    errors.push({
      type: 'WEEKLY_TSS',
      message: `Planned TSS ${Math.round(weeklyTss)} exceeds week ${weekIdx + 1} cap ${Math.round(tssCap)} (${envelopeWeek?.kind ?? 'present'}).`,
    })
  }

  // Small epsilon — floating totals often land exactly on the rounded cap.
  if (weeklyKm > kmCap + 0.25) {
    errors.push({
      type: 'WEEKLY_KM',
      message: `Planned ${Math.round(weeklyKm * 10) / 10} km exceeds week ${weekIdx + 1} cap ${Math.round(kmCap * 10) / 10} km (${envelopeWeek?.kind ?? 'present'}).`,
    })
  }

  return errors.length ? { valid: false, errors } : { valid: true }
}
