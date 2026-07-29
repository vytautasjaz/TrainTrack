'use client'

import { INTENSITY_ZONES } from '@/lib/calculators/pace-zones'
import { cn } from '@/lib/utils'

type CalculatorZoneBarProps = {
  markerPercent: number | null
  className?: string
}

export function CalculatorZoneBar({ markerPercent, className }: CalculatorZoneBarProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="relative h-2.5 overflow-hidden rounded-full bg-muted">
        <div className="absolute inset-0 flex">
          {INTENSITY_ZONES.map((zone) => (
            <div key={zone.id} className={cn('h-full flex-1', zone.className)} />
          ))}
        </div>
        {markerPercent != null ? (
          <span
            className="absolute top-1/2 z-[1] h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-foreground shadow-sm"
            style={{ left: `${Math.min(100, Math.max(0, markerPercent))}%` }}
            aria-hidden
          />
        ) : null}
      </div>
      <div className="flex justify-between gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {INTENSITY_ZONES.map((zone) => (
          <span key={zone.id}>{zone.label}</span>
        ))}
      </div>
    </div>
  )
}
