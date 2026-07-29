'use client'

import type { AthletePreferences } from '@/lib/athlete-preferences'
import type { WorkoutStructure } from '@/lib/workout-builder/types'
import { getSessionTypeLabel } from '@/lib/workout-builder/session-modes'
import { inferDominantSessionType } from '@/lib/workout-builder/smart-title'
import {
  buildWorkoutSummaryLines,
  computeWorkoutSummaryMetrics,
} from '@/lib/workout-builder/workout-summary'
import { cn } from '@/lib/utils'

type WorkoutSummaryPanelProps = {
  structure: WorkoutStructure
  sessionType?: import('@prisma/client').SessionType
  sportType?: import('@prisma/client').WorkoutType
  athletePreferences?: AthletePreferences | null
  className?: string
}

export function WorkoutSummaryPanel({
  structure,
  sessionType,
  sportType = 'RUN',
  athletePreferences,
  className,
}: WorkoutSummaryPanelProps) {
  const lines = buildWorkoutSummaryLines(structure, sportType)
  const metrics = computeWorkoutSummaryMetrics(structure, athletePreferences, sportType)
  const workoutTypeLabel = getSessionTypeLabel(
    sessionType ?? inferDominantSessionType(structure),
    sportType,
  )

  if (lines.length === 0) return null

  return (
    <aside className={cn('space-y-3 border-t border-border/50 pt-4', className)}>
      <h3 className="text-sm font-semibold">Today&apos;s Workout</h3>

      <div className="space-y-1">
        {lines.map((line, index) => (
          <div key={index}>
            {index > 0 && (
              <div className="py-0.5 text-center text-xs text-muted-foreground/50">↓</div>
            )}
            <p className="text-sm leading-snug text-muted-foreground">{line.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2 border-t border-border/50 pt-3 text-sm">
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Distance</span>
          <span className="font-medium">{metrics.distanceLabel}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Estimated Duration</span>
          <span className="font-medium">{metrics.durationLabel}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Workout Type</span>
          <span className="font-medium">{workoutTypeLabel}</span>
        </div>
      </div>
    </aside>
  )
}
