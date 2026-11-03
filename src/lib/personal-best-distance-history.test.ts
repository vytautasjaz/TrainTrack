import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { PersonalBestMetric, PersonalBestSport } from '@prisma/client'
import {
  buildPersonalBestDistanceHistory,
  previousPbChangeLabel,
} from '@/lib/personal-best-distance-history'
import type { PersonalBestHistoryRecord, PersonalBestRecord } from '@/lib/personal-bests'

const pb: PersonalBestRecord = {
  id: 'pb1',
  name: 'Marathon',
  sport: PersonalBestSport.RUN,
  presetKey: 'MARATHON',
  metric: PersonalBestMetric.TIME,
  value: 180,
  dateText: '2024-04-01',
  event: 'Boston',
  raceId: null,
  sortOrder: 0,
}

describe('buildPersonalBestDistanceHistory', () => {
  it('includes archived previous PBs with change metadata', () => {
    const history: PersonalBestHistoryRecord[] = [
      {
        id: 'h1',
        personalBestId: 'pb1',
        value: 195,
        metric: PersonalBestMetric.TIME,
        dateText: '2022',
        event: 'Berlin',
        raceId: null,
        supersededAt: '2024-04-02T10:00:00.000Z',
      },
    ]

    const entries = buildPersonalBestDistanceHistory([], pb, history)
    assert.equal(entries.length, 2)

    const previous = entries.find((e) => e.id === 'pb-history:h1')
    assert.ok(previous)
    assert.equal(previous.resultLabel, '3:15:00')
    assert.equal(previous.event, 'Berlin')
    assert.equal(previous.isPreviousPersonalBest, true)
    const label = previousPbChangeLabel(previous)
    assert.ok(label?.includes('Previous PB'))
    assert.ok(label?.includes('changed'))

    const current = entries.find((e) => e.id === 'pb:pb1')
    assert.equal(current?.isPersonalBestRecord, true)
  })
})
