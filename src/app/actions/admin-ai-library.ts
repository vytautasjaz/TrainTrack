'use server'

import { revalidatePath } from 'next/cache'
import { SessionType, WorkoutType } from '@prisma/client'
import { requireAdmin } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { ADAPTATION_KEYS } from '@/lib/coach-engine/types'
import {
  listCoachEngineWorkoutsAdmin,
  refreshWorkoutLibraryFromDb,
  seedCoachEngineWorkoutsFromCode,
  saveCoachEngineWorkoutStructure,
  type CoachEngineWorkoutAdminRow,
} from '@/lib/coach-engine/library-store'
import { hasStructureContent, parseStructure } from '@/lib/workout-builder/utils'
import type { WorkoutStructure } from '@/lib/workout-builder/types'
import type { SwimWorkoutStructure } from '@/lib/swim-workout/types'
import { hasSwimStructureContent } from '@/lib/swim-workout/calculations'
import { alignCandidateWithStructure } from '@/lib/coach-engine/session-copy'

export type { CoachEngineWorkoutAdminRow }

export async function adminListCoachEngineWorkouts() {
  await requireAdmin()
  return listCoachEngineWorkoutsAdmin()
}

export async function adminSeedCoachEngineWorkouts() {
  await requireAdmin()
  const count = await seedCoachEngineWorkoutsFromCode()
  revalidatePath('/admin/ai-library')
  return { ok: true as const, count }
}

export async function adminUpsertCoachEngineWorkout(input: {
  id: string
  title: string
  description?: string
  sport: WorkoutType
  sessionType: SessionType
  primaryAdaptation: string
  durationMin: number
  distanceKm?: number | null
  difficulty: string
  cardiovascularLoad: string
  muscularLoad?: string
  mechanicalLoad?: string
  tags?: string
  intervalCount?: number | null
  intervalDurationMin?: number | null
  recoveryMin?: number | null
  methodologyTags?: string
  progressionTo?: string
  family?: string | null
  isActive: boolean
  sortOrder: number
}) {
  await requireAdmin()
  const id = input.id.trim().toUpperCase().replace(/\s+/g, '_')
  if (!id) throw new Error('ID is required')
  if (!input.title.trim()) throw new Error('Title is required')
  if (!(ADAPTATION_KEYS as readonly string[]).includes(input.primaryAdaptation)) {
    throw new Error('Invalid primary adaptation')
  }

  const splitCsv = (value?: string) =>
    (value ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

  const data = {
    id,
    title: input.title.trim(),
    description: input.description?.trim() ?? '',
    sport: input.sport,
    sessionType: input.sessionType,
    primaryAdaptation: input.primaryAdaptation,
    durationMin: Math.max(0, Math.round(input.durationMin)),
    distanceKm: input.distanceKm ?? null,
    difficulty: input.difficulty,
    cardiovascularLoad: input.cardiovascularLoad,
    muscularLoad: input.muscularLoad ?? input.cardiovascularLoad,
    mechanicalLoad: input.mechanicalLoad ?? input.cardiovascularLoad,
    tags: splitCsv(input.tags),
    intervalCount: input.intervalCount ?? null,
    intervalDurationMin: input.intervalDurationMin ?? null,
    recoveryMin: input.recoveryMin ?? null,
    methodologyTags: splitCsv(input.methodologyTags),
    progressionTo: splitCsv(input.progressionTo),
    family: input.family?.trim() || null,
    isActive: input.isActive,
    sortOrder: input.sortOrder,
  }

  await prisma.coachEngineWorkout.upsert({
    where: { id },
    create: data,
    update: data,
  })

  // If a builder structure already exists, re-align catalog units/copy to it.
  const existing = await prisma.coachEngineWorkout.findUnique({ where: { id } })
  if (existing?.structure) {
    const structure = parseStructure(existing.structure)
    const aligned = alignCandidateWithStructure({
      id: existing.id,
      primaryAdaptation: existing.primaryAdaptation as never,
      sport: existing.sport,
      sessionType: existing.sessionType,
      title: existing.title,
      description: existing.description,
      durationMin: existing.durationMin,
      distanceKm: existing.distanceKm,
      cardiovascularLoad: existing.cardiovascularLoad as never,
      muscularLoad: existing.muscularLoad as never,
      mechanicalLoad: existing.mechanicalLoad as never,
      difficulty: existing.difficulty as never,
      tags: existing.tags,
      intervalCount: existing.intervalCount,
      intervalDurationMin: existing.intervalDurationMin,
      recoveryMin: existing.recoveryMin,
      structure,
    })
    await prisma.coachEngineWorkout.update({
      where: { id },
      data: {
        title: aligned.title,
        description: aligned.description,
        durationMin: aligned.durationMin,
        distanceKm: aligned.distanceKm,
      },
    })
  }

  await refreshWorkoutLibraryFromDb()
  revalidatePath('/admin/ai-library')
  return { ok: true as const }
}

export async function adminDeleteCoachEngineWorkout(id: string) {
  await requireAdmin()
  await prisma.coachEngineWorkout.delete({ where: { id } })
  await refreshWorkoutLibraryFromDb()
  revalidatePath('/admin/ai-library')
  return { ok: true as const }
}

export async function adminToggleCoachEngineWorkout(
  id: string,
  isActive: boolean,
) {
  await requireAdmin()
  await prisma.coachEngineWorkout.update({
    where: { id },
    data: { isActive },
  })
  await refreshWorkoutLibraryFromDb()
  revalidatePath('/admin/ai-library')
  return { ok: true as const }
}

/** Save builder structure for an AI library workout (SharedWorkoutEditor ai-library mode). */
export async function adminSaveCoachEngineWorkoutBuilder(
  libraryId: string,
  payload: {
    title: string
    description?: string
    sportType: WorkoutType
    sessionType: SessionType
    tags?: string[]
    structure?: WorkoutStructure
    swimStructure?: SwimWorkoutStructure | null
    estimatedDuration?: number
    estimatedDistanceKm?: number | null
  },
) {
  await requireAdmin()
  const id = libraryId.trim()
  if (!id) throw new Error('Library workout id required')

  const structure =
    payload.structure && hasStructureContent(payload.structure)
      ? payload.structure
      : null
  const swimStructure =
    payload.swimStructure && hasSwimStructureContent(payload.swimStructure)
      ? payload.swimStructure
      : null

  await saveCoachEngineWorkoutStructure({
    id,
    title: payload.title,
    description: payload.description ?? null,
    sport: payload.sportType,
    sessionType: payload.sessionType,
    durationMin: payload.estimatedDuration ?? undefined,
    distanceKm: payload.estimatedDistanceKm ?? undefined,
    tags: payload.tags,
    structure,
    swimStructure,
  })
  revalidatePath('/admin/ai-library')
  return { ok: true as const, id, savedAt: new Date().toISOString() }
}
