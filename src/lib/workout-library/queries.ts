import { WorkoutType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { WorkoutLibraryTemplate } from '@/lib/workout-library/types'
import { LIBRARY_SPORTS } from '@/lib/workout-library/config'

const templateSelect = {
  id: true,
  title: true,
  type: true,
  sessionType: true,
  description: true,
  distanceKm: true,
  durationMin: true,
  notes: true,
  structure: true,
  swimEnvironment: true,
  swimStructure: true,
  plannedDistanceMeters: true,
  tags: true,
  createdAt: true,
  updatedAt: true,
} as const

export async function getCoachLibraryTemplates(
  coachId: string,
): Promise<WorkoutLibraryTemplate[]> {
  return prisma.workoutTemplate.findMany({
    where: { coachId },
    orderBy: { updatedAt: 'desc' },
    select: templateSelect,
  })
}

export async function getCoachLibraryTemplatesBySport(
  coachId: string,
  sport: WorkoutType,
): Promise<WorkoutLibraryTemplate[]> {
  return prisma.workoutTemplate.findMany({
    where: { coachId, type: sport },
    orderBy: { updatedAt: 'desc' },
    select: templateSelect,
  })
}

export async function getCoachLibraryCountsBySport(
  coachId: string,
): Promise<Record<WorkoutType, number>> {
  const rows = await prisma.workoutTemplate.groupBy({
    by: ['type'],
    where: { coachId },
    _count: { _all: true },
  })

  const counts = Object.fromEntries(
    LIBRARY_SPORTS.map((s) => [s.type, 0]),
  ) as Record<WorkoutType, number>

  for (const row of rows) {
    counts[row.type] = row._count._all
  }

  return counts
}
