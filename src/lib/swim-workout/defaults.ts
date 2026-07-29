import { SwimEnvironment } from '@prisma/client'
import type { SwimSection, SwimSet, SwimWorkoutForm, SwimWorkoutStructure } from './types'

export function newSwimId(): string {
  return crypto.randomUUID()
}

export function createEmptySet(order: number): SwimSet {
  return {
    id: newSwimId(),
    order,
    repeatCount: 0,
    distanceM: 0,
    stroke: '',
  }
}

export function createSection(title: string, order: number): SwimSection {
  return {
    id: newSwimId(),
    title,
    order,
    sets: [createEmptySet(0)],
  }
}

export function createDefaultSwimStructure(): SwimWorkoutStructure {
  return {
    version: 1,
    sections: [
      createSection('Warm Up', 0),
      createSection('Main Set', 1),
      createSection('Cool Down', 2),
    ],
  }
}

export function normalizeSectionOrders(sections: SwimSection[]): SwimSection[] {
  return sections.map((section, index) => ({
    ...section,
    order: index,
    sets: section.sets.map((set, setIndex) => ({ ...set, order: setIndex })),
  }))
}

export function defaultSwimWorkoutForm(): SwimWorkoutForm {
  return {
    title: 'New Swim Workout',
    description: '',
    swimEnvironment: SwimEnvironment.POOL,
    plannedDistanceMeters: null,
    plannedDuration: null,
    coachNotes: null,
    swimStructure: null,
    builderEnabled: false,
  }
}
