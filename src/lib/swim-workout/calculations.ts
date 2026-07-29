import type { SwimSection, SwimSet, SwimWorkoutStructure } from './types'

export function isCompleteSwimSet(set: SwimSet): boolean {
  return set.repeatCount > 0 && set.distanceM > 0 && set.stroke.trim().length > 0
}

export function setDistanceMeters(set: SwimSet): number {
  if (!isCompleteSwimSet(set)) return 0
  return set.repeatCount * set.distanceM
}

export function sectionDistanceMeters(section: SwimSection): number {
  return section.sets.reduce((sum, set) => sum + setDistanceMeters(set), 0)
}

export function workoutDistanceMeters(structure: SwimWorkoutStructure | null | undefined): number {
  if (!structure) return 0
  return structure.sections.reduce((sum, section) => sum + sectionDistanceMeters(section), 0)
}

/** True when structured swim has any meaningful set data (not just empty shells). */
export function hasSwimStructureContent(
  structure: SwimWorkoutStructure | null | undefined,
): boolean {
  if (!structure?.sections.length) return false
  return structure.sections.some((section) =>
    section.sets.some(
      (set) =>
        isCompleteSwimSet(set) ||
        set.repeatCount > 0 ||
        set.distanceM > 0 ||
        set.stroke.trim().length > 0 ||
        Boolean(set.targetPace?.trim()) ||
        Boolean(set.rest?.trim()) ||
        Boolean(set.notes?.trim()),
    ),
  )
}

export function ensureTrailingEmptySet(sets: SwimSet[]): SwimSet[] {
  if (sets.length === 0) return sets
  const last = sets[sets.length - 1]
  if (isCompleteSwimSet(last) || last.repeatCount > 0 || last.distanceM > 0 || last.stroke.trim()) {
    return [...sets, createTrailingSet(sets.length)]
  }
  return sets
}

function createTrailingSet(order: number): SwimSet {
  return {
    id: crypto.randomUUID(),
    order,
    repeatCount: 0,
    distanceM: 0,
    stroke: '',
  }
}
