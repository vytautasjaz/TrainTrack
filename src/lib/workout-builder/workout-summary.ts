import type { WorkoutType } from '@prisma/client'
import type { WorkoutStructure } from './types'
import { inferSmartBlockLabel } from './smart-blocks'
import {
  estimateStructureDistanceKm,
  estimateStructureDurationMinutes,
  formatPlanBlockSummary,
} from './segment-estimation'
import type { AthletePreferences } from '@/lib/athlete-preferences'
import { flattenStructure } from './structure-list'

export type WorkoutSummaryLine = {
  label: string
}

export function buildWorkoutSummaryLines(
  structure: WorkoutStructure,
  sportType?: WorkoutType,
): WorkoutSummaryLine[] {
  const items = flattenStructure(structure)
  if (items.length === 0) return []

  return items.map(({ block, section }) => {
    const smart = inferSmartBlockLabel(block, section, sportType)
    const detail = formatPlanBlockSummary(block)
    return {
      label: detail ? `${smart.label} — ${detail}` : smart.label,
    }
  })
}

export function formatWorkoutSummaryCompact(
  structure: WorkoutStructure,
  sportType?: WorkoutType,
): string[] {
  const items = flattenStructure(structure)
  return items.map(({ block, section }) => {
    const smart = inferSmartBlockLabel(block, section, sportType)
    const detail = formatPlanBlockSummary(block)
    return detail || smart.label
  })
}

export function formatEstimatedDurationLabel(minutes: number): string {
  if (minutes <= 0) return '—'
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h <= 0) return `${m} min`
  if (m === 0) return `${h} h`
  return `${h} h ${String(m).padStart(2, '0')} min`
}

export function formatEstimatedDistanceLabel(km: number): string {
  if (km <= 0) return '—'
  const rounded = Math.round(km * 10) / 10
  return `${rounded} km`
}

export function computeWorkoutSummaryMetrics(
  structure: WorkoutStructure,
  athletePreferences?: AthletePreferences | null,
  sportType?: WorkoutType,
) {
  const distanceKm = estimateStructureDistanceKm(structure, athletePreferences, sportType)
  const durationMin = estimateStructureDurationMinutes(structure, athletePreferences, sportType)
  return {
    distanceKm,
    durationMin,
    distanceLabel: formatEstimatedDistanceLabel(distanceKm),
    durationLabel: formatEstimatedDurationLabel(durationMin),
  }
}
