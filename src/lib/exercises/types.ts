import { z } from 'zod'

/** Matches Prisma ExerciseSource. */
export const exerciseSourceSchema = z.enum([
  'TRAINTRACK',
  'FREE_EXERCISE_DB',
  'EXERCISE_DB',
  'USER',
  'OTHER',
])
export type ExerciseSource = z.infer<typeof exerciseSourceSchema>

export const exerciseSearchContextSchema = z.enum([
  'STRENGTH',
  'HYROX',
  'RUNNING',
  'CONDITIONING',
  'MOBILITY',
  'CORE',
  'GENERAL',
])
export type ExerciseSearchContext = z.infer<typeof exerciseSearchContextSchema>

export const exerciseMediaTypeSchema = z.enum(['IMAGE', 'GIF', 'VIDEO'])
export type ExerciseMediaType = z.infer<typeof exerciseMediaTypeSchema>

export const exerciseMediaItemSchema = z.object({
  type: exerciseMediaTypeSchema,
  url: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  source: z.string().min(1),
  license: z.string().optional(),
  attribution: z.string().optional(),
})
export type ExerciseMediaItem = z.infer<typeof exerciseMediaItemSchema>

export const exerciseMediaSchema = z.object({
  items: z.array(exerciseMediaItemSchema).default([]),
})
export type ExerciseMedia = z.infer<typeof exerciseMediaSchema>

/** Normalized record used by search / autocomplete (DB or seed). */
export const exerciseRecordSchema = z.object({
  id: z.string().min(1),
  canonicalName: z.string().min(1),
  aliases: z.array(z.string()).default([]),
  searchTerms: z.array(z.string()).default([]),
  category: z.string().min(1),
  movementPattern: z.string().nullable().optional(),
  equipment: z.array(z.string()).default([]),
  primaryMuscles: z.array(z.string()).default([]),
  secondaryMuscles: z.array(z.string()).default([]),
  prescriptionTypes: z.array(z.string()).default([]),
  modalities: z.array(z.string()).default([]),
  difficulty: z.string().nullable().optional(),
  instructions: z.string().nullable().optional(),
  shortDescription: z.string().nullable().optional(),
  coachingCues: z.array(z.string()).default([]),
  commonMistakes: z.array(z.string()).default([]),
  media: exerciseMediaSchema.nullable().optional(),
  variationType: z.string().nullable().optional(),
  canonicalExerciseId: z.string().nullable().optional(),
  source: exerciseSourceSchema,
  sourceId: z.string().nullable().optional(),
  coachId: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
  usageCount: z.number().int().nonnegative().default(0),
  popularity: z.number().int().nonnegative().default(0),
})
export type ExerciseRecord = z.infer<typeof exerciseRecordSchema>

export type ExerciseMatchType =
  | 'exact_name'
  | 'exact_alias'
  | 'name_prefix'
  | 'alias_prefix'
  | 'token'
  | 'partial_name'
  | 'partial_alias'
  | 'search_term'
  | 'context'

export type ExerciseSearchHit = {
  exercise: ExerciseRecord
  score: number
  matchType: ExerciseMatchType
}

export type ExerciseSearchOptions = {
  context?: ExerciseSearchContext
  limit?: number
  /** Include inactive rows (admin tools). */
  includeInactive?: boolean
}

/** Raw seed JSON shape from traintrack-exercise-library-seed.json */
export const traintrackSeedExerciseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  aliases: z.array(z.string()).default([]),
  category: z.string().min(1),
  movementPattern: z.string().optional(),
  equipment: z.array(z.string()).default([]),
  primaryMuscles: z.array(z.string()).default([]),
  secondaryMuscles: z.array(z.string()).default([]),
  prescriptionTypes: z.array(z.string()).default([]),
  modalities: z.array(z.string()).default([]),
  source: z.string().optional(),
  searchTerms: z.array(z.string()).default([]),
})
export type TraintrackSeedExercise = z.infer<typeof traintrackSeedExerciseSchema>
