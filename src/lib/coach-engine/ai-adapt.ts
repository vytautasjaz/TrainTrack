import { z } from 'zod'
import { generateStructuredObject } from '@/lib/ai/openai'
import type {
  AthleteState,
  CandidateWorkout,
  CapacityProfile,
  GoalProfile,
  PhaseProfile,
  PriorityProfile,
  ValidationError,
  WeeklySlot,
  WorkoutProposal,
} from '@/lib/coach-engine/types'
import { AI_WORKOUT_ADAPT_PHILOSOPHY } from '@/lib/ai/skills/philosophy'

export const workoutProposalSchema = z.object({
  selected_workout: z.string().min(1).max(64),
  adaptations: z.object({
    interval_count: z.union([z.number().int().min(1).max(16), z.null()]),
    interval_duration_min: z.union([z.number().min(0.2).max(60), z.null()]),
    recovery_min: z.union([z.number().min(0).max(20), z.null()]),
    duration_min: z.union([z.number().int().min(0).max(240), z.null()]),
    distance_km: z.union([z.number().min(0).max(60), z.null()]),
  }),
  reason: z.string().min(1).max(500),
})

export type AiWorkoutProposalOutput = z.infer<typeof workoutProposalSchema>

const SYSTEM_PROMPT = AI_WORKOUT_ADAPT_PHILOSOPHY

function compactCandidate(c: CandidateWorkout) {
  return {
    id: c.id,
    primary_adaptation: c.primaryAdaptation,
    title: c.title,
    duration_min: c.durationMin,
    distance_km: c.distanceKm,
    cardiovascular_load: c.cardiovascularLoad,
    mechanical_load: c.mechanicalLoad,
    difficulty: c.difficulty,
    interval_count: c.intervalCount,
    interval_duration_min: c.intervalDurationMin,
    recovery_min: c.recoveryMin,
  }
}

export function toWorkoutProposal(
  raw: AiWorkoutProposalOutput,
): WorkoutProposal {
  return {
    selectedWorkoutId: raw.selected_workout,
    adaptations: {
      intervalCount: raw.adaptations.interval_count,
      intervalDurationMin: raw.adaptations.interval_duration_min,
      recoveryMin: raw.adaptations.recovery_min,
      durationMin: raw.adaptations.duration_min,
      distanceKm: raw.adaptations.distance_km,
    },
    reason: raw.reason,
  }
}

export async function adaptWorkoutWithAi(args: {
  athleteState: AthleteState
  goal: GoalProfile
  phase: PhaseProfile
  priority: PriorityProfile
  capacity: CapacityProfile
  slot: WeeklySlot
  candidates: CandidateWorkout[]
  previousErrors?: ValidationError[]
  skillSystemPrompt?: string | null
}): Promise<{
  proposal: WorkoutProposal
  tokensIn: number | null
  tokensOut: number | null
}> {
  const payload = {
    athlete_state: {
      training_load: args.athleteState.trainingLoad,
      readiness: args.athleteState.readiness,
      recent_volume: args.athleteState.recentVolume,
      consistency: args.athleteState.consistency,
      level: args.athleteState.level,
    },
    goal: {
      demand_id: args.goal.demandId,
      week_count: args.goal.weekCount,
      target: args.goal.target,
      notes: args.goal.notes || null,
    },
    phase: args.phase,
    priority: {
      primary: args.priority.primary.adaptation,
      secondary: args.priority.secondary.map((s) => s.adaptation),
    },
    constraints: {
      available_minutes: args.slot.availableMinutes,
      hard_slot: args.slot.hard,
      max_weekly_tss: args.capacity.maxWeeklyTss,
      max_weekly_km: args.capacity.maxWeeklyKm,
      remaining_capacity: args.capacity.remainingCapacity,
    },
    slot: {
      day_of_week: args.slot.dayOfWeek,
      stimulus: args.slot.stimulus,
      primary_adaptation: args.slot.primaryAdaptation,
    },
    candidate_workouts: args.candidates.map(compactCandidate),
    previous_validation_errors: args.previousErrors ?? [],
  }

  const skillExtra = args.skillSystemPrompt?.trim()
  const system = skillExtra
    ? `${SYSTEM_PROMPT}\n\nSkill-specific coaching guidance:\n${skillExtra}`
    : SYSTEM_PROMPT

  const { object, tokensIn, tokensOut } = await generateStructuredObject({
    system,
    prompt: JSON.stringify(payload, null, 2),
    schema: workoutProposalSchema,
  })

  // Guard: force selection to be from candidates if model drifts.
  const allowed = new Set(args.candidates.map((c) => c.id))
  if (!allowed.has(object.selected_workout) && args.candidates[0]) {
    object.selected_workout = args.candidates[0].id
  }

  return {
    proposal: toWorkoutProposal(object),
    tokensIn,
    tokensOut,
  }
}

export function isAiAvailable(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim())
}
