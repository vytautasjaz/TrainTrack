import type { SwimEnvironment } from '@prisma/client'

export type SwimSet = {
  id: string
  order: number
  repeatCount: number
  distanceM: number
  stroke: string
  targetPace?: string
  rest?: string
  notes?: string
}

export type SwimSection = {
  id: string
  title: string
  order: number
  sets: SwimSet[]
}

export type SwimWorkoutStructure = {
  version: 1
  sections: SwimSection[]
}

export type SwimWorkoutForm = {
  title: string
  description: string
  swimEnvironment: SwimEnvironment
  plannedDistanceMeters?: number | null
  plannedDuration?: number | null
  coachNotes?: string | null
  coachNotesPrivate?: boolean
  swimStructure?: SwimWorkoutStructure | null
  builderEnabled: boolean
}

export type SwimTemplateForm = SwimWorkoutForm & {
  tags?: string[]
}

export type SwimWorkoutSavePayload = SwimWorkoutForm & {
  scheduledDate?: string
  athleteId?: string
  templateId?: string
}
