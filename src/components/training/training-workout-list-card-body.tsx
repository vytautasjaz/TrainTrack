'use client'

import { useMemo } from 'react'
import { Clock, MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { StravaSyncedIndicator } from '@/components/plan/strava-synced-indicator'
import { ReschedulePlanIndicator } from '@/components/plan/reschedule-plan-indicator'
import {
  buildAthleteStructureDisplay,
  buildListPhaseRows,
  type WorkoutSummaryMetric,
} from '@/lib/workout-builder/athlete-structure-display'
import { getSessionIntensity } from '@/lib/workout-builder/session-intensity'
import { hasStructureContent } from '@/lib/workout-builder/utils'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { cn } from '@/lib/utils'

type TrainingWorkoutListCardBodyProps = {
  workout: PlanWorkoutDetail
  coachNotes?: string | null
  className?: string
}

function SideMetricsStack({ metrics }: { metrics: WorkoutSummaryMetric[] }) {
  const shown = metrics.filter((m) => m.label === 'Distance' || m.label === 'Time')
  if (shown.length === 0) return null

  const icons: Record<string, typeof MapPin> = {
    Distance: MapPin,
    Time: Clock,
  }

  return (
    <div className="flex shrink-0 items-center divide-x divide-border/50">
      {shown.map((metric, index) => {
        const Icon = icons[metric.label] ?? MapPin
        return (
          <div
            key={metric.label}
            className={cn(
              'flex items-center gap-1.5',
              index === 0 ? 'pr-3' : index === shown.length - 1 ? 'pl-3' : 'px-3',
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0">
              <p className="text-sm font-bold tabular-nums leading-none text-foreground">
                {metric.value}
              </p>
              <p className="mt-0.5 text-[10px] leading-none text-muted-foreground">
                {metric.label}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function PhaseTimeline({
  rows,
}: {
  rows: ReturnType<typeof buildListPhaseRows>
}) {
  if (rows.length === 0) return null

  return (
    <div className="relative mt-2 min-w-0">
      {rows.length > 1 ? (
        <div
          className="absolute bottom-1 left-[5px] top-1 border-l border-dashed border-border/70"
          aria-hidden
        />
      ) : null}
      <ul>
        {rows.map((row) => (
          <li
            key={row.id}
            className="relative flex items-start gap-2.5 py-1 first:pt-0 last:pb-0"
          >
            <span
              className="relative z-[1] mt-1 h-2 w-2 shrink-0 rounded-full border-2 border-card bg-muted-foreground/35"
              aria-hidden
            />
            <p className="min-w-0 flex-1 text-sm leading-snug">
              <span className="font-semibold text-foreground">{row.label}</span>{' '}
              <span className="text-muted-foreground">{row.detail}</span>
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function TrainingWorkoutListCardBody({
  workout,
  coachNotes,
  className,
}: TrainingWorkoutListCardBodyProps) {
  const intensity = getSessionIntensity(workout.sessionType)

  const display = useMemo(() => {
    if (!workout.structure || !hasStructureContent(workout.structure)) return null
    return buildAthleteStructureDisplay({
      structure: workout.structure,
      plannedDistance: workout.plannedDistance,
      plannedDuration: workout.plannedDuration,
      sportType: workout.type,
    })
  }, [workout])

  const phaseRows = display ? buildListPhaseRows(display) : []

  return (
    <div className={cn('min-w-0 flex-1', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h3 className="text-base font-bold leading-tight tracking-tight">{workout.title}</h3>
          {intensity ? (
            <Badge
              className={cn(
                'px-2 py-0 text-[10px] font-bold uppercase tracking-wide',
                intensity.className,
              )}
            >
              {intensity.label}
            </Badge>
          ) : null}
          <StravaSyncedIndicator workout={workout} variant="wordmark" size="sm" />
        </div>

        {display ? <SideMetricsStack metrics={display.metrics} /> : null}
      </div>

      <ReschedulePlanIndicator workout={workout} compact className="mt-1" />

      {phaseRows.length > 0 ? <PhaseTimeline rows={phaseRows} /> : null}

      {coachNotes ? (
        <div className="mt-3 border-t border-border/40 pt-2.5">
          <p className="text-[13px] font-semibold text-foreground">Coach</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{coachNotes}</p>
        </div>
      ) : null}
    </div>
  )
}
