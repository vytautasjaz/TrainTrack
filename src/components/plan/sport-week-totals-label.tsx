import { Clock, Route } from 'lucide-react'
import type { WorkoutType } from '@prisma/client'
import {
  sportUsesPlannedDistance,
  type SportWeekTotals,
} from '@/lib/plan-week-totals'
import { formatDistance, formatDuration } from '@/lib/utils'
import { cn } from '@/lib/utils'

type SportWeekTotalsLabelProps = {
  sport: WorkoutType
  totals: SportWeekTotals
  className?: string
}

export function SportWeekTotalsLabel({ sport, totals, className }: SportWeekTotalsLabelProps) {
  const showDistance = sportUsesPlannedDistance(sport) && totals.distanceKm > 0
  const showDuration = totals.durationMin > 0

  if (!showDistance && !showDuration) return null

  return (
    <div className={cn('flex flex-col gap-0.5 text-muted-foreground lg:gap-1', className)}>
      {showDistance && (
        <div className="flex items-center gap-1 text-[9px] leading-none tabular-nums lg:text-[10px]">
          <Route className="h-2.5 w-2.5 shrink-0 opacity-60" strokeWidth={2.25} />
          <span>{formatDistance(totals.distanceKm)}</span>
        </div>
      )}
      {showDuration && (
        <div className="flex items-center gap-1 text-[9px] leading-none tabular-nums lg:text-[10px]">
          <Clock className="h-2.5 w-2.5 shrink-0 opacity-60" strokeWidth={2.25} />
          <span>{formatDuration(totals.durationMin)}</span>
        </div>
      )}
    </div>
  )
}
