import { describe, expect, it } from 'vitest'
import {
  createEmptyBlockV2,
  workoutStructureV2Schema,
} from './structure-v2'

describe('workoutStructureV2Schema', () => {
  it('accepts a strength session fixture (legacy sections → items)', () => {
    const fixture = {
      version: 2,
      sections: [
        {
          id: 's1',
          type: 'WARMUP',
          name: 'Warm Up',
          blocks: [
            {
              id: 'b1',
              type: 'CIRCUIT',
              rounds: 2,
              exercises: [
                {
                  exerciseId: 'air_squat',
                  name: 'Air Squats',
                  prescription: { mode: 'REPS', value: 10 },
                },
                {
                  exerciseId: 'push_up',
                  name: 'Push Ups',
                  prescription: { mode: 'REPS', value: 10 },
                },
              ],
            },
          ],
        },
        {
          id: 's2',
          type: 'STRENGTH',
          name: 'Strength',
          blocks: [
            {
              id: 'b2',
              type: 'SET',
              rounds: 4,
              rest: { type: 'TIME', value: 120, unit: 'sec' },
              exercises: [
                {
                  exerciseId: 'front_squat',
                  name: 'Front Squat',
                  prescription: { mode: 'REPS', value: 5 },
                  load: { type: 'ABSOLUTE', value: 60, unit: 'kg' },
                },
              ],
            },
            {
              id: 'b3',
              type: 'SUPERSET',
              rounds: 3,
              exercises: [
                {
                  exerciseId: 'pull_up',
                  order: 'A1',
                  prescription: { mode: 'REPS', value: 8 },
                },
                {
                  exerciseId: 'push_up',
                  order: 'A2',
                  prescription: { mode: 'REPS', value: 12 },
                },
              ],
            },
          ],
        },
        {
          id: 's3',
          type: 'COOLDOWN',
          blocks: [
            {
              id: 'b4',
              type: 'FREE_TEXT',
              text: 'Stretch hips and calves',
            },
          ],
        },
      ],
      coachNotes: 'Keep squat depth consistent',
    }

    const parsed = workoutStructureV2Schema.parse(fixture)
    expect(parsed.version).toBe(2)
    expect(parsed.items).toHaveLength(3)
    expect(parsed.items[0]?.kind).toBe('section')
    expect(parsed.items[1]?.kind).toBe('section')
    if (parsed.items[1]?.kind === 'section') {
      expect(parsed.items[1].blocks[0]?.type).toBe('SET')
    }
  })

  it('accepts root-level exercises and blocks as peers', () => {
    const fixture = {
      version: 2,
      items: [
        {
          kind: 'block',
          block: {
            id: 'e1',
            type: 'EXERCISE',
            exercise: {
              exerciseId: 'back_squat',
              name: 'Back Squat',
              prescription: { mode: 'REPS', value: 5 },
            },
          },
        },
        {
          kind: 'block',
          block: {
            id: 'b1',
            type: 'SET',
            rounds: 3,
            exercises: [
              {
                exerciseId: 'rdl',
                name: 'RDL',
                prescription: { mode: 'REPS', value: 8 },
              },
            ],
          },
        },
        {
          kind: 'section',
          id: 's1',
          type: 'CORE',
          name: 'Core',
          blocks: [],
        },
      ],
    }

    const parsed = workoutStructureV2Schema.parse(fixture)
    expect(parsed.items.map((i) => i.kind)).toEqual([
      'block',
      'block',
      'section',
    ])
    expect(
      parsed.items[0]?.kind === 'block' && parsed.items[0].block.type,
    ).toBe('EXERCISE')
  })

  it('accepts a HYROX race simulation fixture', () => {
    const fixture = {
      version: 2,
      sections: [
        {
          id: 's1',
          type: 'HYROX_SIMULATION',
          name: 'HYROX Sim',
          blocks: [
            {
              id: 'b1',
              type: 'RACE_SIMULATION',
              exercises: [
                {
                  exerciseId: 'run',
                  name: 'Run',
                  prescription: { mode: 'DISTANCE', value: 1, unit: 'km' },
                },
                {
                  exerciseId: 'ski',
                  name: 'SkiErg',
                  prescription: { mode: 'DISTANCE', value: 1000, unit: 'm' },
                },
                {
                  exerciseId: 'sledPush',
                  name: 'Sled Push',
                  prescription: { mode: 'DISTANCE', value: 50, unit: 'm' },
                  load: { type: 'COMPETITION', division: 'OPEN' },
                },
              ],
            },
            {
              id: 'b2',
              type: 'EMOM',
              rounds: 8,
              interval: { value: 60, unit: 'sec' },
              exercises: [
                {
                  exerciseId: 'burpees',
                  prescription: { mode: 'REPS', value: 5 },
                },
              ],
            },
            {
              id: 'b3',
              type: 'AMRAP',
              duration: { value: 12, unit: 'min' },
              exercises: [
                {
                  exerciseId: 'wallBalls',
                  prescription: { mode: 'REPS', value: 10 },
                },
              ],
            },
          ],
        },
      ],
    }

    const parsed = workoutStructureV2Schema.parse(fixture)
    expect(parsed.items[0]?.kind).toBe('section')
    if (parsed.items[0]?.kind === 'section') {
      expect(parsed.items[0].type).toBe('HYROX_SIMULATION')
      expect(parsed.items[0].blocks.map((b) => b.type)).toEqual([
        'RACE_SIMULATION',
        'EMOM',
        'AMRAP',
      ])
    }
  })

  it('createEmptyBlockV2 returns valid blocks for phase-1 types', () => {
    const types = [
      'SET',
      'CIRCUIT',
      'SUPERSET',
      'EMOM',
      'AMRAP',
      'FOR_TIME',
      'RACE_SIMULATION',
      'CONTINUOUS',
      'REST',
      'FREE_TEXT',
    ] as const

    for (const type of types) {
      const block = createEmptyBlockV2(type)
      const wrapped = workoutStructureV2Schema.parse({
        version: 2,
        items: [
          {
            kind: 'section',
            id: 's',
            type: 'STRENGTH',
            blocks: [block],
          },
        ],
      })
      expect(wrapped.items[0]?.kind).toBe('section')
      if (wrapped.items[0]?.kind === 'section') {
        expect(wrapped.items[0].blocks[0]?.type).toBe(type)
      }
    }
  })
})
