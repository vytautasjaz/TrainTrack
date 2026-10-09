import { z } from 'zod'
import {
  planDraftOutputSchema,
  type AiSkillBriefField,
  type AiSkillDefinition,
} from '@/lib/ai/skills/types'
import { SCHEDULE_BRIEF_FIELDS, RACE_WEEKDAY_FIELD } from '@/lib/coach-engine/brief'
import { buildSkillSystemPrompt } from '@/lib/ai/skills/philosophy'

const scheduleFields = [...SCHEDULE_BRIEF_FIELDS] as AiSkillBriefField[]
const raceWeekdayField = RACE_WEEKDAY_FIELD as AiSkillBriefField

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

export const hyroxGeneralSkill: AiSkillDefinition = {
  slug: 'hyrox-general',
  title: 'HYROX general',
  description:
    'HYROX Open/Pro prep: running economy, station skill, compromised running, and race sims — with interference-aware spacing and progressive overload.',
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
    ...scheduleFields,
    raceWeekdayField,
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
    ...scheduleBriefSchema,
  }),
  systemPrompt: buildSkillSystemPrompt(`### HYROX focus

Draft a TrainingPlan mixing RUN and STRENGTH/HYROX station work.

**Event demands**
- Running under fatigue (compromised running) — not only fresh easy miles.
- Station skill + muscular endurance (sled, wall balls, etc.) without destroying running quality.
- Race simulations near the end when capacity is earned.

**Interference awareness**
- Heavy lower-body strength and hard running close together is costly.
- Space key run quality away from the hardest station days when possible.
- Easy runs stay easy; station days should not secretly become VO2 smash sessions unless designed.

**Progression**
- Early: technique + aerobic base + general strength.
- Mid: station density and compromised-run pieces; progress one dimension at a time (reps, load, or run volume — not all).
- Late: full or partial race sims + taper.
- Division (open/pro/doubles) changes intensity and density expectations — Pro is not “Open but broken”.

**Sport focus:** HYROX when appropriate; still use RUN for aerobic development.`),
  outputSchema: planDraftOutputSchema,
}

export const multiSportBaseSkill: AiSkillDefinition = {
  slug: 'multi-sport-base',
  title: 'Multi-sport base',
  description:
    'Aerobic base across run / bike / swim / strength: mostly easy intensity, smart distribution, zones from athlete context (FTP, CSS, paces).',
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
    ...scheduleFields,
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
    ...scheduleBriefSchema,
  }),
  systemPrompt: buildSkillSystemPrompt(`### Multi-sport aerobic base

Draft an aerobic base TrainingPlan across RUN, BIKE, SWIM, and occasional STRENGTH.

**Intent**
- Build the engine with mostly low intensity.
- Limited tempo/threshold — never gray-zone spam in every sport every day.
- Respect athlete zones from context (paces, FTP, CSS, HR).

**Emphasis**
- balanced / run / bike / swim biases volume distribution, not “ignore other sports”.
- Strength: maintenance or supportive; do not copy endurance progression blindly.

**Progression**
- Grow total aerobic minutes first.
- Then density of controlled quality in the emphasized sport.
- Keep easy days truly easy across modalities.
- Watch cumulative fatigue — three “easy” hard-feeling sessions is still load.`),
  outputSchema: planDraftOutputSchema,
}
