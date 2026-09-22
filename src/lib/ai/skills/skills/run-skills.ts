import { z } from 'zod'
import {
  planDraftOutputSchema,
  type AiSkillDefinition,
} from '@/lib/ai/skills/types'

const commonBrief = {
  weekCount: z.coerce.number().int().min(4).max(24).default(8),
  level: z
    .enum(['beginner', 'intermediate', 'advanced', 'elite'])
    .default('intermediate'),
  notes: z.string().max(2000).optional().default(''),
}

function draftSkill(
  partial: Omit<
    AiSkillDefinition,
    'kind' | 'outputSchema' | 'briefSchema'
  > & {
    briefSchema: z.ZodTypeAny
  },
): AiSkillDefinition {
  return {
    ...partial,
    kind: 'draft',
    outputSchema: planDraftOutputSchema,
  }
}

export const run5kBuildSkill = draftSkill({
  slug: 'run-5k-build',
  title: '5K build',
  description:
    'Progressive 5K plan with easy volume, strides, and race-pace work.',
  audience: 'both',
  briefFields: [
    {
      key: 'weekCount',
      label: 'Weeks',
      kind: 'number',
      min: 4,
      max: 16,
      defaultValue: 8,
      required: true,
    },
    {
      key: 'level',
      label: 'Level',
      kind: 'select',
      options: [
        { value: 'beginner', label: 'Beginner' },
        { value: 'intermediate', label: 'Intermediate' },
        { value: 'advanced', label: 'Advanced' },
        { value: 'elite', label: 'Elite' },
      ],
      defaultValue: 'intermediate',
    },
    {
      key: 'goalTime',
      label: 'Goal 5K time (optional)',
      kind: 'text',
      placeholder: 'e.g. 22:00',
    },
    {
      key: 'notes',
      label: 'Extra notes',
      kind: 'textarea',
      placeholder: 'Availability, constraints, preferences…',
    },
  ],
  briefSchema: z.object({
    ...commonBrief,
    weekCount: z.coerce.number().int().min(4).max(16).default(8),
    goalTime: z.string().max(40).optional().default(''),
  }),
  systemPrompt: `You are an experienced running coach drafting a relative TrainingPlan for a 5K race.
Use athlete context (paces, recent volume, compliance) when provided.
Output weekIndex (0-based) and dayOfWeek (0=Mon … 6=Sun). Include easy runs, one quality session most weeks, and a long run.
Keep intensity appropriate to level. Prefer RUN sport. Include optional phases (base → build → peak → taper).
Do not invent absolute calendar dates. Titles should be short and coach-ready.
Always include every schema field: use null for unknown optional strings/numbers, [] for empty tags/phases.`,
})

export const runHalfMarathonSkill = draftSkill({
  slug: 'run-half-marathon',
  title: 'Half marathon',
  description:
    'Half marathon block with progressive long runs and threshold work.',
  audience: 'both',
  briefFields: [
    {
      key: 'weekCount',
      label: 'Weeks',
      kind: 'number',
      min: 8,
      max: 20,
      defaultValue: 12,
      required: true,
    },
    {
      key: 'level',
      label: 'Level',
      kind: 'select',
      options: [
        { value: 'beginner', label: 'Beginner' },
        { value: 'intermediate', label: 'Intermediate' },
        { value: 'advanced', label: 'Advanced' },
        { value: 'elite', label: 'Elite' },
      ],
      defaultValue: 'intermediate',
    },
    {
      key: 'goalTime',
      label: 'Goal half time (optional)',
      kind: 'text',
      placeholder: 'e.g. 1:45',
    },
    {
      key: 'notes',
      label: 'Extra notes',
      kind: 'textarea',
    },
  ],
  briefSchema: z.object({
    ...commonBrief,
    weekCount: z.coerce.number().int().min(8).max(20).default(12),
    goalTime: z.string().max(40).optional().default(''),
  }),
  systemPrompt: `You are an experienced running coach drafting a half marathon TrainingPlan.
Balance aerobic volume, long runs, and 1–2 quality sessions weekly. Respect recent training load from context.
Use relative weekIndex/dayOfWeek. Include phases and a short taper. Prefer RUN.`,
})

export const runMarathonSkill = draftSkill({
  slug: 'run-marathon',
  title: 'Marathon',
  description:
    'Marathon build with long-run progression, MP segments, and recovery weeks.',
  audience: 'both',
  briefFields: [
    {
      key: 'weekCount',
      label: 'Weeks',
      kind: 'number',
      min: 12,
      max: 24,
      defaultValue: 16,
      required: true,
    },
    {
      key: 'level',
      label: 'Level',
      kind: 'select',
      options: [
        { value: 'beginner', label: 'Beginner' },
        { value: 'intermediate', label: 'Intermediate' },
        { value: 'advanced', label: 'Advanced' },
        { value: 'elite', label: 'Elite' },
      ],
      defaultValue: 'intermediate',
    },
    {
      key: 'goalTime',
      label: 'Goal marathon time (optional)',
      kind: 'text',
      placeholder: 'e.g. 3:45',
    },
    {
      key: 'notes',
      label: 'Extra notes',
      kind: 'textarea',
    },
  ],
  briefSchema: z.object({
    ...commonBrief,
    weekCount: z.coerce.number().int().min(12).max(24).default(16),
    goalTime: z.string().max(40).optional().default(''),
  }),
  systemPrompt: `You are an experienced marathon coach drafting a TrainingPlan.
Include progressive long runs (with cutback weeks), easy volume, and limited quality work.
Honor athlete history and avoid sudden load spikes. Relative weekIndex/dayOfWeek only. Prefer RUN.`,
})
