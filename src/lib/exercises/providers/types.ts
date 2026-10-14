import type {
  ExerciseMedia,
  ExerciseRecord,
  ExerciseSource,
} from '@/lib/exercises/types'

/**
 * External / curated source before TrainTrack normalization.
 * Provider-specific fields stay inside adapters — never leak to the builder.
 */
export type ExternalExercise = {
  source: ExerciseSource
  sourceId: string
  name: string
  aliases?: string[]
  category?: string
  movementPattern?: string
  equipment?: string[]
  primaryMuscles?: string[]
  secondaryMuscles?: string[]
  prescriptionTypes?: string[]
  modalities?: string[]
  searchTerms?: string[]
  instructions?: string
  shortDescription?: string
  coachingCues?: string[]
  commonMistakes?: string[]
  media?: ExerciseMedia | null
  difficulty?: string
  /** Opaque provider payload for provenance (not redistributed to UI). */
  raw?: unknown
}

export type ExerciseProviderCapabilities = {
  images?: boolean
  videos?: boolean
  instructions?: boolean
  muscles?: boolean
  equipment?: boolean
  /** When false, do not persist provider content into TrainTrack DB. */
  allowRedistribution?: boolean
}

/**
 * Abstraction for exercise data sources.
 * Workout Builder never calls providers directly — only the ingest pipeline does.
 */
export type ExerciseProvider = {
  id: string
  name: string
  source: ExerciseSource
  capabilities?: ExerciseProviderCapabilities
  search?(query: string): Promise<ExternalExercise[]>
  getExercise?(sourceId: string): Promise<ExternalExercise | null>
  /** Bulk import when licensing permits redistribution. */
  import?(): Promise<ExternalExercise[]>
  /** Map external → TrainTrack-normalized upsert shape (no provider field leak). */
  toNormalized(external: ExternalExercise): Omit<
    ExerciseRecord,
    'usageCount' | 'popularity' | 'isActive' | 'coachId'
  > & {
    isActive?: boolean
    coachId?: string | null
  }
}
