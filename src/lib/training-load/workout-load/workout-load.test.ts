import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { SessionType, WorkoutType } from '@prisma/client'
import {
  aggregateDailyLoad,
  calculateWorkoutLoadFromFeatures,
  combineNormalizedLoads,
  featuresFromDistribution,
  sessionLoadClassFromWorkoutLoad,
} from '@/lib/training-load/workout-load'
import type { WorkoutStructure } from '@/lib/workout-builder/types'
import { calculateWorkoutLoad } from '@/lib/training-load/workout-load'

describe('workout load engine v1', () => {
  it('10 km easy ≈ low recovery, zero quality', () => {
    const features = featuresFromDistribution({
      sport: WorkoutType.RUN,
      sessionType: SessionType.EASY_RUN,
      pieces: [{ band: 'EASY', minutes: 55, km: 10 }],
    })
    const load = calculateWorkoutLoadFromFeatures(features)
    assert.ok(load.tss >= 30 && load.tss <= 55, `tss ${load.tss}`)
    assert.ok(load.cardiovascularLoad >= 25 && load.cardiovascularLoad <= 50)
    assert.equal(load.qualityLoad, 0)
    assert.ok(
      load.recoveryDemand < 45,
      `recovery ${load.recoveryDemand} should be LOW`,
    )
    assert.ok(['VERY_LOW', 'LOW'].includes(load.loadCategory))
    assert.equal(sessionLoadClassFromWorkoutLoad(load), 'LOW')
  })

  it('5 × 2 km threshold is high quality + high recovery', () => {
    const features = featuresFromDistribution({
      sport: WorkoutType.RUN,
      sessionType: SessionType.THRESHOLD,
      pieces: [
        { band: 'EASY', minutes: 20, km: 3.5 },
        { band: 'THRESHOLD', minutes: 45, km: 10 }, // 5×2 km ≈ 45′ at thr pace
        { band: 'RECOVERY', minutes: 8, km: 1.2 },
        { band: 'EASY', minutes: 10, km: 1.7 },
      ],
    })
    const load = calculateWorkoutLoadFromFeatures(features)
    assert.ok(load.tss >= 65, `tss ${load.tss}`)
    assert.ok(load.qualityLoad >= 70, `quality ${load.qualityLoad}`)
    assert.ok(load.cardiovascularLoad >= 70, `cv ${load.cardiovascularLoad}`)
    assert.ok(load.recoveryDemand >= 65, `recovery ${load.recoveryDemand}`)
    assert.ok(load.isQualitySession)
    assert.ok(load.isHighLoad)
  })

  it('30 km easy long: high mechanical, zero quality, still high recovery', () => {
    const features = featuresFromDistribution({
      sport: WorkoutType.RUN,
      sessionType: SessionType.LONG_RUN,
      pieces: [{ band: 'EASY', minutes: 165, km: 30 }],
    })
    const load = calculateWorkoutLoadFromFeatures(features)
    assert.equal(load.qualityLoad, 0)
    assert.ok(load.mechanicalLoad >= 85, `mech ${load.mechanicalLoad}`)
    assert.ok(load.muscularLoad >= 60, `muscular ${load.muscularLoad}`)
    assert.ok(load.tss >= 90, `tss ${load.tss}`)
    assert.ok(
      load.recoveryDemand >= 70,
      `30 km easy recovery ${load.recoveryDemand}`,
    )
    assert.ok(load.isHighLoad)
    assert.equal(load.isQualitySession, false)
  })

  it('28 km with 8 km HM pace is harder than easy long of similar distance', () => {
    const easy = calculateWorkoutLoadFromFeatures(
      featuresFromDistribution({
        sport: WorkoutType.RUN,
        sessionType: SessionType.LONG_RUN,
        pieces: [{ band: 'EASY', minutes: 155, km: 28 }],
      }),
    )
    const specific = calculateWorkoutLoadFromFeatures(
      featuresFromDistribution({
        sport: WorkoutType.RUN,
        sessionType: SessionType.LONG_RUN,
        pieces: [
          { band: 'EASY', minutes: 110, km: 20 },
          { band: 'HM_PACE', minutes: 36, km: 8 },
        ],
        tags: ['hm-specific'],
      }),
    )
    assert.ok(specific.qualityLoad > easy.qualityLoad)
    assert.ok(specific.recoveryDemand > easy.recoveryDemand)
    assert.ok(specific.cardiovascularLoad > easy.cardiovascularLoad)
  })

  it('combines double-threshold day with diminishing returns', () => {
    const am = calculateWorkoutLoadFromFeatures(
      featuresFromDistribution({
        sport: WorkoutType.RUN,
        sessionType: SessionType.THRESHOLD,
        pieces: [
          { band: 'EASY', minutes: 15, km: 2.5 },
          { band: 'THRESHOLD', minutes: 40, km: 9 },
          { band: 'EASY', minutes: 10, km: 1.7 },
        ],
      }),
    )
    const pm = calculateWorkoutLoadFromFeatures(
      featuresFromDistribution({
        sport: WorkoutType.RUN,
        sessionType: SessionType.THRESHOLD,
        pieces: [
          { band: 'EASY', minutes: 12, km: 2 },
          { band: 'THRESHOLD', minutes: 35, km: 8 },
          { band: 'EASY', minutes: 8, km: 1.4 },
        ],
      }),
    )
    const daily = aggregateDailyLoad([am, pm])
    assert.ok(daily.tss >= am.tss + pm.tss - 0.2)
    assert.ok(daily.recoveryDemand < am.recoveryDemand + pm.recoveryDemand)
    assert.ok(daily.recoveryDemand >= 70)
    assert.equal(daily.qualitySessionCount, 2)
    assert.ok(daily.isHighLoadDay)
    assert.equal(combineNormalizedLoads([60, 50]), 80)
  })

  it('calculates from real workout structure blocks', () => {
    const structure: WorkoutStructure = {
      warmup: [
        {
          id: 'w1',
          order: 0,
          type: 'CONTINUOUS',
          durationType: 'time',
          time: 15,
          targets: [{ type: 'rpe', value: 'Easy' }],
        },
      ],
      mainSet: [
        {
          id: 'm1',
          order: 0,
          type: 'INTERVAL',
          repetitions: 5,
          work: { mode: 'distance', value: 2, unit: 'km' },
          recovery: { mode: 'time', value: 2, unit: 'min' },
          targets: [
            { type: 'rpe', value: 'Threshold' },
            { type: 'rpe', value: 'Easy' },
          ],
        },
      ],
      cooldown: [
        {
          id: 'c1',
          order: 0,
          type: 'CONTINUOUS',
          durationType: 'time',
          time: 10,
          targets: [{ type: 'rpe', value: 'Easy' }],
        },
      ],
    }
    const load = calculateWorkoutLoad({
      structure,
      sport: WorkoutType.RUN,
      sessionType: SessionType.THRESHOLD,
    })
    assert.ok(load.features.thresholdMin > 0)
    assert.ok(load.qualityLoad >= 50)
    assert.ok(load.tss > 40)
    assert.equal(load.loadModelVersion, 'v1')
  })
})
