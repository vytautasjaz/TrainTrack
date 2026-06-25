import { prisma } from '@/lib/prisma'

export const WORKOUT_LIST_ORDER_BY = [
  { date: 'asc' as const },
  { sortOrder: 'asc' as const },
  { title: 'asc' as const },
]

export async function getNextWorkoutSortOrder(athleteId: string, date: Date) {
  const result = await prisma.workout.aggregate({
    where: { athleteId, date },
    _max: { sortOrder: true },
  })
  return (result._max.sortOrder ?? -1) + 1
}
