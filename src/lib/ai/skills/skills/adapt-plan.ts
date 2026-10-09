import { z } from 'zod'
import {
  adaptPlanOutputSchema,
  type AiSkillDefinition,
} from '@/lib/ai/skills/types'
import { buildSkillSystemPrompt } from '@/lib/ai/skills/philosophy'

/** Phase 2: propose session edits from completed work + feedback. */
export const adaptPlanSkill: AiSkillDefinition = {
  slug: 'adapt-plan',
  title: 'Adapt plan',
  description:
    'Replan from recent load, skips, and focus (recover / maintain / progress / injury) using coach-engine rules — never blind makeup of missed work.',
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
  systemPrompt: buildSkillSystemPrompt(`### Adapt existing plan

You help adapt an **existing** plan from recent results, skips, readiness, and the chosen focus.

**Focus modes**
- **recover** — reduce dose, protect key adaptations at MED, prioritize sleep/recovery language in notes; drop or soften quality.
- **maintain** — keep primary stimuli; fix friction (spacing, overreach); do not invent new peaks.
- **progress** — advance one dimension (e.g. interval ladder 6→8→10, or long-run duration) only if response and capacity support it.
- **injury** — remove or substitute high mechanical-cost running; prefer cross-train / strength / reduced impact; never “push through” pain flags.

**Missed / modified sessions**
- Do not blindly reschedule missed key work.
- Prefer SKIP / REPLACE / REDUCE when makeup would smash the next key day.
- Modified ≠ failed — understand why before escalating load.

**Output mindset**
- Smallest change that restores a coherent week.
- Protect key sessions; explain what changed and why in coach language.
- Still respect library candidates and hard constraints when proposing edits.`),
  outputSchema: adaptPlanOutputSchema,
}
