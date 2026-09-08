'use client'

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

/**
 * Portrait-only week summary under the matrix — same sport progress bars
 * as Home week stats / Month calendar week cell.
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

  if (sports.length === 0 && volumePlannedMin <= 0 && volumeActualMin <= 0) {
    return null
  }

  return (
    <div
      className={cn(
        'tt-week-portrait-stats portrait:max-lg:block landscape:max-lg:hidden lg:hidden',
        className,
      )}
    >
      {sports.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-3 gap-y-3">
          {sports.map((sport) => {
            const totals = sumSportWeekTotals(days, sport, options)
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
                  <p className="truncate text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                    {WORKOUT_TYPE_LABELS[sport]}
                  </p>
                </div>
                <p className="mt-0.5 text-[11px] tabular-nums text-foreground">
                  <span className="font-semibold">{metric.actualLabel}</span>
                  <span className="text-muted-foreground">
                    /{metric.plannedLabel}
                    {metric.unit ? ` ${metric.unit}` : ''}
                  </span>
                </p>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-[var(--tt-line,#ebebeb)]">
                  <div
                    className={cn(
                      'h-full rounded-full transition-[width]',
                      WORKOUT_TYPE_DOT_CLASS[sport],
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      ) : null}

      {(volumePlannedMin > 0 || volumeActualMin > 0) && (
        <div
          className={cn(
            sports.length > 0 && 'mt-3 border-t border-[var(--tt-line,#ebebeb)] pt-2.5',
          )}
        >
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
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[var(--tt-line,#ebebeb)]">
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
