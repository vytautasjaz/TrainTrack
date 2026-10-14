import { prisma } from '@/lib/prisma'
import {
  exerciseThumbnailUrl,
  parseExerciseMedia,
} from '@/lib/exercises/media'
import type {
  ExerciseItem,
  WorkoutBlockV2,
  WorkoutStructureV2,
} from '@/lib/workout-builder/structure-v2'

function exercisesOf(block: WorkoutBlockV2): ExerciseItem[] {
  if ('exercises' in block && Array.isArray(block.exercises) && block.exercises.length) {
    return block.exercises
  }
  if ('exercise' in block && block.exercise) return [block.exercise]
  return []
}

/** Unique exercise ids referenced by a structure v2 workout. */
export function collectStructureV2ExerciseIds(
  structure: WorkoutStructureV2,
): string[] {
  const ids = new Set<string>()
  for (const item of structure.items) {
    const blocks = item.kind === 'block' ? [item.block] : item.blocks
    for (const block of blocks) {
      for (const exercise of exercisesOf(block)) {
        const id = exercise.exerciseId?.trim()
        if (id) ids.add(id)
      }
    }
  }
  return [...ids]
}

/**
 * Batch-resolve list thumbnails for exercise ids (one Prisma query).
 * Missing / custom ids map to null.
 */
export async function loadExerciseThumbnailMap(
  exerciseIds: string[],
): Promise<Record<string, string | null>> {
  const ids = [
    ...new Set(
      exerciseIds
        .map((id) => id.trim())
        .filter((id) => id.length > 0),
    ),
  ].slice(0, 120)

  const out: Record<string, string | null> = {}
  for (const id of ids) out[id] = null
  if (ids.length === 0) return out

  const rows = await prisma.exercise.findMany({
    where: { id: { in: ids } },
    select: { id: true, media: true },
  })
  for (const row of rows) {
    out[row.id] = exerciseThumbnailUrl(parseExerciseMedia(row.media))
  }
  return out
}
