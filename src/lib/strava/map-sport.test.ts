import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { WorkoutType } from '@prisma/client'
import {
  mapStravaTypeToWorkoutType,
  resolveStravaActivityWorkoutType,
  workoutTypesCompatible,
} from '@/lib/strava/map-sport'

describe('mapStravaTypeToWorkoutType', () => {
  it('maps Strava Workout and WeightTraining to STRENGTH', () => {
    assert.equal(mapStravaTypeToWorkoutType('Workout'), WorkoutType.STRENGTH)
    assert.equal(mapStravaTypeToWorkoutType('WeightTraining'), WorkoutType.STRENGTH)
    assert.equal(mapStravaTypeToWorkoutType('workout'), WorkoutType.STRENGTH)
  })
})

describe('resolveStravaActivityWorkoutType', () => {
  it('falls back to type when sport_type is unmapped', () => {
    assert.equal(
      resolveStravaActivityWorkoutType({
        sport_type: 'SomeFutureGymType',
        type: 'Workout',
      }),
      WorkoutType.STRENGTH,
    )
  })

  it('uses sport_type when mapped', () => {
    assert.equal(
      resolveStravaActivityWorkoutType({
        sport_type: 'WeightTraining',
        type: 'Workout',
      }),
      WorkoutType.STRENGTH,
    )
  })
})

describe('workoutTypesCompatible', () => {
  it('treats STRENGTH and HYROX as interchangeable for gym-style sessions', () => {
    assert.equal(
      workoutTypesCompatible(WorkoutType.STRENGTH, WorkoutType.HYROX),
      true,
    )
    assert.equal(
      workoutTypesCompatible(WorkoutType.HYROX, WorkoutType.STRENGTH),
      true,
    )
  })
})
