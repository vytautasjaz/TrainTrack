import { z } from 'zod'
import {
  planDraftOutputSchema,
  type AiSkillBriefField,
  type AiSkillDefinition,
} from '@/lib/ai/skills/types'
import { SCHEDULE_BRIEF_FIELDS, RACE_WEEKDAY_FIELD } from '@/lib/coach-engine/brief'
import { buildSkillSystemPrompt } from '@/lib/ai/skills/philosophy'

const scheduleBriefSchema = {
  daysPerWeek: z.coerce.number().int().min(3).max(7).default(4),
  longRunDay: z.coerce.number().int().min(0).max(6).default(5),
  raceWeekday: z.coerce.number().int().min(0).max(6).default(6),
  currentWeeklyKm: z.coerce.number().min(5).max(160).default(30),
  firstWeekKm: z.coerce.number().min(5).max(160).default(30),
  availableDays: z.string().max(40).optional().default(''),
  paceEasy: z.union([z.string(), z.number()]).optional().nullable(),
  paceTempo: z.union([z.string(), z.number()]).optional().nullable(),
  paceThreshold: z.union([z.string(), z.number()]).optional().nullable(),
  paceVo2: z.union([z.string(), z.number()]).optional().nullable(),
  bikeFtpWatts: z.coerce.number().min(50).max(500).optional().nullable(),
  swimCssSecPer100m: z.coerce.number().min(40).max(300).optional().nullable(),
  hrMax: z.coerce.number().int().min(120).max(230).optional().nullable(),
  hrResting: z.coerce.number().int().min(30).max(100).optional().nullable(),
}

const commonBrief = {
  weekCount: z.coerce.number().int().min(4).max(24).default(8),
  level: z
    .enum(['beginner', 'intermediate', 'advanced', 'elite'])
    .default('intermediate'),
  notes: z.string().max(2000).optional().default(''),
  ...scheduleBriefSchema,
}

const levelField: AiSkillBriefField = {
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

function withScheduleFields(
  fields: AiSkillBriefField[],
): AiSkillBriefField[] {
  const notesIdx = fields.findIndex((f) => f.key === 'notes')
  const schedule = [...SCHEDULE_BRIEF_FIELDS] as AiSkillBriefField[]
  const race = RACE_WEEKDAY_FIELD as AiSkillBriefField
  if (notesIdx < 0) return [...fields, ...schedule, race]
  return [
    ...fields.slice(0, notesIdx),
    ...schedule,
    race,
    ...fields.slice(notesIdx),
  ]
}

export const run5kBuildSkill = draftSkill({
  slug: 'run-5k-build',
  title: '5K build',
  description:
    'Progressive 5K plan: aerobic base, strides/economy, controlled quality, and race-pace sharpening — with week-to-week progression, not cloned sessions.',
  audience: 'both',
  briefFields: withScheduleFields([
    {
      key: 'weekCount',
      label: 'Weeks',
      kind: 'number',
      min: 4,
      max: 16,
      defaultValue: 8,
      required: true,
    },
    levelField,
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
      placeholder: 'Injuries, constraints, preferences…',
    },
  ]),
  briefSchema: z.object({
    ...commonBrief,
    weekCount: z.coerce.number().int().min(4).max(16).default(8),
    goalTime: z.string().max(40).optional().default(''),
  }),
  systemPrompt: buildSkillSystemPrompt(`### 5K build focus

This skill builds a relative TrainingPlan for a 5K goal.

**What the athlete needs**
- Aerobic durability and running economy (most volume easy).
- One clear quality stimulus most weeks (threshold cruise, short VO2, or race-pace — not all at once early).
- Neuromuscular freshness: strides / short hills as economy tools, not smash sessions.
- A short peak/taper so race week is sharp, not exhausted.

**How to structure weeks**
- Prefer: easy volume + 1 quality + optional strides day + a modest long(ish) aerobic run.
- Beginners: protect frequency and easy running; quality is short and controlled.
- Advanced: still mostly easy; quality can be denser but never gray-zone spam every day.
- Respect recent volume from context — no sudden load spikes.

**Progression story (examples)**
- Early: shorter threshold or intro reps (e.g. ease into higher-rep templates: 6× → 8× → catalog peak).
- Mid: extend quality time-at-intensity or race-pace pieces.
- Late: race-pace specificity + taper volume, keep intensity touch.

**Sport:** Prefer RUN. Phases: base → build → peak → taper when week count allows.`),
})

export const runHalfMarathonSkill = draftSkill({
  slug: 'run-half-marathon',
  title: 'Half marathon',
  description:
    'Half marathon block with progressive long runs, controlled threshold/tempo, and cutback weeks — methodology chosen for the athlete, not dogma.',
  audience: 'both',
  briefFields: withScheduleFields([
    {
      key: 'weekCount',
      label: 'Weeks',
      kind: 'number',
      min: 8,
      max: 20,
      defaultValue: 12,
      required: true,
    },
    levelField,
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
  ]),
  briefSchema: z.object({
    ...commonBrief,
    weekCount: z.coerce.number().int().min(8).max(20).default(12),
    goalTime: z.string().max(40).optional().default(''),
  }),
  systemPrompt: buildSkillSystemPrompt(`### Half marathon focus

Build a TrainingPlan for half marathon performance.

**Primary demands**
- Aerobic durability and long-run tolerance.
- Sustainable threshold / sub-threshold economy.
- Limited, purposeful high intensity — not weekly VO2 heroics unless gaps demand it.

**Weekly pattern (typical)**
- Large easy volume.
- Progressive long run (insert cutback weeks).
- 1–2 quality sessions: often threshold/tempo family; VO2 only when aerobic base and recovery allow.
- Protect the long run: no hard day immediately before it.

**Progression**
- Grow long-run duration/distance first; then add controlled pace segments near race pace when earned.
- Quality: climb within a family (reps or duration) week to week — identical cloned threshold weeks are a failure mode.
- Mid-block cutbacks to absorb load.
- Final 1–2 weeks: taper volume, keep some race-pace feel.

**Methodology**
- Default lean: pyramidal / threshold-capable for many HM athletes.
- Polarized only when athlete history and recovery support sparse hard work.
- Prefer RUN.`),
})

export const runMarathonSkill = draftSkill({
  slug: 'run-marathon',
  title: 'Marathon',
  description:
    'Marathon build: long-run progression, MP specificity when earned, recovery weeks, and conservative load — adaptation per recovery cost.',
  audience: 'both',
  briefFields: withScheduleFields([
    {
      key: 'weekCount',
      label: 'Weeks',
      kind: 'number',
      min: 12,
      max: 24,
      defaultValue: 16,
      required: true,
    },
    levelField,
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
  ]),
  briefSchema: z.object({
    ...commonBrief,
    weekCount: z.coerce.number().int().min(12).max(24).default(16),
    goalTime: z.string().max(40).optional().default(''),
  }),
  systemPrompt: buildSkillSystemPrompt(`### Marathon focus

Draft a marathon TrainingPlan that models a coach’s decision process — not a copy-paste of “hard weeks”.

**Primary demands**
- Long-run tolerance and aerobic durability first.
- Marathon-pace / specific endurance only after the engine is built.
- Mechanical resilience: respect recent load; avoid sudden spikes.

**Weekly pattern**
- Mostly easy running at true easy effort.
- One progressive long run with planned cutbacks.
- Limited quality (often controlled threshold or MP segments later) — usually ≤1–2 hard stimuli/week depending on level.
- Never stack punishing quality + long without recovery logic.

**Progression philosophy**
- Volume and long-run duration are the main levers early.
- Then: density of MP inside the long run / quality sessions.
- Interval ladders on threshold families (e.g. 6×1k → 8×1k → 10×1k) when using that template — do not clone the same prescription for many weeks.
- Deload / cutback weeks are success, not weakness.
- Taper: reduce volume, keep neuromuscular touch, arrive fresh.

**Risk**
- Marathon plans fail by being impressive on paper and unrecoverable in life. Prefer measurable adaptation over heroic sessions.
- Prefer RUN.`),
})
