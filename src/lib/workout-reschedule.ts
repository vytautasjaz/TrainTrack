import { WorkoutStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { toDateKey } from '@/lib/dates'
import { getNextWorkoutSortOrder } from '@/lib/workout-sort'
import { structureDiagramPrismaValue } from '@/lib/workout-builder/structure-diagram'

type RescheduleCandidate = {
  id: string
  athleteId: string
  date: Date
  sortOrder: number
  type: import('@prisma/client').WorkoutType
  sessionType: import('@prisma/client').SessionType
  title: string
  description: string | null
  plannedDistance: number | null
  plannedDuration: number | null
  coachNotes: string | null
  coachNotesPrivate: boolean
  structure: unknown
  swimEnvironment: import('@prisma/client').SwimEnvironment | null
  swimStructure: unknown
  plannedDistanceMeters: number | null
  tags: string[]
  templateId: string | null
  isRescheduleGhost: boolean
  rescheduledFromId: string | null
  rescheduledFromDate: Date | null
  rescheduledFrom: { id: string; isRescheduleGhost: boolean; date: Date } | null
  rescheduledCopy: { id: string } | null
}

/**
 * Move an athlete workout onto `targetDate`, leaving a ghost on the original plan
 * day when this is the first move. No-op if already on that date.
 * Used by athlete reschedule UI and cross-day Strava linking.
 */
export async function moveAthleteWorkoutToDateWithGhost(
  workoutId: string,
  targetDate: Date,
): Promise<{ moved: boolean; fromDateKey: string; toDateKey: string }> {
  const workout = await prisma.workout.findFirst({
    where: { id: workoutId },
    include: {
      rescheduledCopy: { select: { id: true } },
      rescheduledFrom: { select: { id: true, isRescheduleGhost: true, date: true } },
    },
  })
  if (!workout) throw new Error('Workout not found')
  if (workout.isRescheduleGhost) {
    throw new Error('This is a placeholder for a moved workout')
  }

  const targetKey = toDateKey(targetDate)
  const currentKey = toDateKey(workout.date)
  if (currentKey === targetKey) {
    return { moved: false, fromDateKey: currentKey, toDateKey: targetKey }
  }

  const sortOrder = await getNextWorkoutSortOrder(workout.athleteId, targetDate)
  const candidate = workout as RescheduleCandidate

  // Already has a ghost on the original plan day — move the active card again.
  if (candidate.rescheduledFromId && candidate.rescheduledFrom?.isRescheduleGhost) {
    const originalPlanDate = candidate.rescheduledFromDate ?? candidate.rescheduledFrom.date
    const movingBack = toDateKey(originalPlanDate) === targetKey

    if (movingBack) {
      const restoreSortOrder = await getNextWorkoutSortOrder(
        candidate.athleteId,
        originalPlanDate,
      )
      await prisma.$transaction([
        prisma.workout.delete({ where: { id: candidate.rescheduledFromId } }),
        prisma.workout.update({
          where: { id: candidate.id },
          data: {
            date: originalPlanDate,
            sortOrder: restoreSortOrder,
            rescheduledFromId: null,
            rescheduledFromDate: null,
          },
        }),
      ])
      return {
        moved: true,
        fromDateKey: currentKey,
        toDateKey: toDateKey(originalPlanDate),
      }
    }

    await prisma.workout.update({
      where: { id: candidate.id },
      data: {
        date: targetDate,
        sortOrder,
      },
    })
    return { moved: true, fromDateKey: currentKey, toDateKey: targetKey }
  }

  // Clear any stale non-ghost link first.
  if (candidate.rescheduledFromId) {
    await prisma.workout.update({
      where: { id: candidate.id },
      data: { rescheduledFromId: null },
    })
  }
  if (candidate.rescheduledCopy) {
    await prisma.workout.delete({ where: { id: candidate.rescheduledCopy.id } })
  }

  const originalDate = candidate.date
  const ghost = await prisma.workout.create({
    data: {
      athleteId: candidate.athleteId,
      date: originalDate,
      sortOrder: candidate.sortOrder,
      type: candidate.type,
      sessionType: candidate.sessionType,
      title: candidate.title,
      description: candidate.description,
      plannedDistance: candidate.plannedDistance,
      plannedDuration: candidate.plannedDuration,
      coachNotes: candidate.coachNotes,
      coachNotesPrivate: candidate.coachNotesPrivate,
      structure: (candidate.structure as object) ?? undefined,
      structureDiagram: structureDiagramPrismaValue(candidate.structure, {
        durationMinutes: candidate.plannedDuration,
      }),
      swimEnvironment: candidate.swimEnvironment,
      swimStructure: (candidate.swimStructure as object) ?? undefined,
      plannedDistanceMeters: candidate.plannedDistanceMeters,
      tags: candidate.tags,
      status: WorkoutStatus.PLANNED,
      selfLogged: false,
      isRescheduleGhost: true,
      templateId: candidate.templateId,
    },
  })

  await prisma.workout.update({
    where: { id: candidate.id },
    data: {
      date: targetDate,
      sortOrder,
      rescheduledFromId: ghost.id,
      rescheduledFromDate: originalDate,
      isRescheduleGhost: false,
    },
  })

  return {
    moved: true,
    fromDateKey: toDateKey(originalDate),
    toDateKey: targetKey,
  }
}
