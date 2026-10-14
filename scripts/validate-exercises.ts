/**
 * Validate curated seed + search smoke checks (no DB required).
 *
 *   npm run exercises:validate
 */
import { loadSeedExerciseCorpus } from '@/lib/exercises/seed-corpus'
import { searchExercises } from '@/lib/exercises/search'
import { assertExerciseIdInCorpus } from '@/lib/exercises/validate'

const corpus = loadSeedExerciseCorpus()
console.log(`Seed corpus: ${corpus.length} exercises`)

if (corpus.length < 300) {
  throw new Error(`Expected ~346 seeded exercises, got ${corpus.length}`)
}

const ids = new Set(corpus.map((e) => e.id))
const cases: { q: string; expectId: string; context?: 'HYROX' | 'STRENGTH' }[] =
  [
    { q: 'rdl', expectId: 'romanian_deadlift' },
    { q: 'farmers', expectId: 'farmer_carry' },
    { q: 'wallball', expectId: 'wall_ball' },
    { q: 'ski erg', expectId: 'skierg' },
    { q: 'bbj', expectId: 'burpee_broad_jump' },
    { q: 'sled', expectId: 'sled_push', context: 'HYROX' },
  ]

for (const c of cases) {
  const hits = searchExercises(corpus, c.q, {
    context: c.context,
    limit: 5,
  })
  const top = hits[0]?.exercise.id
  if (top !== c.expectId) {
    // sled may return sled_pull equally — accept either HYROX sled*
    if (c.q === 'sled' && top?.startsWith('sled_')) {
      console.log(`ok  "${c.q}" → ${top}`)
      continue
    }
    throw new Error(
      `Search "${c.q}" expected ${c.expectId}, got ${top ?? 'none'}`,
    )
  }
  console.log(`ok  "${c.q}" → ${top}`)
}

assertExerciseIdInCorpus('back_squat', ids)
try {
  assertExerciseIdInCorpus('not_a_real_exercise_zzz', ids)
  throw new Error('expected unknown id to fail')
} catch (e) {
  if (!(e instanceof Error) || !e.message.includes('Unknown exerciseId')) {
    throw e
  }
  console.log('ok  unknown exerciseId rejected')
}

console.log('\nValidation passed.')
