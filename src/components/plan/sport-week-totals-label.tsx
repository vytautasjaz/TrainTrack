import { Clock, Route } from 'lucide-react'
import type { WorkoutType } from '@prisma/client'
import {
  formatSportWeekActualDistance,
  formatSportWeekDistance,
  sportHasPlannedDistance,
  type SportWeekTotals,
} from '@/lib/plan-week-totals'
import { formatDuration } from '@/lib/utils'
import { cn } from '@/lib/utils'

type SportWeekTotalsLabelProps = {
  sport: WorkoutType
  totals: SportWeekTotals
  className?: string
}

export function SportWeekTotalsLabel({ sport, totals, className }: SportWeekTotalsLabelProps) {
  const plannedDistance = formatSportWeekDistance(sport, totals)
  const actualDistance = formatSportWeekActualDistance(sport, totals)
  const showDistance = sportHasPlannedDistance(sport, totals) && plannedDistance != null
  const showDuration = totals.durationMin > 0 || totals.actualDurationMin > 0
  const hasActualDuration = totals.actualDurationMin > 0

  if (!showDistance && !showDuration) return null

  return (
    <div className={cn('flex flex-col gap-0.5 text-muted-foreground lg:gap-1', className)}>
      {showDistance && plannedDistance && (
        <div className="flex items-center gap-1 text-[9px] leading-none tabular-nums lg:text-[10px]">
          <Route className="h-2.5 w-2.5 shrink-0 opacity-60" strokeWidth={2.25} />
          {actualDistance ? (
            <>
              <span className="font-semibold text-foreground">{actualDistance}</span>
              <span className="opacity-50">/</span>
              <span>{plannedDistance}</span>
            </>
          ) : (
            <span>{plannedDistance}</span>
          )}
        </div>
      )}
      {showDuration && (
        <div className="flex items-center gap-1 text-[9px] leading-none tabular-nums lg:text-[10px]">
          <Clock className="h-2.5 w-2.5 shrink-0 opacity-60" strokeWidth={2.25} />
          {hasActualDuration && totals.durationMin > 0 ? (
            <>
              <span className="font-semibold text-foreground">
                {formatDuration(totals.actualDurationMin)}
              </span>
              <span className="opacity-50">/</span>
              <span>{formatDuration(totals.durationMin)}</span>
            </>
          ) : hasActualDuration ? (
            <span className="font-semibold text-foreground">
              {formatDuration(totals.actualDurationMin)}
            </span>
          ) : (
            <span>{formatDuration(totals.durationMin)}</span>
          )}
        </div>
      )}
    </div>
  )
}
