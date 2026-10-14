import { describe, expect, it } from 'vitest'
import {
  formatBlockV2Title,
  isWorkoutStructureV2,
  migrateWorkoutStructureV1ToV2,
  normalizeWorkoutStructure,
  parseStructureForDisplay,
  parseStructureV1,
  prepareStructureForPersist,
  projectStructureV2ToV1,
} from './structure-compat'
import type { WorkoutStructure } from './types'
import type { WorkoutStructureV2 } from './structure-v2'

const v1Fixture: WorkoutStructure = {
  warmup: [
    {
      id: 'w1',
      order: 0,
      type: 'CONTINUOUS',
      durationType: 'time',
      time: 10,
      targets: [{ type: 'rpe', value: 'Easy' }],
    },
  ],
  mainSet: [
    {
      id: 'm1',
      order: 0,
      type: 'INTERVAL',
      repetitions: 5,
      work: { mode: 'distance', value: 400, unit: 'm' },
      recovery: { mode: 'time', value: 90, unit: 'sec' },
    },
  ],
  cooldown: [],
  coachNotes: 'Stay smooth',
}

const v2Fixture: WorkoutStructureV2 = {
  version: 2,
  items: [
    {
      kind: 'section',
      id: 's1',
      type: 'STRENGTH',
      name: 'Strength',
      blocks: [
        {
          id: 'b1',
          type: 'SET',
          rounds: 3,
          exercises: [
            {
              exerciseId: 'back_squat',
              name: 'Back Squat',
              prescription: { mode: 'REPS', value: 5 },
              load: { type: 'ABSOLUTE', value: 80, unit: 'kg' },
            },
          ],
          rest: { type: 'TIME', value: 120, unit: 'sec' },
        },
      ],
    },
  ],
  coachNotes: 'Brace hard',
}

describe('structure-compat', () => {
  it('detects v2', () => {
    expect(isWorkoutStructureV2(v2Fixture)).toBe(true)
    expect(isWorkoutStructureV2(v1Fixture)).toBe(false)
    expect(isWorkoutStructureV2(null)).toBe(false)
  })

  it('still parses v1 via parseStructureV1', () => {
    const parsed = parseStructureV1(v1Fixture)
    expect(parsed.warmup).toHaveLength(1)
    expect(parsed.mainSet[0]?.type).toBe('INTERVAL')
    expect(parsed.coachNotes).toBe('Stay smooth')
  })

  it('migrates v1 → v2 with section items', () => {
    const v2 = migrateWorkoutStructureV1ToV2(v1Fixture)
    expect(v2.version).toBe(2)
    expect(
      v2.items.some((s) => s.kind === 'section' && s.type === 'WARMUP'),
    ).toBe(true)
    expect(
      v2.items.some((s) => s.kind === 'section' && s.type === 'MAIN_SET'),
    ).toBe(true)
    expect(v2.coachNotes).toBe('Stay smooth')
  })

  it('projects root-level exercises into main set with exercise title', () => {
    const flat: WorkoutStructureV2 = {
      version: 2,
      items: [
        {
          kind: 'block',
          block: {
            id: 'e1',
            type: 'EXERCISE',
            exercise: {
              exerciseId: 'push_up',
              name: 'Push Ups',
              prescription: { mode: 'REPS', value: 20 },
              load: { type: 'ABSOLUTE', value: 20, unit: 'kg' },
            },
          },
        },
      ],
    }
    const projected = projectStructureV2ToV1(flat)
    expect(projected.mainSet).toHaveLength(1)
    expect(projected.mainSet[0]?.name).toBe('Push Ups')
    expect(projected.mainSet[0]?.text).toMatch(/20 reps/)
    expect(projected.mainSet[0]?.text).toMatch(/20kg/)
    expect(projected.mainSet[0]?.name).not.toMatch(/Coach Notes/i)
  })

  it('projects v2 sections with headers and named blocks (not Coach Notes)', () => {
    const projected = projectStructureV2ToV1(v2Fixture)
    expect(projected.mainSet.length).toBeGreaterThan(1)
    expect(projected.mainSet[0]?.name).toBe('Strength')
    expect(projected.mainSet[0]?.text).toBe('')
    const setBlock = projected.mainSet[1]
    expect(setBlock?.type).toBe('FREE_TEXT')
    expect(setBlock?.name).toMatch(/Set/i)
    expect(setBlock?.text).toMatch(/Back Squat/i)
    expect(setBlock?.text).toMatch(/5 reps/)
    expect(setBlock?.name).not.toMatch(/Coach Notes/i)
    expect(projected.coachNotes).toBe('Brace hard')
  })

  it('parseStructureForDisplay projects v2', () => {
    const display = parseStructureForDisplay(v2Fixture)
    expect(display.mainSet[0]?.type).toBe('FREE_TEXT')
  })

  it('normalizeWorkoutStructure picks the right version', () => {
    expect(normalizeWorkoutStructure(v2Fixture).version).toBe(2)
    expect(normalizeWorkoutStructure(v1Fixture).version).toBe(1)
  })

  it('prepareStructureForPersist keeps raw v2', () => {
    const prepared = prepareStructureForPersist(v2Fixture)
    expect(prepared.shouldSave).toBe(true)
    expect(prepared.stored).toMatchObject({ version: 2 })
    expect(prepared.display.mainSet.length).toBeGreaterThan(0)
  })

  it('prepareStructureForPersist keeps v1 buckets', () => {
    const prepared = prepareStructureForPersist(v1Fixture)
    expect(prepared.shouldSave).toBe(true)
    expect(prepared.stored).toMatchObject({
      warmup: expect.any(Array),
      mainSet: expect.any(Array),
    })
    expect(
      prepared.stored && 'version' in prepared.stored
        ? prepared.stored.version
        : undefined,
    ).toBeUndefined()
  })

  it('formatBlockV2Title includes AMRAP duration, EMOM interval, set rounds+rest', () => {
    expect(
      formatBlockV2Title({
        id: 'a1',
        type: 'AMRAP',
        duration: { value: 12, unit: 'min' },
        exercises: [],
      }),
    ).toBe('AMRAP · 12 min')

    expect(
      formatBlockV2Title({
        id: 'e1',
        type: 'EMOM',
        rounds: 8,
        interval: { value: 60, unit: 'sec' },
        exercises: [],
      }),
    ).toBe('EMOM · 8 × 1 min')

    expect(
      formatBlockV2Title({
        id: 's1',
        type: 'SET',
        rounds: 3,
        rest: { type: 'TIME', value: 90, unit: 'sec' },
        exercises: [],
      }),
    ).toBe('Set · 3× · Rest 90 sec')

    expect(
      formatBlockV2Title({
        id: 'f1',
        type: 'FOR_TIME',
        rounds: 5,
        timeCap: { value: 20, unit: 'min' },
        exercises: [],
      }),
    ).toBe('For Time · 5 rounds · cap 20 min')
  })
})
