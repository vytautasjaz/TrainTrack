import type { SwimSection, SwimSet, SwimWorkoutStructure } from './types'
import {
  effectiveRepeatCount,
  isCompleteSwimSet,
  sectionDistanceMetersDraft,
} from './calculations'

export function formatSwimDistance(meters: number | null | undefined): string {
  if (meters == null || meters <= 0) return ''
  return `${Math.round(meters)} m`
}

export function formatSwimSectionHeaderStats(
  section: SwimSection,
  meaningfulSetCount: number,
): string {
  const distance = sectionDistanceMetersDraft(section)
  const parts: string[] = []
  if (distance > 0) parts.push(formatSwimDistance(distance))
  if (meaningfulSetCount > 0) {
    parts.push(`${meaningfulSetCount} set${meaningfulSetCount === 1 ? '' : 's'}`)
  }
  if (parts.length === 0) return 'Empty'
  return parts.join(' – ')
}

export function formatSwimSetSummary(set: SwimSet): string {
  if (!isCompleteSwimSet(set)) return ''
  const base = `${effectiveRepeatCount(set)} × ${set.distanceM} m ${set.stroke}`
  const parts = [base]
  if (set.targetPace?.trim()) parts.push(set.targetPace.trim())
  if (set.rest?.trim()) parts.push(set.rest.trim())
  if (set.notes?.trim()) parts.push(set.notes.trim())
  return parts.join(' · ')
}

export function formatSwimSectionSummary(section: SwimSection, prefix?: string): string[] {
  const lines = section.sets
    .map((set) => formatSwimSetSummary(set))
    .filter(Boolean)
    .map((line) => (prefix ? `${prefix} ${line}` : line))
  return lines
}

export function formatSwimStructureLines(
  structure: SwimWorkoutStructure | null | undefined,
): string[] {
  if (!structure?.sections.length) return []

  const lines: string[] = []
  for (const section of [...structure.sections].sort((a, b) => a.order - b.order)) {
    const setLines = formatSwimSectionSummary(section)
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
