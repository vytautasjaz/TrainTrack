import type { WorkoutStatus, WorkoutType, SessionType } from '@prisma/client'
import { toDateKey } from '@/lib/dates'

export type WorkoutCompletionSource = 'strava' | 'manual' | 'self_logged'

export type WorkoutHistoryItem = {
  id: string
  title: string
  dateKey: string
  type: WorkoutType
  sessionType: SessionType
  status: WorkoutStatus
  selfLogged: boolean
  plannedDistance: number | null
  plannedDuration: number | null
  result: {
    actualDistance: number | null
    actualDuration: number | null
    rpe: number | null
    athleteNotes: string | null
    coachReply: string | null
    coachReplyReadAt: string | null
    stravaActivityUrl: string | null
    completedAt: Date
  }
}

export function getWorkoutCompletionSource(workout: {
  selfLogged: boolean
  result: { stravaActivityUrl: string | null } | null
}): WorkoutCompletionSource {
  if (workout.result?.stravaActivityUrl) return 'strava'
  if (workout.selfLogged) return 'self_logged'
  return 'manual'
}

export const COMPLETION_SOURCE_LABELS: Record<WorkoutCompletionSource, string> = {
  strava: 'Strava',
  manual: 'Logged',
  self_logged: 'Self-added',
}

export function groupHistoryByDateKey(
  workouts: WorkoutHistoryItem[],
): Map<string, WorkoutHistoryItem[]> {
  const map = new Map<string, WorkoutHistoryItem[]>()
  for (const workout of workouts) {
    const list = map.get(workout.dateKey) ?? []
    list.push(workout)
    map.set(workout.dateKey, list)
  }
  return map
}

export function toPlanWorkoutDetailFromHistory(item: WorkoutHistoryItem) {
  return {
    id: item.id,
    title: item.title,
    dateKey: item.dateKey,
    type: item.type,
    sessionType: item.sessionType,
    status: item.status,
    description: null,
    plannedDistance: item.plannedDistance,
    plannedDuration: item.plannedDuration,
    coachNotes: null,
    structure: null,
    selfLogged: item.selfLogged,
    result: {
      actualDistance: item.result.actualDistance,
      actualDuration: item.result.actualDuration,
      rpe: item.result.rpe,
      athleteNotes: item.result.athleteNotes,
      coachReply: item.result.coachReply,
      coachReplyReadAt: item.result.coachReplyReadAt,
      stravaActivityUrl: item.result.stravaActivityUrl,
    },
  }
}

export function toWorkoutHistoryItem(w: {
  id: string
  title: string
  date: Date
  type: WorkoutType
  sessionType: SessionType
  status: WorkoutStatus
  selfLogged: boolean
  plannedDistance: number | null
  plannedDuration: number | null
  result: {
    actualDistance: number | null
    actualDuration: number | null
    rpe: number | null
    athleteNotes: string | null
    coachReply: string | null
    coachReplyReadAt?: Date | null
    stravaActivityUrl: string | null
    completedAt: Date
  } | null
}): WorkoutHistoryItem | null {
  if (!w.result) return null

  return {
    id: w.id,
    title: w.title,
    dateKey: toDateKey(w.date),
    type: w.type,
    sessionType: w.sessionType,
    status: w.status,
    selfLogged: w.selfLogged,
    plannedDistance: w.plannedDistance,
    plannedDuration: w.plannedDuration,
    result: {
      actualDistance: w.result.actualDistance,
      actualDuration: w.result.actualDuration,
      rpe: w.result.rpe,
      athleteNotes: w.result.athleteNotes,
      coachReply: w.result.coachReply ?? null,
      coachReplyReadAt: w.result.coachReplyReadAt?.toISOString() ?? null,
      stravaActivityUrl: w.result.stravaActivityUrl,
      completedAt: w.result.completedAt,
    },
  }
}
