import { SessionType, WorkoutType } from '@prisma/client'
import { z } from 'zod'

const segmentSchema = z.object({
  mode: z.enum(['time', 'distance']),
  value: z.number().nonnegative(),
  unit: z.enum(['sec', 'min', 'm', 'km']),
  description: z.string().optional(),
})

const targetSchema = z.object({
  type: z.enum([
    'pace',
    'heartRate',
    'heartRateZone',
    'power',
    'powerZone',
    'cadence',
    'rpe',
    'speed',
  ]),
  min: z.number().optional(),
  max: z.number().optional(),
  value: z.string().optional(),
})

const stepEverySchema = z.object({
  mode: z.enum(['time', 'distance']),
  value: z.number().nonnegative(),
  unit: z.enum(['sec', 'min', 'm', 'km']),
})

const includeItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  kind: z.enum(['strides', 'drill', 'hill_sprint', 'pickup', 'custom']),
  repetitions: z.number().int().positive(),
  work: segmentSchema,
  recovery: segmentSchema.optional(),
  notes: z.string().optional(),
  placementHint: z.enum(['anywhere', 'before_main', 'inside_main', 'after_main']).optional(),
})

const blockSchema = z.object({
  id: z.string(),
  order: z.number().int().nonnegative(),
  type: z.enum([
    'CONTINUOUS',
    'INTERVAL',
    'REPETITION',
    'FREE_TEXT',
    'RECOVERY',
    'REST',
    'PROGRESSIVE',
  ]),
  name: z.string().optional(),
  repetitions: z.number().int().positive().optional(),
  work: segmentSchema.optional(),
  recovery: segmentSchema.optional(),
  durationType: z.enum(['time', 'distance']).optional(),
  time: z.number().nonnegative().optional(),
  distance: z.number().nonnegative().optional(),
  distanceUnit: z.enum(['km', 'm']).optional(),
  targets: z.array(targetSchema).optional(),
  startIntensity: targetSchema.optional(),
  endIntensity: targetSchema.optional(),
  stepEvery: stepEverySchema.optional(),
  notes: z.string().optional(),
  text: z.string().optional(),
})

export const workoutStructureSchema = z.object({
  warmup: z.array(blockSchema),
  mainSet: z.array(blockSchema),
  cooldown: z.array(blockSchema),
  coachNotes: z.string().optional(),
  includeItems: z.array(includeItemSchema).optional(),
})

export const builderPayloadSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  sportType: z.nativeEnum(WorkoutType),
  sessionType: z.nativeEnum(SessionType),
  scheduledDate: z.string().optional(),
  tags: z.array(z.string()),
  estimatedDuration: z.number().int().nonnegative().optional(),
  structure: workoutStructureSchema,
})

export type BuilderPayload = z.infer<typeof builderPayloadSchema>
