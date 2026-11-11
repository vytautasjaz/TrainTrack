import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { RaceLegKind, RaceType, WorkoutType } from '@prisma/client'
import { findRaceTargetForActivity } from '@/lib/strava/match-race'
import type { StravaActivity } from '@/lib/strava/types'

function activity(
  partial: Partial<StravaActivity> & Pick<StravaActivity, 'start_date_local'>,
): Pick<StravaActivity, 'type' | 'sport_type' | 'start_date_local'> {
  return {
    type: partial.type ?? 'Run',
    sport_type: partial.sport_type ?? 'Run',
    start_date_local: partial.start_date_local,
  }
}

describe('findRaceTargetForActivity', () => {
  it('matches a same-day single-sport race', () => {
    const target = findRaceTargetForActivity(
      [
        {
          id: 'race-1',
          date: '2026-11-09',
          type: RaceType.TEN_K,
          sport: WorkoutType.RUN,
          stravaActivityId: null,
        },
      ],
      activity({ start_date_local: '2026-11-09T09:00:00' }),
      new Set(),
      new Set(),
    )
    assert.deepEqual(target, { kind: 'race', raceId: 'race-1' })
  })

  it('skips when the race already has Strava', () => {
    const target = findRaceTargetForActivity(
      [
        {
          id: 'race-1',
          date: '2026-11-09',
          type: RaceType.TEN_K,
          sport: WorkoutType.RUN,
          stravaActivityId: 'already',
        },
      ],
      activity({ start_date_local: '2026-11-09T09:00:00' }),
      new Set(),
      new Set(),
    )
    assert.equal(target, null)
  })

  it('returns null when multiple races are eligible', () => {
    const target = findRaceTargetForActivity(
      [
        {
          id: 'race-1',
          date: '2026-11-09',
          type: RaceType.TEN_K,
          sport: WorkoutType.RUN,
          stravaActivityId: null,
        },
        {
          id: 'race-2',
          date: '2026-11-09',
          type: RaceType.FIVE_K,
          sport: WorkoutType.RUN,
          stravaActivityId: null,
        },
      ],
      activity({ start_date_local: '2026-11-09T09:00:00' }),
      new Set(),
      new Set(),
    )
    assert.equal(target, null)
  })

  it('matches a free triathlon leg by sport', () => {
    const target = findRaceTargetForActivity(
      [
        {
          id: 'tri-1',
          date: '2026-11-09',
          type: RaceType.TRIATHLON,
          sport: WorkoutType.TRIATHLON,
          stravaActivityId: null,
          legs: [
            { id: 'leg-swim', kind: RaceLegKind.SWIM, stravaActivityId: 'x' },
            { id: 'leg-bike', kind: RaceLegKind.BIKE, stravaActivityId: null },
            { id: 'leg-run', kind: RaceLegKind.RUN, stravaActivityId: null },
          ],
        },
      ],
      activity({
        type: 'Ride',
        sport_type: 'Ride',
        start_date_local: '2026-11-09T09:00:00',
      }),
      new Set(),
      new Set(),
    )
    assert.deepEqual(target, {
      kind: 'leg',
      raceId: 'tri-1',
      legId: 'leg-bike',
    })
  })
})
