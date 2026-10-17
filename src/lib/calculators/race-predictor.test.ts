import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { formatRaceTime } from './race-time'
import {
  predictionCaption,
  predictionConfidence,
  predictionDistanceRatio,
  predictionQuality,
  riegelPredictMinutes,
} from './race-predictor'

describe('riegelPredictMinutes', () => {
  it('returns null for non-positive inputs', () => {
    assert.equal(riegelPredictMinutes(0, 5, 10), null)
    assert.equal(riegelPredictMinutes(24.5, 0, 10), null)
    assert.equal(riegelPredictMinutes(24.5, 5, -1), null)
  })

  it('returns known time when distances match', () => {
    assert.equal(riegelPredictMinutes(24.5, 5, 5), 24.5)
  })

  it('matches the published 24:30 5K equivalents', () => {
    const t1 = 24.5
    const d1 = 5

    const tenK = riegelPredictMinutes(t1, d1, 10)
    assert.ok(tenK != null)
    assert.equal(formatRaceTime(tenK), '51:05')

    const half = riegelPredictMinutes(t1, d1, 21.0975)
    assert.ok(half != null)
    assert.equal(formatRaceTime(half), '1:52:42')

    const marathon = riegelPredictMinutes(t1, d1, 42.195)
    assert.ok(marathon != null)
    // Article rounds to ~3:55; exact Riegel is 3:54:59
    assert.equal(formatRaceTime(marathon), '3:54:59')
  })
})

describe('predictionConfidence', () => {
  it('scores high when ratio ≤ 2', () => {
    assert.equal(predictionDistanceRatio(5, 10), 2)
    assert.equal(predictionConfidence(5, 10)?.band, 'high')
    assert.equal(predictionConfidence(5, 5)?.band, 'high')
  })

  it('scores medium when ratio ≤ 4.5', () => {
    assert.equal(predictionConfidence(5, 21.0975)?.band, 'medium')
    assert.equal(predictionConfidence(10, 21.0975)?.band, 'medium')
  })

  it('scores low when ratio > 4.5', () => {
    assert.equal(predictionConfidence(5, 42.195)?.band, 'low')
  })
})

describe('predictionQuality', () => {
  it('splits band label from detail', () => {
    const minutes = riegelPredictMinutes(24.5, 5, 42.195)
    const quality = predictionQuality(5, 42.195, minutes, '5K')
    assert.equal(quality?.band, 'low')
    assert.equal(quality?.label, 'Low')
    assert.match(quality?.detail ?? '', /Far from 5K/)
  })

  it('notes when prediction exceeds Riegel range', () => {
    const minutes = riegelPredictMinutes(40, 5, 42.195)
    assert.ok(minutes != null)
    assert.ok(minutes > 230)
    const quality = predictionQuality(5, 42.195, minutes, '5K')
    assert.equal(quality?.outsideRange, true)
    assert.match(quality?.detail ?? '', /230/)
  })
})

describe('predictionCaption', () => {
  it('includes far-from caveat for low confidence', () => {
    const minutes = riegelPredictMinutes(24.5, 5, 42.195)
    const caption = predictionCaption(5, 42.195, minutes, '5K')
    assert.ok(caption?.includes('Low'))
    assert.ok(caption?.includes('Far from 5K'))
  })
})
