import { z } from 'zod'
import {
  adaptPlanOutputSchema,
  type AiSkillDefinition,
} from '@/lib/ai/skills/types'

/** Phase 2: propose session edits from completed work + feedback. */
export const adaptPlanSkill: AiSkillDefinition = {
  slug: 'adapt-plan',
  title: 'Adapt plan',
  description:
    'Adjust an existing plan from recent completed sessions, load, and feedback.',
  audience: 'both',
  kind: 'adapt',
  briefFields: [
    {
      key: 'lookbackWeeks',
      label: 'Lookback weeks',
      kind: 'number',
      min: 1,
      max: 8,
      defaultValue: 2,
      required: true,
    },
    {
      key: 'focus',
      label: 'Adaptation focus',
      kind: 'select',
      options: [
        { value: 'recover', label: 'Recover / reduce load' },
        { value: 'maintain', label: 'Maintain momentum' },
        { value: 'progress', label: 'Progress volume/intensity' },
        { value: 'injury', label: 'Work around niggle/injury' },
      ],
      defaultValue: 'maintain',
    },
    {
      key: 'notes',
      label: 'Coach / athlete notes',
      kind: 'textarea',
      placeholder: 'What should change and why?',
    },
  ],
  briefSchema: z.object({
    lookbackWeeks: z.coerce.number().int().min(1).max(8).default(2),
    focus: z
      .enum(['recover', 'maintain', 'progress', 'injury'])
      .default('maintain'),
    notes: z.string().max(2000).optional().default(''),
  }),
  systemPrompt: `You are adapting an existing training plan based on completed sessions, compliance, load, and feedback.
Propose concrete sessionEdits (update/add/remove) using weekIndex + dayOfWeek.
Prefer small, justified changes. Summarize why. Do not invent absolute dates.`,
  outputSchema: adaptPlanOutputSchema,
}
