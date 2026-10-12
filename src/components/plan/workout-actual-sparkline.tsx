'use client'

import { WorkoutType } from '@prisma/client'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import {
  lapsChartReady,
  parseLapsCache,
  type ActivitySplitRow,
} from '@/lib/strava/laps'
import { cn } from '@/lib/utils'

const MAX_BARS = 28

type SparkSeries = {
  rows: ActivitySplitRow[]
  /** Manual / multi laps from Strava — bar width follows segment duration. */
  kind: 'laps' | 'splits'
}

function pickSeries(workout: PlanWorkoutDetail): SparkSeries | null {
  const cache = parseLapsCache(workout.result?.stravaLapsCache)
  if (!cache || !lapsChartReady(cache)) return null

  // Prefer real Strava laps (manual lap button → usually 2+). A single
  // auto-lap for the whole activity is ignored in favour of 1 km splits.
  const kind: SparkSeries['kind'] =
    cache.laps.length >= 2 ? 'laps' : 'splits'
  const source = kind === 'laps' ? cache.laps : cache.splitsMetric
  if (source.length < 2) return null

  if (source.length <= MAX_BARS) return { rows: source, kind }

  // Evenly sample so long activities still fit the card.
  const rows: ActivitySplitRow[] = []
  const step = (source.length - 1) / (MAX_BARS - 1)
  for (let i = 0; i < MAX_BARS; i += 1) {
    rows.push(source[Math.round(i * step)]!)
  }
  return { rows, kind }
}

function coverage(
  rows: ActivitySplitRow[],
  pick: (r: ActivitySplitRow) => number | null | undefined,
): number {
  return rows.filter((r) => {
    const v = pick(r)
    return v != null && v > 0
  }).length
}

function barValues(rows: ActivitySplitRow[], sport: WorkoutType): number[] {
  const need = Math.ceil(rows.length * 0.6)
  const wattsCount = coverage(rows, (r) => r.avgWatts)
  const hrCount = coverage(rows, (r) => r.avgHr)

  // Bike intervals: power is the effort signal when the meter wrote watts.
  if (sport === WorkoutType.BIKE && wattsCount >= need) {
    return rows.map((r) => r.avgWatts ?? 0)
  }
  if (hrCount >= need) {
    return rows.map((r) => r.avgHr ?? 0)
  }
  if (wattsCount >= need) {
    return rows.map((r) => r.avgWatts ?? 0)
  }
  return rows.map((r) => r.avgSpeedMps)
}

export function workoutHasActualSparkline(workout: PlanWorkoutDetail): boolean {
  return pickSeries(workout) != null
}

/** Compact actual effort bars from Strava laps (preferred) or km splits. */
export function WorkoutActualSparkline({
  workout,
  className,
}: {
  workout: PlanWorkoutDetail
  className?: string
}) {
  const series = pickSeries(workout)
  if (!series) return null

  const { rows, kind } = series
  const values = barValues(rows, workout.type)
  const max = Math.max(...values, 0.01)
  const min = Math.min(...values.filter((v) => v > 0), max)
  const floor = Math.max(min * 0.65, 0)
  const span = Math.max(max - floor, 0.01)
  const widthByDuration = kind === 'laps'
  const usedPower =
    workout.type === WorkoutType.BIKE &&
    coverage(rows, (r) => r.avgWatts) >= Math.ceil(rows.length * 0.6)

  return (
    <div
      className={cn('flex h-3 w-full items-end gap-px', className)}
      role="img"
      aria-label={
        usedPower
          ? kind === 'laps'
            ? 'Actual power by Strava lap'
            : 'Actual power by kilometre split'
          : kind === 'laps'
            ? 'Actual effort by Strava lap'
            : 'Actual effort by kilometre split'
      }
    >
      {rows.map((row, i) => {
        const v = values[i] ?? 0
        const pct = Math.max(10, Math.round(((v - floor) / span) * 88))
        const flexGrow = widthByDuration
          ? Math.max(row.elapsedSec, row.distanceM / 10, 1)
          : 1
        return (
          <span
            key={`${row.index}-${row.elapsedSec}-${i}`}
            className="min-w-px rounded-t-[1px] bg-[var(--tt-sparkline,var(--tt-good,#16a34a))] opacity-45"
            style={{ height: `${pct}%`, flexGrow }}
          />
        )
      })}
    </div>
  )
}
