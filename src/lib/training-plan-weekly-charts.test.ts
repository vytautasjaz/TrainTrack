import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { SessionType, WorkoutType } from '@prisma/client'
import { buildPlanWeeklyChartSeries } from '@/lib/training-plan-weekly-charts'

describe('buildPlanWeeklyChartSeries', () => {
  it('aggregates mileage, TSS, and longest run by week', () => {
    const series = buildPlanWeeklyChartSeries({
      plan: {
        weekCount: 2,
        sportFocus: WorkoutType.RUN,
        sessions: [
          {
            id: '1',
            weekIndex: 0,
            dayOfWeek: 1,
            sortOrder: 0,
            type: WorkoutType.RUN,
            sessionType: SessionType.EASY_RUN,
            title: 'Easy',
            description: null,
            plannedDistance: 10,
            plannedDuration: 55,
            plannedDistanceMeters: null,
            coachNotes: null,
            coachNotesPrivate: false,
            tags: [],
            sourceTemplateId: null,
            structure: null,
          },
          {
            id: '2',
            weekIndex: 0,
            dayOfWeek: 5,
            sortOrder: 0,
            type: WorkoutType.RUN,
            sessionType: SessionType.LONG_RUN,
            title: 'Long run',
            description: null,
            plannedDistance: 22,
            plannedDuration: 120,
            plannedDistanceMeters: null,
            coachNotes: null,
            coachNotesPrivate: false,
            tags: ['long-run'],
            sourceTemplateId: null,
            structure: null,
          },
          {
            id: '3',
            weekIndex: 1,
            dayOfWeek: 5,
            sortOrder: 0,
            type: WorkoutType.RUN,
            sessionType: SessionType.LONG_RUN,
            title: 'Long run',
            description: null,
            plannedDistance: 24,
            plannedDuration: 130,
            plannedDistanceMeters: null,
            coachNotes: null,
            coachNotesPrivate: false,
            tags: ['long-run'],
            sourceTemplateId: null,
            structure: null,
          },
        ],
      },
    })

    assert.equal(series.length, 2)
    assert.equal(series[0]!.mileageKm, 32)
    assert.equal(series[0]!.longestRunKm, 22)
    assert.ok(series[0]!.tss > 0)
    assert.equal(series[1]!.longestRunKm, 24)
    assert.ok(series[1]!.mileageKm >= 24)
  })
})
