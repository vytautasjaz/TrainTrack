import type { SessionType, SwimEnvironment, WorkoutType } from '@prisma/client'

export type WorkoutLibraryTemplate = {
  id: string
  title: string
  type: WorkoutType
  sessionType: SessionType
  description: string | null
  distanceKm: number | null
  durationMin: number | null
  distanceSource?: import('@prisma/client').PlannedMetricSource | null
  durationSource?: import('@prisma/client').PlannedMetricSource | null
  plannedDistanceMetersSource?: import('@prisma/client').PlannedMetricSource | null
  notes: string | null
  structure: unknown
  swimEnvironment: SwimEnvironment | null
  swimStructure: unknown
  plannedDistanceMeters: number | null
  tags: string[]
  createdAt: Date
  updatedAt: Date
}

export type LibrarySort = 'title' | 'updated' | 'session'
