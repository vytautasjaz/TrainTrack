'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { format, getISOWeek } from 'date-fns'
import type { WorkoutType } from '@prisma/client'
import {
  addDateOnlyDays,
  parseDateOnly,
  toDateKey,
  todayDateKey,
} from '@/lib/dates'
import { sumSportWeekTotals } from '@/lib/plan-week-totals'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { WORKOUT_TYPE_LABELS } from '@/lib/constants'
import { WORKOUT_TYPE_ICONS } from '@/lib/workout-display'
import {
  WEEK_STATS_SPORT_ICON_COLOR,
  weekSportMetric,
  weekSportProgressPercent,
  weekSportsWithPlannedWork,
} from '@/lib/week-sport-stats'
import { V2WidgetHeader } from '@/components/ui/v2'
import { v2 } from '@/lib/design-tokens'
import {
  WeekCarouselNav,
  WeekSwipePane,
  WeekSwipeSlide,
} from '@/components/dashboard/week-swipe-pane'
import { MorphProgressBar } from '@/components/dashboard/week-nav-morph'
import { TrainingLoadChart } from '@/components/dashboard/athlete-training-load-card'
import { cn } from '@/lib/utils'
import { DASHBOARD_WEEK_NAV_CENTER } from '@/lib/dashboard-week-nav'
import {
  daySessionLoadActual,
  daySessionLoadPlanned,
  weekSessionLoadActual,
  weekSessionLoadPlanned,
  type SessionLoadThresholds,
} from '@/lib/training-load/session-tss'

const CENTER_INDEX = DASHBOARD_WEEK_NAV_CENTER

type LoadMetric = 'tss' | 'time'
type MorphPair = { planned: number[]; actual: number[] }

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

function dayMinutesPlanned(workouts: PlanWorkoutDetail[], dateKey: string): number {
  let sum = 0
  for (const w of workouts) {
    if (w.dateKey !== dateKey) continue
    if (w.type === 'REST' || w.isRescheduleGhost) continue
    if (w.status === 'SKIPPED') continue
    sum += w.plannedDuration ?? 0
  }
  return Math.max(0, Math.round(sum))
}

function dayMinutesActual(workouts: PlanWorkoutDetail[], dateKey: string): number {
  let sum = 0
  for (const w of workouts) {
    if (w.dateKey !== dateKey) continue
    if (w.type === 'REST' || w.isRescheduleGhost) continue
    if (w.status !== 'COMPLETED') continue
    sum += w.result?.actualDuration ?? 0
  }
  return Math.max(0, Math.round(sum))
}

export function HomeWeekStatsLoadCard({
  workouts,
  anchorWeekStartKey,
  planSportRows = [],
  swimCssSecPer100m = null,
  thresholds,
  className,
  /**
   * Offset from this week (0 = current). When the home week board changes,
   * overview follows — but overview navigation does not drive the board.
   */
  weekOffset,
  loadedMinOffset,
  loadedMaxOffset,
}: {
  workouts: PlanWorkoutDetail[]
  anchorWeekStartKey: string
  planSportRows?: WorkoutType[]
  swimCssSecPer100m?: number | null
  thresholds: SessionLoadThresholds
  className?: string
  weekOffset?: number
  loadedMinOffset?: number
  loadedMaxOffset?: number
}) {
  const rangeMin = loadedMinOffset ?? -CENTER_INDEX
  const rangeMax = loadedMaxOffset ?? CENTER_INDEX
  const offsetList = useMemo(() => {
    const list: number[] = []
    for (let o = rangeMin; o <= rangeMax; o += 1) list.push(o)
    return list.length > 0 ? list : [0]
  }, [rangeMin, rangeMax])
  const slideCount = offsetList.length
  const centerSlide = Math.max(0, offsetList.indexOf(0))

  const [active, setActive] = useState(() => {
    if (weekOffset == null) return centerSlide
    const idx = offsetList.indexOf(weekOffset)
    return idx >= 0 ? idx : centerSlide
  })
  const [paneActive, setPaneActive] = useState(() => {
    if (weekOffset == null) return centerSlide
    const idx = offsetList.indexOf(weekOffset)
    return idx >= 0 ? idx : centerSlide
  })
  const [metric, setMetric] = useState<LoadMetric>('tss')
  const [barMorphFrom, setBarMorphFrom] = useState<Record<string, number> | null>(
    null,
  )
  const [dailyMorphFrom, setDailyMorphFrom] = useState<MorphPair | null>(null)
  const [morphGen, setMorphGen] = useState(0)
  const syncTimerRef = useRef<number | null>(null)
  const todayKey = todayDateKey()

  const weeks = useMemo(() => {
    const anchor = parseDateOnly(anchorWeekStartKey)
    return offsetList.map((weekOffset) => {
      const weekStartKey = toDateKey(addDateOnlyDays(anchor, weekOffset * 7))
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
        start.getFullYear() === end.getFullYear() &&
        start.getMonth() === end.getMonth()
          ? `${format(start, 'd')} – ${format(end, 'd MMMM yyyy')}`
          : start.getFullYear() === end.getFullYear()
            ? `${format(start, 'd MMMM')} – ${format(end, 'd MMMM yyyy')}`
            : `${format(start, 'd MMMM yyyy')} – ${format(end, 'd MMMM yyyy')}`
      const rangeLabelCompact =
        start.getFullYear() === end.getFullYear() &&
        start.getMonth() === end.getMonth()
          ? `${format(start, 'd')} – ${format(end, 'd MMM')}`
          : start.getFullYear() === end.getFullYear()
            ? `${format(start, 'd MMM')} – ${format(end, 'd MMM')}`
            : `${format(start, 'd MMM yy')} – ${format(end, 'd MMM yy')}`

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
      const weekLabel =
        weekOffset === 0
          ? 'This week'
          : weekOffset === -1
            ? 'Last week'
            : weekOffset === 1
              ? 'Next week'
              : `Week ${weekNum}`

      const plannedWeek = keys.every((k) => k > todayKey)
      const dailyPlannedTss = keys.map((k) =>
        daySessionLoadPlanned(workouts, k, thresholds),
      )
      const dailyActualTss = keys.map((k) =>
        daySessionLoadActual(workouts, k, thresholds),
      )
      const dailyPlannedTime = keys.map((k) => dayMinutesPlanned(workouts, k))
      const dailyActualTime = keys.map((k) => dayMinutesActual(workouts, k))
      const dailyPlanned = metric === 'tss' ? dailyPlannedTss : dailyPlannedTime
      const dailyActual = metric === 'tss' ? dailyActualTss : dailyActualTime
      // Week totals: sum raw then round once (same as hero metrics).
      // Daily bars still use per-day rounded values for the chart.
      const plannedTotal =
        metric === 'tss'
          ? weekSessionLoadPlanned(all, thresholds)
          : dailyPlannedTime.reduce((a, b) => a + b, 0)
      const actualTotal =
        metric === 'tss'
          ? weekSessionLoadActual(all, thresholds)
          : dailyActualTime.reduce((a, b) => a + b, 0)

      return {
        weekStartKey,
        weekLabel,
        rangeLabel,
        rangeLabelCompact,
        sports: sportList,
        planDays: days,
        allWorkouts: all,
        overall: {
          plannedLabel: formatHoursLabel(plannedMin),
          completedLabel: formatHoursLabel(completedMin),
          pct: overallPct,
        },
        plannedWeek,
        dailyPlanned,
        dailyActual,
        plannedTotal,
        actualTotal,
      }
    })
  }, [
    anchorWeekStartKey,
    workouts,
    planSportRows,
    swimCssSecPer100m,
    thresholds,
    todayKey,
    metric,
    offsetList,
  ])

  const safeActive = Math.max(0, Math.min(weeks.length - 1, active))
  const week = weeks[safeActive]!
  const unitLabel = metric === 'tss' ? 'TSS' : 'min'
  const canPrev = safeActive > 0
  const canNext = safeActive < slideCount - 1

  const captureBarPcts = useCallback(
    (slide: (typeof weeks)[number]) => {
      const pcts: Record<string, number> = { __overall: slide.overall.pct }
      for (const sport of slide.sports) {
        const totals = sumSportWeekTotals(slide.planDays, sport, {
          swimCssSecPer100m,
        })
        const m = weekSportMetric(sport, totals, slide.allWorkouts)
        pcts[sport] = weekSportProgressPercent(m.actual, m.planned)
      }
      return pcts
    },
    [swimCssSecPer100m],
  )

  // Main board → overview only (overview arrows/swipe stay local).
  useEffect(() => {
    if (weekOffset == null) return
    const next = offsetList.indexOf(weekOffset)
    if (next < 0) return
    if (syncTimerRef.current != null) {
      window.clearTimeout(syncTimerRef.current)
      syncTimerRef.current = null
    }
    setBarMorphFrom(null)
    setDailyMorphFrom(null)
    setActive(next)
    setPaneActive(next)
  }, [weekOffset, offsetList])

  const syncPaneToActive = useCallback(() => {
    if (syncTimerRef.current != null) {
      window.clearTimeout(syncTimerRef.current)
      syncTimerRef.current = null
    }
    if (paneActive === active) return
    setPaneActive(active)
    setBarMorphFrom(null)
    setDailyMorphFrom(null)
  }, [active, paneActive])

  const onActiveChange = useCallback((index: number) => {
    if (syncTimerRef.current != null) {
      window.clearTimeout(syncTimerRef.current)
      syncTimerRef.current = null
    }
    setBarMorphFrom(null)
    setDailyMorphFrom(null)
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
      const current = weeks[active]!
      setBarMorphFrom(captureBarPcts(current))
      setDailyMorphFrom({
        planned: [...current.dailyPlanned],
        actual: [...current.dailyActual],
      })
      setMorphGen((g) => g + 1)
      setActive(next)
      syncTimerRef.current = window.setTimeout(() => {
        syncTimerRef.current = null
        setBarMorphFrom(null)
        setDailyMorphFrom(null)
        setPaneActive(next)
      }, 520)
    },
    [active, captureBarPcts, weeks],
  )

  const switchMetric = useCallback(
    (next: LoadMetric) => {
      if (next === metric) return
      const current = weeks[active]!
      setDailyMorphFrom({
        planned: [...current.dailyPlanned],
        actual: [...current.dailyActual],
      })
      setMorphGen((g) => g + 1)
      setMetric(next)
      window.setTimeout(() => setDailyMorphFrom(null), 500)
    },
    [active, metric, weeks],
  )

  useEffect(() => {
    return () => {
      if (syncTimerRef.current != null) window.clearTimeout(syncTimerRef.current)
    }
  }, [])

  const awayFromThisWeek = offsetList[safeActive] !== 0
  const nav = (
    <WeekCarouselNav
      canPrev={canPrev}
      canNext={canNext}
      isToday={!awayFromThisWeek}
      rangeLabel={week.rangeLabel}
      rangeLabelCompact={week.rangeLabelCompact}
      onPrev={() => goByArrow(Math.max(0, safeActive - 1))}
      onNext={() => goByArrow(Math.min(slideCount - 1, safeActive + 1))}
    />
  )

  return (
    <section
      className={cn(v2.surfaces.widgetLight, 'tt-v2-home-widget', className)}
    >
      <V2WidgetHeader
        title="Week overview"
        className="flex-nowrap"
        trailing={nav}
      />

      <WeekSwipePane
        className="tt-space-after-title"
        active={Math.max(0, Math.min(slideCount - 1, paneActive))}
        count={slideCount}
        onActiveChange={onActiveChange}
        onGestureStart={syncPaneToActive}
        wheelSwipe
      >
        {weeks.map((slide, i) => {
          const data = i === paneActive ? weeks[active]! : slide
          const isVisible = i === paneActive
          const morph = isVisible ? barMorphFrom : null
          const showActual = !data.plannedWeek
          const headlineTotal = showActual ? data.actualTotal : data.plannedTotal

          return (
            <WeekSwipeSlide key={slide.weekStartKey} active={isVisible}>
              <div className="grid grid-cols-1 gap-3 min-[520px]:grid-cols-[minmax(0,0.9fr)_minmax(0,1.25fr)] min-[520px]:gap-4 min-[520px]:items-start">
                {/* Left — week sport stats */}
                <div className="flex min-w-0 flex-col gap-3">
                  {data.sports.length === 0 ? (
                    <p className="text-[11px] text-[var(--tt-ink-faint,#9a9a9a)]">
                      No sports planned
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      {data.sports.map((sport) => {
                        const totals = sumSportWeekTotals(data.planDays, sport, {
                          swimCssSecPer100m,
                        })
                        const sportMetric = weekSportMetric(
                          sport,
                          totals,
                          data.allWorkouts,
                        )
                        const pct = weekSportProgressPercent(
                          sportMetric.actual,
                          sportMetric.planned,
                        )
                        const Icon = WORKOUT_TYPE_ICONS[sport]

                        return (
                          <div key={sport} className="min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex min-w-0 items-center gap-1">
                                <Icon
                                  className={cn(
                                    'h-3 w-3 shrink-0',
                                    WEEK_STATS_SPORT_ICON_COLOR[sport],
                                  )}
                                  strokeWidth={2.1}
                                  aria-hidden
                                />
                                <p className="truncate text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--tt-ink-faint,#9a9a9a)]">
                                  {WORKOUT_TYPE_LABELS[sport]}
                                </p>
                              </div>
                              <p className="shrink-0 text-[11px] tabular-nums text-[var(--tt-ink,#111)]">
                                <span className="font-semibold">
                                  {sportMetric.actualLabel}
                                </span>
                                <span className="text-[var(--tt-ink-faint,#9a9a9a)]">
                                  /{sportMetric.plannedLabel}
                                  {sportMetric.unit
                                    ? ` ${sportMetric.unit}`
                                    : ''}
                                </span>
                              </p>
                            </div>
                            <div className="tt-v2-home-track mt-1.5 h-1 overflow-hidden">
                              <MorphProgressBar
                                pct={pct}
                                morphFrom={morph?.[sport] ?? null}
                                className="tt-v2-home-track-fill--accent"
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  <div className="border-t border-[var(--tt-line,#ebebeb)] pt-2.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--tt-ink-faint,#9a9a9a)]">
                        Volume
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
                    <div className="tt-v2-home-track mt-1.5 h-1 overflow-hidden">
                      <MorphProgressBar
                        pct={data.overall.pct}
                        morphFrom={morph?.__overall ?? null}
                        className="tt-v2-home-track-fill"
                      />
                    </div>
                  </div>
                </div>

                {/* Right — training load graph */}
                <div className="flex min-w-0 flex-col border-t border-[var(--tt-line,#ebebeb)] pt-3 min-[520px]:border-t-0 min-[520px]:border-l min-[520px]:pl-4 min-[520px]:pt-0">
                  <div className="flex items-end justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[1.35rem] font-semibold tabular-nums leading-none tracking-tight text-[var(--tt-ink,#111)]">
                        {headlineTotal}{' '}
                        <span className="text-[12px] font-medium normal-case tracking-normal text-[var(--tt-ink-soft,#6b6b6b)]">
                          {unitLabel}
                          {data.plannedWeek ? ' plan' : ''}
                        </span>
                      </p>
                      {showActual && data.plannedTotal > 0 ? (
                        <p className="mt-1 text-[11px] tabular-nums text-[var(--tt-ink-faint,#9a9a9a)]">
                          Planned {data.plannedTotal} {unitLabel}
                        </p>
                      ) : null}
                    </div>
                    {isVisible ? (
                      <div
                        className="mb-0.5 flex shrink-0 items-center gap-1 text-[10px] font-medium tracking-[0.02em]"
                        role="group"
                        aria-label="Load metric"
                      >
                        {(
                          [
                            { id: 'tss' as const, label: 'TSS' },
                            { id: 'time' as const, label: 'Time' },
                          ] as const
                        ).map((option, index) => (
                          <span
                            key={option.id}
                            className="inline-flex items-center gap-1"
                          >
                            {index > 0 ? (
                              <span
                                className="text-[var(--tt-ink-faint,#9a9a9a)]"
                                aria-hidden
                              >
                                ·
                              </span>
                            ) : null}
                            <button
                              type="button"
                              aria-pressed={metric === option.id}
                              onClick={() => switchMetric(option.id)}
                              className={cn(
                                'transition',
                                metric === option.id
                                  ? 'text-[var(--tt-v2-accent)]'
                                  : 'text-[var(--tt-ink-faint,#9a9a9a)] hover:text-[var(--tt-ink-soft,#6b6b6b)]',
                              )}
                            >
                              {option.label}
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-auto">
                    <TrainingLoadChart
                      key={`${slide.weekStartKey}-${metric}-${isVisible ? morphGen : 'idle'}`}
                      plannedDaily={data.dailyPlanned}
                      actualDaily={data.dailyActual}
                      yMax={Math.max(
                        ...data.dailyPlanned,
                        ...data.dailyActual,
                        1,
                      )}
                      showActual={showActual}
                      morphFrom={isVisible ? dailyMorphFrom : null}
                      compact
                    />
                  </div>
                </div>
              </div>
            </WeekSwipeSlide>
          )
        })}
      </WeekSwipePane>
    </section>
  )
}
