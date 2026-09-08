'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import type { WorkoutType } from '@prisma/client'
import type { PlanDay } from '@/lib/plan-week'
import {
  sumSportWeekTotals,
  sumWeekDurationMinutes,
  type WeekTotalsOptions,
} from '@/lib/plan-week-totals'
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
import { cn, formatDuration } from '@/lib/utils'

type WeekPortraitStatsProps = {
  days: PlanDay[]
  sportRows: WorkoutType[]
  swimCssSecPer100m?: number | null
  className?: string
}

/** Min width per sport before progress bars stay readable. */
const SPORT_BAR_MIN_PX = 72

/**
 * Portrait-only week summary under the matrix.
 * Row 1 — all sports in one strip (bars only when there is room).
 * Row 2 — weekly volume.
 */
export function WeekPortraitStats({
  days,
  sportRows,
  swimCssSecPer100m = null,
  className,
}: WeekPortraitStatsProps) {
  const options: WeekTotalsOptions = { swimCssSecPer100m }
  const allWorkouts = days.flatMap((d) => d.workouts)
  const sports = weekSportsWithPlannedWork(days, sportRows, options)
  const { planned: volumePlannedMin, actual: volumeActualMin } =
    sumWeekDurationMinutes(days, options)
  const volumePct = weekSportProgressPercent(volumeActualMin, volumePlannedMin)

  const sportsRowRef = useRef<HTMLDivElement>(null)
  const [showSportBars, setShowSportBars] = useState(false)

  useLayoutEffect(() => {
    const row = sportsRowRef.current
    if (!row || sports.length === 0) {
      setShowSportBars(false)
      return
    }

    function sync() {
      const width = row!.clientWidth
      setShowSportBars(width >= sports.length * SPORT_BAR_MIN_PX)
    }

    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(row)
    return () => ro.disconnect()
  }, [sports.length])

  if (sports.length === 0 && volumePlannedMin <= 0 && volumeActualMin <= 0) {
    return null
  }

  return (
    <div
      className={cn(
        'tt-week-portrait-stats flex flex-col gap-1.5 portrait:max-lg:flex landscape:max-lg:hidden lg:hidden',
        className,
      )}
    >
      {sports.length > 0 ? (
        <div
          ref={sportsRowRef}
          className="grid min-w-0 gap-1.5"
          style={{
            gridTemplateColumns: `repeat(${sports.length}, minmax(0, 1fr))`,
          }}
          data-sport-count={sports.length}
          data-show-bars={showSportBars ? '1' : '0'}
        >
          {sports.map((sport) => {
            const totals = sumSportWeekTotals(days, sport, options)
            const metric = weekSportMetric(sport, totals, allWorkouts)
            const pct = weekSportProgressPercent(metric.actual, metric.planned)
            const Icon = WORKOUT_TYPE_ICONS[sport]
            const label = WORKOUT_TYPE_LABELS[sport]
            const detail = `${label} ${metric.actualLabel}/${metric.plannedLabel}${
              metric.unit ? ` ${metric.unit}` : ''
            }`

            return (
              <div
                key={sport}
                className="tt-week-portrait-sport min-w-0"
                title={detail}
              >
                <div className="flex min-w-0 items-center gap-0.5">
                  <Icon
                    className={cn(
                      'h-3 w-3 shrink-0',
                      WEEK_STATS_SPORT_ICON_COLOR[sport],
                    )}
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <p className="min-w-0 truncate text-[10px] tabular-nums leading-tight text-foreground">
                    <span className="font-semibold">{metric.actualLabel}</span>
                    <span className="text-muted-foreground">
                      /{metric.plannedLabel}
                      {metric.unit ? ` ${metric.unit}` : ''}
                    </span>
                  </p>
                </div>
                {showSportBars ? (
                  <div className="tt-week-portrait-sport-bar mt-1 h-1 overflow-hidden rounded-full bg-[var(--tt-line,#ebebeb)]">
                    <div
                      className={cn(
                        'h-full rounded-full transition-[width]',
                        WORKOUT_TYPE_DOT_CLASS[sport],
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      ) : null}

      {(volumePlannedMin > 0 || volumeActualMin > 0) && (
        <div className="tt-week-portrait-volume min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
              Weekly volume
            </p>
            <p className="text-[11px] tabular-nums text-muted-foreground">
              {volumeActualMin > 0 && volumePlannedMin > 0 ? (
                <>
                  <span className="font-semibold text-foreground">
                    {formatDuration(volumeActualMin)}
                  </span>
                  <span>
                    /{formatDuration(volumePlannedMin)} · {volumePct}%
                  </span>
                </>
              ) : (
                <span className="font-semibold text-foreground">
                  {formatDuration(
                    volumeActualMin > 0 ? volumeActualMin : volumePlannedMin,
                  )}
                </span>
              )}
            </p>
          </div>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-[var(--tt-line,#ebebeb)]">
            <div
              className="h-full rounded-full bg-[var(--tt-ink-soft,#6b6b6b)] transition-[width]"
              style={{ width: `${volumePct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
