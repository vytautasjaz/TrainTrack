import { SwimEnvironment } from '@prisma/client'
import type { SwimWorkoutForm } from './types'
import { parseSwimStructure } from './parse'

export function swimWorkoutToForm(workout: {
  title: string
  description: string | null
  swimEnvironment: SwimEnvironment | null
  plannedDistanceMeters: number | null
  plannedDuration: number | null
  coachNotes: string | null
  coachNotesPrivate?: boolean
  swimStructure: unknown
}): SwimWorkoutForm {
  const structure = parseSwimStructure(workout.swimStructure)
  return {
    title: workout.title,
    description: workout.description ?? '',
    swimEnvironment: workout.swimEnvironment ?? SwimEnvironment.POOL,
    plannedDistanceMeters: workout.plannedDistanceMeters,
    plannedDuration: workout.plannedDuration,
    coachNotes: workout.coachNotes,
    coachNotesPrivate: Boolean(workout.coachNotesPrivate),
    swimStructure: structure,
    builderEnabled: Boolean(structure?.sections.length),
  }
}

export function swimTemplateToForm(template: {
  title: string
  description: string | null
  swimEnvironment: SwimEnvironment | null
  plannedDistanceMeters: number | null
  durationMin: number | null
  notes: string | null
  swimStructure: unknown
  tags: string[]
}): SwimWorkoutForm & { tags: string[] } {
  const base = swimWorkoutToForm({
    title: template.title,
    description: template.description,
    swimEnvironment: template.swimEnvironment,
    plannedDistanceMeters: template.plannedDistanceMeters,
    plannedDuration: template.durationMin,
    coachNotes: template.notes,
    swimStructure: template.swimStructure,
  })
  return { ...base, tags: template.tags }
}
