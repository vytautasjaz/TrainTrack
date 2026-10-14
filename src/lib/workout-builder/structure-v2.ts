import { z } from 'zod'

/** Logical part of the workout (WHAT area). */
export const workoutSectionTypeSchema = z.enum([
  'WARMUP',
  'STRENGTH',
  'CONDITIONING',
  'MAIN_SET',
  'HYROX_SIMULATION',
  'CORE',
  'FINISHER',
  'COOLDOWN',
  'RECOVERY',
  'CUSTOM',
])
export type WorkoutSectionType = z.infer<typeof workoutSectionTypeSchema>

/** How a group of exercises is executed. */
export const workoutBlockTypeV2Schema = z.enum([
  'EXERCISE',
  'SET',
  'CIRCUIT',
  'SUPERSET',
  'INTERVAL',
  'EMOM',
  'AMRAP',
  'FOR_TIME',
  'LADDER',
  'RACE_SIMULATION',
  'CONTINUOUS',
  'REST',
  'FREE_TEXT',
])
export type WorkoutBlockTypeV2 = z.infer<typeof workoutBlockTypeV2Schema>

export const prescriptionModeSchema = z.enum([
  'REPS',
  'TIME',
  'DISTANCE',
  'CALORIES',
  'WEIGHT',
  'UNTIMED',
])
export type PrescriptionMode = z.infer<typeof prescriptionModeSchema>

export const prescriptionUnitSchema = z.enum([
  'sec',
  'min',
  'm',
  'km',
  'kg',
  'lb',
  'cal',
])
export type PrescriptionUnit = z.infer<typeof prescriptionUnitSchema>

export const exercisePrescriptionSchema = z.object({
  mode: prescriptionModeSchema,
  value: z.number().nonnegative().optional(),
  unit: prescriptionUnitSchema.optional(),
})
export type ExercisePrescription = z.infer<typeof exercisePrescriptionSchema>

export const loadTypeSchema = z.enum([
  'ABSOLUTE',
  'RPE',
  'PERCENT_1RM',
  'BODYWEIGHT',
  'COMPETITION',
  'CUSTOM',
])
export type LoadType = z.infer<typeof loadTypeSchema>

export const exerciseLoadSchema = z.object({
  type: loadTypeSchema,
  value: z.union([z.number(), z.string()]).optional(),
  unit: z.enum(['kg', 'lb']).optional(),
  division: z.enum(['OPEN', 'PRO']).optional(),
})
export type ExerciseLoad = z.infer<typeof exerciseLoadSchema>

export const exerciseTargetTypeSchema = z.enum([
  'RPE',
  'PACE',
  'HEART_RATE',
  'POWER',
  'HR_ZONE',
  'PACE_ZONE',
  'ALL_OUT',
  'CUSTOM',
])
export type ExerciseTargetType = z.infer<typeof exerciseTargetTypeSchema>

export const exerciseTargetSchema = z.object({
  type: exerciseTargetTypeSchema,
  value: z.union([z.number(), z.string()]).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
})
export type ExerciseTarget = z.infer<typeof exerciseTargetSchema>

export const restTypeSchema = z.enum([
  'NONE',
  'TIME',
  'UNTIL_NEXT_MINUTE',
  'CUSTOM',
])
export type RestType = z.infer<typeof restTypeSchema>

export const restSchema = z.object({
  type: restTypeSchema,
  value: z.number().nonnegative().optional(),
  unit: z.enum(['sec', 'min']).optional(),
  label: z.string().optional(),
})
export type RestSpec = z.infer<typeof restSchema>

export const durationSpecSchema = z.object({
  value: z.number().nonnegative(),
  unit: z.enum(['sec', 'min']),
})
export type DurationSpec = z.infer<typeof durationSpecSchema>

export const exerciseItemSchema = z.object({
  exerciseId: z.string().min(1),
  name: z.string().optional(),
  /** Superset labels e.g. A1 / A2 */
  order: z.string().optional(),
  prescription: exercisePrescriptionSchema.optional(),
  load: exerciseLoadSchema.optional(),
  target: exerciseTargetSchema.optional(),
  notes: z.string().optional(),
})
export type ExerciseItem = z.infer<typeof exerciseItemSchema>

const blockBaseSchema = z.object({
  id: z.string().min(1),
  notes: z.string().optional(),
})

const setLikeBlockSchema = blockBaseSchema.extend({
  type: z.enum(['SET', 'CIRCUIT', 'SUPERSET', 'INTERVAL', 'LADDER']),
  rounds: z.number().int().positive().optional(),
  exercises: z.array(exerciseItemSchema).default([]),
  rest: restSchema.optional(),
})

const emomBlockSchema = blockBaseSchema.extend({
  type: z.literal('EMOM'),
  rounds: z.number().int().positive().optional(),
  interval: durationSpecSchema.optional(),
  exercises: z.array(exerciseItemSchema).default([]),
  rest: restSchema.optional(),
})

const amrapBlockSchema = blockBaseSchema.extend({
  type: z.literal('AMRAP'),
  duration: durationSpecSchema.optional(),
  exercises: z.array(exerciseItemSchema).default([]),
  rest: restSchema.optional(),
})

const forTimeBlockSchema = blockBaseSchema.extend({
  type: z.literal('FOR_TIME'),
  rounds: z.number().int().positive().optional(),
  timeCap: durationSpecSchema.optional(),
  exercises: z.array(exerciseItemSchema).default([]),
  rest: restSchema.optional(),
})

const raceSimulationBlockSchema = blockBaseSchema.extend({
  type: z.literal('RACE_SIMULATION'),
  exercises: z.array(exerciseItemSchema).default([]),
  rest: restSchema.optional(),
})

const continuousBlockSchema = blockBaseSchema.extend({
  type: z.literal('CONTINUOUS'),
  exercise: exerciseItemSchema.optional(),
  exercises: z.array(exerciseItemSchema).optional(),
  prescription: exercisePrescriptionSchema.optional(),
  rest: restSchema.optional(),
})

const singleExerciseBlockSchema = blockBaseSchema.extend({
  type: z.literal('EXERCISE'),
  exercise: exerciseItemSchema.optional(),
  exercises: z.array(exerciseItemSchema).optional(),
  rest: restSchema.optional(),
})

const restBlockSchema = blockBaseSchema.extend({
  type: z.literal('REST'),
  rest: restSchema.optional(),
})

const freeTextBlockSchema = blockBaseSchema.extend({
  type: z.literal('FREE_TEXT'),
  text: z.string().optional(),
})

export const workoutBlockV2Schema = z.discriminatedUnion('type', [
  setLikeBlockSchema,
  emomBlockSchema,
  amrapBlockSchema,
  forTimeBlockSchema,
  raceSimulationBlockSchema,
  continuousBlockSchema,
  singleExerciseBlockSchema,
  restBlockSchema,
  freeTextBlockSchema,
])
export type WorkoutBlockV2 = z.infer<typeof workoutBlockV2Schema>

export const workoutSectionV2Schema = z.object({
  id: z.string().min(1),
  type: workoutSectionTypeSchema,
  name: z.string().optional(),
  blocks: z.array(workoutBlockV2Schema).default([]),
})
export type WorkoutSectionV2 = z.infer<typeof workoutSectionV2Schema>

/** Top-level peers: section, block, or standalone exercise (EXERCISE block). */
export const workoutRootSectionItemSchema = workoutSectionV2Schema.extend({
  kind: z.literal('section'),
})
export const workoutRootBlockItemSchema = z.object({
  kind: z.literal('block'),
  block: workoutBlockV2Schema,
})
export const workoutRootItemSchema = z.discriminatedUnion('kind', [
  workoutRootSectionItemSchema,
  workoutRootBlockItemSchema,
])
export type WorkoutRootItemV2 = z.infer<typeof workoutRootItemSchema>

/** Card summary kept compatible with v1 optional fields. */
export const workoutCardSummaryV2Schema = z.object({
  essence: z.string().optional(),
  highlightedBlockIds: z.array(z.string()).optional(),
})

const workoutStructureV2ObjectSchema = z.object({
  version: z.literal(2),
  items: z.array(workoutRootItemSchema).default([]),
  coachNotes: z.string().optional(),
  cardSummary: workoutCardSummaryV2Schema.optional(),
})

/**
 * Accepts canonical `{ items }` or legacy `{ sections }` (normalized to items).
 */
export const workoutStructureV2Schema = z.preprocess((raw) => {
  if (!raw || typeof raw !== 'object') return raw
  const obj = raw as Record<string, unknown>
  if (Array.isArray(obj.items)) return obj
  if (Array.isArray(obj.sections)) {
    const items = (obj.sections as unknown[]).map((entry) => {
      if (entry && typeof entry === 'object' && 'kind' in entry) {
        return entry
      }
      return { kind: 'section', ...(entry as object) }
    })
    const { sections: _sections, ...rest } = obj
    return { ...rest, items }
  }
  return { ...obj, items: obj.items ?? [] }
}, workoutStructureV2ObjectSchema)

export type WorkoutStructureV2 = z.infer<typeof workoutStructureV2ObjectSchema>

export function sectionRootItem(
  section: WorkoutSectionV2,
): Extract<WorkoutRootItemV2, { kind: 'section' }> {
  return { kind: 'section', ...section }
}

export function blockRootItem(
  block: WorkoutBlockV2,
): Extract<WorkoutRootItemV2, { kind: 'block' }> {
  return { kind: 'block', block }
}

/** Sections only — for callers that still think in section lists. */
export function sectionsFromStructure(
  structure: WorkoutStructureV2,
): WorkoutSectionV2[] {
  return structure.items
    .filter(
      (item): item is Extract<WorkoutRootItemV2, { kind: 'section' }> =>
        item.kind === 'section',
    )
    .map(({ kind: _kind, ...section }) => section)
}

export const SECTION_TYPE_LABELS: Record<WorkoutSectionType, string> = {
  WARMUP: 'Warm Up',
  STRENGTH: 'Strength',
  CONDITIONING: 'Conditioning',
  MAIN_SET: 'Main Set',
  HYROX_SIMULATION: 'HYROX Simulation',
  CORE: 'Core',
  FINISHER: 'Finisher',
  COOLDOWN: 'Cool Down',
  RECOVERY: 'Recovery',
  CUSTOM: 'Custom',
}

export const BLOCK_TYPE_V2_LABELS: Record<WorkoutBlockTypeV2, string> = {
  EXERCISE: 'Exercise',
  SET: 'Set',
  CIRCUIT: 'Circuit',
  SUPERSET: 'Superset',
  INTERVAL: 'Interval',
  EMOM: 'EMOM',
  AMRAP: 'AMRAP',
  FOR_TIME: 'For Time',
  LADDER: 'Ladder',
  RACE_SIMULATION: 'Race Simulation',
  CONTINUOUS: 'Continuous',
  REST: 'Rest',
  FREE_TEXT: 'Free Text',
}

export function newStructureId(): string {
  return crypto.randomUUID()
}

export function emptyStructureV2(): WorkoutStructureV2 {
  return { version: 2, items: [] }
}

export function defaultStructureV2ForSport(
  sport: 'STRENGTH' | 'HYROX',
): WorkoutStructureV2 {
  if (sport === 'HYROX') {
    return {
      version: 2,
      items: [
        sectionRootItem({
          id: newStructureId(),
          type: 'WARMUP',
          name: 'Warm Up',
          blocks: [],
        }),
        sectionRootItem({
          id: newStructureId(),
          type: 'HYROX_SIMULATION',
          name: 'HYROX Simulation',
          blocks: [],
        }),
        sectionRootItem({
          id: newStructureId(),
          type: 'COOLDOWN',
          name: 'Cool Down',
          blocks: [],
        }),
      ],
    }
  }
  return {
    version: 2,
    items: [
      sectionRootItem({
        id: newStructureId(),
        type: 'WARMUP',
        name: 'Warm Up',
        blocks: [],
      }),
      sectionRootItem({
        id: newStructureId(),
        type: 'STRENGTH',
        name: 'Strength',
        blocks: [],
      }),
      sectionRootItem({
        id: newStructureId(),
        type: 'COOLDOWN',
        name: 'Cool Down',
        blocks: [],
      }),
    ],
  }
}

export function createEmptyBlockV2(type: WorkoutBlockTypeV2): WorkoutBlockV2 {
  const id = newStructureId()
  switch (type) {
    case 'SET':
    case 'CIRCUIT':
    case 'SUPERSET':
    case 'INTERVAL':
    case 'LADDER':
      return {
        id,
        type,
        rounds: type === 'SET' ? 3 : 3,
        exercises: [],
        rest: { type: 'TIME', value: 90, unit: 'sec' },
      }
    case 'EMOM':
      return {
        id,
        type: 'EMOM',
        rounds: 8,
        interval: { value: 60, unit: 'sec' },
        exercises: [],
      }
    case 'AMRAP':
      return {
        id,
        type: 'AMRAP',
        duration: { value: 12, unit: 'min' },
        exercises: [],
      }
    case 'FOR_TIME':
      return {
        id,
        type: 'FOR_TIME',
        rounds: 5,
        exercises: [],
      }
    case 'RACE_SIMULATION':
      return { id, type: 'RACE_SIMULATION', exercises: [] }
    case 'CONTINUOUS':
      return {
        id,
        type: 'CONTINUOUS',
        exercise: createEmptyExerciseItem(),
      }
    case 'EXERCISE':
      return {
        id,
        type: 'EXERCISE',
        exercise: createEmptyExerciseItem(),
      }
    case 'REST':
      return {
        id,
        type: 'REST',
        rest: { type: 'TIME', value: 90, unit: 'sec' },
      }
    case 'FREE_TEXT':
      return { id, type: 'FREE_TEXT', text: '' }
    default:
      return { id, type: 'FREE_TEXT', text: '' }
  }
}

export function createEmptyExerciseItem(
  partial?: Partial<ExerciseItem>,
): ExerciseItem {
  return {
    exerciseId: partial?.exerciseId ?? 'custom_exercise',
    name: partial?.name,
    order: partial?.order,
    prescription: partial?.prescription ?? { mode: 'REPS', value: 10 },
    load: partial?.load,
    target: partial?.target,
    notes: partial?.notes,
  }
}
