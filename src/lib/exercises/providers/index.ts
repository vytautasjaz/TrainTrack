export type {
  ExerciseProvider,
  ExerciseProviderCapabilities,
  ExternalExercise,
} from '@/lib/exercises/providers/types'
export { traintrackProvider } from '@/lib/exercises/providers/traintrack/adapter'
export { exerciseDbProvider } from '@/lib/exercises/providers/exercisedb/adapter'
export {
  repdbProvider,
  REPDB_ATTRIBUTION,
  REPDB_ATTRIBUTION_URL,
} from '@/lib/exercises/providers/repdb/adapter'
