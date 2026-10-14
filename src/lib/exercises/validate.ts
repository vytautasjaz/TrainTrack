import { z } from 'zod'
import { getExerciseById } from '@/lib/exercises/queries'
import { loadSeedExerciseCorpus } from '@/lib/exercises/seed-corpus'

/**
 * AI / coach-engine payloads must reference known library ids.
 * Resolves against DB first, then curated seed fallback.
 */
export async function assertExerciseIdExists(id: string): Promise<true> {
  const trimmed = id.trim()
  if (!trimmed) {
    throw new Error('exerciseId is required')
  }
  const fromDb = await getExerciseById(trimmed)
  if (fromDb) return true
  const fromSeed = loadSeedExerciseCorpus().some((e) => e.id === trimmed)
  if (fromSeed) return true
  throw new Error(`Unknown exerciseId: ${trimmed}`)
}

export const exerciseIdSchema = z
  .string()
  .min(1)
  .refine(
    async (id) => {
      try {
        await assertExerciseIdExists(id)
        return true
      } catch {
        return false
      }
    },
    { message: 'Unknown exerciseId' },
  )

/** Sync check against an in-memory corpus (tests / offline). */
export function assertExerciseIdInCorpus(
  id: string,
  corpusIds: Set<string> | string[],
): void {
  const set = corpusIds instanceof Set ? corpusIds : new Set(corpusIds)
  if (!set.has(id)) {
    throw new Error(`Unknown exerciseId: ${id}`)
  }
}
