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
  formatWeekSportTime,
  sportSupportsDistance,
  weekSportMetric,
  weekSportProgressPercent,
  weekSportsWithPlannedWork,
  type WeekSportStatMode,
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
import {
  WEEK_SPORT_STATS_GRID,
  WeekSportMetricValue,
  WeekSportStatModeToggle,
  WeekVolumeMetric,
} from '@/components/dashboard/week-sport-stat-metrics'
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

type MorphPair = { planned: number[]; actual: number[] }

function weekDateKeys(weekStartKey: string): string[] {
  const start = parseDateOnly(weekStartKey)
  return Array.from({ length: 7 }, (_, i) => toDateKey(addDateOnlyDays(start, i)))
}

function formatHoursLabel(min: number): string {
  return formatWeekSportTime(min)
}

function formatKmLabel(km: number): string {
  if (km <= 0) return '0'
  const rounded = Math.round(km * 10) / 10
  return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(1)
}

function workoutDistanceKm(
  workout: PlanWorkoutDetail,
  planned: boolean,
): number {
  if (planned) {
    if (
      workout.type === 'SWIM' &&
      workout.plannedDistanceMeters != null &&
      workout.plannedDistanceMeters > 0
    ) {
      return workout.plannedDistanceMeters / 1000
    }
    return workout.plannedDistance ?? 0
  }
  return workout.result?.actualDistance ?? 0
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

function dayDistancePlanned(workouts: PlanWorkoutDetail[], dateKey: string): number {
  let sum = 0
  for (const w of workouts) {
    if (w.dateKey !== dateKey) continue
    if (w.type === 'REST' || w.isRescheduleGhost) continue
    if (w.status === 'SKIPPED') continue
    if (!sportSupportsDistance(w.type)) continue
    sum += workoutDistanceKm(w, true)
  }
  return Math.max(0, Math.round(sum * 10) / 10)
}

function dayDistanceActual(workouts: PlanWorkoutDetail[], dateKey: string): number {
  let sum = 0
  for (const w of workouts) {
    if (w.dateKey !== dateKey) continue
    if (w.type === 'REST' || w.isRescheduleGhost) continue
    if (w.status !== 'COMPLETED') continue
    if (!sportSupportsDistance(w.type)) continue
    sum += workoutDistanceKm(w, false)
  }
  return Math.max(0, Math.round(sum * 10) / 10)
}

function unitLabelForMode(mode: WeekSportStatMode): string {
  if (mode === 'tss') return 'TSS'
  if (mode === 'time') return 'min'
  return 'km'
}

/** Unlinked left defaults: Run/Bike/Swim → km, Strength → time (hours). */
function defaultSportBarMode(sport: WorkoutType): WeekSportStatMode {
  return sportSupportsDistance(sport) ? 'distance' : 'time'
}

type WeekModeSeries = {
  dailyPlanned: number[]
  dailyActual: number[]
  plannedTotal: number
  actualTotal: number
  overall: {
    plannedLabel: string
    completedLabel: string
    pct: number
  }
}

function buildModeSeries(args: {
  plannedTss: number
  actualTss: number
  plannedKm: number
  completedKm: number
  plannedMin: number
  completedMin: number
  dailyPlannedTss: number[]
  dailyActualTss: number[]
  dailyPlannedTime: number[]
  dailyActualTime: number[]
  dailyPlannedDistance: number[]
  dailyActualDistance: number[]
}): Record<WeekSportStatMode, WeekModeSeries> {
  const distancePlanned = Math.round(args.plannedKm * 10) / 10
  const distanceActual = Math.round(args.completedKm * 10) / 10
  const timePlanned = args.dailyPlannedTime.reduce((a, b) => a + b, 0)
  const timeActual = args.dailyActualTime.reduce((a, b) => a + b, 0)

  const pct = (actual: number, planned: number) =>
    planned > 0 ? Math.min(100, Math.round((actual / planned) * 100)) : 0

  return {
    distance: {
      dailyPlanned: args.dailyPlannedDistance,
      dailyActual: args.dailyActualDistance,
      plannedTotal: distancePlanned,
      actualTotal: distanceActual,
      overall: {
        plannedLabel: formatKmLabel(args.plannedKm),
        completedLabel: formatKmLabel(args.completedKm),
        pct: pct(args.completedKm, args.plannedKm),
      },
    },
    time: {
      dailyPlanned: args.dailyPlannedTime,
      dailyActual: args.dailyActualTime,
      plannedTotal: timePlanned,
      actualTotal: timeActual,
      overall: {
        plannedLabel: formatHoursLabel(args.plannedMin),
        completedLabel: formatHoursLabel(args.completedMin),
        pct: pct(args.completedMin, args.plannedMin),
      },
    },
    tss: {
      dailyPlanned: args.dailyPlannedTss,
      dailyActual: args.dailyActualTss,
      plannedTotal: args.plannedTss,
      actualTotal: args.actualTss,
      overall: {
        plannedLabel: String(args.plannedTss),
        completedLabel: String(args.actualTss),
        pct: pct(args.actualTss, args.plannedTss),
      },
    },
  }
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
  /**
   * Toggle highlights TSS by default. Until the user picks a mode once:
   * left sports use km (run/bike) / time (strength), volume stays hours,
   * right graph stays on TSS. After that both sides follow `sportStatMode`.
   */
  const [sportStatMode, setSportStatMode] =
    useState<WeekSportStatMode>('tss')
  const [modeLinked, setModeLinked] = useState(false)
  const volumeMode: WeekSportStatMode = modeLinked ? sportStatMode : 'time'
  const graphMode: WeekSportStatMode = modeLinked ? sportStatMode : 'tss'
  const sportBarMode = useCallback(
    (sport: WorkoutType): WeekSportStatMode =>
      modeLinked ? sportStatMode : defaultSportBarMode(sport),
    [modeLinked, sportStatMode],
  )
  const [barMorphFrom, setBarMorphFrom] = useState<Record<string, number> | null>(
    null,
  )
  const [dailyMorphFrom, setDailyMorphFrom] = useState<MorphPair | null>(null)
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
      let plannedKm = 0
      let completedKm = 0
      for (const sport of sportList) {
        const totals = sumSportWeekTotals(days, sport, options)
        plannedMin += totals.durationMin
        completedMin += totals.actualDurationMin
        if (sport === 'SWIM') {
          plannedKm += totals.distanceMeters / 1000
          completedKm += totals.actualDistanceMeters / 1000
        } else if (sportSupportsDistance(sport)) {
          plannedKm += totals.distanceKm
          completedKm += totals.actualDistanceKm
        }
      }

      const plannedTss = weekSessionLoadPlanned(all, thresholds)
      const actualTss = weekSessionLoadActual(all, thresholds)

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
      const dailyPlannedDistance = keys.map((k) =>
        dayDistancePlanned(workouts, k),
      )
      const dailyActualDistance = keys.map((k) =>
        dayDistanceActual(workouts, k),
      )

      const byMode = buildModeSeries({
        plannedTss,
        actualTss,
        plannedKm,
        completedKm,
        plannedMin,
        completedMin,
        dailyPlannedTss,
        dailyActualTss,
        dailyPlannedTime,
        dailyActualTime,
        dailyPlannedDistance,
        dailyActualDistance,
      })

      return {
        weekStartKey,
        weekLabel,
        rangeLabel,
        rangeLabelCompact,
        sports: sportList,
        planDays: days,
        allWorkouts: all,
        plannedWeek,
        byMode,
      }
    })
  }, [
    anchorWeekStartKey,
    workouts,
    planSportRows,
    swimCssSecPer100m,
    thresholds,
    todayKey,
    offsetList,
  ])

  const safeActive = Math.max(0, Math.min(weeks.length - 1, active))
  const week = weeks[safeActive]!
  const unitLabel = unitLabelForMode(graphMode)
  const canPrev = safeActive > 0
  const canNext = safeActive < slideCount - 1

  const captureBarPcts = useCallback(
    (slide: (typeof weeks)[number]) => {
      const pcts: Record<string, number> = {
        __overall: slide.byMode[volumeMode].overall.pct,
      }
      for (const sport of slide.sports) {
        const mode = sportBarMode(sport)
        const totals = sumSportWeekTotals(slide.planDays, sport, {
          swimCssSecPer100m,
        })
        const m = weekSportMetric(
          sport,
          totals,
          slide.allWorkouts,
          mode,
          thresholds,
        )
        pcts[sport] = weekSportProgressPercent(m.actual, m.planned)
      }
      return pcts
    },
    [sportBarMode, swimCssSecPer100m, thresholds, volumeMode],
  )

  const switchSportStatMode = useCallback(
    (next: WeekSportStatMode) => {
      if (next === sportStatMode && modeLinked) return
      const current = weeks[active]!
      setBarMorphFrom(captureBarPcts(current))
      setDailyMorphFrom({
        planned: [...current.byMode[graphMode].dailyPlanned],
        actual: [...current.byMode[graphMode].dailyActual],
      })
      setSportStatMode(next)
      setModeLinked(true)
      window.setTimeout(() => {
        setBarMorphFrom(null)
        setDailyMorphFrom(null)
      }, 500)
    },
    [
      active,
      captureBarPcts,
      graphMode,
      modeLinked,
      sportStatMode,
      weeks,
    ],
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
        planned: [...current.byMode[graphMode].dailyPlanned],
        actual: [...current.byMode[graphMode].dailyActual],
      })
      setActive(next)
      syncTimerRef.current = window.setTimeout(() => {
        syncTimerRef.current = null
        setBarMorphFrom(null)
        setDailyMorphFrom(null)
        setPaneActive(next)
      }, 520)
    },
    [active, captureBarPcts, graphMode, weeks],
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
        trailing={
          <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
            <WeekSportStatModeToggle
              mode={sportStatMode}
              onChange={switchSportStatMode}
            />
            {nav}
          </div>
        }
      />

      <WeekSwipePane
        className="mt-2"
        active={Math.max(0, Math.min(slideCount - 1, paneActive))}
        count={slideCount}
        onActiveChange={onActiveChange}
        onGestureStart={syncPaneToActive}
        wheelSwipe
      >
        {weeks.map((slide, i) => {
          const data = i === paneActive ? weeks[active]! : slide
          const chart = data.byMode[volumeMode]
          const graph = data.byMode[graphMode]
          const isVisible = i === paneActive
          const morph = isVisible ? barMorphFrom : null
          const showActual = !data.plannedWeek
          const headlineTotal = showActual ? graph.actualTotal : graph.plannedTotal

          return (
            <WeekSwipeSlide key={slide.weekStartKey} active={isVisible}>
              <div className="grid grid-cols-1 gap-3 min-[520px]:grid-cols-[minmax(0,0.9fr)_minmax(0,1.25fr)] min-[520px]:gap-4 min-[520px]:items-start">
                {/* Left — week sport stats */}
                <div className="flex min-w-0 flex-col gap-2.5">
                  {data.sports.length === 0 ? (
                    <p className="text-[11px] text-[var(--tt-ink-faint,#9a9a9a)]">
                      No sports planned
                    </p>
                  ) : (
                    <div className={cn(WEEK_SPORT_STATS_GRID, 'gap-y-1')}>
                        {data.sports.map((sport, sportIndex) => {
                          const mode = sportBarMode(sport)
                          const totals = sumSportWeekTotals(
                            data.planDays,
                            sport,
                            { swimCssSecPer100m },
                          )
                          const sportMetric = weekSportMetric(
                            sport,
                            totals,
                            data.allWorkouts,
                            mode,
                            thresholds,
                          )
                          const pct = weekSportProgressPercent(
                            sportMetric.actual,
                            sportMetric.planned,
                          )
                          const unavailable = Boolean(
                            sportMetric.unavailableForMode,
                          )
                          const Icon = WORKOUT_TYPE_ICONS[sport]
                          const isLast = sportIndex === data.sports.length - 1

                          return (
                            <div key={sport} className="contents">
                              <div
                                className={cn(
                                  'flex min-w-0 items-center gap-1',
                                  unavailable && 'opacity-45',
                                )}
                              >
                                <Icon
                                  className={cn(
                                    'h-3.5 w-3.5 shrink-0',
                                    unavailable
                                      ? 'text-[var(--tt-ink-faint,#9a9a9a)]'
                                      : WEEK_STATS_SPORT_ICON_COLOR[sport],
                                  )}
                                  strokeWidth={2.1}
                                  aria-hidden
                                />
                                <p
                                  className={cn(
                                    'truncate text-[10px] font-semibold uppercase tracking-[0.06em]',
                                    unavailable
                                      ? 'text-[var(--tt-ink-faint,#9a9a9a)]'
                                      : 'text-[var(--tt-ink,#111)]',
                                  )}
                                >
                                  {WORKOUT_TYPE_LABELS[sport]}
                                </p>
                              </div>
                              <WeekSportMetricValue metric={sportMetric} />
                              <div
                                className={cn(
                                  'col-span-2 tt-v2-home-track mt-0.5 h-1 overflow-hidden',
                                  !isLast && 'mb-2',
                                )}
                              >
                                <MorphProgressBar
                                  pct={pct}
                                  morphFrom={morph?.[sport] ?? null}
                                  className={
                                    unavailable
                                      ? 'tt-v2-home-track-fill--muted'
                                      : 'tt-v2-home-track-fill--accent'
                                  }
                                />
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  )}

                  <div className="border-t border-[var(--tt-line,#ebebeb)] pt-2">
                    <WeekVolumeMetric
                      actual={chart.overall.completedLabel}
                      planned={chart.overall.plannedLabel}
                      mode={volumeMode}
                    />
                    <div className="tt-v2-home-track mt-1 h-1 overflow-hidden">
                      <MorphProgressBar
                        pct={chart.overall.pct}
                        morphFrom={morph?.__overall ?? null}
                        className="tt-v2-home-track-fill"
                      />
                    </div>
                    <p className="mt-1 text-right text-[11px] tabular-nums text-[var(--tt-ink-faint,#9a9a9a)]">
                      {chart.overall.pct}%
                    </p>
                  </div>
                </div>

                {/* Right — training load graph */}
                <div className="flex min-w-0 flex-col border-t border-[var(--tt-line,#ebebeb)] pt-2.5 min-[520px]:border-t-0 min-[520px]:border-l min-[520px]:pl-4 min-[520px]:pt-0">
                  <div className="min-w-0">
                    <p className="text-[1.35rem] font-semibold tabular-nums leading-none tracking-tight text-[var(--tt-ink,#111)]">
                      {headlineTotal}{' '}
                      <span className="text-[12px] font-medium normal-case tracking-normal text-[var(--tt-ink-soft,#6b6b6b)]">
                        {unitLabel}
                        {data.plannedWeek ? ' plan' : ''}
                      </span>
                    </p>
                    {showActual && graph.plannedTotal > 0 ? (
                      <p className="mt-1 text-[11px] tabular-nums text-[var(--tt-ink-faint,#9a9a9a)]">
                        Planned {graph.plannedTotal} {unitLabel}
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-1.5">
                    <TrainingLoadChart
                      key={slide.weekStartKey}
                      plannedDaily={graph.dailyPlanned}
                      actualDaily={graph.dailyActual}
                      yMax={Math.max(
                        ...graph.dailyPlanned,
                        ...graph.dailyActual,
                        1,
                      )}
                      showActual={showActual}
                      morphFrom={isVisible ? dailyMorphFrom : null}
                      compact
                      seriesTone={graphMode === 'time' ? 'ink' : 'accent'}
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
