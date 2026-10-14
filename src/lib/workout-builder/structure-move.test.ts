import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  applyStructureMove,
  type StructureDragSource,
  type StructureDropTarget,
} from './structure-move'
import {
  createEmptyBlockV2,
  createEmptyExerciseItem,
  newStructureId,
  sectionRootItem,
  type WorkoutSectionV2,
  type WorkoutStructureV2,
} from './structure-v2'

function ex(name: string) {
  return createEmptyExerciseItem({
    exerciseId: name,
    name,
  })
}

function section(
  type: WorkoutSectionV2['type'],
  blocks: WorkoutSectionV2['blocks'],
): WorkoutSectionV2 {
  return {
    id: newStructureId(),
    type,
    name: type,
    blocks,
  }
}

function structureWithTwoSections(): WorkoutStructureV2 {
  return {
    version: 2,
    items: [
      sectionRootItem(
        section('WARMUP', [
          { ...createEmptyBlockV2('EXERCISE'), exercise: ex('A') },
          {
            ...createEmptyBlockV2('EMOM'),
            exercises: [ex('B'), ex('C')],
          },
        ]),
      ),
      sectionRootItem(
        section('STRENGTH', [
          {
            ...createEmptyBlockV2('AMRAP'),
            exercises: [ex('D')],
          },
        ]),
      ),
    ],
  }
}

describe('applyStructureMove', () => {
  it('moves a block from one section to another', () => {
    const structure = structureWithTwoSections()
    const source: StructureDragSource = {
      kind: 'sectionBlock',
      sectionRootIndex: 0,
      blockIndex: 1,
    }
    const target: StructureDropTarget = {
      kind: 'section',
      sectionRootIndex: 1,
      insertAt: 0,
    }
    const next = applyStructureMove(structure, source, target)
    assert.ok(next)
    const warm = next.items[0]
    const strength = next.items[1]
    assert.equal(warm?.kind, 'section')
    assert.equal(strength?.kind, 'section')
    if (warm?.kind !== 'section' || strength?.kind !== 'section') return
    assert.equal(warm.blocks.length, 1)
    assert.equal(strength.blocks.length, 2)
    assert.equal(strength.blocks[0]?.type, 'EMOM')
  })

  it('pulls a block out of a section onto the root', () => {
    const structure = structureWithTwoSections()
    const next = applyStructureMove(
      structure,
      { kind: 'sectionBlock', sectionRootIndex: 0, blockIndex: 0 },
      { kind: 'root', insertAt: 2 },
    )
    assert.ok(next)
    assert.equal(next.items.length, 3)
    assert.equal(next.items[2]?.kind, 'block')
    const warm = next.items[0]
    assert.equal(warm?.kind, 'section')
    if (warm?.kind === 'section') assert.equal(warm.blocks.length, 1)
  })

  it('moves a nested exercise between blocks', () => {
    const structure = structureWithTwoSections()
    const next = applyStructureMove(
      structure,
      {
        kind: 'exercise',
        container: { kind: 'section', sectionRootIndex: 0, blockIndex: 1 },
        exerciseIndex: 0,
      },
      {
        kind: 'blockExercises',
        container: { kind: 'section', sectionRootIndex: 1, blockIndex: 0 },
        insertAt: 1,
      },
    )
    assert.ok(next)
    const warm = next.items[0]
    const strength = next.items[1]
    assert.equal(warm?.kind, 'section')
    assert.equal(strength?.kind, 'section')
    if (warm?.kind !== 'section' || strength?.kind !== 'section') return
    const emom = warm.blocks[1]
    const amrap = strength.blocks[0]
    assert.equal(emom && 'exercises' in emom ? emom.exercises?.length : 0, 1)
    assert.deepEqual(
      amrap && 'exercises' in amrap
        ? amrap.exercises?.map((e) => e.exerciseId)
        : [],
      ['D', 'B'],
    )
  })

  it('lifts a nested exercise out of a section onto the root', () => {
    const structure = structureWithTwoSections()
    const next = applyStructureMove(
      structure,
      {
        kind: 'exercise',
        container: { kind: 'section', sectionRootIndex: 0, blockIndex: 1 },
        exerciseIndex: 1,
      },
      { kind: 'root', insertAt: 0 },
    )
    assert.ok(next)
    assert.equal(next.items[0]?.kind, 'block')
    if (next.items[0]?.kind === 'block') {
      assert.equal(next.items[0].block.type, 'EXERCISE')
    }
  })
})
