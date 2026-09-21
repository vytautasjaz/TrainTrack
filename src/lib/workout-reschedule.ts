import { WorkoutStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { toDateKey } from '@/lib/dates'
import { getNextWorkoutSortOrder } from '@/lib/workout-sort'

type RescheduleCandidate = {
  id: string
  athleteId: string
  date: Date
  isRescheduleGhost: boolean
  rescheduledFromId: string | null
  rescheduledFromDate: Date | null
  rescheduledFrom: { id: string; isRescheduleGhost: boolean; date: Date } | null
  rescheduledCopy: { id: string } | null
}

/**
 * Move an athlete workout onto `targetDate`.
 * Keeps `rescheduledFromDate` for “from …” / coach review — does **not** leave a
 * ghost placeholder card on the original day.
 * No-op if already on that date.
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

  const linkedGhostId =
    candidate.rescheduledFromId && candidate.rescheduledFrom?.isRescheduleGhost
      ? candidate.rescheduledFromId
      : null
  const originalPlanDate =
    candidate.rescheduledFromDate ??
    candidate.rescheduledFrom?.date ??
    candidate.date

  // Moving back to the original plan day — clear lineage and drop any legacy ghost.
  if (toDateKey(originalPlanDate) === targetKey) {
    const restoreSortOrder = await getNextWorkoutSortOrder(
      candidate.athleteId,
      originalPlanDate,
    )
    await prisma.$transaction(async (tx) => {
      if (linkedGhostId) {
        await tx.workout.delete({ where: { id: linkedGhostId } })
      }
      if (candidate.rescheduledCopy) {
        await tx.workout.delete({ where: { id: candidate.rescheduledCopy.id } })
      }
      await tx.workout.update({
        where: { id: candidate.id },
        data: {
          date: originalPlanDate,
          sortOrder: restoreSortOrder,
          rescheduledFromId: null,
          rescheduledFromDate: null,
          isRescheduleGhost: false,
        },
      })
    })
    return {
      moved: true,
      fromDateKey: currentKey,
      toDateKey: toDateKey(originalPlanDate),
    }
  }

  await prisma.$transaction(async (tx) => {
    if (linkedGhostId) {
      await tx.workout.delete({ where: { id: linkedGhostId } })
    }
    if (candidate.rescheduledCopy) {
      await tx.workout.delete({ where: { id: candidate.rescheduledCopy.id } })
    }
    await tx.workout.update({
      where: { id: candidate.id },
      data: {
        date: targetDate,
        sortOrder,
        rescheduledFromId: null,
        rescheduledFromDate: originalPlanDate,
        isRescheduleGhost: false,
      },
    })
  })

  return {
    moved: true,
    fromDateKey: currentKey,
    toDateKey: targetKey,
  }
}
