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
  weekSportMetric,
  weekSportProgressPercent,
  weekSportsWithPlannedWork,
} from '@/lib/week-sport-stats'
import {
  HomeMobileSectionHeader,
} from '@/components/ui/mobile-accordion-body'
import { cn } from '@/lib/utils'

const WEEK_NAV_LIMIT = 4

const SHELL =
  'overflow-hidden rounded-[0.9rem] border border-[var(--tt-line,#ebebeb)] bg-[var(--tt-surface,#fff)] px-4 py-3.5 shadow-[var(--tt-shadow)] md:rounded-[10px] md:p-4'

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

function formatHoursLabel(min: number): string {
  if (min <= 0) return '0h'
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return m ? `${h}h${m}` : `${h}h`
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

  const { weekNum, rangeLabel, sports, planDays, allWorkouts, overall } =
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
          ? `${format(start, 'd')}–${format(end, 'd MMM')}`
          : `${format(start, 'd MMM')}–${format(end, 'd MMM')}`

      let plannedMin = 0
      let completedMin = 0
      for (const sport of sportList) {
        const totals = sumSportWeekTotals(days, sport, options)
        plannedMin += totals.durationMin
        completedMin += totals.actualDurationMin
      }
      const overallPct =
        plannedMin > 0
          ? Math.min(100, Math.round((completedMin / plannedMin) * 100))
          : 0

      return {
        weekNum: getISOWeek(start),
        rangeLabel: label,
        sports: sportList,
        planDays: days,
        allWorkouts: all,
        overall: {
          plannedLabel: formatHoursLabel(plannedMin),
          completedLabel: formatHoursLabel(completedMin),
          pct: overallPct,
        },
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
    <section className={cn(SHELL, className)}>
      <HomeMobileSectionHeader
        title={title}
        collapsible={false}
        subtitle={rangeLabel}
        trailing={
          <>
            <button
              type="button"
              onClick={() => setWeekOffset((o) => Math.max(-WEEK_NAV_LIMIT, o - 1))}
              disabled={!canPrev}
              aria-label="Previous week"
              className="rounded p-0.5 text-[var(--tt-ink-faint,#9a9a9a)] enabled:hover:text-[var(--tt-ink,#111)] disabled:opacity-30"
            >
              <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={() => setWeekOffset((o) => Math.min(WEEK_NAV_LIMIT, o + 1))}
              disabled={!canNext}
              aria-label="Next week"
              className="rounded p-0.5 text-[var(--tt-ink-faint,#9a9a9a)] enabled:hover:text-[var(--tt-ink,#111)] disabled:opacity-30"
            >
              <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
          </>
        }
      />

      {sports.length === 0 ? (
          <p className="mt-3 text-center text-[11px] text-[var(--tt-ink-faint,#9a9a9a)]">
            No sports planned
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-3">
            {sports.map((sport) => {
              const totals = sumSportWeekTotals(planDays, sport, {
                swimCssSecPer100m,
              })
              const metric = weekSportMetric(sport, totals, allWorkouts)
              const pct = weekSportProgressPercent(metric.actual, metric.planned)
              const Icon = WORKOUT_TYPE_ICONS[sport]

              return (
                <div key={sport} className="min-w-0">
                  <div className="flex items-center gap-1">
                    <Icon
                      className={cn(
                        'h-3 w-3 shrink-0',
                        WEEK_STATS_SPORT_ICON_COLOR[sport],
                      )}
                      strokeWidth={1.75}
                      aria-hidden
                    />
                    <p className="truncate text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--tt-ink-faint,#9a9a9a)]">
                      {WORKOUT_TYPE_LABELS[sport]}
                    </p>
                  </div>
                  <p className="mt-0.5 text-[11px] tabular-nums text-[var(--tt-ink,#111)]">
                    <span className="font-semibold">{metric.actualLabel}</span>
                    <span className="text-[var(--tt-ink-faint,#9a9a9a)]">
                      /{metric.plannedLabel}
                      {metric.unit ? ` ${metric.unit}` : ''}
                    </span>
                  </p>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-[var(--tt-line,#ebebeb)]">
                    <div
                      className={cn(
                        'h-full rounded-full transition-[width] duration-500 ease-out',
                        WORKOUT_TYPE_DOT_CLASS[sport],
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-3 border-t border-[var(--tt-line,#ebebeb)] pt-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--tt-ink-faint,#9a9a9a)]">
              Overall
            </p>
            <p className="text-[11px] tabular-nums text-[var(--tt-ink-faint,#9a9a9a)]">
              <span className="font-semibold text-[var(--tt-ink,#111)]">
                {overall.completedLabel}
              </span>
              <span>
                /{overall.plannedLabel} · {overall.pct}%
              </span>
            </p>
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[var(--tt-line,#ebebeb)]">
            <div
              className="h-full rounded-full bg-[var(--tt-ink-soft,#6b6b6b)] transition-[width] duration-500 ease-out"
              style={{ width: `${overall.pct}%` }}
            />
          </div>
        </div>
    </section>
  )
}
