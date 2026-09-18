import { prisma } from '@/lib/prisma'

export const WORKOUT_LIST_ORDER_BY = [
  { date: 'asc' as const },
  { sortOrder: 'asc' as const },
  { title: 'asc' as const },
]

export async function getNextWorkoutSortOrder(athleteId: string, date: Date) {
  const [workoutMax, raceMax] = await Promise.all([
    prisma.workout.aggregate({
      where: { athleteId, date, isRescheduleGhost: false },
      _max: { sortOrder: true },
    }),
    prisma.race.aggregate({
      where: { athleteId, date, resultsLogOnly: false },
      _max: { daySortOrder: true },
    }),
  ])
  const maxWorkout = workoutMax._max.sortOrder ?? -1
  const maxRace = raceMax._max.daySortOrder ?? -1
  return Math.max(maxWorkout, maxRace) + 1
}

/** Alias — day order is shared between workouts and races. */
export const getNextDayItemSortOrder = getNextWorkoutSortOrder
