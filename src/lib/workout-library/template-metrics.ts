import { PlannedMetricSource, WorkoutType } from '@prisma/client'
import type { AthletePreferences } from '@/lib/athlete-preferences'
import {
  estimateDistanceKmFromDurationMinutes,
  estimateDurationMinutesFromDistanceKm,
  estimateStructureDistanceKm,
  estimateStructureDurationMinutes,
} from '@/lib/workout-builder/segment-estimation'
import { hasStructureContent, parseStructure } from '@/lib/workout-builder/utils'
import { sportUsesPlannedDistance } from '@/lib/plan-week-totals'
import type { WorkoutLibraryTemplate } from '@/lib/workout-library/types'
import { isAutomatedMetricSource } from '@/lib/workout-metric-source'

export type LibraryTemplateAthleteMetrics = {
  distanceKm: number | null
  durationMin: number | null
  distanceApprox: boolean
  durationApprox: boolean
  distanceSource: PlannedMetricSource | null
  durationSource: PlannedMetricSource | null
}

/**
 * Resolve library template distance/duration for the currently selected athlete.
 *
 * - MANUAL sources keep the template absolute.
 * - STRUCTURE sources recompute from blocks + athlete prefs.
 * - COMPANION sources recompute from the other metric via pace/speed.
 * - Legacy templates (null sources) keep previous behavior: structure overwrites when present.
 */
export function resolveLibraryTemplateMetricsForAthlete(
  template: Pick<
    WorkoutLibraryTemplate,
    | 'type'
    | 'sessionType'
    | 'distanceKm'
    | 'durationMin'
    | 'structure'
    | 'plannedDistanceMeters'
    | 'distanceSource'
    | 'durationSource'
  >,
  preferences: AthletePreferences | null | undefined,
): LibraryTemplateAthleteMetrics {
  if (template.type === WorkoutType.SWIM) {
    const distanceSource =
      template.distanceSource ??
      (template.distanceKm != null && template.distanceKm > 0
        ? PlannedMetricSource.MANUAL
        : null)
    const durationSource =
      template.durationSource ??
      (template.durationMin != null && template.durationMin > 0
        ? PlannedMetricSource.MANUAL
        : null)
    return {
      distanceKm: template.distanceKm,
      durationMin: template.durationMin,
      distanceApprox: isAutomatedMetricSource(distanceSource),
      durationApprox: isAutomatedMetricSource(durationSource),
      distanceSource,
      durationSource,
    }
  }

  const legacy = template.distanceSource == null && template.durationSource == null
  let distanceKm = template.distanceKm
  let durationMin = template.durationMin
  let distanceSource: PlannedMetricSource | null =
    distanceKm != null && distanceKm > 0
      ? template.distanceSource ?? PlannedMetricSource.MANUAL
      : null
  let durationSource: PlannedMetricSource | null =
    durationMin != null && durationMin > 0
      ? template.durationSource ?? PlannedMetricSource.MANUAL
      : null

  const structure = parseStructure(template.structure)
  const hasStructure = hasStructureContent(structure)
  const shouldResolveStructure =
    hasStructure &&
    (legacy ||
      template.distanceSource === PlannedMetricSource.STRUCTURE ||
      template.durationSource === PlannedMetricSource.STRUCTURE ||
      template.distanceSource == null ||
      template.durationSource == null)

  if (shouldResolveStructure) {
    const estDist = estimateStructureDistanceKm(structure, preferences, template.type)
    const estDur = estimateStructureDurationMinutes(structure, preferences, template.type)

    const replaceDistance =
      legacy ||
      template.distanceSource === PlannedMetricSource.STRUCTURE ||
      (template.distanceSource == null && !(distanceKm && distanceKm > 0))
    const replaceDuration =
      legacy ||
      template.durationSource === PlannedMetricSource.STRUCTURE ||
      (template.durationSource == null && !(durationMin && durationMin > 0))

    if (replaceDistance && estDist > 0) {
      distanceKm = estDist
      distanceSource = PlannedMetricSource.STRUCTURE
    }
    if (replaceDuration && estDur > 0) {
      durationMin = estDur
      durationSource = PlannedMetricSource.STRUCTURE
    }
  }

  if (sportUsesPlannedDistance(template.type)) {
    const needDurationCompanion =
      distanceKm &&
      distanceKm > 0 &&
      !(durationMin && durationMin > 0) &&
      (legacy ||
        template.durationSource === PlannedMetricSource.COMPANION ||
        template.durationSource == null)
    const needDistanceCompanion =
      durationMin &&
      durationMin > 0 &&
      !(distanceKm && distanceKm > 0) &&
      (legacy ||
        template.distanceSource === PlannedMetricSource.COMPANION ||
        template.distanceSource == null)

    if (needDurationCompanion) {
      const derived = estimateDurationMinutesFromDistanceKm(
        distanceKm!,
        preferences,
        template.sessionType,
        template.type,
      )
      if (derived > 0) {
        durationMin = derived
        durationSource = PlannedMetricSource.COMPANION
      }
    } else if (needDistanceCompanion) {
      const derived = estimateDistanceKmFromDurationMinutes(
        durationMin!,
        preferences,
        template.sessionType,
        template.type,
      )
      if (derived > 0) {
        distanceKm = derived
        distanceSource = PlannedMetricSource.COMPANION
      }
    }
  }

  // Locked MANUAL values must stay absolute even if structure also exists.
  if (template.distanceSource === PlannedMetricSource.MANUAL && template.distanceKm) {
    distanceKm = template.distanceKm
    distanceSource = PlannedMetricSource.MANUAL
  }
  if (template.durationSource === PlannedMetricSource.MANUAL && template.durationMin) {
    durationMin = template.durationMin
    durationSource = PlannedMetricSource.MANUAL
  }

  return {
    distanceKm: distanceKm && distanceKm > 0 ? distanceKm : null,
    durationMin: durationMin && durationMin > 0 ? durationMin : null,
    distanceApprox: isAutomatedMetricSource(distanceSource),
    durationApprox: isAutomatedMetricSource(durationSource),
    distanceSource: distanceKm && distanceKm > 0 ? distanceSource : null,
    durationSource: durationMin && durationMin > 0 ? durationSource : null,
  }
}

export function formatLibraryTemplateMetrics(
  metrics: LibraryTemplateAthleteMetrics,
  options?: { swimMeters?: number | null },
): string | null {
  const parts: string[] = []
  if (options?.swimMeters != null && options.swimMeters > 0) {
    parts.push(`${options.swimMeters} m`)
  } else if (metrics.distanceKm != null) {
    const km = Math.round(metrics.distanceKm * 10) / 10
    parts.push(metrics.distanceApprox ? `~${km} km` : `${km} km`)
  }
  if (metrics.durationMin != null) {
    parts.push(
      metrics.durationApprox
        ? `~${metrics.durationMin} min`
        : `${metrics.durationMin} min`,
    )
  }
  return parts.length > 0 ? parts.join(' · ') : null
}
