import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { parseDateOnly } from '@/lib/dates'
import { preparationWeeksFromThisWeekToRace } from '@/lib/race-preparation'

describe('preparationWeeksFromThisWeekToRace', () => {
  it('counts inclusive weeks from this Monday through race week', () => {
    // Monday 2026-10-05 → race Sunday 2026-11-01 (week of Mon 2026-10-26)
    // weeks: Oct 5, 12, 19, 26 → 4
    const today = parseDateOnly('2026-10-07') // Wed in week of Oct 5
    assert.equal(
      preparationWeeksFromThisWeekToRace('2026-11-01', today),
      4,
    )
  })

  it('returns 1 when the race is this week', () => {
    const today = parseDateOnly('2026-10-07')
    assert.equal(
      preparationWeeksFromThisWeekToRace('2026-10-10', today),
      1,
    )
  })

  it('returns null when the race week is already past', () => {
    const today = parseDateOnly('2026-10-14')
    assert.equal(
      preparationWeeksFromThisWeekToRace('2026-10-10', today),
      null,
    )
  })
})
