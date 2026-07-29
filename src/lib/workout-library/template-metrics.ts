import { WorkoutType } from '@prisma/client'
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

export type LibraryTemplateAthleteMetrics = {
  distanceKm: number | null
  durationMin: number | null
  distanceApprox: boolean
  durationApprox: boolean
}

/**
 * Resolve library template distance/duration for the currently selected athlete.
 * Structured templates recompute from blocks + pace/speed zones; missing companion
 * metrics are estimated when the sport supports distance.
 */
export function resolveLibraryTemplateMetricsForAthlete(
  template: Pick<
    WorkoutLibraryTemplate,
    'type' | 'sessionType' | 'distanceKm' | 'durationMin' | 'structure' | 'plannedDistanceMeters'
  >,
  preferences: AthletePreferences | null | undefined,
): LibraryTemplateAthleteMetrics {
  if (template.type === WorkoutType.SWIM) {
    return {
      distanceKm: template.distanceKm,
      durationMin: template.durationMin,
      distanceApprox: false,
      durationApprox: false,
    }
  }

  let distanceKm = template.distanceKm
  let durationMin = template.durationMin
  let distanceApprox = false
  let durationApprox = false

  const structure = parseStructure(template.structure)
  if (hasStructureContent(structure)) {
    const estDist = estimateStructureDistanceKm(structure, preferences, template.type)
    const estDur = estimateStructureDurationMinutes(structure, preferences, template.type)
    if (estDist > 0) {
      distanceKm = estDist
      distanceApprox = true
    }
    if (estDur > 0) {
      durationMin = estDur
      durationApprox = true
    }
  }

  if (sportUsesPlannedDistance(template.type)) {
    if (distanceKm && distanceKm > 0 && !(durationMin && durationMin > 0)) {
      const derived = estimateDurationMinutesFromDistanceKm(
        distanceKm,
        preferences,
        template.sessionType,
        template.type,
      )
      if (derived > 0) {
        durationMin = derived
        durationApprox = true
      }
    } else if (durationMin && durationMin > 0 && !(distanceKm && distanceKm > 0)) {
      const derived = estimateDistanceKmFromDurationMinutes(
        durationMin,
        preferences,
        template.sessionType,
        template.type,
      )
      if (derived > 0) {
        distanceKm = derived
        distanceApprox = true
      }
    }
  }

  return {
    distanceKm: distanceKm && distanceKm > 0 ? distanceKm : null,
    durationMin: durationMin && durationMin > 0 ? durationMin : null,
    distanceApprox,
    durationApprox,
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
