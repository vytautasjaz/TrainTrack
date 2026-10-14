import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { loadSeedExerciseCorpus } from '@/lib/exercises/seed-corpus'
import { searchExercises } from '@/lib/exercises/search'
import { assertExerciseIdInCorpus } from '@/lib/exercises/validate'

const corpus = loadSeedExerciseCorpus()

describe('exercise search', () => {
  it('loads curated seed corpus', () => {
    assert.ok(corpus.length >= 300)
  })

  it('rdl → Romanian Deadlift', () => {
    const hits = searchExercises(corpus, 'rdl', { limit: 5 })
    assert.equal(hits[0]?.exercise.id, 'romanian_deadlift')
  })

  it('farmers → Farmer Carry', () => {
    const hits = searchExercises(corpus, 'farmers', { limit: 5 })
    assert.equal(hits[0]?.exercise.id, 'farmer_carry')
  })

  it('wallball → Wall Ball', () => {
    const hits = searchExercises(corpus, 'wallball', { limit: 5 })
    assert.equal(hits[0]?.exercise.id, 'wall_ball')
  })

  it('ski erg → SkiErg', () => {
    const hits = searchExercises(corpus, 'ski erg', { limit: 5 })
    assert.equal(hits[0]?.exercise.id, 'skierg')
  })

  it('bbj → Burpee Broad Jump', () => {
    const hits = searchExercises(corpus, 'bbj', { limit: 5 })
    assert.equal(hits[0]?.exercise.id, 'burpee_broad_jump')
  })

  it('HYROX + sled ranks sled movements highly', () => {
    const hits = searchExercises(corpus, 'sled', {
      context: 'HYROX',
      limit: 8,
    })
    assert.ok(hits.length > 0)
    assert.ok(
      hits
        .slice(0, 3)
        .every(
          (h) =>
            h.exercise.id.includes('sled') ||
            h.exercise.canonicalName.toLowerCase().includes('sled'),
        ),
    )
  })

  it('STRENGTH + squat ranks squat family highly', () => {
    const hits = searchExercises(corpus, 'squat', {
      context: 'STRENGTH',
      limit: 8,
    })
    assert.ok(hits.length > 0)
    assert.ok(
      hits
        .slice(0, 6)
        .some((h) => /squat/i.test(h.exercise.canonicalName)),
    )
    assert.ok(hits.some((h) => h.exercise.id === 'back_squat'))
  })

  it('canonical Romanian Deadlift ranks above random romanian variants for rdl', () => {
    const hits = searchExercises(corpus, 'rdl', { limit: 5 })
    assert.equal(hits[0]?.exercise.id, 'romanian_deadlift')
    assert.ok(
      !hits.slice(1).some((h) => h.score >= (hits[0]?.score ?? 0) && h.exercise.id !== 'romanian_deadlift'),
    )
  })

  it('rejects unknown exercise ids', () => {
    const ids = corpus.map((e) => e.id)
    assert.throws(() => assertExerciseIdInCorpus('nope_zzz', ids), /Unknown/)
    assert.doesNotThrow(() => assertExerciseIdInCorpus('back_squat', ids))
  })
})
