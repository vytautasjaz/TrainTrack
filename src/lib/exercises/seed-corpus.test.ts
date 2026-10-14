import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { EXERCISE_CANONICAL_MAP } from '@/lib/exercises/canonical-map'
import { loadSeedExerciseCorpus } from '@/lib/exercises/seed-corpus'

describe('exercise seed corpus', () => {
  it('is stable across repeated loads (idempotent shape)', () => {
    const a = loadSeedExerciseCorpus()
    const b = loadSeedExerciseCorpus()
    assert.equal(a.length, b.length)
    assert.deepEqual(
      a.map((e) => e.id),
      b.map((e) => e.id),
    )
  })

  it('applies curated canonical links for known variations', () => {
    const corpus = loadSeedExerciseCorpus()
    const byId = new Map(corpus.map((e) => [e.id, e]))
    let linked = 0
    for (const [variationId, canonicalId] of Object.entries(
      EXERCISE_CANONICAL_MAP,
    )) {
      const variation = byId.get(variationId)
      const canonical = byId.get(canonicalId)
      if (!variation || !canonical) continue
      assert.equal(variation.canonicalExerciseId, canonicalId)
      linked += 1
    }
    assert.ok(linked >= 5, `expected several linked variations, got ${linked}`)
  })
})
