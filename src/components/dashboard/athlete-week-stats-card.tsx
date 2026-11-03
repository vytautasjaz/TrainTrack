'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  formatWeekSportTime,
  weekSportMetric,
  weekSportProgressPercent,
  weekSportsWithPlannedWork,
  type WeekSportStatMode,
} from '@/lib/week-sport-stats'
import {
  WEEK_SPORT_STATS_GRID,
  WeekSportMetricValue,
  WeekSportStatModeToggle,
  WeekVolumeMetric,
} from '@/components/dashboard/week-sport-stat-metrics'
import {
  HomeMobileSectionHeader,
} from '@/components/ui/mobile-accordion-body'
import { V2WidgetHeader } from '@/components/ui/v2'
import { v2 } from '@/lib/design-tokens'
import {
  WeekCarouselNav,
  WeekCarouselThisWeekButton,
  WeekSwipePane,
  WeekSwipeSlide,
} from '@/components/dashboard/week-swipe-pane'
import { MorphProgressBar } from '@/components/dashboard/week-nav-morph'
import { cn } from '@/lib/utils'
import {
  DASHBOARD_WEEK_NAV_CENTER,
  DASHBOARD_WEEK_NAV_COUNT,
} from '@/lib/dashboard-week-nav'
import {
  weekSessionLoadActual,
  weekSessionLoadPlanned,
} from '@/lib/training-load/session-tss'
import { useSessionLoadThresholds } from '@/components/plan/session-load-thresholds-context'

const WEEK_COUNT = DASHBOARD_WEEK_NAV_COUNT
const CENTER_INDEX = DASHBOARD_WEEK_NAV_CENTER

const SHELL =
  'overflow-hidden rounded-[0.9rem] border border-[var(--tt-line,#ebebeb)] bg-[var(--tt-surface,#fff)] px-4 py-3.5 shadow-[var(--tt-shadow)] md:rounded-[10px] md:p-4'

type AthleteWeekStatsCardProps = {
  workouts: PlanWorkoutDetail[]
  anchorWeekStartKey: string
  planSportRows?: WorkoutType[]
  swimCssSecPer100m?: number | null
  /** `v2` = light panel + eyebrow header for athlete home v2. */
  tone?: 'default' | 'v2'
  className?: string
}

function weekDateKeys(weekStartKey: string): string[] {
  const start = parseDateOnly(weekStartKey)
  return Array.from({ length: 7 }, (_, i) => toDateKey(addDateOnlyDays(start, i)))
}

function formatHoursLabel(min: number): string {
  return formatWeekSportTime(min)
}

function buildWeekStats(
  weekStartKey: string,
  workouts: PlanWorkoutDetail[],
  planSportRows: WorkoutType[],
  swimCssSecPer100m: number | null,
  weekOffset: number,
  plannedTss: number,
  actualTss: number,
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
    rangeLabelCompact,
    sports: sportList,
    planDays: days,
    allWorkouts: all,
    overall: {
      plannedLabel: formatHoursLabel(plannedMin),
      completedLabel: formatHoursLabel(completedMin),
      pct: overallPct,
    },
    tss: {
      planned: plannedTss,
      actual: actualTss,
      pct:
        plannedTss > 0
          ? Math.min(100, Math.round((actualTss / plannedTss) * 100))
          : 0,
    },
  }
}

export function AthleteWeekStatsCard({
  workouts,
  anchorWeekStartKey,
  planSportRows = [],
  swimCssSecPer100m = null,
  tone = 'default',
  className,
}: AthleteWeekStatsCardProps) {
  const isV2 = tone === 'v2'
  const [active, setActive] = useState(CENTER_INDEX)
  /** Carousel track — only moves on swipe; arrows morph bars in place. */
  const [paneActive, setPaneActive] = useState(CENTER_INDEX)
  const [sportStatMode, setSportStatMode] =
    useState<WeekSportStatMode>('distance')
  const [barMorphFrom, setBarMorphFrom] = useState<Record<string, number> | null>(
    null,
  )
  const syncTimerRef = useRef<number | null>(null)
  const loadThresholds = useSessionLoadThresholds()

  const weeks = useMemo(() => {
    const anchor = parseDateOnly(anchorWeekStartKey)
    return Array.from({ length: WEEK_COUNT }, (_, i) => {
      const weekOffset = i - CENTER_INDEX
      const weekStartKey = toDateKey(addDateOnlyDays(anchor, weekOffset * 7))
      const keys = weekDateKeys(weekStartKey)
      const keySet = new Set(keys)
      const weekWorkouts = workouts.filter((w) => keySet.has(w.dateKey))
      return buildWeekStats(
        weekStartKey,
        workouts,
        planSportRows,
        swimCssSecPer100m,
        weekOffset,
        weekSessionLoadPlanned(weekWorkouts, loadThresholds),
        weekSessionLoadActual(weekWorkouts, loadThresholds),
      )
    })
  }, [
    anchorWeekStartKey,
    workouts,
    planSportRows,
    swimCssSecPer100m,
    loadThresholds,
  ])

  const week = weeks[active]!
  const canPrev = active > 0
  const canNext = active < WEEK_COUNT - 1

  const captureBarPcts = useCallback(
    (slide: (typeof weeks)[number]) => {
      const pcts: Record<string, number> = {
        __overall: slide.overall.pct,
        __tss: slide.tss.pct,
      }
      for (const sport of slide.sports) {
        const totals = sumSportWeekTotals(slide.planDays, sport, {
          swimCssSecPer100m,
        })
        const metric = weekSportMetric(
          sport,
          totals,
          slide.allWorkouts,
          sportStatMode,
          loadThresholds,
        )
        pcts[sport] = weekSportProgressPercent(metric.actual, metric.planned)
      }
      return pcts
    },
    [sportStatMode, swimCssSecPer100m, loadThresholds],
  )

  const switchSportStatMode = useCallback(
    (next: WeekSportStatMode) => {
      if (next === sportStatMode) return
      const current = weeks[active]!
      setBarMorphFrom(captureBarPcts(current))
      setSportStatMode(next)
      window.setTimeout(() => setBarMorphFrom(null), 500)
    },
    [active, captureBarPcts, sportStatMode, weeks],
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

  const awayFromThisWeek = active !== CENTER_INDEX
  const nav = (
    <>
      {awayFromThisWeek ? (
        <WeekCarouselThisWeekButton
          className="mr-1.5"
          onClick={() => goByArrow(CENTER_INDEX)}
        />
      ) : null}
      <WeekCarouselNav
        canPrev={canPrev}
        canNext={canNext}
        isToday={!awayFromThisWeek}
        rangeLabel={week.rangeLabel}
        rangeLabelCompact={week.rangeLabelCompact}
        onPrev={() => goByArrow(Math.max(0, active - 1))}
        onNext={() => goByArrow(Math.min(WEEK_COUNT - 1, active + 1))}
      />
    </>
  )

  const trackClass = isV2
    ? 'tt-v2-home-track mt-0.5 h-1.5 overflow-hidden'
    : 'mt-0.5 h-1 overflow-hidden rounded-full bg-[var(--tt-line,#ebebeb)]'
  const footerTrackClass = isV2
    ? 'tt-v2-home-track mt-1 h-1.5 overflow-hidden'
    : 'mt-1 h-1 overflow-hidden rounded-full bg-[var(--tt-line,#ebebeb)]'

  return (
    <section
      className={cn(
        isV2 ? cn(v2.surfaces.widgetLight, 'tt-v2-home-widget') : SHELL,
        className,
      )}
    >
      {isV2 ? (
        <V2WidgetHeader
          title={week.title}
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
      ) : (
        <HomeMobileSectionHeader
          title={week.title}
          collapsible={false}
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
      )}

      <WeekSwipePane
        className="mt-2"
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
                <div className={cn(WEEK_SPORT_STATS_GRID, 'gap-y-1')}>
                    {data.sports.map((sport, sportIndex) => {
                      const totals = sumSportWeekTotals(data.planDays, sport, {
                        swimCssSecPer100m,
                      })
                      const metric = weekSportMetric(
                        sport,
                        totals,
                        data.allWorkouts,
                        sportStatMode,
                        loadThresholds,
                      )
                      const pct = weekSportProgressPercent(
                        metric.actual,
                        metric.planned,
                      )
                      const unavailable = Boolean(metric.unavailableForMode)
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
                              strokeWidth={1.75}
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
                          <WeekSportMetricValue metric={metric} />
                          <div
                            className={cn(
                              'col-span-2',
                              trackClass,
                              !isLast && 'mb-2',
                            )}
                          >
                            <MorphProgressBar
                              pct={pct}
                              morphFrom={morph?.[sport] ?? null}
                              className={
                                unavailable
                                  ? isV2
                                    ? 'tt-v2-home-track-fill--muted'
                                    : 'bg-[var(--tt-ink-faint,#9a9a9a)]'
                                  : isV2
                                    ? 'tt-v2-home-track-fill--accent'
                                    : WORKOUT_TYPE_DOT_CLASS[sport]
                              }
                            />
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}

              <div className="mt-2.5 border-t border-[var(--tt-line,#ebebeb)] pt-2">
                <div className="min-w-0">
                  <WeekVolumeMetric
                    actual={data.overall.completedLabel}
                    planned={data.overall.plannedLabel}
                  />
                  <div className={footerTrackClass}>
                    <MorphProgressBar
                      pct={data.overall.pct}
                      morphFrom={morph?.__overall ?? null}
                      className={
                        isV2
                          ? 'tt-v2-home-track-fill'
                          : 'bg-[var(--tt-ink-soft,#6b6b6b)]'
                      }
                    />
                  </div>
                  <p className="mt-1 text-right text-[11px] tabular-nums text-[var(--tt-ink-faint,#9a9a9a)]">
                    {data.overall.pct}%
                  </p>
                </div>
              </div>
            </WeekSwipeSlide>
          )
        })}
      </WeekSwipePane>
    </section>
  )
}
