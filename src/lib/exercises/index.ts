export type {
  ExerciseRecord,
  ExerciseMedia,
  ExerciseMediaItem,
  ExerciseSearchContext,
  ExerciseSearchHit,
  ExerciseSearchOptions,
  ExerciseSource,
  ExerciseMatchType,
} from '@/lib/exercises/types'
export {
  parseExerciseMedia,
  primaryExerciseMedia,
  exercisePoseSequence,
  exercisePoseKind,
  exerciseThumbnailUrl,
} from '@/lib/exercises/media'
export { searchExercises, getExerciseFromCorpus } from '@/lib/exercises/search'
export {
  getPlatformExerciseLibrary,
  getExerciseLibraryForCoach,
  getExerciseById,
} from '@/lib/exercises/queries'
export {
  defaultPrescriptionMode,
  prescriptionModesForExercise,
  supportsLoad,
} from '@/lib/exercises/prescription'
export {
  assertExerciseIdExists,
  assertExerciseIdInCorpus,
  exerciseIdSchema,
} from '@/lib/exercises/validate'
export { loadSeedExerciseCorpus } from '@/lib/exercises/seed-corpus'
export { customExerciseId } from '@/lib/exercises/custom-id'
