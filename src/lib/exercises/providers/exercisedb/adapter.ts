import type { ExerciseProvider } from '@/lib/exercises/providers/types'

/**
 * Placeholder for ExerciseDB / similar commercial APIs.
 *
 * Do NOT copy restricted ExerciseDB content into TrainTrack by default.
 * Prefer live lookup or licensed redistribution only after terms review.
 * Workout Builder must never import this module.
 */
export const exerciseDbProvider: ExerciseProvider = {
  id: 'exercisedb',
  name: 'ExerciseDB (placeholder)',
  source: 'EXERCISE_DB',
  capabilities: {
    images: true,
    videos: true,
    instructions: true,
    muscles: true,
    equipment: true,
    allowRedistribution: false,
  },
  async search() {
    throw new Error(
      'ExerciseDB search is not configured. Integrate per current API terms; do not redistribute restricted data.',
    )
  },
  async getExercise() {
    return null
  },
  async import() {
    throw new Error(
      'ExerciseDB bulk import disabled — redistribution not assumed from public API access.',
    )
  },
  toNormalized(external) {
    return {
      id: `exdb_${external.sourceId}`,
      canonicalName: external.name,
      aliases: external.aliases ?? [],
      searchTerms: external.searchTerms ?? [],
      category: external.category ?? 'STRENGTH',
      movementPattern: external.movementPattern ?? null,
      equipment: external.equipment ?? [],
      primaryMuscles: external.primaryMuscles ?? [],
      secondaryMuscles: external.secondaryMuscles ?? [],
      prescriptionTypes: external.prescriptionTypes ?? [],
      modalities: external.modalities ?? [],
      difficulty: external.difficulty ?? null,
      instructions: null, // keep instructions external unless license allows
      shortDescription: null,
      coachingCues: [],
      commonMistakes: [],
      media: null,
      variationType: null,
      canonicalExerciseId: null,
      source: 'EXERCISE_DB',
      sourceId: external.sourceId,
      coachId: null,
      isActive: true,
    }
  },
}
