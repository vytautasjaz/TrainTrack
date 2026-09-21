import {
  addDateOnlyDays,
  endOfWeekDateOnly,
  parseDateOnly,
  startOfWeekDateOnly,
  toDateKey,
} from '@/lib/dates'

export type PhaseRangeKeys = {
  startKey: string
  endKey: string
}

/** Inclusive range from two keys (order-independent). */
export function normalizePhaseRange(a: string, b: string): PhaseRangeKeys {
  return a <= b ? { startKey: a, endKey: b } : { startKey: b, endKey: a }
}

/**
 * Training blocks start on Monday. Full weeks end Sunday; a mid-week end
 * (e.g. Friday race) is kept so the last week can be Mon→race day.
 */
export function snapTrainingBlockRange(range: PhaseRangeKeys): PhaseRangeKeys {
  const start = startOfWeekDateOnly(parseDateOnly(range.startKey), 1)
  const endRaw = parseDateOnly(range.endKey)
  let end = endRaw
  // If end is before snapped start (rare), push to that Monday.
  if (end.getTime() < start.getTime()) {
    end = start
  }
  return {
    startKey: toDateKey(start),
    endKey: toDateKey(end),
  }
}

/** Snap a painted week-column span to Mon→Sun (inclusive). */
export function snapTrainingBlockRangeToWholeWeeks(
  range: PhaseRangeKeys,
): PhaseRangeKeys {
  const snapped = snapTrainingBlockRange(range)
  return {
    startKey: snapped.startKey,
    endKey: toDateKey(endOfWeekDateOnly(parseDateOnly(snapped.endKey), 1)),
  }
}

export function phaseRangeEquals(a: PhaseRangeKeys, b: PhaseRangeKeys): boolean {
  return a.startKey === b.startKey && a.endKey === b.endKey
}

/** Shift both ends by whole calendar days. */
export function shiftPhaseRange(
  range: PhaseRangeKeys,
  deltaDays: number,
): PhaseRangeKeys {
  if (deltaDays === 0) return range
  return {
    startKey: toDateKey(addDateOnlyDays(parseDateOnly(range.startKey), deltaDays)),
    endKey: toDateKey(addDateOnlyDays(parseDateOnly(range.endKey), deltaDays)),
  }
}

/** Resize one edge to `toKey`, keeping the other fixed. */
export function resizePhaseRange(
  range: PhaseRangeKeys,
  edge: 'start' | 'end',
  toKey: string,
): PhaseRangeKeys {
  if (edge === 'start') {
    return normalizePhaseRange(toKey, range.endKey)
  }
  return normalizePhaseRange(range.startKey, toKey)
}

/**
 * Column span → calendar dates.
 * Day columns: start/end are that day.
 * Week columns: start = Monday of start week, end = Sunday of end week.
 */
export function dateKeysForColumnSpan(args: {
  startIdx: number
  endIdx: number
  unit: 'day' | 'week'
  dayKeys: string[]
  weekStartKeys: string[]
  weekEndKeys: string[]
}): PhaseRangeKeys | null {
  const lo = Math.min(args.startIdx, args.endIdx)
  const hi = Math.max(args.startIdx, args.endIdx)
  if (args.unit === 'day') {
    const startKey = args.dayKeys[lo]
    const endKey = args.dayKeys[hi]
    if (!startKey || !endKey) return null
    return { startKey, endKey }
  }
  const startKey = args.weekStartKeys[lo]
  const endKey = args.weekEndKeys[hi]
  if (!startKey || !endKey) return null
  return { startKey, endKey }
}

export function columnIndexFromClientX(
  clientX: number,
  gridLeft: number,
  colW: number,
  colCount: number,
): number {
  if (colW <= 0 || colCount <= 0) return 0
  const raw = Math.floor((clientX - gridLeft) / colW)
  return Math.min(colCount - 1, Math.max(0, raw))
}

/** Pointer drag past this many px counts as a gesture (not a click). */
export const PHASE_GESTURE_THRESHOLD_PX = 4
