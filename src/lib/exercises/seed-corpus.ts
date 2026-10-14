import seedJson from '../../../data/exercises/traintrack-exercise-library-seed.json'
import {
  normalizeTraintrackExternal,
  seedRowToExternal,
} from '@/lib/exercises/providers/traintrack/adapter'
import {
  traintrackSeedExerciseSchema,
  type ExerciseRecord,
} from '@/lib/exercises/types'

/** In-memory TrainTrack curated corpus (no DB). Used by tests + DB-empty fallback. */
export function loadSeedExerciseCorpus(): ExerciseRecord[] {
  if (!Array.isArray(seedJson)) return []
  const out: ExerciseRecord[] = []
  for (const row of seedJson) {
    const parsed = traintrackSeedExerciseSchema.safeParse(row)
    if (!parsed.success) continue
    out.push(normalizeTraintrackExternal(seedRowToExternal(parsed.data)))
  }
  return out
}
