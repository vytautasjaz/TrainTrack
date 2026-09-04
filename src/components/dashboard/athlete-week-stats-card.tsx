'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import {
  WeekSwipePane,
  WeekSwipeSlide,
} from '@/components/dashboard/week-swipe-pane'
import { MorphProgressBar } from '@/components/dashboard/week-nav-morph'
import { cn } from '@/lib/utils'

const WEEK_NAV_LIMIT = 4
const WEEK_COUNT = WEEK_NAV_LIMIT * 2 + 1
const CENTER_INDEX = WEEK_NAV_LIMIT

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

function buildWeekStats(
  weekStartKey: string,
  workouts: PlanWorkoutDetail[],
  planSportRows: WorkoutType[],
  swimCssSecPer100m: number | null,
  weekOffset: number,
) {
  const keys = weekDateKeys(weekStartKey)
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
  const rangeLabel =
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

  const weekNum = getISOWeek(start)
  const title =
    weekOffset === 0
      ? 'This week'
      : weekOffset === -1
        ? 'Last week'
        : weekOffset === 1
          ? 'Next week'
          : `Week ${weekNum}`

  return {
    weekOffset,
    weekStartKey,
    weekNum,
    title,
    rangeLabel,
    sports: sportList,
    planDays: days,
    allWorkouts: all,
    overall: {
      plannedLabel: formatHoursLabel(plannedMin),
      completedLabel: formatHoursLabel(completedMin),
      pct: overallPct,
    },
  }
}

export function AthleteWeekStatsCard({
  workouts,
  anchorWeekStartKey,
  planSportRows = [],
  swimCssSecPer100m = null,
  className,
}: AthleteWeekStatsCardProps) {
  const [active, setActive] = useState(CENTER_INDEX)
  /** Carousel track — only moves on swipe; arrows morph bars in place. */
  const [paneActive, setPaneActive] = useState(CENTER_INDEX)
  const [barMorphFrom, setBarMorphFrom] = useState<Record<string, number> | null>(
    null,
  )
  const syncTimerRef = useRef<number | null>(null)

  const weeks = useMemo(() => {
    const anchor = parseDateOnly(anchorWeekStartKey)
    return Array.from({ length: WEEK_COUNT }, (_, i) => {
      const weekOffset = i - CENTER_INDEX
      const weekStartKey = toDateKey(addDateOnlyDays(anchor, weekOffset * 7))
      return buildWeekStats(
        weekStartKey,
        workouts,
        planSportRows,
        swimCssSecPer100m,
        weekOffset,
      )
    })
  }, [anchorWeekStartKey, workouts, planSportRows, swimCssSecPer100m])

  const week = weeks[active]!
  const canPrev = active > 0
  const canNext = active < WEEK_COUNT - 1

  const captureBarPcts = useCallback(
    (slide: (typeof weeks)[number]) => {
      const pcts: Record<string, number> = { __overall: slide.overall.pct }
      for (const sport of slide.sports) {
        const totals = sumSportWeekTotals(slide.planDays, sport, {
          swimCssSecPer100m,
        })
        const metric = weekSportMetric(sport, totals, slide.allWorkouts)
        pcts[sport] = weekSportProgressPercent(metric.actual, metric.planned)
      }
      return pcts
    },
    [swimCssSecPer100m],
  )

  const syncPaneToActive = useCallback(() => {
    if (syncTimerRef.current != null) {
      window.clearTimeout(syncTimerRef.current)
      syncTimerRef.current = null
    }
    if (paneActive === active) return
    setPaneActive(active)
    setBarMorphFrom(null)
  }, [active, paneActive])

  const onActiveChange = useCallback((index: number) => {
    if (syncTimerRef.current != null) {
      window.clearTimeout(syncTimerRef.current)
      syncTimerRef.current = null
    }
    setBarMorphFrom(null)
    setActive(index)
    setPaneActive(index)
  }, [])

  const goByArrow = useCallback(
    (next: number) => {
      if (next === active) return
      if (syncTimerRef.current != null) {
        window.clearTimeout(syncTimerRef.current)
        syncTimerRef.current = null
      }
      setBarMorphFrom(captureBarPcts(weeks[active]!))
      setActive(next)
      // Align track after morph — no slide animation (pane owns that).
      syncTimerRef.current = window.setTimeout(() => {
        syncTimerRef.current = null
        setBarMorphFrom(null)
        setPaneActive(next)
      }, 520)
    },
    [active, captureBarPcts, weeks],
  )

  useEffect(() => {
    return () => {
      if (syncTimerRef.current != null) window.clearTimeout(syncTimerRef.current)
    }
  }, [])

  return (
    <section className={cn(SHELL, className)}>
      <HomeMobileSectionHeader
        title={week.title}
        collapsible={false}
        subtitle={week.rangeLabel}
        trailing={
          <>
            <button
              type="button"
              onClick={() => goByArrow(Math.max(0, active - 1))}
              disabled={!canPrev}
              aria-label="Previous week"
              className="rounded p-0.5 text-[var(--tt-ink-faint,#9a9a9a)] enabled:hover:text-[var(--tt-ink,#111)] disabled:opacity-30"
            >
              <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={() => goByArrow(Math.min(WEEK_COUNT - 1, active + 1))}
              disabled={!canNext}
              aria-label="Next week"
              className="rounded p-0.5 text-[var(--tt-ink-faint,#9a9a9a)] enabled:hover:text-[var(--tt-ink,#111)] disabled:opacity-30"
            >
              <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
          </>
        }
      />

      <WeekSwipePane
        className="mt-3"
        active={paneActive}
        count={WEEK_COUNT}
        onActiveChange={onActiveChange}
        onGestureStart={syncPaneToActive}
      >
        {weeks.map((slide, i) => {
          const data = i === paneActive ? weeks[active]! : slide
          const isVisible = i === paneActive
          const morph = isVisible ? barMorphFrom : null
          return (
            <WeekSwipeSlide key={slide.weekStartKey} active={isVisible}>
              {data.sports.length === 0 ? (
                <p className="text-center text-[11px] text-[var(--tt-ink-faint,#9a9a9a)]">
                  No sports planned
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-x-3 gap-y-3">
                  {data.sports.map((sport) => {
                    const totals = sumSportWeekTotals(data.planDays, sport, {
                      swimCssSecPer100m,
                    })
                    const metric = weekSportMetric(
                      sport,
                      totals,
                      data.allWorkouts,
                    )
                    const pct = weekSportProgressPercent(
                      metric.actual,
                      metric.planned,
                    )
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
                          <MorphProgressBar
                            pct={pct}
                            morphFrom={morph?.[sport] ?? null}
                            className={WORKOUT_TYPE_DOT_CLASS[sport]}
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
                      {data.overall.completedLabel}
                    </span>
                    <span>
                      /{data.overall.plannedLabel} · {data.overall.pct}%
                    </span>
                  </p>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[var(--tt-line,#ebebeb)]">
                  <MorphProgressBar
                    pct={data.overall.pct}
                    morphFrom={morph?.__overall ?? null}
                    className="bg-[var(--tt-ink-soft,#6b6b6b)]"
                  />
                </div>
              </div>
            </WeekSwipeSlide>
          )
        })}
      </WeekSwipePane>
    </section>
  )
}
