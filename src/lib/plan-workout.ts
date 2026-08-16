import { AthleteLogTypeValues } from '@/lib/athlete-log-type'
import {
  SessionType,
  WorkoutStatus,
  WorkoutType,
  type AthleteLogType,
  type RacePriority,
  type RaceType,
  type RaceOutcome,
  type SwimEnvironment,
} from '@prisma/client'
import type { RaceDistancesBySport } from '@/lib/race-distance-stats'
import { toDateKey } from '@/lib/dates'
import type { WorkoutStructure } from '@/lib/workout-builder/types'
import { formatPlanBlockSummary } from '@/lib/workout-builder/segment-estimation'
import { parseStructure } from '@/lib/workout-builder/utils'
import type { SwimWorkoutStructure } from '@/lib/swim-workout/types'
import { parseSwimStructure } from '@/lib/swim-workout/parse'
import { formatSwimStructureLines, formatSwimSetSummary } from '@/lib/swim-workout/format'

export type PlanWorkoutDetail = {
  id: string
  title: string
  dateKey: string
  type: WorkoutType
  sessionType: SessionType
  status: WorkoutStatus
  description: string | null
  plannedDistance: number | null
  plannedDistanceMeters: number | null
  plannedDuration: number | null
  plannedDistanceSource?: import('@prisma/client').PlannedMetricSource | null
  plannedDurationSource?: import('@prisma/client').PlannedMetricSource | null
  plannedDistanceMetersSource?: import('@prisma/client').PlannedMetricSource | null
  swimEnvironment: SwimEnvironment | null
  coachNotes: string | null
  coachNotesPrivate?: boolean
  structure: WorkoutStructure | null
  swimStructure: SwimWorkoutStructure | null
  tags?: string[]
  selfLogged?: boolean
  rescheduledFromDateKey?: string | null
  /** Ghost placeholder left on the original planned day. */
  isRescheduleGhost?: boolean
  /** Active copy’s date when this row is a ghost. */
  rescheduledToDateKey?: string | null
  /** Active workout id when this row is a ghost. */
  rescheduledCopyId?: string | null
  isRace?: boolean
  raceId?: string
  raceType?: RaceType
  racePriority?: RacePriority
  raceOutcome?: RaceOutcome | null
  raceGoal?: string | null
  raceLocation?: string | null
  /** Planned/actual km attributed to RUN/BIKE/SWIM (triathlon splits). */
  raceDistanceBySport?: RaceDistancesBySport
  result: {
    actualDistance: number | null
    actualDuration: number | null
    rpe: number | null
    athleteNotes: string | null
    athleteNotesPrivate?: boolean
    coachReply: string | null
    coachReplyReadAt: string | null
    stravaActivityUrl: string | null
    stravaActivityName?: string | null
    stravaActivityDescription?: string | null
    logType: AthleteLogType | null
  } | null
}

export function toPlanWorkoutDetail(w: {
  id: string
  title: string
  date: Date
  type: WorkoutType
  sessionType?: SessionType
  status: WorkoutStatus
  description: string | null
  plannedDistance: number | null
  plannedDuration: number | null
  plannedDistanceSource?: import('@prisma/client').PlannedMetricSource | null
  plannedDurationSource?: import('@prisma/client').PlannedMetricSource | null
  plannedDistanceMetersSource?: import('@prisma/client').PlannedMetricSource | null
  coachNotes: string | null
  coachNotesPrivate?: boolean
  structure?: unknown
  swimEnvironment?: SwimEnvironment | null
  swimStructure?: unknown
  plannedDistanceMeters?: number | null
  tags?: string[]
  selfLogged?: boolean
  rescheduledFromDate?: Date | null
  isRescheduleGhost?: boolean
  rescheduledCopy?: { id: string; date: Date } | null
  result: {
    actualDistance: number | null
    actualDuration: number | null
    rpe: number | null
    athleteNotes: string | null
    athleteNotesPrivate?: boolean
    coachReply: string | null
    coachReplyReadAt?: Date | null
    stravaActivityUrl: string | null
    stravaActivityName?: string | null
    stravaActivityDescription?: string | null
    logType?: AthleteLogType | null
  } | null
}): PlanWorkoutDetail {
  return {
    id: w.id,
    title: w.title,
    dateKey: toDateKey(w.date),
    type: w.type,
    sessionType: w.sessionType ?? SessionType.CUSTOM,
    status: w.status,
    description: w.description,
    plannedDistance: w.plannedDistance,
    plannedDistanceMeters: w.plannedDistanceMeters ?? null,
    plannedDuration: w.plannedDuration,
    plannedDistanceSource: w.plannedDistanceSource ?? null,
    plannedDurationSource: w.plannedDurationSource ?? null,
    plannedDistanceMetersSource: w.plannedDistanceMetersSource ?? null,
    swimEnvironment: w.swimEnvironment ?? null,
    coachNotes: w.coachNotes,
    coachNotesPrivate: w.coachNotesPrivate ?? false,
    structure: w.structure ? parseStructure(w.structure) : null,
    swimStructure: w.swimStructure ? parseSwimStructure(w.swimStructure) : null,
    tags: w.tags ?? [],
    selfLogged: w.selfLogged ?? false,
    rescheduledFromDateKey: w.rescheduledFromDate ? toDateKey(w.rescheduledFromDate) : null,
    isRescheduleGhost: Boolean(w.isRescheduleGhost),
    rescheduledToDateKey:
      w.isRescheduleGhost && w.rescheduledCopy
        ? toDateKey(w.rescheduledCopy.date)
        : null,
    rescheduledCopyId:
      w.isRescheduleGhost && w.rescheduledCopy ? w.rescheduledCopy.id : null,
    result: w.result
      ? {
          actualDistance: w.result.actualDistance,
          actualDuration: w.result.actualDuration,
          rpe: w.result.rpe,
          athleteNotes: w.result.athleteNotes,
          athleteNotesPrivate: w.result.athleteNotesPrivate ?? false,
          coachReply: w.result.coachReply ?? null,
          coachReplyReadAt: w.result.coachReplyReadAt?.toISOString() ?? null,
          stravaActivityUrl: w.result.stravaActivityUrl ?? null,
          stravaActivityName: w.result.stravaActivityName ?? null,
          stravaActivityDescription: w.result.stravaActivityDescription ?? null,
          logType: w.result.logType ?? null,
        }
      : null,
  }
}

/** Strip private notes so the other party never receives them in client props. */
export function redactPlanWorkoutNotesForViewer(
  workout: PlanWorkoutDetail,
  viewer: 'coach' | 'athlete',
): PlanWorkoutDetail {
  if (viewer === 'athlete') {
    if (!workout.coachNotesPrivate) return workout
    return {
      ...workout,
      coachNotes: null,
      coachNotesPrivate: false,
    }
  }

  if (!workout.result?.athleteNotesPrivate) return workout
  return {
    ...workout,
    result: {
      ...workout.result,
      athleteNotes: null,
      athleteNotesPrivate: false,
    },
  }
}

/** One-line summaries for each block in a structured workout (plan + athlete views). */
export function getStructureDescriptionLines(structure: WorkoutStructure): string[] {
  const lines: string[] = []
  for (const block of structure.warmup) {
    lines.push(`WU ${formatPlanBlockSummary(block)}`)
  }
  for (const block of structure.mainSet) {
    lines.push(formatPlanBlockSummary(block))
  }
  for (const block of structure.cooldown) {
    lines.push(`CD ${formatPlanBlockSummary(block)}`)
  }
  return lines
}

/** Each block / paragraph shown on its own line in plan week/month views. */
export function getWorkoutPlanDescriptionLines(w: PlanWorkoutDetail): string[] {
  if (w.description?.trim()) {
    return w.description.trim().split('\n').map((l) => l.trim()).filter(Boolean)
  }

  if (w.swimStructure) {
    const swimLines = formatSwimStructureLines(w.swimStructure)
    if (swimLines.length > 0) return swimLines
  }

  if (w.structure) {
    const lines = getStructureDescriptionLines(w.structure)
    if (lines.length > 0) return lines
  }

  if (w.coachNotes?.trim()) {
    return w.coachNotes.trim().split('\n').map((l) => l.trim()).filter(Boolean)
  }

  return []
}

export type WorkoutPlanDescriptionEntry =
  | { kind: 'section'; text: string }
  | { kind: 'line'; text: string; prefix?: 'WU' | 'CD' }

/** Structured description entries for plan cards (bold section titles, WU/CD prefixes). */
export function getWorkoutPlanDescriptionEntries(
  w: PlanWorkoutDetail,
): WorkoutPlanDescriptionEntry[] {
  if (w.description?.trim()) {
    return w.description
      .trim()
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((text) => ({ kind: 'line' as const, text }))
  }

  if (w.swimStructure?.sections.length) {
    const entries: WorkoutPlanDescriptionEntry[] = []
    for (const section of [...w.swimStructure.sections].sort((a, b) => a.order - b.order)) {
      const setLines = section.sets
        .map((set) => formatSwimSetSummary(set))
        .filter(Boolean)
      if (setLines.length === 0) continue

      const titleLower = section.title.toLowerCase()
      const isWarm = titleLower.includes('warm')
      const isCool = titleLower.includes('cool')
      if (!isWarm && !isCool && section.title.trim()) {
        entries.push({ kind: 'section', text: section.title.trim() })
      }

      for (const line of setLines) {
        if (isWarm) entries.push({ kind: 'line', text: line, prefix: 'WU' })
        else if (isCool) entries.push({ kind: 'line', text: line, prefix: 'CD' })
        else entries.push({ kind: 'line', text: line })
      }
    }
    if (entries.length > 0) return entries
  }

  if (w.structure) {
    const lines = getStructureDescriptionLines(w.structure)
    if (lines.length > 0) {
      return lines.map((text) => {
        if (text.startsWith('WU ')) {
          return { kind: 'line' as const, text: text.slice(3), prefix: 'WU' as const }
        }
        if (text.startsWith('CD ')) {
          return { kind: 'line' as const, text: text.slice(3), prefix: 'CD' as const }
        }
        return { kind: 'line' as const, text }
      })
    }
  }

  if (w.coachNotes?.trim()) {
    return w.coachNotes
      .trim()
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((text) => ({ kind: 'line' as const, text }))
  }

  return []
}

export function isStravaSynced(workout: PlanWorkoutDetail): boolean {
  return Boolean(workout.result?.stravaActivityUrl)
}

/** Plan DnD: completed (and race/ghost/rest) workouts stay fixed on their day. */
export function canDragPlanWorkout(
  workout: Pick<
    PlanWorkoutDetail,
    'isRace' | 'isRescheduleGhost' | 'type' | 'status'
  >,
  /** Optimistic UI status when the card has one. */
  status?: WorkoutStatus,
): boolean {
  const resolved = status ?? workout.status
  if (resolved === WorkoutStatus.COMPLETED) return false
  if (workout.isRace) return false
  if (workout.isRescheduleGhost) return false
  if (workout.type === WorkoutType.REST || workout.type === WorkoutType.RECOVERY) {
    return false
  }
  return true
}

export function athleteHasQuickLogActions(
  workout: PlanWorkoutDetail,
  isCoach: boolean,
): boolean {
  if (isCoach) return false
  if (workout.isRace) return false
  if (workout.isRescheduleGhost) return false
  if (workout.type === WorkoutType.RECOVERY || workout.type === WorkoutType.REST) return false
  if (isStravaSynced(workout)) return false
  return true
}

export function isRescheduledWorkout(workout: PlanWorkoutDetail): boolean {
  return Boolean(
    !workout.isRescheduleGhost &&
      workout.rescheduledFromDateKey &&
      workout.rescheduledFromDateKey !== workout.dateKey,
  )
}

export function resolveAthleteLogType(workout: PlanWorkoutDetail): AthleteLogType | null {
  if (
    workout.rescheduledFromDateKey &&
    workout.rescheduledFromDateKey !== workout.dateKey &&
    workout.status === WorkoutStatus.PLANNED
  ) {
    return AthleteLogTypeValues.ADJUSTED
  }
  if (workout.result?.logType === AthleteLogTypeValues.RESCHEDULED) {
    return AthleteLogTypeValues.ADJUSTED
  }
  if (
    workout.status === WorkoutStatus.PLANNED &&
    workout.result?.logType === AthleteLogTypeValues.ADJUSTED
  ) {
    return AthleteLogTypeValues.ADJUSTED
  }
  if (workout.status === WorkoutStatus.SKIPPED) return AthleteLogTypeValues.SKIPPED
  if (workout.status === WorkoutStatus.COMPLETED) {
    return workout.result?.logType ?? AthleteLogTypeValues.COMPLETED
  }
  return null
}

export function athleteLogTypeLabel(logType: AthleteLogType | null): string {
  if (logType === AthleteLogTypeValues.ADJUSTED) return 'Adjusted'
  if (logType === AthleteLogTypeValues.SKIPPED) return 'Skipped'
  if (logType === AthleteLogTypeValues.RESCHEDULED) return 'Adjusted'
  if (logType === AthleteLogTypeValues.COMPLETED) return 'Completed'
  return 'Logged'
}
