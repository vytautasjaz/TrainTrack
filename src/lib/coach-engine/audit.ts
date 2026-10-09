import type {
  CoachEngineAuditRecord,
  CoachEngineMeta,
  CollectedAthleteData,
  GoalProfile,
  TrainingModelId,
  ValidationError,
} from '@/lib/coach-engine/types'
import {
  COACH_ENGINE_LIBRARY_VERSION,
  COACH_ENGINE_VERSION,
} from '@/lib/coach-engine/versions'

export type WeekValidationAudit = {
  weekIndex: number
  ok: boolean
  score: number
  errors: ValidationError[]
}

export type BuildCoachEngineAuditArgs = {
  athleteId: string
  skillSlug: string
  brief: Record<string, unknown>
  goal: GoalProfile
  data: CollectedAthleteData
  lockedModel?: TrainingModelId | null
  meta: CoachEngineMeta
  weekValidations: WeekValidationAudit[]
  usedAi: boolean
  capabilityConfidence: number
}

/** Snapshot inputs + versions + constraints + validation for reproducibility. */
export function buildCoachEngineAudit(
  args: BuildCoachEngineAuditArgs,
): CoachEngineAuditRecord {
  const safetyConstraints = args.meta.safetyGate?.constraints ?? []
  const methodologyConstraints = args.meta.methodology.constraints ?? []

  return {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    engineVersion: COACH_ENGINE_VERSION,
    libraryVersion: COACH_ENGINE_LIBRARY_VERSION,
    skillSlug: args.skillSlug,
    athleteId: args.athleteId,
    usedAi: args.usedAi,
    lockedModel: args.lockedModel ?? null,
    inputs: {
      brief: sanitizeBrief(args.brief),
      goal: {
        demandId: args.goal.demandId,
        sport: args.goal.sport,
        weekCount: args.goal.weekCount,
        level: args.goal.level,
        daysPerWeek: args.goal.daysPerWeek,
        longRunDay: args.goal.longRunDay,
        raceWeekday: args.goal.raceWeekday,
        availableDays: args.goal.availableDays,
        currentWeeklyKm: args.goal.currentWeeklyKm,
        firstWeekKm: args.goal.firstWeekKm,
        raceDate: args.goal.race?.date ?? null,
        raceName: args.goal.race?.name ?? null,
        target: args.goal.target.valueLabel,
      },
      history: {
        weekSummaryCount: args.data.weekSummaries.length,
        recentSessionCount: args.data.recentSessions.length,
        hasThresholdPace: args.data.paces.threshold != null,
        hasEasyPace: args.data.paces.easy != null,
        raceCount: args.data.races.length,
      },
      capabilityConfidence: args.capabilityConfidence,
    },
    constraints: {
      safety: [...safetyConstraints],
      methodology: [...methodologyConstraints],
      safetyDecision: args.meta.safetyGate?.decision ?? 'clear',
      requiresReview: Boolean(args.meta.requiresReview),
      selectedModel: args.meta.methodology.selectedModel,
      methodologyConfidence: args.meta.methodology.confidence,
    },
    validation: {
      planScore: args.meta.planScore,
      weeks: args.weekValidations.map((w) => ({
        weekIndex: w.weekIndex,
        ok: w.ok,
        score: w.score,
        errorTypes: w.errors.map((e) => e.type),
        errorMessages: w.errors.map((e) => e.message).slice(0, 8),
      })),
      criticScore: args.meta.criticScore ?? null,
      criticRepairsApplied: args.meta.criticRepairsApplied ?? [],
    },
  }
}

function sanitizeBrief(brief: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(brief)) {
    if (value == null) continue
    if (typeof value === 'string') {
      out[key] = value.slice(0, 500)
      continue
    }
    if (
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      Array.isArray(value)
    ) {
      out[key] = value
      continue
    }
    // Drop nested objects / functions — keep audit JSON flat and safe.
  }
  return out
}
