import { PlannedMetricSource, WorkoutType } from '@prisma/client'
import type { AthletePreferences } from '@/lib/athlete-preferences'
import {
  estimateSwimDistanceMetersFromCss,
  estimateSwimDurationMinFromCss,
} from '@/lib/athlete-preferences'
import { hasStructureContent, parseStructure } from '@/lib/workout-builder/utils'
import {
  resolveLibraryTemplateMetricsForAthlete,
  type LibraryTemplateAthleteMetrics,
} from '@/lib/workout-library/template-metrics'
import { isAutomatedMetricSource } from '@/lib/workout-metric-source'

export type TrainingPlanSessionMetricsInput = {
  type: WorkoutType
  sessionType: string
  plannedDistance: number | null
  plannedDuration: number | null
  plannedDistanceMeters?: number | null
  plannedDistanceSource?: PlannedMetricSource | null
  plannedDurationSource?: PlannedMetricSource | null
  plannedDistanceMetersSource?: PlannedMetricSource | null
  structure?: unknown | null
}

export type TrainingPlanSessionAthleteMetrics = LibraryTemplateAthleteMetrics & {
  distanceMeters: number | null
  distanceMetersSource: PlannedMetricSource | null
}

/**
 * Resolve plan-session planned metrics for a specific athlete.
 * Structure prescriptions (Threshold, %FTP, zones, CSS companions) stay portable;
 * totals are recomputed from athlete prefs the same way as library templates.
 */
export function resolveTrainingPlanSessionMetricsForAthlete(
  session: TrainingPlanSessionMetricsInput,
  preferences: AthletePreferences | null | undefined,
): TrainingPlanSessionAthleteMetrics {
  const base = resolveLibraryTemplateMetricsForAthlete(
    {
      type: session.type,
      sessionType: session.sessionType as never,
      distanceKm: session.plannedDistance,
      durationMin: session.plannedDuration,
      structure: session.structure ?? null,
      plannedDistanceMeters: session.plannedDistanceMeters ?? null,
      distanceSource: session.plannedDistanceSource ?? null,
      durationSource: session.plannedDurationSource ?? null,
    },
    preferences,
  )

  if (session.type !== WorkoutType.SWIM) {
    return {
      ...base,
      distanceMeters: null,
      distanceMetersSource: null,
    }
  }

  return resolveSwimPlanSessionMetrics(session, preferences, base)
}

/**
 * Recompute session totals for a new plan level / linked athlete.
 * MANUAL metrics stay locked; STRUCTURE/COMPANION/legacy values are cleared and
 * re-derived from structure + the given preference defaults.
 */
export function recalculateTrainingPlanSessionMetricsForPreferences(
  session: TrainingPlanSessionMetricsInput,
  preferences: AthletePreferences | null | undefined,
): TrainingPlanSessionAthleteMetrics {
  const distanceLocked =
    session.plannedDistanceSource === PlannedMetricSource.MANUAL
  const durationLocked =
    session.plannedDurationSource === PlannedMetricSource.MANUAL
  const metersLocked =
    session.plannedDistanceMetersSource === PlannedMetricSource.MANUAL

  let hasStructure = false
  try {
    hasStructure = hasStructureContent(parseStructure(session.structure))
  } catch {
    /* ignore invalid structure */
  }

  const openDistanceSource = (): PlannedMetricSource | null => {
    if (hasStructure) return PlannedMetricSource.STRUCTURE
    if (
      durationLocked ||
      (session.plannedDuration != null && session.plannedDuration > 0)
    ) {
      return PlannedMetricSource.COMPANION
    }
    return null
  }

  const openDurationSource = (): PlannedMetricSource | null => {
    if (hasStructure) return PlannedMetricSource.STRUCTURE
    if (
      distanceLocked ||
      metersLocked ||
      (session.plannedDistance != null && session.plannedDistance > 0) ||
      (session.plannedDistanceMeters != null &&
        session.plannedDistanceMeters > 0)
    ) {
      return PlannedMetricSource.COMPANION
    }
    return null
  }

  return resolveTrainingPlanSessionMetricsForAthlete(
    {
      ...session,
      plannedDistance: distanceLocked ? session.plannedDistance : null,
      plannedDuration: durationLocked ? session.plannedDuration : null,
      plannedDistanceMeters: metersLocked
        ? session.plannedDistanceMeters
        : null,
      plannedDistanceSource: distanceLocked
        ? PlannedMetricSource.MANUAL
        : openDistanceSource(),
      plannedDurationSource: durationLocked
        ? PlannedMetricSource.MANUAL
        : openDurationSource(),
      plannedDistanceMetersSource: metersLocked
        ? PlannedMetricSource.MANUAL
        : openDistanceSource(),
    },
    preferences,
  )
}

function resolveSwimPlanSessionMetrics(
  session: TrainingPlanSessionMetricsInput,
  preferences: AthletePreferences | null | undefined,
  base: LibraryTemplateAthleteMetrics,
): TrainingPlanSessionAthleteMetrics {
  const legacy =
    session.plannedDistanceSource == null &&
    session.plannedDurationSource == null &&
    session.plannedDistanceMetersSource == null

  let meters =
    session.plannedDistanceMeters && session.plannedDistanceMeters > 0
      ? session.plannedDistanceMeters
      : base.distanceKm && base.distanceKm > 0
        ? Math.round(base.distanceKm * 1000)
        : null
  let durationMin = base.durationMin
  let metersSource: PlannedMetricSource | null =
    meters != null && meters > 0
      ? session.plannedDistanceMetersSource ??
        session.plannedDistanceSource ??
        PlannedMetricSource.MANUAL
      : null
  let durationSource = base.durationSource

  const css = preferences?.swimCssSecPer100m
  const hasCss = typeof css === 'number' && css > 0

  const metersLocked =
    session.plannedDistanceMetersSource === PlannedMetricSource.MANUAL ||
    session.plannedDistanceSource === PlannedMetricSource.MANUAL
  const durationLocked =
    session.plannedDurationSource === PlannedMetricSource.MANUAL

  if (hasCss) {
    const needDuration =
      meters != null &&
      meters > 0 &&
      !(durationMin && durationMin > 0) &&
      !durationLocked &&
      (legacy ||
        session.plannedDurationSource === PlannedMetricSource.COMPANION ||
        session.plannedDurationSource == null ||
        isAutomatedMetricSource(session.plannedDurationSource))

    const needMeters =
      durationMin != null &&
      durationMin > 0 &&
      !(meters && meters > 0) &&
      !metersLocked &&
      (legacy ||
        session.plannedDistanceMetersSource === PlannedMetricSource.COMPANION ||
        session.plannedDistanceSource === PlannedMetricSource.COMPANION ||
        session.plannedDistanceMetersSource == null ||
        session.plannedDistanceSource == null ||
        isAutomatedMetricSource(session.plannedDistanceMetersSource) ||
        isAutomatedMetricSource(session.plannedDistanceSource))

    if (needDuration && meters != null) {
      const derived = estimateSwimDurationMinFromCss(meters, css!)
      if (derived > 0) {
        durationMin = derived
        durationSource = PlannedMetricSource.COMPANION
      }
    } else if (needMeters && durationMin != null) {
      const derived = estimateSwimDistanceMetersFromCss(durationMin, css!)
      if (derived > 0) {
        meters = derived
        metersSource = PlannedMetricSource.COMPANION
      }
    }
  }

  if (metersLocked && session.plannedDistanceMeters && session.plannedDistanceMeters > 0) {
    meters = session.plannedDistanceMeters
    metersSource = PlannedMetricSource.MANUAL
  }
  if (durationLocked && session.plannedDuration && session.plannedDuration > 0) {
    durationMin = session.plannedDuration
    durationSource = PlannedMetricSource.MANUAL
  }

  const distanceKm =
    meters != null && meters > 0 ? Math.round((meters / 1000) * 100) / 100 : null

  return {
    distanceKm,
    durationMin: durationMin && durationMin > 0 ? durationMin : null,
    distanceApprox: isAutomatedMetricSource(metersSource),
    durationApprox: isAutomatedMetricSource(durationSource),
    distanceSource:
      distanceKm != null
        ? (metersSource ?? PlannedMetricSource.MANUAL)
        : null,
    durationSource: durationMin && durationMin > 0 ? durationSource : null,
    distanceMeters: meters != null && meters > 0 ? meters : null,
    distanceMetersSource: meters != null && meters > 0 ? metersSource : null,
  }
}
