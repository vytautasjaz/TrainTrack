import type { SeasonEventData } from '@/lib/season-planner'
import { asDate, eachDateOnlyDay, parseDateOnly, toDateKey } from '@/lib/dates'

export type { SeasonEventData }

/** Expand overlapping events into per-day lists (inclusive start–end). */
export function groupSeasonEventsByDate(
  events: SeasonEventData[],
  rangeStart?: Date,
  rangeEnd?: Date,
): Map<string, SeasonEventData[]> {
  const map = new Map<string, SeasonEventData[]>()
  for (const event of events) {
    const eventStart = asDate(event.startDate as Date | string)
    const eventEnd = asDate(event.endDate as Date | string)
    const start = rangeStart
      ? (eventStart.getTime() > rangeStart.getTime() ? eventStart : rangeStart)
      : eventStart
    const end = rangeEnd
      ? (eventEnd.getTime() < rangeEnd.getTime() ? eventEnd : rangeEnd)
      : eventEnd
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
