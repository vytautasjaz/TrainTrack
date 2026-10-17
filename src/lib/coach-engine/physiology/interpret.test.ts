import { describe, expect, it } from 'vitest'
import {
  rateProfileMetric,
  rateTrainingResponse,
  trainingResponseInsight,
} from './interpret'

describe('rateProfileMetric', () => {
  it('uses training-state labels, not population grades', () => {
    expect(rateProfileMetric('aerobicStrength', 30, null).label).toBe(
      'Needs attention',
    )
    expect(rateProfileMetric('aerobicStrength', 50, null).label).toBe(
      'Developing',
    )
    expect(rateProfileMetric('aerobicStrength', 70, null).label).toBe('Good')
    expect(rateProfileMetric('aerobicStrength', 90, null).label).toBe(
      'Very strong',
    )
  })

  it('compares aerobic base to threshold when context is present', () => {
    const r = rateProfileMetric('aerobicStrength', 55, null, {
      thresholdCapacity: 88,
    })
    expect(r.label).toBe('Developing')
    expect(r.insight.toLowerCase()).toContain('behind')
  })

  it('treats high overreach as needs attention (inverted)', () => {
    const high = rateProfileMetric('overreachRisk', 85, null)
    expect(high.tone).toBe('bad')
    expect(high.label).toBe('Needs attention')

    const low = rateProfileMetric('overreachRisk', 20, null)
    expect(low.tone).toBe('great')
    expect(low.label).toBe('Low risk')
  })

  it('rates weekly volume against productive range', () => {
    const below = rateProfileMetric('volumeTolerance', 26, {
      current: 26.6,
      optimal: 36,
      upperLimit: 41,
    })
    expect(below.label).toBe('Below target')
    expect(below.insight).toContain('36')

    const onTrack = rateProfileMetric('volumeTolerance', 40, {
      current: 40,
      optimal: 42,
      upperLimit: 55,
    })
    expect(onTrack.label).toBe('On track')
  })

  it('rates long-run distance with coach language', () => {
    const short = rateProfileMetric('longRunTolerance', 14.7, null)
    expect(short.label).toBe('Developing')
    expect(short.insight.toLowerCase()).toContain('gradually')

    const strong = rateProfileMetric('longRunTolerance', 32, null)
    expect(strong.label).toBe('Very strong')
  })
})

describe('rateTrainingResponse', () => {
  it('labels strong historical response', () => {
    const r = rateTrainingResponse(0.9)
    expect(r.tone).toBe('great')
    expect(r.label).toBe('Very strong')
  })

  it('adapts response blurbs by strength', () => {
    expect(trainingResponseInsight('threshold', 0.9)).toContain('strongest')
    expect(trainingResponseInsight('vo2', 0.5).toLowerCase()).toContain(
      'stronger',
    )
  })
})
