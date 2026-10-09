import { SessionType, WorkoutType } from '@prisma/client'
import { collectAthleteData } from '@/lib/coach-engine/collect'
import { buildAthleteState } from '@/lib/coach-engine/state'
import { resolveGoalProfile } from '@/lib/coach-engine/goal'
import { getDemandProfile } from '@/lib/coach-engine/demand'
import { calculateCapabilities, calculateGaps } from '@/lib/coach-engine/capability'
import { selectPriorities } from '@/lib/coach-engine/priority'
import { calculateCapacity } from '@/lib/coach-engine/capacity'
import { buildPhaseProfile } from '@/lib/coach-engine/periodization'
import { selectMethodology } from '@/lib/coach-engine/methodology'
import {
  applyDoseToPhase,
  calculateDoseProfile,
  calculateTrainingBudget,
} from '@/lib/coach-engine/dose'
import { buildWeeklyArchitecture } from '@/lib/coach-engine/weekly'
import { pickDeterministicCandidateV2 } from '@/lib/coach-engine/library-v2'
import { refreshWorkoutLibraryFromDb } from '@/lib/coach-engine/library-store'
import { parseDateOnly } from '@/lib/dates'
import type { MethodologySelection, WeeklySlot } from '@/lib/coach-engine/types'
import type { WorkoutStructure } from '@/lib/workout-builder/types'
import type { SwimWorkoutStructure } from '@/lib/swim-workout/types'

export type CalendarWorkoutSuggestion = {
  dateKey: string
  sportType: WorkoutType
  sessionType: SessionType
  title: string
  description: string
  plannedDistance: number | null
  plannedDuration: number | null
  coachNotes: string
  tags: string[]
  structure: WorkoutStructure | null
  swimStructure: SwimWorkoutStructure | null
}

function dayOfWeekFromDateKey(dateKey: string): number {
  // Mon=0 … Sun=6 (coach-engine convention)
  const d = parseDateOnly(dateKey)
  return (d.getUTCDay() + 6) % 7
}

function skillForSport(sport?: WorkoutType | null): string {
  if (sport === WorkoutType.HYROX) return 'hyrox-general'
  if (sport === WorkoutType.TRIATHLON || sport === WorkoutType.BIKE || sport === WorkoutType.SWIM) {
    return 'multi-sport-base'
  }
  return 'run-5k-build'
}

function slotForDay(
  slots: WeeklySlot[],
  dayOfWeek: number,
): WeeklySlot {
  const exact = slots.find((s) => s.dayOfWeek === dayOfWeek)
  if (exact && exact.stimulus !== 'rest') return exact
  // Don't leave calendar days empty — soften rest into easy/recovery.
  return {
    dayOfWeek,
    stimulus: 'easy',
    primaryAdaptation: 'aerobic_capacity',
    availableMinutes: 45,
    hard: false,
  }
}

type SuggestContext = {
  sport: WorkoutType
  slots: WeeklySlot[]
  methodology: MethodologySelection
}

async function buildSuggestContext(args: {
  athleteId: string
  sportFocus?: WorkoutType | null
}): Promise<SuggestContext> {
  await refreshWorkoutLibraryFromDb()
  const data = await collectAthleteData(args.athleteId)
  const skillSlug = skillForSport(args.sportFocus)
  const brief: Record<string, unknown> = {
    weekCount: 8,
    level: 'intermediate',
    daysPerWeek: 5,
    longRunDay: 5,
    currentWeeklyKm: Math.max(20, data.weekSummaries[0]?.completedDistanceKm || 30),
    firstWeekKm: Math.max(20, data.weekSummaries[0]?.completedDistanceKm || 30),
  }
  const state = buildAthleteState(data, 'intermediate')
  const goal = resolveGoalProfile({ skillSlug, brief, data })
  if (args.sportFocus) goal.sport = args.sportFocus

  const demand = getDemandProfile(goal.demandId)
  const caps = calculateCapabilities(state, data, goal)
  const gaps = calculateGaps(caps, demand.demands)
  const seedPhase = buildPhaseProfile({
    goal,
    priority: {
      primary: { adaptation: 'aerobic_capacity', score: 0.5 },
      secondary: [],
    },
    weekIndex: 0,
  })
  const priority = selectPriorities({
    gaps,
    demand,
    phase: seedPhase,
    state,
  })
  const capacity = calculateCapacity(state, goal)
  const budget = calculateTrainingBudget({ brief, capacity, state })
  const dose = calculateDoseProfile({ state, goal, capacity, budget })
  const methodology = selectMethodology({
    state,
    goal,
    phase: seedPhase,
    priority,
  })
  let phase = buildPhaseProfile({ goal, priority, weekIndex: 0 })
  phase = applyDoseToPhase(phase, dose, 0)
  const weekArch = buildWeeklyArchitecture({
    priority,
    capacity,
    phase,
    methodology,
    daysPerWeek: goal.daysPerWeek,
    longRunDay: goal.longRunDay,
    availableDays: goal.availableDays,
    level: goal.level,
  })

  return {
    sport: args.sportFocus ?? goal.sport,
    slots: weekArch.slots,
    methodology,
  }
}

function suggestionFromContext(
  dateKey: string,
  ctx: SuggestContext,
): CalendarWorkoutSuggestion {
  const dow = dayOfWeekFromDateKey(dateKey)
  const slot = slotForDay(ctx.slots, dow)
  const pick = pickDeterministicCandidateV2(slot, ctx.sport, ctx.methodology)
  const durationMin =
    slot.availableMinutes > 0
      ? Math.min(pick.durationMin, slot.availableMinutes)
      : pick.durationMin

  return {
    dateKey,
    sportType: pick.sport,
    sessionType: pick.sessionType,
    title: pick.title,
    description: pick.description,
    plannedDistance: pick.distanceKm,
    plannedDuration: durationMin > 0 ? durationMin : null,
    coachNotes: `AI suggested for ${dateKey} · ${ctx.methodology.selectedModel} · ${slot.stimulus}`,
    tags: ['ai-suggested', `model:${ctx.methodology.selectedModel}`, ...pick.tags].slice(
      0,
      8,
    ),
    structure: pick.structure ?? null,
    swimStructure: pick.swimStructure ?? null,
  }
}

/** Suggest one calendar workout for a date using the coach-engine library. */
export async function suggestCalendarWorkout(args: {
  athleteId: string
  dateKey: string
  sportFocus?: WorkoutType | null
}): Promise<CalendarWorkoutSuggestion> {
  const ctx = await buildSuggestContext(args)
  return suggestionFromContext(args.dateKey, ctx)
}

export async function suggestCalendarWorkouts(args: {
  athleteId: string
  dateKeys: string[]
  sportFocus?: WorkoutType | null
}): Promise<CalendarWorkoutSuggestion[]> {
  const unique = [...new Set(args.dateKeys)].sort()
  if (unique.length === 0) return []
  const ctx = await buildSuggestContext(args)
  return unique.map((dateKey) => suggestionFromContext(dateKey, ctx))
}
