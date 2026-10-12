'use server'

import { requireAthleteSession } from '@/lib/session'
import {
  getDayNotesForRange,
  getPlanWorkoutsInRange,
  getSeasonEventsForRange,
  groupDayNotesByDate,
} from '@/lib/queries'
import {
  redactPlanWorkoutNotesForViewer,
  toPlanWorkoutDetail,
  type PlanWorkoutDetail,
} from '@/lib/plan-workout'
import type { DayNoteData } from '@/lib/day-notes'
import type { SeasonEventData } from '@/lib/season-planner'
import {
  addDateOnlyDays,
  startOfWeekDateOnly,
  todayDateOnly,
  toDateKey,
} from '@/lib/dates'

/** Keep in sync with HOME_V2_WEEK_CHUNK in home-week-utils. */
const WEEK_CHUNK = 4

export type AthleteHomeWeekChunk = {
  workouts: PlanWorkoutDetail[]
  dayNotes: Array<DayNoteData & { dateKey: string }>
  seasonEvents: SeasonEventData[]
  windowStartKey: string
  windowEndKey: string
  startOffset: number
  endOffset: number
}

/**
 * Lazy-load a contiguous week window for athlete home swipe.
 * Offsets are relative to the current calendar week (0 = this week).
 */
export async function fetchAthleteHomeWeekChunk(input: {
  startOffset: number
  /** Inclusive end week offset. Defaults to startOffset + chunk - 1. */
  endOffset?: number
}): Promise<AthleteHomeWeekChunk> {
  const session = await requireAthleteSession()
  const athleteId = session.athleteId

  const startOffset = Math.trunc(input.startOffset)
  const endOffset = Math.trunc(
    input.endOffset ?? startOffset + WEEK_CHUNK - 1,
  )
  if (endOffset < startOffset) {
    throw new Error('Invalid week range')
  }
  // Cap one request (~16 weeks) so a runaway client can't pull huge ranges.
  if (endOffset - startOffset + 1 > WEEK_CHUNK * 4) {
    throw new Error('Range too large')
  }

  const anchor = startOfWeekDateOnly(todayDateOnly())
  const rangeStart = addDateOnlyDays(anchor, startOffset * 7)
  const rangeEnd = addDateOnlyDays(anchor, endOffset * 7 + 6)

  const [rawWorkouts, dayNotesRaw, seasonEvents] = await Promise.all([
    getPlanWorkoutsInRange(athleteId, rangeStart, rangeEnd),
    getDayNotesForRange(athleteId, rangeStart, rangeEnd),
    getSeasonEventsForRange(athleteId, rangeStart, rangeEnd, 'athlete'),
  ])

  const workouts = rawWorkouts.map((w) =>
    redactPlanWorkoutNotesForViewer(toPlanWorkoutDetail(w), 'athlete'),
  )
  const dayNotes = [...groupDayNotesByDate(dayNotesRaw, 'athlete').entries()].map(
    ([dateKey, note]) => ({ dateKey, ...note }),
  )

  return {
    workouts,
    dayNotes,
    seasonEvents: seasonEvents as SeasonEventData[],
    windowStartKey: toDateKey(rangeStart),
    windowEndKey: toDateKey(rangeEnd),
    startOffset,
    endOffset,
  }
}
