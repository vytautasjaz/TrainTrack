import { z } from 'zod'
import {
  SessionType,
  SeasonPhase,
  WorkoutType,
} from '@prisma/client'

export const AI_SKILL_AUDIENCES = ['coach', 'athlete', 'both'] as const
export type AiSkillAudience = (typeof AI_SKILL_AUDIENCES)[number]

export const AI_SKILL_KINDS = ['draft', 'adapt'] as const
export type AiSkillKind = (typeof AI_SKILL_KINDS)[number]

/** OpenAI structured outputs reject `.optional().nullable()` (nested anyOf/not). Prefer required + nullable. */
const nullableString = (max: number) => z.union([z.string().max(max), z.null()])
const nullableNumber = (opts?: { int?: boolean; min?: number; max?: number }) => {
  let n = z.number()
  if (opts?.int) n = n.int()
  if (opts?.min != null) n = n.min(opts.min)
  if (opts?.max != null) n = n.max(opts.max)
  return z.union([n, z.null()])
}

export const planDraftSessionSchema = z.object({
  weekIndex: z.number().int().min(0).max(51),
  dayOfWeek: z.number().int().min(0).max(6),
  type: z.nativeEnum(WorkoutType),
  sessionType: z.nativeEnum(SessionType),
  title: z.string().min(1).max(120),
  description: nullableString(2000),
  plannedDistance: nullableNumber({ min: 0.1, max: 200 }),
  plannedDuration: nullableNumber({ int: true, min: 1, max: 600 }),
  coachNotes: nullableString(2000),
  tags: z.array(z.string().max(40)).max(8),
})

export const planDraftPhaseSchema = z.object({
  phase: z.nativeEnum(SeasonPhase),
  sport: z.nativeEnum(WorkoutType),
  label: nullableString(80),
  startDay: z.number().int().min(0),
  endDay: z.number().int().min(0),
})

export const planDraftOutputSchema = z.object({
  title: z.string().min(1).max(120),
  description: nullableString(2000),
  weekCount: z.number().int().min(1).max(52),
  sportFocus: z.union([z.nativeEnum(WorkoutType), z.null()]),
  level: z.union([
    z.enum(['beginner', 'intermediate', 'advanced', 'elite']),
    z.null(),
  ]),
  target: nullableString(80),
  guidelines: nullableString(4000),
  sessions: z.array(planDraftSessionSchema).min(1).max(400),
  phases: z.array(planDraftPhaseSchema).max(20),
})

export type PlanDraftOutput = z.infer<typeof planDraftOutputSchema>

export const adaptPlanOutputSchema = z.object({
  summary: z.string().max(2000),
  guidelines: nullableString(4000),
  sessionEdits: z
    .array(
      z.object({
        weekIndex: z.number().int().min(0).max(51),
        dayOfWeek: z.number().int().min(0).max(6),
        action: z.enum(['update', 'add', 'remove']),
        type: z.union([z.nativeEnum(WorkoutType), z.null()]),
        sessionType: z.union([z.nativeEnum(SessionType), z.null()]),
        title: nullableString(120),
        description: nullableString(2000),
        plannedDistance: nullableNumber({ min: 0.1, max: 200 }),
        plannedDuration: nullableNumber({ int: true, min: 1, max: 600 }),
        coachNotes: nullableString(2000),
        matchTitle: nullableString(120),
      }),
    )
    .max(80),
})

export type AdaptPlanOutput = z.infer<typeof adaptPlanOutputSchema>

export type AiSkillBriefField = {
  key: string
  label: string
  kind: 'text' | 'textarea' | 'number' | 'select'
  required?: boolean
  placeholder?: string
  options?: { value: string; label: string }[]
  min?: number
  max?: number
  defaultValue?: string | number
}

export type AiSkillDefinition<TBrief extends z.ZodTypeAny = z.ZodTypeAny> = {
  slug: string
  title: string
  description: string
  audience: AiSkillAudience
  kind: AiSkillKind
  briefFields: AiSkillBriefField[]
  briefSchema: TBrief
  systemPrompt: string
  /** Draft skills use planDraftOutputSchema; adapt uses adaptPlanOutputSchema. */
  outputSchema: z.ZodTypeAny
}

export function briefValuesToPrompt(values: Record<string, unknown>): string {
  const lines = Object.entries(values)
    .filter(([, v]) => v != null && String(v).trim() !== '')
    .map(([k, v]) => `- ${k}: ${typeof v === 'string' ? v.trim() : String(v)}`)
  return lines.length ? lines.join('\n') : '(no additional brief)'
}
