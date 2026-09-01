import type { SwimSection, SwimSet, SwimWorkoutStructure } from './types'

/** Empty repeat field with distance entered counts as 1×distance. */
export function effectiveRepeatCount(set: SwimSet): number {
  if (set.repeatCount > 0) return set.repeatCount
  if (set.distanceM > 0) return 1
  return 0
}

export function isCompleteSwimSet(set: SwimSet): boolean {
  return effectiveRepeatCount(set) > 0 && set.distanceM > 0 && set.stroke.trim().length > 0
}

export function setDistanceMeters(set: SwimSet): number {
  if (!isCompleteSwimSet(set)) return 0
  return effectiveRepeatCount(set) * set.distanceM
}

/** Distance for in-progress sets (stroke optional). */
export function setDistanceMetersDraft(set: SwimSet): number {
  const repeats = effectiveRepeatCount(set)
  if (repeats > 0 && set.distanceM > 0) return repeats * set.distanceM
  return 0
}

export function sectionDistanceMeters(section: SwimSection): number {
  return section.sets.reduce((sum, set) => sum + setDistanceMeters(set), 0)
}

export function sectionDistanceMetersDraft(section: SwimSection): number {
  return section.sets.reduce((sum, set) => sum + setDistanceMetersDraft(set), 0)
}

export function workoutDistanceMeters(structure: SwimWorkoutStructure | null | undefined): number {
  if (!structure) return 0
  return structure.sections.reduce((sum, section) => sum + sectionDistanceMeters(section), 0)
}

/** Live editor total — counts sets with repeats × distance even before stroke is chosen. */
export function workoutDistanceMetersDraft(
  structure: SwimWorkoutStructure | null | undefined,
): number {
  if (!structure) return 0
  return structure.sections.reduce(
    (sum, section) => sum + sectionDistanceMetersDraft(section),
    0,
  )
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
