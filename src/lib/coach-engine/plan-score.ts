import type {
  CapacityProfile,
  MethodologySelection,
  PlannedSession,
  PriorityProfile,
  ValidationError,
  ValidationResult,
  WeeklyArchitecture,
} from '@/lib/coach-engine/types'
import { capacityCeilingForWeek } from '@/lib/coach-engine/capacity'
import {
  findInterferenceErrors,
  findKeySessionProtectionErrors,
} from '@/lib/coach-engine/safety'
import { resolveSportArchitecture } from '@/lib/coach-engine/sport-architecture'
import {
  validateWeeklyPlan as validateWeeklyCaps,
  validateWorkoutProposal,
} from '@/lib/coach-engine/validate'

/**
 * Stretch target for deterministic improvement passes (no AI).
 * Heuristic fit score — not athlete outcome quality.
 */
export const PLAN_SCORE_IMPROVE_TARGET = 75
/**
 * Aggregate plan score below this → coach/engine `requiresReview`.
 * Intentionally below the improve stretch so acceptable weeks aren’t over-flagged.
 */
export const PLAN_SCORE_REVIEW_BELOW = 65
/** @deprecated Prefer PLAN_SCORE_IMPROVE_TARGET — kept as alias for callers. */
export const PLAN_SCORE_TARGET = PLAN_SCORE_IMPROVE_TARGET
/** Below this, validation refuses the week after repairs. */
export const PLAN_SCORE_HARD_FLOOR = 35
export const MAX_PLAN_SCORE_IMPROVE_PASSES = 4

export {
  validateWorkoutProposal,
  applyAdaptations,
  proposalToSession,
} from '@/lib/coach-engine/validate'

function weeklyTssTargetForScore(
  capacity: CapacityProfile,
  weekIndex?: number,
  architecture?: WeeklyArchitecture,
): number {
  const ceiling =
    weekIndex != null
      ? capacityCeilingForWeek(capacity, weekIndex)
      : { maxTss: capacity.maxWeeklyTss, kind: 'present' as const }
  const isRaceish =
    architecture?.phase.isTaper ||
    architecture?.phase.phase === 'RACE' ||
    ceiling.kind === 'race' ||
    ceiling.kind === 'taper'
  const mult =
    ceiling.kind === 'race'
      ? 0.55
      : ceiling.kind === 'taper' || isRaceish
        ? 0.7
        : ceiling.kind === 'deload'
          ? 0.78
          : 0.85
  return Math.max(15, ceiling.maxTss * mult)
}

/** Composite plan score 0–100 (V2 §62 heuristic). */
export function scorePlan(args: {
  sessions: PlannedSession[]
  capacity: CapacityProfile
  priority: PriorityProfile
  methodology: MethodologySelection
  architecture: WeeklyArchitecture
  weekIndex?: number
}): number {
  const active = args.sessions.filter((s) => s.type !== 'REST')
  const training = active.filter((s) => !s.tags.includes('race-day'))
  const tss = training.reduce((sum, s) => sum + s.estimatedTss, 0)
  const tssTarget = weeklyTssTargetForScore(
    args.capacity,
    args.weekIndex,
    args.architecture,
  )
  const tssDenom = Math.max(tssTarget, args.capacity.maxWeeklyTss * 0.5, 1)
  const tssFit = 1 - Math.min(1, Math.abs(tss - tssTarget) / tssDenom)

  const isRaceish =
    args.architecture.phase.isTaper ||
    args.architecture.phase.phase === 'RACE'
  const idealHard = isRaceish
    ? 1
    : Math.min(2, args.capacity.maxHardSessionsPerWeek)
  const hardCount = training.filter(
    (s) => s.isKeySession && s.estimatedTss > 45,
  ).length
  const hardFit = 1 - Math.min(1, Math.abs(hardCount - idealHard) / 3)

  const focusPool = training.length ? training : active
  const focusTags = focusPool.filter(
    (s) => s.primaryAdaptation === args.priority.primary.adaptation,
  ).length
  const focusFit = focusPool.length ? focusTags / focusPool.length : 0.5
  const conf = args.methodology.confidence
  const score = Math.round(
    (tssFit * 0.3 + hardFit * 0.25 + focusFit * 0.25 + conf * 0.2) * 100,
  )
  return Math.min(100, Math.max(0, score))
}

export function validateWeekComprehensive(args: {
  sessions: PlannedSession[]
  capacity: CapacityProfile
  architecture: WeeklyArchitecture
  priority: PriorityProfile
  methodology: MethodologySelection
  weekIndex?: number
}): ValidationResult {
  const errors: ValidationError[] = []
  const caps = validateWeeklyCaps({
    sessions: args.sessions,
    capacity: args.capacity,
    architecture: args.architecture,
    weekIndex: args.weekIndex,
  })
  if (!caps.valid) errors.push(...caps.errors)
  const sportArch = resolveSportArchitecture({
    demandId:
      args.capacity.architectureId === 'hyrox'
        ? 'HYROX_V1'
        : args.capacity.architectureId === 'multi_sport'
          ? 'MULTI_BASE_V1'
          : 'HALF_V1',
  })
  errors.push(...findInterferenceErrors(args.sessions, sportArch))
  errors.push(...findKeySessionProtectionErrors(args.sessions, args.architecture))

  const score = scorePlan(args)
  if (score < PLAN_SCORE_HARD_FLOOR) {
    errors.push({
      type: 'PLAN_SCORE',
      message: `Plan score ${score} is below safety threshold (${PLAN_SCORE_HARD_FLOOR}).`,
    })
  } else if (score < PLAN_SCORE_IMPROVE_TARGET) {
    errors.push({
      type: 'PLAN_SCORE',
      message: `Plan score ${score} is below improve target (${PLAN_SCORE_IMPROVE_TARGET}).`,
    })
  }

  if (errors.length) return { valid: false, errors, score }
  return { valid: true, score }
}

export { improvePlanScoreOnce } from '@/lib/coach-engine/plan-score-improve'
