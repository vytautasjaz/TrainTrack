import { RaceType, SessionType, WorkoutStatus, WorkoutType } from '@prisma/client'
import { toDateKey } from '@/lib/dates'
import type { WorkoutStructure } from '@/lib/workout-builder/types'
import { formatBlockSummary, parseStructure } from '@/lib/workout-builder/utils'

export type PlanWorkoutDetail = {
  id: string
  title: string
  dateKey: string
  type: WorkoutType
  sessionType: SessionType
  status: WorkoutStatus
  description: string | null
  plannedDistance: number | null
  plannedDuration: number | null
  coachNotes: string | null
  structure: WorkoutStructure | null
  selfLogged?: boolean
  isRace?: boolean
  raceId?: string
  raceType?: RaceType
  raceGoal?: string | null
  raceLocation?: string | null
  result: {
    actualDistance: number | null
    actualDuration: number | null
    rpe: number | null
    athleteNotes: string | null
    coachReply: string | null
    coachReplyReadAt: string | null
    stravaActivityUrl: string | null
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
  coachNotes: string | null
  structure?: unknown
  selfLogged?: boolean
  result: {
    actualDistance: number | null
    actualDuration: number | null
    rpe: number | null
    athleteNotes: string | null
    coachReply: string | null
    coachReplyReadAt?: Date | null
    stravaActivityUrl: string | null
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
    plannedDuration: w.plannedDuration,
    coachNotes: w.coachNotes,
    structure: w.structure ? parseStructure(w.structure) : null,
    selfLogged: w.selfLogged ?? false,
    result: w.result
      ? {
          actualDistance: w.result.actualDistance,
          actualDuration: w.result.actualDuration,
          rpe: w.result.rpe,
          athleteNotes: w.result.athleteNotes,
          coachReply: w.result.coachReply ?? null,
          coachReplyReadAt: w.result.coachReplyReadAt?.toISOString() ?? null,
          stravaActivityUrl: w.result.stravaActivityUrl ?? null,
        }
      : null,
  }
}

/** Each block / paragraph shown on its own line in plan week/month views. */
export function getWorkoutPlanDescriptionLines(w: PlanWorkoutDetail): string[] {
  if (w.description?.trim()) {
    return w.description.trim().split('\n').map((l) => l.trim()).filter(Boolean)
  }

  if (w.structure) {
    const lines: string[] = []
    for (const block of w.structure.warmup) {
      lines.push(`WU ${formatBlockSummary(block)}`)
    }
    for (const block of w.structure.mainSet) {
      lines.push(formatBlockSummary(block))
    }
    for (const block of w.structure.cooldown) {
      lines.push(`CD ${formatBlockSummary(block)}`)
    }
    if (lines.length > 0) return lines
  }

  if (w.coachNotes?.trim()) {
    return w.coachNotes.trim().split('\n').map((l) => l.trim()).filter(Boolean)
  }

  return []
}

export function isStravaSynced(workout: PlanWorkoutDetail): boolean {
  return Boolean(workout.result?.stravaActivityUrl)
}
