import type { ExternalExercise } from '@/lib/exercises/providers/types'
import type { ExerciseProvider } from '@/lib/exercises/providers/types'
import type { ExerciseRecord } from '@/lib/exercises/types'

/**
 * Run a provider adapter to produce a TrainTrack-normalized exercise record.
 * Provider-specific fields must not leak past this boundary.
 */
export function normalizeExternalExercise(
  provider: ExerciseProvider,
  external: ExternalExercise,
): ExerciseRecord {
  const normalized = provider.toNormalized(external)
  return {
    usageCount: 0,
    popularity: 0,
    isActive: true,
    coachId: null,
    ...normalized,
    source: provider.source,
  }
}
