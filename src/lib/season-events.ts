import type { SeasonEventData } from '@/lib/season-planner'
import { eachDateOnlyDay, parseDateOnly, toDateKey } from '@/lib/dates'

export type { SeasonEventData }

/** Expand overlapping events into per-day lists (inclusive start–end). */
export function groupSeasonEventsByDate(
  events: SeasonEventData[],
  rangeStart?: Date,
  rangeEnd?: Date,
): Map<string, SeasonEventData[]> {
  const map = new Map<string, SeasonEventData[]>()
  for (const event of events) {
    const start = rangeStart
      ? (event.startDate.getTime() > rangeStart.getTime() ? event.startDate : rangeStart)
      : event.startDate
    const end = rangeEnd
      ? (event.endDate.getTime() < rangeEnd.getTime() ? event.endDate : rangeEnd)
      : event.endDate
    if (end.getTime() < start.getTime()) continue
    for (const day of eachDateOnlyDay(
      parseDateOnly(toDateKey(start)),
      parseDateOnly(toDateKey(end)),
    )) {
      const key = toDateKey(day)
      const list = map.get(key)
      if (list) list.push(event)
      else map.set(key, [event])
    }
  }
  return map
}
