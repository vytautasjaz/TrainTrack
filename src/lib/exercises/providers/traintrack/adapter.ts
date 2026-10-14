import { readFileSync } from 'node:fs'
import path from 'node:path'
import {
  EXERCISE_CANONICAL_MAP,
  variationTypeFor,
} from '@/lib/exercises/canonical-map'
import { buildSearchBlob, tokenizeSearchText } from '@/lib/exercises/normalize'
import type { ExerciseProvider } from '@/lib/exercises/providers/types'
import type { ExternalExercise } from '@/lib/exercises/providers/types'
import {
  traintrackSeedExerciseSchema,
  type ExerciseRecord,
  type TraintrackSeedExercise,
} from '@/lib/exercises/types'

export const TRAINTRACK_SEED_RELATIVE_PATH =
  'data/exercises/traintrack-exercise-library-seed.json'

export function resolveTraintrackSeedPath(cwd = process.cwd()): string {
  return path.join(cwd, TRAINTRACK_SEED_RELATIVE_PATH)
}

export function loadTraintrackSeedFile(
  cwd = process.cwd(),
): TraintrackSeedExercise[] {
  const raw = JSON.parse(
    readFileSync(resolveTraintrackSeedPath(cwd), 'utf8'),
  ) as unknown
  if (!Array.isArray(raw)) {
    throw new Error('TrainTrack exercise seed must be a JSON array')
  }
  return raw.map((row, i) => {
    const parsed = traintrackSeedExerciseSchema.safeParse(row)
    if (!parsed.success) {
      throw new Error(
        `Invalid seed row at index ${i}: ${parsed.error.message}`,
      )
    }
    return parsed.data
  })
}

export function seedRowToExternal(
  row: TraintrackSeedExercise,
): ExternalExercise {
  return {
    source: 'TRAINTRACK',
    sourceId: row.id,
    name: row.name,
    aliases: row.aliases,
    category: row.category,
    movementPattern: row.movementPattern,
    equipment: row.equipment,
    primaryMuscles: row.primaryMuscles,
    secondaryMuscles: row.secondaryMuscles,
    prescriptionTypes: row.prescriptionTypes,
    modalities: row.modalities,
    searchTerms: row.searchTerms,
    raw: { seedSource: row.source ?? 'traintrack_curated_seed' },
  }
}

export function normalizeTraintrackExternal(
  external: ExternalExercise,
): ExerciseRecord {
  const id = external.sourceId
  const canonicalExerciseId = EXERCISE_CANONICAL_MAP[id] ?? null
  const aliases = [...new Set(external.aliases ?? [])]
  const searchTerms = [
    ...new Set([
      ...(external.searchTerms ?? []),
      ...tokenizeSearchText(external.name),
      ...aliases.flatMap((a) => tokenizeSearchText(a)),
    ]),
  ]
  const blobTerms = tokenizeSearchText(
    buildSearchBlob({
      canonicalName: external.name,
      aliases,
      searchTerms,
      equipment: external.equipment,
      movementPattern: external.movementPattern,
    }),
  )

  return {
    id,
    canonicalName: external.name,
    aliases,
    searchTerms: [...new Set([...searchTerms, ...blobTerms])],
    category: external.category ?? 'STRENGTH',
    movementPattern: external.movementPattern ?? null,
    equipment: external.equipment ?? [],
    primaryMuscles: external.primaryMuscles ?? [],
    secondaryMuscles: external.secondaryMuscles ?? [],
    prescriptionTypes: external.prescriptionTypes ?? [],
    modalities: external.modalities ?? [],
    difficulty: external.difficulty ?? null,
    instructions: external.instructions ?? null,
    shortDescription: external.shortDescription ?? null,
    coachingCues: external.coachingCues ?? [],
    commonMistakes: external.commonMistakes ?? [],
    media: external.media ?? null,
    variationType: canonicalExerciseId
      ? variationTypeFor(id, canonicalExerciseId)
      : null,
    canonicalExerciseId,
    source: 'TRAINTRACK',
    sourceId: id,
    coachId: null,
    isActive: true,
    usageCount: 0,
    popularity: 0,
  }
}

export const traintrackProvider: ExerciseProvider = {
  id: 'traintrack',
  name: 'TrainTrack Curated',
  source: 'TRAINTRACK',
  capabilities: {
    instructions: false,
    muscles: true,
    equipment: true,
    allowRedistribution: true,
  },
  async import() {
    return loadTraintrackSeedFile().map(seedRowToExternal)
  },
  toNormalized(external) {
    return normalizeTraintrackExternal(external)
  },
}
