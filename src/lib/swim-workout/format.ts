import type { SwimSection, SwimSet, SwimWorkoutStructure } from './types'
import {
  effectiveRepeatCount,
  isCompleteSwimSet,
  sectionDistanceMetersDraft,
} from './calculations'
import {
  DEFAULT_SWIM_DISTANCE_UNIT,
  formatSwimMeters,
  type SwimDistanceUnit,
} from '@/lib/units'

export function formatSwimDistance(
  meters: number | null | undefined,
  swimUnit: SwimDistanceUnit = DEFAULT_SWIM_DISTANCE_UNIT,
): string {
  if (meters == null || meters <= 0) return ''
  const formatted = formatSwimMeters(meters, swimUnit)
  return formatted === '—' ? '' : formatted
}

export function formatSwimSectionHeaderStats(
  section: SwimSection,
  meaningfulSetCount: number,
  swimUnit: SwimDistanceUnit = DEFAULT_SWIM_DISTANCE_UNIT,
): string {
  const distance = sectionDistanceMetersDraft(section)
  const parts: string[] = []
  if (distance > 0) parts.push(formatSwimDistance(distance, swimUnit))
  if (meaningfulSetCount > 0) {
    parts.push(`${meaningfulSetCount} set${meaningfulSetCount === 1 ? '' : 's'}`)
  }
  if (parts.length === 0) return 'Empty'
  return parts.join(' – ')
}

export function formatSwimSetSummary(
  set: SwimSet,
  swimUnit: SwimDistanceUnit = DEFAULT_SWIM_DISTANCE_UNIT,
): string {
  if (!isCompleteSwimSet(set)) return ''
  const distLabel =
    formatSwimDistance(set.distanceM, swimUnit) || `${set.distanceM} m`
  const base = `${effectiveRepeatCount(set)} × ${distLabel} ${set.stroke}`
  const parts = [base]
  if (set.targetPace?.trim()) parts.push(set.targetPace.trim())
  if (set.rest?.trim()) parts.push(set.rest.trim())
  if (set.notes?.trim()) parts.push(set.notes.trim())
  return parts.join(' · ')
}

export function formatSwimSectionSummary(
  section: SwimSection,
  prefix?: string,
  swimUnit: SwimDistanceUnit = DEFAULT_SWIM_DISTANCE_UNIT,
): string[] {
  const lines = section.sets
    .map((set) => formatSwimSetSummary(set, swimUnit))
    .filter(Boolean)
    .map((line) => (prefix ? `${prefix} ${line}` : line))
  return lines
}

export function formatSwimStructureLines(
  structure: SwimWorkoutStructure | null | undefined,
  swimUnit: SwimDistanceUnit = DEFAULT_SWIM_DISTANCE_UNIT,
): string[] {
  if (!structure?.sections.length) return []

  const lines: string[] = []
  for (const section of [...structure.sections].sort((a, b) => a.order - b.order)) {
    const setLines = formatSwimSectionSummary(section, undefined, swimUnit)
    if (setLines.length === 0) continue

    const titleLower = section.title.toLowerCase()
    if (titleLower.includes('warm')) {
      lines.push(...setLines.map((line) => `WU ${line}`))
    } else if (titleLower.includes('cool')) {
      lines.push(...setLines.map((line) => `CD ${line}`))
    } else {
      lines.push(...setLines)
    }
  }
  return lines
}

export function swimEnvironmentLabel(env: string): string {
  return env === 'OPEN_WATER' ? 'Open Water' : 'Pool'
}
