'use server'

import { WorkoutStatus, WorkoutType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  addDateOnlyDays,
  endOfWeekDateOnly,
  parseDateOnly,
  startOfWeekDateOnly,
  toDateKey,
} from '@/lib/dates'
import {
  getPlanWorkoutsInRange,
  getRacesForRange,
  groupWorkoutsByDate,
} from '@/lib/queries'
import {
  applyPlanWorkoutViewerPolicy,
  redactPlanWorkoutNotesForViewer,
  toPlanWorkoutDetail,
  type PlanWorkoutDetail,
} from '@/lib/plan-workout'
import { mergeRacesIntoByDate } from '@/lib/races'
import { buildPlanTableDays, type PlanDay } from '@/lib/plan-week'
import {
  isCoach,
  requireCoachOwnsAthlete,
  requireSession,
} from '@/lib/session'
import { listTrainingPlans } from '@/app/actions/training-plans'
import {
  copyWeekBetweenAthletes,
  copyWorkoutToAthleteDate,
} from '@/app/actions/workouts'
import { workoutCloneCreateData } from '@/lib/workout-clone'
import { getNextWorkoutSortOrder } from '@/lib/workout-sort'
import { onTrainingCalendarDataChanged } from '@/lib/calendar-invalidation'
import { revalidatePath } from 'next/cache'
import { structureDiagramPrismaValue } from '@/lib/workout-builder/structure-diagram'

export type CoachCompareAthletePane = {
  kind: 'athlete'
  athleteId: string
  athleteName: string
  weekStartKey: string
  days: PlanDay[]
}

export type CoachCompareLibraryPane = {
  kind: 'library'
  planId: string
  planTitle: string
  weekIndex: number
  weekCount: number
  weekStartKey: string
  days: PlanDay[]
}

export async function getCoachCompareAthleteWeek(payload: {
  athleteId: string
  weekStartKey: string
}): Promise<CoachCompareAthletePane> {
  const session = await requireSession()
  if (!isCoach(session)) throw new Error('Coach only')
  await requireCoachOwnsAthlete(session.userId, payload.athleteId)

  const athlete = await prisma.athlete.findUnique({
    where: { id: payload.athleteId },
    select: { id: true, name: true },
  })
  if (!athlete) throw new Error('Athlete not found')

  const weekStart = startOfWeekDateOnly(parseDateOnly(payload.weekStartKey))
  const weekEnd = endOfWeekDateOnly(weekStart)
  const [rawWorkouts, races] = await Promise.all([
    getPlanWorkoutsInRange(payload.athleteId, weekStart, weekEnd),
    getRacesForRange(payload.athleteId, weekStart, weekEnd),
  ])
  const byDateRaw = groupWorkoutsByDate(rawWorkouts)
  const byDateWorkouts = new Map(
    [...byDateRaw.entries()].map(([key, list]) => [
      key,
      list.map((w) =>
        applyPlanWorkoutViewerPolicy(
          redactPlanWorkoutNotesForViewer(toPlanWorkoutDetail(w), 'coach'),
          'coach',
        ),
      ),
    ]),
  )
  const byDate = mergeRacesIntoByDate(byDateWorkouts, races)
  const dates = Array.from({ length: 7 }, (_, i) => addDateOnlyDays(weekStart, i))
  const days = buildPlanTableDays(dates, byDate)

  return {
    kind: 'athlete',
    athleteId: athlete.id,
    athleteName: athlete.name,
    weekStartKey: toDateKey(weekStart),
    days,
  }
}

export async function listCoachComparePlans() {
  const session = await requireSession()
  if (!isCoach(session)) throw new Error('Coach only')
  const plans = await listTrainingPlans()
  return plans.map((p) => ({
    id: p.id,
    title: p.title,
    weekCount: p.weekCount,
  }))
}

/** Map library plan weekIndex onto a calendar week for display/drop targets. */
export async function getCoachCompareLibraryWeek(payload: {
  planId: string
  weekStartKey: string
  weekIndex: number
}): Promise<CoachCompareLibraryPane> {
  const session = await requireSession()
  if (!isCoach(session)) throw new Error('Coach only')

  const plan = await prisma.trainingPlan.findFirst({
    where: { id: payload.planId, coachId: session.userId },
    select: {
      id: true,
      title: true,
      weekCount: true,
      sessions: {
        where: { weekIndex: payload.weekIndex },
        orderBy: [{ dayOfWeek: 'asc' }, { sortOrder: 'asc' }],
        select: {
          id: true,
          weekIndex: true,
          dayOfWeek: true,
          sortOrder: true,
          type: true,
          sessionType: true,
          title: true,
          description: true,
          plannedDistance: true,
          plannedDuration: true,
          plannedDistanceMeters: true,
          swimEnvironment: true,
          swimStructure: true,
          structure: true,
          coachNotes: true,
          tags: true,
        },
      },
    },
  })
  if (!plan) throw new Error('Plan not found')

  const weekStart = startOfWeekDateOnly(parseDateOnly(payload.weekStartKey))
  const byDate = new Map<string, PlanWorkoutDetail[]>()
  for (const session of plan.sessions) {
    if (session.type === WorkoutType.REST || session.type === WorkoutType.RECOVERY) {
      continue
    }
    const date = addDateOnlyDays(weekStart, session.dayOfWeek)
    const dateKey = toDateKey(date)
    const detail: PlanWorkoutDetail = {
      id: `library:${session.id}`,
      dateKey,
      type: session.type,
      sessionType: session.sessionType,
      title: session.title,
      description: session.description,
      plannedDistance: session.plannedDistance,
      plannedDuration: session.plannedDuration,
      plannedDistanceMeters: session.plannedDistanceMeters,
      swimEnvironment: session.swimEnvironment,
      status: WorkoutStatus.PLANNED,
      sortOrder: session.sortOrder,
      tags: session.tags,
      coachNotes: session.coachNotes,
      structure: null,
      structureRaw: session.structure,
      swimStructure: null,
      isRace: false,
      selfLogged: false,
      result: null,
    }
    const list = byDate.get(dateKey) ?? []
    list.push(detail)
    byDate.set(dateKey, list)
  }
  const dates = Array.from({ length: 7 }, (_, i) => addDateOnlyDays(weekStart, i))
  const days = buildPlanTableDays(dates, byDate)

  return {
    kind: 'library',
    planId: plan.id,
    planTitle: plan.title,
    weekIndex: payload.weekIndex,
    weekCount: plan.weekCount,
    weekStartKey: toDateKey(weekStart),
    days,
  }
}

export async function compareCopyWorkout(payload: {
  workoutId: string
  targetAthleteId: string
  dateKey: string
}) {
  await copyWorkoutToAthleteDate(payload)
}

export async function compareCopyWeek(payload: {
  sourceAthleteId: string
  sourceWeekStartKey: string
  targetAthleteId: string
  targetWeekStartKey: string
}) {
  await copyWeekBetweenAthletes(payload)
}

export async function compareCopyLibrarySession(payload: {
  planSessionId: string
  targetAthleteId: string
  dateKey: string
}) {
  const session = await requireSession()
  if (!isCoach(session)) throw new Error('Coach only')
  await requireCoachOwnsAthlete(session.userId, payload.targetAthleteId)

  const planSession = await prisma.trainingPlanSession.findFirst({
    where: {
      id: payload.planSessionId,
      plan: { coachId: session.userId },
    },
  })
  if (!planSession) throw new Error('Session not found')
  if (
    planSession.type === WorkoutType.REST ||
    planSession.type === WorkoutType.RECOVERY
  ) {
    throw new Error('Cannot copy rest/recovery')
  }

  const date = parseDateOnly(payload.dateKey)
  const sortOrder = await getNextWorkoutSortOrder(payload.targetAthleteId, date)
  await prisma.workout.create({
    data: {
      ...workoutCloneCreateData(
        {
          templateId: null,
          type: planSession.type,
          sessionType: planSession.sessionType,
          title: planSession.title,
          description: planSession.description,
          plannedDistance: planSession.plannedDistance,
          plannedDuration: planSession.plannedDuration,
          plannedDistanceMeters: planSession.plannedDistanceMeters,
          plannedDistanceSource: planSession.plannedDistanceSource,
          plannedDurationSource: planSession.plannedDurationSource,
          plannedDistanceMetersSource: planSession.plannedDistanceMetersSource,
          swimEnvironment: planSession.swimEnvironment,
          swimStructure: planSession.swimStructure,
          coachNotes: planSession.coachNotes,
          coachNotesPrivate: planSession.coachNotesPrivate,
          structure: planSession.structure,
          tags: planSession.tags,
        },
        {
          athleteId: payload.targetAthleteId,
          date,
          sortOrder,
        },
      ),
      planId: planSession.planId,
      planSessionId: planSession.id,
      structureDiagram: structureDiagramPrismaValue(planSession.structure, {
        durationMinutes: planSession.plannedDuration,
      }),
    },
  })
  await onTrainingCalendarDataChanged(payload.targetAthleteId)
  revalidatePath('/training')
  revalidatePath('/dashboard')
}

export async function compareCopyLibraryWeek(payload: {
  planId: string
  weekIndex: number
  targetAthleteId: string
  targetWeekStartKey: string
}) {
  const session = await requireSession()
  if (!isCoach(session)) throw new Error('Coach only')
  await requireCoachOwnsAthlete(session.userId, payload.targetAthleteId)

  const plan = await prisma.trainingPlan.findFirst({
    where: { id: payload.planId, coachId: session.userId },
    select: {
      sessions: {
        where: { weekIndex: payload.weekIndex },
        orderBy: [{ dayOfWeek: 'asc' }, { sortOrder: 'asc' }],
      },
    },
  })
  if (!plan) throw new Error('Plan not found')

  const targetWeekStart = startOfWeekDateOnly(
    parseDateOnly(payload.targetWeekStartKey),
  )

  for (const planSession of plan.sessions) {
    if (
      planSession.type === WorkoutType.REST ||
      planSession.type === WorkoutType.RECOVERY
    ) {
      continue
    }
    const date = addDateOnlyDays(targetWeekStart, planSession.dayOfWeek)
    const sortOrder = await getNextWorkoutSortOrder(payload.targetAthleteId, date)
    await prisma.workout.create({
      data: {
        ...workoutCloneCreateData(
          {
            templateId: null,
            type: planSession.type,
            sessionType: planSession.sessionType,
            title: planSession.title,
            description: planSession.description,
            plannedDistance: planSession.plannedDistance,
            plannedDuration: planSession.plannedDuration,
            plannedDistanceMeters: planSession.plannedDistanceMeters,
            plannedDistanceSource: planSession.plannedDistanceSource,
            plannedDurationSource: planSession.plannedDurationSource,
            plannedDistanceMetersSource: planSession.plannedDistanceMetersSource,
            swimEnvironment: planSession.swimEnvironment,
            swimStructure: planSession.swimStructure,
            coachNotes: planSession.coachNotes,
            coachNotesPrivate: planSession.coachNotesPrivate,
            structure: planSession.structure,
            tags: planSession.tags,
          },
          {
            athleteId: payload.targetAthleteId,
            date,
            sortOrder,
          },
        ),
        planId: payload.planId,
        planSessionId: planSession.id,
      },
    })
  }

  await onTrainingCalendarDataChanged(payload.targetAthleteId)
  revalidatePath('/training')
  revalidatePath('/dashboard')
}
