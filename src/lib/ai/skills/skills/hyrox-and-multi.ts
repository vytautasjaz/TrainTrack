import { z } from 'zod'
import {
  planDraftOutputSchema,
  type AiSkillDefinition,
} from '@/lib/ai/skills/types'

export const hyroxGeneralSkill: AiSkillDefinition = {
  slug: 'hyrox-general',
  title: 'HYROX general',
  description:
    'Mixed running + station strength plan for HYROX Open/Pro prep.',
  audience: 'both',
  kind: 'draft',
  briefFields: [
    {
      key: 'weekCount',
      label: 'Weeks',
      kind: 'number',
      min: 6,
      max: 16,
      defaultValue: 10,
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
      key: 'division',
      label: 'Division focus',
      kind: 'select',
      options: [
        { value: 'open', label: 'Open' },
        { value: 'pro', label: 'Pro' },
        { value: 'doubles', label: 'Doubles' },
      ],
      defaultValue: 'open',
    },
    {
      key: 'notes',
      label: 'Extra notes',
      kind: 'textarea',
    },
  ],
  briefSchema: z.object({
    weekCount: z.coerce.number().int().min(6).max(16).default(10),
    level: z
      .enum(['beginner', 'intermediate', 'advanced', 'elite'])
      .default('intermediate'),
    division: z.enum(['open', 'pro', 'doubles']).default('open'),
    notes: z.string().max(2000).optional().default(''),
  }),
  systemPrompt: `You are a HYROX coach drafting a TrainingPlan mixing RUN and STRENGTH/HYROX sessions.
Include running economy, station practice, and race simulations near the end.
Use relative weekIndex (0-based) and dayOfWeek (0=Mon). sportFocus should be HYROX when appropriate.`,
  outputSchema: planDraftOutputSchema,
}

export const multiSportBaseSkill: AiSkillDefinition = {
  slug: 'multi-sport-base',
  title: 'Multi-sport base',
  description:
    'Balanced run / bike / swim / strength base block for triathlon or general fitness.',
  audience: 'both',
  kind: 'draft',
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
      key: 'emphasis',
      label: 'Emphasis',
      kind: 'select',
      options: [
        { value: 'balanced', label: 'Balanced' },
        { value: 'run', label: 'Run-biased' },
        { value: 'bike', label: 'Bike-biased' },
        { value: 'swim', label: 'Swim-biased' },
      ],
      defaultValue: 'balanced',
    },
    {
      key: 'notes',
      label: 'Extra notes',
      kind: 'textarea',
    },
  ],
  briefSchema: z.object({
    weekCount: z.coerce.number().int().min(4).max(16).default(8),
    level: z
      .enum(['beginner', 'intermediate', 'advanced', 'elite'])
      .default('intermediate'),
    emphasis: z
      .enum(['balanced', 'run', 'bike', 'swim'])
      .default('balanced'),
    notes: z.string().max(2000).optional().default(''),
  }),
  systemPrompt: `You are a multi-sport coach drafting an aerobic base TrainingPlan.
Include RUN, BIKE, SWIM, and occasional STRENGTH. Keep intensity mostly easy/tempo.
Respect athlete zones (FTP, CSS, paces) from context. Relative weekIndex/dayOfWeek only.`,
  outputSchema: planDraftOutputSchema,
}
