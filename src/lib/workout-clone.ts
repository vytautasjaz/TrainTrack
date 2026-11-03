import type { Prisma, Workout } from '@prisma/client'
import { structureDiagramPrismaValue } from '@/lib/workout-builder/structure-diagram'

/** Fields copied when cloning a planned workout onto another athlete/date. */
export type CloneableWorkout = Pick<
  Workout,
  | 'templateId'
  | 'type'
  | 'sessionType'
  | 'title'
  | 'description'
  | 'plannedDistance'
  | 'plannedDuration'
  | 'plannedDistanceMeters'
  | 'plannedDistanceSource'
  | 'plannedDurationSource'
  | 'plannedDistanceMetersSource'
  | 'swimEnvironment'
  | 'swimStructure'
  | 'coachNotes'
  | 'coachNotesPrivate'
  | 'structure'
  | 'tags'
>

export function workoutCloneCreateData(
  source: CloneableWorkout,
  args: {
    athleteId: string
    date: Date
    sortOrder: number
  },
): Prisma.WorkoutUncheckedCreateInput {
  return {
    athleteId: args.athleteId,
    templateId: source.templateId,
    date: args.date,
    sortOrder: args.sortOrder,
    type: source.type,
    sessionType: source.sessionType,
    title: source.title,
    description: source.description,
    plannedDistance: source.plannedDistance,
    plannedDuration: source.plannedDuration,
    plannedDistanceMeters: source.plannedDistanceMeters,
    plannedDistanceSource: source.plannedDistanceSource,
    plannedDurationSource: source.plannedDurationSource,
    plannedDistanceMetersSource: source.plannedDistanceMetersSource,
    swimEnvironment: source.swimEnvironment,
    swimStructure: source.swimStructure ?? undefined,
    coachNotes: source.coachNotes,
    coachNotesPrivate: source.coachNotesPrivate,
    structure: source.structure ?? undefined,
    structureDiagram: structureDiagramPrismaValue(source.structure, {
      durationMinutes: source.plannedDuration,
    }),
    tags: source.tags,
  }
}

export const WORKOUT_CLONE_SELECT = {
  id: true,
  athleteId: true,
  date: true,
  type: true,
  templateId: true,
  sessionType: true,
  title: true,
  description: true,
  plannedDistance: true,
  plannedDuration: true,
  plannedDistanceMeters: true,
  plannedDistanceSource: true,
  plannedDurationSource: true,
  plannedDistanceMetersSource: true,
  swimEnvironment: true,
  swimStructure: true,
  coachNotes: true,
  coachNotesPrivate: true,
  structure: true,
  tags: true,
  isRescheduleGhost: true,
} as const

export function isCloneablePlanWorkout(w: {
  type: Workout['type']
  isRescheduleGhost?: boolean | null
}): boolean {
  if (w.isRescheduleGhost) return false
  if (w.type === 'REST' || w.type === 'RECOVERY') return false
  return true
}
