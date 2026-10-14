import { unstable_cache } from 'next/cache'
import type { Exercise } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { parseExerciseMedia } from '@/lib/exercises/media'
import { loadSeedExerciseCorpus } from '@/lib/exercises/seed-corpus'
import type { ExerciseRecord } from '@/lib/exercises/types'
import { cacheTags } from '@/lib/cache-tags'

function rowToRecord(row: Exercise): ExerciseRecord {
  return {
    id: row.id,
    canonicalName: row.canonicalName,
    aliases: row.aliases,
    searchTerms: row.searchTerms,
    category: row.category,
    movementPattern: row.movementPattern,
    equipment: row.equipment,
    primaryMuscles: row.primaryMuscles,
    secondaryMuscles: row.secondaryMuscles,
    prescriptionTypes: row.prescriptionTypes,
    modalities: row.modalities,
    difficulty: row.difficulty,
    instructions: row.instructions,
    shortDescription: row.shortDescription,
    coachingCues: row.coachingCues ?? [],
    commonMistakes: row.commonMistakes ?? [],
    media: parseExerciseMedia(row.media),
    variationType: row.variationType,
    canonicalExerciseId: row.canonicalExerciseId,
    source: row.source,
    sourceId: row.sourceId,
    coachId: row.coachId,
    isActive: row.isActive,
    usageCount: row.usageCount,
    popularity: row.popularity,
  }
}

function seedCorpusFallback(): ExerciseRecord[] {
  return loadSeedExerciseCorpus()
}

async function loadPlatformExercisesFromDb(): Promise<ExerciseRecord[]> {
  const rows = await prisma.exercise.findMany({
    where: { coachId: null, isActive: true },
    orderBy: { canonicalName: 'asc' },
  })
  return rows.map(rowToRecord)
}

/** Cached platform library snapshot (tag: exerciseLibrary). */
export function getPlatformExerciseLibrary(): Promise<ExerciseRecord[]> {
  return unstable_cache(
    async () => {
      const fromDb = await loadPlatformExercisesFromDb()
      if (fromDb.length > 0) return fromDb
      return seedCorpusFallback()
    },
    // Bump when media/enrichment shape changes so stale snapshots drop.
    ['exercise-library-platform', 'media-v1'],
    { tags: [cacheTags.exerciseLibrary()], revalidate: 3600 },
  )()
}

export async function getExerciseLibraryForCoach(
  coachId: string | null | undefined,
  opts?: { fresh?: boolean },
): Promise<ExerciseRecord[]> {
  // Editor / preview need fresh media after enrich — skip unstable_cache.
  const platform = opts?.fresh
    ? await (async () => {
        const fromDb = await loadPlatformExercisesFromDb()
        return fromDb.length > 0 ? fromDb : seedCorpusFallback()
      })()
    : await getPlatformExerciseLibrary()
  if (!coachId) return platform
  const customs = await prisma.exercise.findMany({
    where: { coachId, isActive: true, source: 'USER' },
    orderBy: { canonicalName: 'asc' },
  })
  return [...platform, ...customs.map(rowToRecord)]
}

export async function getExerciseById(
  id: string,
): Promise<ExerciseRecord | null> {
  const row = await prisma.exercise.findUnique({ where: { id } })
  if (row) return rowToRecord(row)
  const fallback = seedCorpusFallback().find((e) => e.id === id)
  return fallback ?? null
}
