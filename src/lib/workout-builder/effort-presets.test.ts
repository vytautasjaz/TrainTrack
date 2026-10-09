import { describe, expect, it } from 'vitest'
import {
  normalizeStructureIntensities,
  normalizeTargetsForBuilder,
  numericRpeToEffort,
} from './effort-presets'

describe('numericRpeToEffort', () => {
  it('maps Borg-style numbers and ranges to named efforts', () => {
    expect(numericRpeToEffort('1')).toBe('Recovery')
    expect(numericRpeToEffort('1–2')).toBe('Recovery')
    expect(numericRpeToEffort('2–3')).toBe('Easy')
    expect(numericRpeToEffort('4')).toBe('Moderate')
    expect(numericRpeToEffort('6–7')).toBe('Threshold')
    expect(numericRpeToEffort('8–9')).toBe('Max')
  })
})

describe('normalizeTargetsForBuilder', () => {
  it('collapses Easy pace + numeric RPE into a single Effort', () => {
    expect(
      normalizeTargetsForBuilder([
        { type: 'pace', value: 'Easy' },
        { type: 'rpe', value: '2–3' },
      ]),
    ).toEqual([{ type: 'rpe', value: 'Easy' }])
  })

  it('keeps race pace and drops companion numeric RPE', () => {
    expect(
      normalizeTargetsForBuilder([
        { type: 'pace', value: 'HM Pace' },
        { type: 'rpe', value: '6–7' },
      ]),
    ).toEqual([{ type: 'pace', value: 'HM Pace' }])
  })

  it('normalizes lone numeric RPE', () => {
    expect(normalizeTargetsForBuilder([{ type: 'rpe', value: '1–2' }])).toEqual(
      [{ type: 'rpe', value: 'Recovery' }],
    )
  })
})

describe('normalizeStructureIntensities', () => {
  it('rewrites blocks so athlete copy shows named efforts', () => {
    const next = normalizeStructureIntensities({
      warmup: [
        {
          id: 'wu',
          order: 0,
          type: 'CONTINUOUS',
          durationType: 'distance',
          distance: 7,
          distanceUnit: 'km',
          targets: [
            { type: 'pace', value: 'Easy' },
            { type: 'rpe', value: '2–3' },
          ],
        },
      ],
      mainSet: [
        {
          id: 'main',
          order: 0,
          type: 'CONTINUOUS',
          durationType: 'distance',
          distance: 3,
          distanceUnit: 'km',
          targets: [
            { type: 'pace', value: 'Steady' },
            { type: 'rpe', value: '4' },
          ],
        },
      ],
      cooldown: [
        {
          id: 'cd',
          order: 0,
          type: 'CONTINUOUS',
          durationType: 'time',
          time: 2,
          targets: [{ type: 'rpe', value: '1–2' }],
        },
      ],
    })
    expect(next?.warmup[0]?.targets).toEqual([{ type: 'rpe', value: 'Easy' }])
    expect(next?.mainSet[0]?.targets).toEqual([
      { type: 'rpe', value: 'Steady' },
    ])
    expect(next?.cooldown[0]?.targets).toEqual([
      { type: 'rpe', value: 'Recovery' },
    ])
  })
})
