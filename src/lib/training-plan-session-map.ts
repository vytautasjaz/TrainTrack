import {
  SessionType,
  SwimEnvironment,
  WorkoutStatus,
  type PlannedMetricSource,
} from '@prisma/client'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import type { TrainingPlanSessionDetail } from '@/lib/training-plan'
import { planSlotKey } from '@/lib/training-plan'
import { parseStructure } from '@/lib/workout-builder/utils'
import { parseSwimStructure } from '@/lib/swim-workout/parse'

/** Map a library plan session into PlanWorkoutDetail for SharedWorkoutEditor / cards. */
export function planSessionToPlanWorkoutDetail(
  session: TrainingPlanSessionDetail,
): PlanWorkoutDetail {
  const dateKey = planSlotKey(session.weekIndex, session.dayOfWeek)
  let structure = null
  if (session.structure) {
    try {
      structure = parseStructure(session.structure)
    } catch {
      structure = null
    }
  }
  let swimStructure = null
  if (session.swimStructure) {
    try {
      swimStructure = parseSwimStructure(session.swimStructure)
    } catch {
      swimStructure = null
    }
  }

  return {
    id: session.id,
    title: session.title,
    dateKey,
    type: session.type,
    sessionType: (session.sessionType as SessionType) || SessionType.CUSTOM,
    status: WorkoutStatus.PLANNED,
    description: session.description,
    plannedDistance: session.plannedDistance,
    plannedDistanceMeters: session.plannedDistanceMeters,
    plannedDuration: session.plannedDuration,
    plannedDistanceSource:
      (session.plannedDistanceSource as PlannedMetricSource | null) ?? null,
    plannedDurationSource:
      (session.plannedDurationSource as PlannedMetricSource | null) ?? null,
    plannedDistanceMetersSource:
      (session.plannedDistanceMetersSource as PlannedMetricSource | null) ??
      null,
    swimEnvironment:
      (session.swimEnvironment as SwimEnvironment | null) ?? null,
    coachNotes: session.coachNotes,
    coachNotesPrivate: session.coachNotesPrivate,
    structure,
    swimStructure,
    tags: session.tags,
    result: null,
  }
}
