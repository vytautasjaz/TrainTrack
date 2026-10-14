/**
 * @deprecated Use `@/lib/exercises` Exercise Intelligence layer instead.
 * Kept as a thin compatibility shim during migration.
 */
import { loadSeedExerciseCorpus } from '@/lib/exercises/seed-corpus'
import { customExerciseId } from '@/lib/exercises/custom-id'
import { searchExercises as searchExerciseCorpus } from '@/lib/exercises/search'
import type { PrescriptionMode } from '@/lib/workout-builder/structure-v2'

export { customExerciseId }

/** @deprecated Prefer ExerciseSearchContext via section/sport mapping. */
export type ExerciseCatalogTag =
  | 'strength'
  | 'hyrox'
  | 'run'
  | 'conditioning'
  | 'core'
  | 'warmup'

export type ExerciseCatalogEntry = {
  id: string
  name: string
  tags: ExerciseCatalogTag[]
  defaultPrescriptionMode: PrescriptionMode
}

function mapMode(raw: string | undefined): PrescriptionMode {
  const t = (raw ?? 'REPS').toUpperCase()
  if (t === 'TIME') return 'TIME'
  if (t === 'DISTANCE' || t === 'PACE') return 'DISTANCE'
  if (t === 'CALORIES') return 'CALORIES'
  if (t === 'UNTIMED') return 'UNTIMED'
  return 'REPS'
}

/** @deprecated Prefer getExerciseLibraryForEditor. */
export const EXERCISE_CATALOG: ExerciseCatalogEntry[] =
  loadSeedExerciseCorpus().map((e) => ({
    id: e.id,
    name: e.canonicalName,
    tags: [] as ExerciseCatalogTag[],
    defaultPrescriptionMode: mapMode(e.prescriptionTypes[0]),
  }))

export function getExerciseById(id: string): ExerciseCatalogEntry | undefined {
  return EXERCISE_CATALOG.find((e) => e.id === id)
}

/** @deprecated Prefer searchExercises(corpus, query, options) from @/lib/exercises. */
export function searchExercises(
  query: string,
  _tags?: ExerciseCatalogTag[],
): ExerciseCatalogEntry[] {
  const hits = searchExerciseCorpus(loadSeedExerciseCorpus(), query, {
    limit: 24,
  })
  return hits.map((h) => ({
    id: h.exercise.id,
    name: h.exercise.canonicalName,
    tags: [] as ExerciseCatalogTag[],
    defaultPrescriptionMode: mapMode(h.exercise.prescriptionTypes[0]),
  }))
}