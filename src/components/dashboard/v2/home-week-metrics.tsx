'use client'

import { V2MetricCard, V2MiniBars, V2MiniRing } from '@/components/ui/v2'
import { useUnitSystem } from '@/components/units/units-context'
import {
  pctDelta,
  type HomeWeekMetricsModel,
} from '@/components/dashboard/v2/home-week-utils'
import { kmToMi } from '@/lib/units'
import { cn } from '@/lib/utils'

export function HomeWeekMetrics({
  metrics,
}: {
  metrics: HomeWeekMetricsModel
}) {
  const unitSystem = useUnitSystem()
  const distanceDelta = pctDelta(metrics.distanceKm, metrics.prevDistanceKm)
  const tssDelta = pctDelta(
    metrics.tssActual > 0 ? metrics.tssActual : metrics.tssPlanned,
    metrics.prevTssActual,
  )
  const completionRatio =
    metrics.planned > 0
      ? Math.min(1, metrics.completed / metrics.planned)
      : 0
  const distanceUnit = unitSystem === 'IMPERIAL' ? 'mi' : 'km'
  const toDisplay = (km: number) =>
    Math.round(unitSystem === 'IMPERIAL' ? kmToMi(km) : km)
  const doneDistance = toDisplay(metrics.doneDistanceKm)
  const plannedDistance = toDisplay(metrics.plannedDistanceKm)
  const soft =
    'tt-v2-metric__unit text-[0.55em] font-semibold tracking-normal text-white/40'
  const loadActual = metrics.tssActual
  const loadPlanned = metrics.tssPlanned
  const doneCount = metrics.completed
  const plannedCount = Math.max(metrics.planned, metrics.completed)
  const dailyBars =
    unitSystem === 'IMPERIAL'
      ? metrics.dailyDistanceKm.map((km) => kmToMi(km))
      : metrics.dailyDistanceKm

  const multiWeek = metrics.weekCount > 1
  const weeksLabel = `${metrics.weekCount} Weeks`
  const deltaCompareLabel = multiWeek
    ? `vs last ${metrics.weekCount} weeks`
    : 'vs last week'

  return (
    <div className="tt-v2-hero-metric-strip">
      <V2MetricCard
        label={
          <>
            <span className="sm:hidden">Distance</span>
            <span className="hidden sm:inline">
              {multiWeek ? `${weeksLabel} Distance` : 'Weekly Distance'}
            </span>
          </>
        }
        value={
          <>
            {doneDistance}
            {plannedDistance > 0 ? (
              <span className={cn(soft, 'ml-0.5')}>/ {plannedDistance}</span>
            ) : null}
            <span className={cn(soft, 'ml-0.5')}>{distanceUnit}</span>
          </>
        }
        delta={distanceDelta}
        deltaCompareLabel={deltaCompareLabel}
        compactDelta
      >
        <V2MiniBars values={dailyBars} />
      </V2MetricCard>
      <V2MetricCard
        label={
          <>
            <span className="sm:hidden">Load</span>
            <span className="hidden sm:inline">
              {multiWeek
                ? `${weeksLabel} Training Load`
                : 'Training Load (TSS)'}
            </span>
          </>
        }
        value={
          <>
            {loadActual}
            {loadPlanned > 0 ? (
              <span className={cn(soft, 'ml-0.5')}>/ {loadPlanned}</span>
            ) : null}
          </>
        }
        delta={tssDelta}
        deltaCompareLabel={deltaCompareLabel}
        compactDelta
      >
        <V2MiniBars values={metrics.dailyTss} />
      </V2MetricCard>
      <V2MetricCard
        label={
          <>
            <span className="sm:hidden">Done</span>
            <span className="hidden sm:inline">
              {multiWeek ? `${weeksLabel} Completion` : 'Completion'}
            </span>
          </>
        }
        value={
          <>
            {doneCount}
            <span className={cn(soft, 'ml-0.5')}>/ {plannedCount}</span>
          </>
        }
        hint={multiWeek ? weeksLabel : 'This week'}
      >
        <V2MiniRing value={completionRatio} />
      </V2MetricCard>
    </div>
  )
}
