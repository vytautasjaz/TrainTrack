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
})
