import { PlannedMetricSource, SessionType, WorkoutType } from '@prisma/client'
import type { AthletePreferences } from '@/lib/athlete-preferences'
import type { TrainingPlanEditorDetail } from '@/lib/training-plan'
import { resolveTrainingPlanSessionMetricsForAthlete } from '@/lib/training-plan-session-metrics'
import {
  estimatePlannedSessionTss,
  type SessionLoadThresholds,
} from '@/lib/training-load/session-tss'

function asMetricSource(
  value: string | null | undefined,
): PlannedMetricSource | null {
  if (!value) return null
  if (
    value === PlannedMetricSource.MANUAL ||
    value === PlannedMetricSource.STRUCTURE ||
    value === PlannedMetricSource.COMPANION
  ) {
    return value
  }
  return null
}

export type PlanWeekChartPoint = {
  weekIndex: number
  label: string
  mileageKm: number
  tss: number
  longestRunKm: number
}

function sessionDistanceKm(
  session: TrainingPlanEditorDetail['sessions'][number],
  preferences?: AthletePreferences | null,
): number {
  const metrics = resolveTrainingPlanSessionMetricsForAthlete(
    {
      type: session.type,
      sessionType: session.sessionType,
      plannedDistance: session.plannedDistance,
      plannedDuration: session.plannedDuration,
      plannedDistanceMeters: session.plannedDistanceMeters,
      plannedDistanceSource: asMetricSource(session.plannedDistanceSource),
      plannedDurationSource: asMetricSource(session.plannedDurationSource),
      plannedDistanceMetersSource: asMetricSource(
        session.plannedDistanceMetersSource,
      ),
      structure: session.structure,
    },
    preferences,
  )
  if (metrics.distanceKm != null && metrics.distanceKm > 0) {
    return metrics.distanceKm
  }
  if (metrics.distanceMeters != null && metrics.distanceMeters > 0) {
    return metrics.distanceMeters / 1000
  }
  return 0
}

function sessionDurationMin(
  session: TrainingPlanEditorDetail['sessions'][number],
  preferences?: AthletePreferences | null,
): number {
  const metrics = resolveTrainingPlanSessionMetricsForAthlete(
    {
      type: session.type,
      sessionType: session.sessionType,
      plannedDistance: session.plannedDistance,
      plannedDuration: session.plannedDuration,
      plannedDistanceMeters: session.plannedDistanceMeters,
      plannedDistanceSource: asMetricSource(session.plannedDistanceSource),
      plannedDurationSource: asMetricSource(session.plannedDurationSource),
      plannedDistanceMetersSource: asMetricSource(
        session.plannedDistanceMetersSource,
      ),
      structure: session.structure,
    },
    preferences,
  )
  return metrics.durationMin != null && metrics.durationMin > 0
    ? metrics.durationMin
    : (session.plannedDuration ?? 0)
}

/**
 * Aggregate plan sessions into weekly series for mileage / TSS / longest run.
 * Mileage prefers run+bike+hyrox distance; longest run is RUN-only.
 */
export function buildPlanWeeklyChartSeries(args: {
  plan: Pick<TrainingPlanEditorDetail, 'weekCount' | 'sessions' | 'sportFocus'>
  preferences?: AthletePreferences | null
  thresholds?: SessionLoadThresholds
}): PlanWeekChartPoint[] {
  const { plan, preferences = null, thresholds = {} } = args
  const weeks: PlanWeekChartPoint[] = []

  for (let w = 0; w < plan.weekCount; w += 1) {
    const sessions = plan.sessions.filter((s) => s.weekIndex === w)
    let mileageKm = 0
    let tss = 0
    let longestRunKm = 0
    let longestLongRunKm = 0

    for (const s of sessions) {
      if (s.type === WorkoutType.REST) continue
      const dist = sessionDistanceKm(s, preferences)
      const dur = sessionDurationMin(s, preferences)

      if (
        s.type === WorkoutType.RUN ||
        s.type === WorkoutType.BIKE ||
        s.type === WorkoutType.HYROX ||
        s.type === WorkoutType.TRIATHLON
      ) {
        mileageKm += dist
      }

      if (s.type === WorkoutType.RUN && dist > 0) {
        longestRunKm = Math.max(longestRunKm, dist)
        if (
          s.sessionType === SessionType.LONG_RUN ||
          s.sessionType === 'LONG_RUN' ||
          /long/i.test(s.title) ||
          (s.tags ?? []).some((t) => /long-run|long_run/i.test(t))
        ) {
          longestLongRunKm = Math.max(longestLongRunKm, dist)
        }
      }

      const sessionTss = estimatePlannedSessionTss({
        type: s.type,
        sessionType: s.sessionType,
        structure: s.structure,
        plannedDuration: dur > 0 ? dur : s.plannedDuration,
        thresholds,
      })
      if (sessionTss != null) tss += sessionTss
    }

    weeks.push({
      weekIndex: w,
      label: `W${w + 1}`,
      mileageKm: Math.round(mileageKm * 10) / 10,
      tss: Math.round(tss),
      // Prefer an explicit long-run session when present.
      longestRunKm: Math.round(
        (longestLongRunKm > 0 ? longestLongRunKm : longestRunKm) * 10,
      ) / 10,
    })
  }

  return weeks
}
