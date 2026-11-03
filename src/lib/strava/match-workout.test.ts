import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { WorkoutStatus, WorkoutType } from '@prisma/client'
import { findWorkoutForActivityInPool } from '@/lib/strava/match-workout'

const activity = {
  type: 'Run',
  sport_type: 'Run',
  start_date_local: '2026-10-08T07:30:00Z',
}

describe('findWorkoutForActivityInPool', () => {
  it('matches a same-day planned workout', () => {
    const planned = {
      id: 'tue',
      date: '2026-10-08',
      status: WorkoutStatus.PLANNED,
      type: WorkoutType.RUN,
      selfLogged: false,
      result: null,
    }
    const match = findWorkoutForActivityInPool([planned], activity, new Set())
    assert.equal(match?.workout.id, 'tue')
  })

  it('does not auto-match a planned workout on a nearby day', () => {
    const tuesday = {
      id: 'tue',
      date: '2026-10-07',
      status: WorkoutStatus.PLANNED,
      type: WorkoutType.RUN,
      selfLogged: false,
      result: null,
    }
    const match = findWorkoutForActivityInPool([tuesday], activity, new Set())
    assert.equal(match, null)
  })

  it('skips workouts already claimed or linked to Strava', () => {
    const planned = {
      id: 'wed',
      date: '2026-10-08',
      status: WorkoutStatus.PLANNED,
      type: WorkoutType.RUN,
      result: { stravaActivityId: '999' },
    }
    assert.equal(
      findWorkoutForActivityInPool([planned], activity, new Set()),
      null,
    )
    assert.equal(
      findWorkoutForActivityInPool(
        [{ ...planned, result: null }],
        activity,
        new Set(['wed']),
      ),
      null,
    )
  })

  it('matches planned STRENGTH when Strava type is generic Workout', () => {
    const planned = {
      id: 'gym',
      date: '2026-10-08',
      status: WorkoutStatus.PLANNED,
      type: WorkoutType.STRENGTH,
      selfLogged: false,
      result: null,
    }
    const workoutActivity = {
      type: 'Workout',
      sport_type: 'Workout',
      start_date_local: '2026-10-08T18:00:00',
    }
    const match = findWorkoutForActivityInPool([planned], workoutActivity, new Set())
    assert.equal(match?.workout.id, 'gym')
  })

  it('matches planned STRENGTH when only legacy type is Workout', () => {
    const planned = {
      id: 'gym',
      date: '2026-10-08',
      status: WorkoutStatus.PLANNED,
      type: WorkoutType.STRENGTH,
      result: null,
    }
    const workoutActivity = {
      type: 'Workout',
      sport_type: undefined,
      start_date_local: '2026-10-08T18:00:00',
    }
    const match = findWorkoutForActivityInPool([planned], workoutActivity, new Set())
    assert.equal(match?.workout.id, 'gym')
  })

  it('matches planned HYROX when Strava type is generic Workout', () => {
    const planned = {
      id: 'hyrox',
      date: '2026-10-08',
      status: WorkoutStatus.PLANNED,
      type: WorkoutType.HYROX,
      result: null,
    }
    const workoutActivity = {
      type: 'Workout',
      sport_type: 'Workout',
      start_date_local: '2026-10-08T18:00:00',
    }
    const match = findWorkoutForActivityInPool([planned], workoutActivity, new Set())
    assert.equal(match?.workout.id, 'hyrox')
  })

  it('matches planned HYROX when Strava type is Crossfit', () => {
    const planned = {
      id: 'hyrox',
      date: '2026-10-08',
      status: WorkoutStatus.PLANNED,
      type: WorkoutType.HYROX,
      result: null,
    }
    const crossfit = {
      type: 'Crossfit',
      sport_type: 'Crossfit',
      start_date_local: '2026-10-08T18:00:00',
    }
    const match = findWorkoutForActivityInPool([planned], crossfit, new Set())
    assert.equal(match?.workout.id, 'hyrox')
  })

  it('prefers STRENGTH over HYROX for Strava Workout when both are planned', () => {
    const strength = {
      id: 'strength',
      date: '2026-10-08',
      status: WorkoutStatus.PLANNED,
      type: WorkoutType.STRENGTH,
      result: null,
    }
    const hyrox = {
      id: 'hyrox',
      date: '2026-10-08',
      status: WorkoutStatus.PLANNED,
      type: WorkoutType.HYROX,
      result: null,
    }
    const workoutActivity = {
      type: 'Workout',
      sport_type: 'Workout',
      start_date_local: '2026-10-08T18:00:00',
    }
    // HYROX listed first — still prefer exact STRENGTH match for Workout.
    const match = findWorkoutForActivityInPool(
      [hyrox, strength],
      workoutActivity,
      new Set(),
    )
    assert.equal(match?.workout.id, 'strength')
  })

  it('prefers HYROX over STRENGTH for Strava Crossfit when both are planned', () => {
    const strength = {
      id: 'strength',
      date: '2026-10-08',
      status: WorkoutStatus.PLANNED,
      type: WorkoutType.STRENGTH,
      result: null,
    }
    const hyrox = {
      id: 'hyrox',
      date: '2026-10-08',
      status: WorkoutStatus.PLANNED,
      type: WorkoutType.HYROX,
      result: null,
    }
    const crossfit = {
      type: 'Crossfit',
      sport_type: 'Crossfit',
      start_date_local: '2026-10-08T18:00:00',
    }
    const match = findWorkoutForActivityInPool(
      [strength, hyrox],
      crossfit,
      new Set(),
    )
    assert.equal(match?.workout.id, 'hyrox')
  })
})
