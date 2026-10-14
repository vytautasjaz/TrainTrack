'use server'

import { ExerciseSource } from '@prisma/client'
import { revalidateExerciseLibrary } from '@/lib/cache-tags'
import { customExerciseId } from '@/lib/exercises/custom-id'
import {
  exerciseThumbnailUrl,
  parseExerciseMedia,
  primaryExerciseMedia,
} from '@/lib/exercises/media'
import { loadExerciseThumbnailMap } from '@/lib/exercises/thumbnails'
import { buildSearchBlob, tokenizeSearchText } from '@/lib/exercises/normalize'
import {
  getExerciseById,
  getExerciseLibraryForCoach,
  getPlatformExerciseLibrary,
} from '@/lib/exercises/queries'
import type {
  ExerciseMedia,
  ExerciseMediaItem,
  ExerciseRecord,
} from '@/lib/exercises/types'
import { isCoachView, requireSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

/** Serializable snapshot for Workout Builder autocomplete (slim). */
export type ExerciseLibraryDto = {
  id: string
  canonicalName: string
  aliases: string[]
  category: string
  movementPattern: string | null
  equipment: string[]
  prescriptionTypes: string[]
  modalities: string[]
  source: ExerciseSource
  /** List-only media hint — full media via getExerciseDetail. */
  thumbnailUrl: string | null
}

/** Full exercise payload for Preview / Details progressive disclosure. */
export type ExerciseDetailDto = {
  id: string
  canonicalName: string
  aliases: string[]
  category: string
  movementPattern: string | null
  equipment: string[]
  primaryMuscles: string[]
  secondaryMuscles: string[]
  prescriptionTypes: string[]
  modalities: string[]
  difficulty: string | null
  instructions: string | null
  shortDescription: string | null
  coachingCues: string[]
  commonMistakes: string[]
  media: ExerciseMedia | null
  primaryMedia: ExerciseMediaItem | null
  thumbnailUrl: string | null
  source: ExerciseSource
  sourceId: string | null
  licenseAttribution: string | null
  variations: Array<{
    id: string
    canonicalName: string
    thumbnailUrl: string | null
    variationType: string | null
  }>
}

function toDto(row: ExerciseRecord): ExerciseLibraryDto {
  return {
    id: row.id,
    canonicalName: row.canonicalName,
    aliases: row.aliases,
    category: row.category,
    movementPattern: row.movementPattern ?? null,
    equipment: row.equipment,
    prescriptionTypes: row.prescriptionTypes,
    modalities: row.modalities,
    source: row.source as ExerciseSource,
    thumbnailUrl: exerciseThumbnailUrl(row.media ?? null),
  }
}

function toDetailDto(
  row: ExerciseRecord,
  variations: ExerciseRecord[] = [],
): ExerciseDetailDto {
  const media = row.media ?? null
  const primary = primaryExerciseMedia(media)
  const attribution =
    primary?.attribution ??
    primary?.license ??
    media?.items.find((i) => i.attribution || i.license)?.attribution ??
    media?.items.find((i) => i.license)?.license ??
    null

  return {
    id: row.id,
    canonicalName: row.canonicalName,
    aliases: row.aliases,
    category: row.category,
    movementPattern: row.movementPattern ?? null,
    equipment: row.equipment,
    primaryMuscles: row.primaryMuscles,
    secondaryMuscles: row.secondaryMuscles,
    prescriptionTypes: row.prescriptionTypes,
    modalities: row.modalities,
    difficulty: row.difficulty ?? null,
    instructions: row.instructions ?? null,
    shortDescription: row.shortDescription ?? null,
    coachingCues: row.coachingCues ?? [],
    commonMistakes: row.commonMistakes ?? [],
    media,
    primaryMedia: primary,
    thumbnailUrl: exerciseThumbnailUrl(media),
    source: row.source as ExerciseSource,
    sourceId: row.sourceId ?? null,
    licenseAttribution: attribution,
    variations: variations.map((v) => ({
      id: v.id,
      canonicalName: v.canonicalName,
      thumbnailUrl: exerciseThumbnailUrl(v.media ?? null),
      variationType: v.variationType ?? null,
    })),
  }
}

export async function getExerciseLibraryForEditor(): Promise<
  ExerciseLibraryDto[]
> {
  const session = await requireSession()
  const coachId = isCoachView(session) ? session.userId : null
  // Fresh DB read so RepDB enrich thumbnails show immediately.
  const rows = await getExerciseLibraryForCoach(coachId, { fresh: true })
  return rows.map(toDto)
}

/** Platform-only (no auth) — useful for tests / public tooling. Prefer editor action in UI. */
export async function getPlatformExerciseLibraryAction(): Promise<
  ExerciseLibraryDto[]
> {
  const rows = await getPlatformExerciseLibrary()
  return rows.map(toDto)
}

/**
 * Fresh thumbnail URLs by id (bypasses exerciseLibrary cache).
 * Prefer embedding via getPlanWorkoutDetail when possible (one round-trip).
 */
export async function getExerciseThumbnailMap(
  exerciseIds: string[],
): Promise<Record<string, string | null>> {
  await requireSession()
  return loadExerciseThumbnailMap(exerciseIds)
}

/** On-demand detail for Preview / Details panels. */
export async function getExerciseDetail(
  exerciseId: string,
): Promise<ExerciseDetailDto | null> {
  await requireSession()
  const id = exerciseId.trim()
  if (!id) return null

  const row = await getExerciseById(id)
  if (!row) return null

  const variationRows = await prisma.exercise.findMany({
    where: {
      OR: [
        { canonicalExerciseId: id },
        ...(row.canonicalExerciseId
          ? [
              { canonicalExerciseId: row.canonicalExerciseId },
              { id: row.canonicalExerciseId },
            ]
          : []),
      ],
      isActive: true,
      NOT: { id },
    },
    take: 12,
    orderBy: { canonicalName: 'asc' },
  })

  const variations: ExerciseRecord[] = variationRows.map((v) => ({
    id: v.id,
    canonicalName: v.canonicalName,
    aliases: v.aliases,
    searchTerms: v.searchTerms,
    category: v.category,
    movementPattern: v.movementPattern,
    equipment: v.equipment,
    primaryMuscles: v.primaryMuscles,
    secondaryMuscles: v.secondaryMuscles,
    prescriptionTypes: v.prescriptionTypes,
    modalities: v.modalities,
    difficulty: v.difficulty,
    instructions: v.instructions,
    shortDescription: v.shortDescription,
    coachingCues: v.coachingCues ?? [],
    commonMistakes: v.commonMistakes ?? [],
    media: parseExerciseMedia(v.media),
    variationType: v.variationType,
    canonicalExerciseId: v.canonicalExerciseId,
    source: v.source,
    sourceId: v.sourceId,
    coachId: v.coachId,
    isActive: v.isActive,
    usageCount: v.usageCount,
    popularity: v.popularity,
  }))

  return toDetailDto(row, variations)
}

export async function createCustomExercise(input: {
  name: string
  category?: string
  prescriptionTypes?: string[]
}): Promise<ExerciseLibraryDto> {
  const session = await requireSession()
  if (!isCoachView(session)) throw new Error('Coach only')
  const name = input.name.trim()
  if (!name) throw new Error('Exercise name is required')

  const id = customExerciseId(name)
  const aliases: string[] = []
  const searchTerms = tokenizeSearchText(
    buildSearchBlob({
      canonicalName: name,
      aliases,
      searchTerms: tokenizeSearchText(name),
    }),
  )
  const prescriptionTypes = input.prescriptionTypes?.length
    ? input.prescriptionTypes
    : ['REPS', 'WEIGHT', 'RPE']

  const row = await prisma.exercise.upsert({
    where: { id },
    create: {
      id,
      canonicalName: name,
      aliases,
      searchTerms,
      category: input.category ?? 'CUSTOM',
      movementPattern: 'GENERAL',
      equipment: [],
      primaryMuscles: [],
      secondaryMuscles: [],
      prescriptionTypes,
      modalities: ['STRENGTH'],
      source: 'USER',
      sourceId: id,
      coachId: session.userId,
      isActive: true,
    },
    update: {
      canonicalName: name,
      isActive: true,
      prescriptionTypes,
    },
  })

  revalidateExerciseLibrary()

  return {
    id: row.id,
    canonicalName: row.canonicalName,
    aliases: row.aliases,
    category: row.category,
    movementPattern: row.movementPattern,
    equipment: row.equipment,
    prescriptionTypes: row.prescriptionTypes,
    modalities: row.modalities,
    source: row.source,
    thumbnailUrl: null,
  }
}
