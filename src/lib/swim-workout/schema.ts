import { SwimEnvironment } from '@prisma/client'
import { z } from 'zod'

export const swimSetSchema = z.object({
  id: z.string(),
  order: z.number().int().min(0),
  repeatCount: z.number().int().min(0),
  distanceM: z.number().int().min(0),
  stroke: z.string(),
  targetPace: z.string().optional(),
  rest: z.string().optional(),
  notes: z.string().optional(),
})

export const swimSectionSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  order: z.number().int().min(0),
  sets: z.array(swimSetSchema),
})

export const swimWorkoutStructureSchema = z.object({
  version: z.literal(1),
  sections: z.array(swimSectionSchema),
})

export const swimWorkoutFormSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  swimEnvironment: z.nativeEnum(SwimEnvironment),
  plannedDistanceMeters: z.number().int().positive().nullable().optional(),
  plannedDuration: z.number().int().positive().nullable().optional(),
  coachNotes: z.string().nullable().optional(),
  coachNotesPrivate: z.boolean().optional(),
  swimStructure: swimWorkoutStructureSchema.nullable().optional(),
  builderEnabled: z.boolean(),
  scheduledDate: z.string().optional(),
  athleteId: z.string().optional(),
  templateId: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

export const swimTemplateFormSchema = swimWorkoutFormSchema.omit({
  scheduledDate: true,
  athleteId: true,
  templateId: true,
})
