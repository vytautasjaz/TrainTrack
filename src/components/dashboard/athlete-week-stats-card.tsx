'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format, getISOWeek } from 'date-fns'
import type { WorkoutType } from '@prisma/client'
import {
  addDateOnlyDays,
  parseDateOnly,
  toDateKey,
} from '@/lib/dates'
import { sumSportWeekTotals } from '@/lib/plan-week-totals'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { WORKOUT_TYPE_LABELS } from '@/lib/constants'
import {
  WORKOUT_TYPE_DOT_CLASS,
  WORKOUT_TYPE_ICONS,
} from '@/lib/workout-display'
import {
  WEEK_STATS_SPORT_ICON_COLOR,
  countWeekWorkouts,
  weekSportMetric,
  weekSportProgressPercent,
  weekSportsWithPlannedWork,
} from '@/lib/week-sport-stats'
import { cn } from '@/lib/utils'

const WEEK_NAV_LIMIT = 4

type AthleteWeekStatsCardProps = {
  workouts: PlanWorkoutDetail[]
  anchorWeekStartKey: string
  planSportRows?: WorkoutType[]
  swimCssSecPer100m?: number | null
  className?: string
}

function weekDateKeys(weekStartKey: string): string[] {
  const start = parseDateOnly(weekStartKey)
  return Array.from({ length: 7 }, (_, i) => toDateKey(addDateOnlyDays(start, i)))
}

export function AthleteWeekStatsCard({
  workouts,
  anchorWeekStartKey,
  planSportRows = [],
  swimCssSecPer100m = null,
  className,
}: AthleteWeekStatsCardProps) {
  const [weekOffset, setWeekOffset] = useState(0)

  const selectedWeekStartKey = useMemo(() => {
    const anchor = parseDateOnly(anchorWeekStartKey)
    return toDateKey(addDateOnlyDays(anchor, weekOffset * 7))
  }, [anchorWeekStartKey, weekOffset])

  const { weekNum, rangeLabel, weekCounts, sports, planDays, allWorkouts } =
    useMemo(() => {
      const keys = weekDateKeys(selectedWeekStartKey)
      const keySet = new Set(keys)
      const byDate = new Map<string, PlanWorkoutDetail[]>()
      for (const w of workouts) {
        if (!keySet.has(w.dateKey)) continue
        const list = byDate.get(w.dateKey) ?? []
        list.push(w)
        byDate.set(w.dateKey, list)
      }
      const days = keys.map((dateKey) => ({
        workouts: byDate.get(dateKey) ?? [],
      }))
      const all = days.flatMap((d) => d.workouts)
      const options = { swimCssSecPer100m }
      const sportList = weekSportsWithPlannedWork(days, planSportRows, options)
      const start = parseDateOnly(keys[0]!)
      const end = parseDateOnly(keys[6]!)
      const label =
        start.getMonth() === end.getMonth()
          ? `${format(start, 'd')} – ${format(end, 'd MMM')}`
          : `${format(start, 'd MMM')} – ${format(end, 'd MMM')}`

      return {
        weekNum: getISOWeek(start),
        rangeLabel: label,
        weekCounts: countWeekWorkouts(all),
        sports: sportList,
        planDays: days,
        allWorkouts: all,
      }
    }, [selectedWeekStartKey, workouts, planSportRows, swimCssSecPer100m])

  const canPrev = weekOffset > -WEEK_NAV_LIMIT
  const canNext = weekOffset < WEEK_NAV_LIMIT
  const title =
    weekOffset === 0
      ? 'This week'
      : weekOffset === -1
        ? 'Last week'
        : weekOffset === 1
          ? 'Next week'
          : `Week ${weekNum}`

  return (
    <section className={cn('card-elevated overflow-hidden p-5', className)}>
      <div className="mb-1 flex items-center gap-1">
        <button
          type="button"
          onClick={() => setWeekOffset((o) => Math.max(-WEEK_NAV_LIMIT, o - 1))}
          disabled={!canPrev}
          aria-label="Previous week"
          className={cn(
            'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition',
            canPrev
              ? 'hover:bg-muted/70 hover:text-foreground'
              : 'pointer-events-none opacity-30',
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="min-w-0 flex-1 text-center">
          <h2 className="text-lg font-semibold leading-tight tracking-tight">
            {title}
          </h2>
          <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
            <span className="font-semibold text-foreground/80">Week {weekNum}</span>
            {' · '}
            {rangeLabel}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setWeekOffset((o) => Math.min(WEEK_NAV_LIMIT, o + 1))}
          disabled={!canNext}
          aria-label="Next week"
          className={cn(
            'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition',
            canNext
              ? 'hover:bg-muted/70 hover:text-foreground'
              : 'pointer-events-none opacity-30',
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <p className="mb-4 text-center text-xs tabular-nums text-muted-foreground">
        <span className="font-semibold text-foreground">
          {weekCounts.completed}
        </span>
        {' / '}
        {weekCounts.planned}{' '}
        {weekCounts.planned === 1 ? 'workout' : 'workouts'}
      </p>

      {sports.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No planned training this week.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-3">
          {sports.map((sport) => {
            const totals = sumSportWeekTotals(planDays, sport, {
              swimCssSecPer100m,
            })
            const metric = weekSportMetric(sport, totals, allWorkouts)
            const pct = weekSportProgressPercent(metric.actual, metric.planned)
            const Icon = WORKOUT_TYPE_ICONS[sport]

            return (
              <div key={sport} className="min-w-0 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Icon
                    className={cn(
                      'h-3.5 w-3.5 shrink-0',
                      WEEK_STATS_SPORT_ICON_COLOR[sport],
                    )}
                    strokeWidth={2.25}
                    aria-hidden
                  />
                  <span className="truncate text-xs font-semibold text-foreground">
                    {WORKOUT_TYPE_LABELS[sport]}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-foreground/6">
                  <div
                    className={cn(
                      'h-full rounded-full transition-[width]',
                      WORKOUT_TYPE_DOT_CLASS[sport],
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-[11px] tabular-nums leading-none text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {metric.actualLabel}
                  </span>
                  {' / '}
                  {metric.plannedLabel}
                  {metric.unit ? ` ${metric.unit}` : ''}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
