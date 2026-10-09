import type {
  AthleteState,
  CapacityProfile,
  CoachEngineDraftResult,
  CoachEngineMeta,
  CollectedAthleteData,
  GoalProfile,
  MethodologySelection,
  PhaseProfile,
  PlannedSession,
  PriorityProfile,
  ValidationError,
  WeeklySlot,
  WorkoutAdaptations,
  WorkoutProposal,
} from '@/lib/coach-engine/types'
import type { PlanDraftWithStructure } from '@/lib/ai/skills/types'
import { SessionType, WorkoutType } from '@prisma/client'
import { collectAthleteData } from '@/lib/coach-engine/collect'
import { buildAthleteState, parseAthleteLevel } from '@/lib/coach-engine/state'
import { resolveGoalProfile } from '@/lib/coach-engine/goal'
import { getDemandProfile } from '@/lib/coach-engine/demand'
import { calculateCapabilities, calculateGaps } from '@/lib/coach-engine/capability'
import { selectPriorities } from '@/lib/coach-engine/priority'
import { calculateLimitingFactors } from '@/lib/coach-engine/limiting-factors'
import {
  calculateCapacity,
  refreshCapacityEnvelope,
} from '@/lib/coach-engine/capacity'
import {
  buildPhaseProfile,
  buildPlanPhases,
} from '@/lib/coach-engine/periodization'
import {
  buildWeekBlueprints,
  blueprintToPhaseProfile,
  raceDayTargets,
  type WeekBlueprint,
} from '@/lib/coach-engine/blueprint'
import {
  assessMarathonFeasibility,
  isHighLevelEnduranceGoal,
  maxLongRunWeeklyRatio,
  validateMarathonLongRunDurability,
} from '@/lib/coach-engine/long-run-target'
import { selectMethodology } from '@/lib/coach-engine/methodology'
import {
  applyDoseToPhase,
  calculateDoseProfile,
  calculateTrainingBudget,
} from '@/lib/coach-engine/dose'
import { buildWeeklyArchitecture } from '@/lib/coach-engine/weekly'
import {
  applyReadinessToSlot,
  decideReadinessAction,
} from '@/lib/coach-engine/safety'
import {
  applySafetyConstraintsToCapacity,
  applySafetyConstraintsToDose,
  CoachEngineSafetyError,
  evaluateSafetyIntake,
} from '@/lib/coach-engine/safety-intake'
import {
  findCandidatesForSlotV2,
  pickDeterministicCandidateV2,
  pickProgressiveCandidateV2,
  progressionFamilyKey,
} from '@/lib/coach-engine/library-v2'
import { proposalToSession, validateWorkoutProposal } from '@/lib/coach-engine/validate'
import {
  CoachEngineValidationError,
  enforceWeekValidity,
  formatValidationErrors,
} from '@/lib/coach-engine/enforce-week'
import { adaptWorkoutWithAi, isAiAvailable } from '@/lib/coach-engine/ai-adapt'
import {
  applyCriticSafeRepairs,
  critiquePlanWithAi,
  explainPlanWithAi,
  materializeWeekWithAi,
  refineBlueprintWithAi,
} from '@/lib/coach-engine/ai-multi'
import {
  buildAdaptStep,
  buildArchitectureStep,
  buildCollectStep,
  buildSafetyStep,
  buildDemandStep,
  buildMethodologyStep,
  buildValidateStep,
  formatDecisionTraceMarkdown,
  type CoachEngineDecisionTrace,
} from '@/lib/coach-engine/decision-trace'
import {
  clampThresholdAdaptations,
  enforceWeekVolumeCap,
} from '@/lib/coach-engine/volume-guards'
import { DELOAD_VOLUME_RATIO } from '@/lib/coach-engine/deload'
import {
  PLAN_SCORE_IMPROVE_TARGET,
  PLAN_SCORE_REVIEW_BELOW,
} from '@/lib/coach-engine/plan-score'
import {
  summarizeWeekLoad,
  weeklyStressBudget,
} from '@/lib/coach-engine/session-load'
import { parseProfileOverrides } from '@/lib/coach-engine/brief'
import type { CoachEngineDraftInput } from '@/lib/coach-engine/types'
import { getWorkoutById } from '@/lib/coach-engine/library'
import {
  buildCoachEngineAudit,
  type WeekValidationAudit,
} from '@/lib/coach-engine/audit'

export const MAX_AI_RETRIES = 2

function emptyAdaptations(): WorkoutProposal['adaptations'] {
  return {
    intervalCount: null,
    intervalDurationMin: null,
    recoveryMin: null,
    durationMin: null,
    distanceKm: null,
  }
}

function deterministicProposal(
  slot: WeeklySlot,
  sportFocus: WorkoutType,
  methodology?: MethodologySelection,
): WorkoutProposal {
  const pick = pickDeterministicCandidateV2(slot, sportFocus, methodology)
  return {
    selectedWorkoutId: pick.id,
    adaptations: {
      ...emptyAdaptations(),
      durationMin:
        slot.availableMinutes > 0
          ? Math.min(pick.durationMin, slot.availableMinutes)
          : pick.durationMin,
    },
    reason: `Deterministic ${methodology?.selectedModel ?? 'default'} pick for ${slot.stimulus}.`,
  }
}

/**
 * Soft demotion when a week stacks too many high-cost stimuli
 * (e.g. Tue HM + Thu HM + hard long). Does not invent new library picks.
 */
function applyWeeklyStressBudget(args: {
  sessions: PlannedSession[]
  level: GoalProfile['level']
  preferAerobicLong: boolean
  isRaceWeek: boolean
}): void {
  if (args.isRaceWeek) return
  const budget = weeklyStressBudget(args.level)
  const over = () => summarizeWeekLoad(args.sessions).totalCost > budget
  if (!over()) return

  const racePaceIdx = args.sessions
    .map((s, i) => ({ s, i }))
    .filter(
      ({ s }) =>
        !s.tags.includes('race-day') &&
        s.sessionType !== 'LONG_RUN' &&
        (s.sessionType === 'RACE_PACE' ||
          s.tags.some((t) => /hm-specific|mp-specific|race-pace/i.test(t))),
    )
    .sort((a, b) => a.s.dayOfWeek - b.s.dayOfWeek)

  if (racePaceIdx.length >= 2) {
    const drop = [...racePaceIdx].reverse().find((x) => !x.s.isKeySession) ??
      racePaceIdx[racePaceIdx.length - 1]!
    const s = args.sessions[drop.i]!
    args.sessions[drop.i] = {
      ...s,
      sessionType: SessionType.THRESHOLD,
      tags: [
        ...s.tags.filter(
          (t) => !/hm-specific|mp-specific|race-pace/i.test(t),
        ),
        'threshold',
        'load-budget-demoted',
      ],
      title: s.title
        .replace(/HM|half[-\s]?marathon|race[-\s]?pace/gi, 'Threshold')
        .trim(),
      coachNotes: [s.coachNotes, 'Softened race-pace dose to fit weekly load budget.']
        .filter(Boolean)
        .join(' '),
    }
  }

  if (!over() || !args.preferAerobicLong) return

  for (let i = 0; i < args.sessions.length; i += 1) {
    const s = args.sessions[i]!
    if (s.sessionType !== 'LONG_RUN') continue
    if (!/threshold|fartlek|hm-specific|mp-specific|norwegian/i.test(s.tags.join(' '))) {
      continue
    }
    args.sessions[i] = {
      ...s,
      tags: [
        ...s.tags.filter(
          (t) =>
            !/threshold|fartlek|hm-specific|mp-specific|norwegian|race-pace/i.test(
              t,
            ),
        ),
        'aerobic',
        'load-budget-demoted',
      ],
      coachNotes: [
        s.coachNotes,
        'Long run kept aerobic to respect weekly high-load budget.',
      ]
        .filter(Boolean)
        .join(' '),
    }
  }
}

function raceDaySession(args: {
  weekIndex: number
  dayOfWeek: number
  goal: GoalProfile
  reason?: string
}): PlannedSession {
  const race = raceDayTargets(args.goal)
  const fromLibrary = getWorkoutById('RUN_RACE_DAY_01')
  // Planned distance is the race only (21.1 / 42.2…) — never WU+race+CD summed.
  return {
    weekIndex: args.weekIndex,
    dayOfWeek: args.dayOfWeek,
    type: race.sport,
    sessionType: race.sessionType,
    title: race.title,
    description: `${race.distanceKm} km race` +
      (args.goal.target.valueLabel
        ? ` · goal ${args.goal.target.valueLabel}`
        : ''),
    plannedDistance: race.distanceKm,
    plannedDuration: race.durationMin,
    coachNotes: args.reason ?? `${race.title} — prescribed race session.`,
    tags: ['race-day', 'key-session', 'race-pace'],
    candidateId: fromLibrary?.id ?? 'RUN_RACE_DAY_01',
    primaryAdaptation: 'threshold',
    estimatedTss: Math.round(race.durationMin * 1.1),
    isKeySession: true,
    structure: fromLibrary?.structure ?? null,
    swimStructure: null,
  }
}

async function resolveSlotProposal(args: {
  slot: WeeklySlot
  allowAi: boolean
  athleteState: AthleteState
  goal: GoalProfile
  phase: PhaseProfile
  priority: PriorityProfile
  capacity: CapacityProfile
  methodology: MethodologySelection
  skillSystemPrompt?: string | null
}): Promise<{
  proposal: WorkoutProposal
  tokensIn: number
  tokensOut: number
  usedAi: boolean
}> {
  const fallback = deterministicProposal(
    args.slot,
    args.goal.sport,
    args.methodology,
  )
  if (args.slot.stimulus === 'rest' || !args.allowAi || !isAiAvailable()) {
    return { proposal: fallback, tokensIn: 0, tokensOut: 0, usedAi: false }
  }

  const candidates = findCandidatesForSlotV2(args.slot, {
    sportFocus: args.goal.sport,
    limit: 4,
    methodology: args.methodology,
    preferRaceSpecific: args.slot.preferRaceSpecific,
    athleteLevel: args.goal.level,
    demandId: args.goal.demandId,
  })

  let previousErrors: ValidationError[] | undefined
  let tokensIn = 0
  let tokensOut = 0

  for (let attempt = 0; attempt <= MAX_AI_RETRIES; attempt += 1) {
    try {
      const result = await adaptWorkoutWithAi({
        athleteState: args.athleteState,
        goal: args.goal,
        phase: args.phase,
        priority: args.priority,
        capacity: args.capacity,
        slot: args.slot,
        candidates,
        previousErrors,
        skillSystemPrompt: args.skillSystemPrompt,
      })
      tokensIn += result.tokensIn ?? 0
      tokensOut += result.tokensOut ?? 0

      const validation = validateWorkoutProposal({
        proposal: result.proposal,
        slotAvailableMinutes: args.slot.availableMinutes,
        capacity: args.capacity,
        hardSlot: args.slot.hard,
      })
      if (validation.valid) {
        return {
          proposal: result.proposal,
          tokensIn,
          tokensOut,
          usedAi: true,
        }
      }
      previousErrors = validation.errors
    } catch {
      break
    }
  }

  return { proposal: fallback, tokensIn, tokensOut, usedAi: false }
}

function planTitle(goal: GoalProfile, methodology: MethodologySelection): string {
  const demand = getDemandProfile(goal.demandId)
  return `${demand.label} · ${methodology.selectedModel.replaceAll('_', ' ')} · ${goal.weekCount}w`
}

function buildGuidelines(meta: {
  priority: PriorityProfile
  capacity: CapacityProfile
  phase: PhaseProfile
  methodology: MethodologySelection
  limiting: ReturnType<typeof calculateLimitingFactors>
  planScore: number
  skillGuidance?: string | null
  blueprints?: WeekBlueprint[]
  criticSummary?: string | null
  criticScore?: number | null
  criticRepairsApplied?: string[]
  safetyGate?: import('@/lib/coach-engine/types').SafetyGateResult | null
  goal?: GoalProfile | null
}): string {
  const secondary = meta.priority.secondary
    .map((s) => s.adaptation.replaceAll('_', ' '))
    .join(', ')
  const alts = meta.methodology.alternatives
    .slice(0, 2)
    .map((a) => `${a.model} (${a.score})`)
    .join(', ')
  const skillBlock = meta.skillGuidance?.trim()
  const phaseLines =
    meta.blueprints
      ?.map(
        (b) =>
          `W${b.weekIndex + 1} ${b.label}: ~${b.targetKm} km · long ${b.longRunTargetKm} km · ${b.qualitySessions}Q${b.preferRaceSpecific ? ' · race-specific' : ''}${b.isDeload ? ' · recovery' : ''}${b.isRaceWeek ? ' · race' : ''}`,
      )
      .join('\n') ?? null
  const marathonFeasibility =
    meta.goal?.demandId === 'MARATHON_V1'
      ? assessMarathonFeasibility({
          level: meta.goal.level,
          highLevel: isHighLevelEnduranceGoal(meta.goal),
          weekCount: meta.goal.weekCount,
          currentWeeklyKm:
            meta.goal.currentWeeklyKm ?? meta.goal.firstWeekKm ?? 25,
          recentLongestRunKm: Math.max(
            12,
            Math.round(
              (meta.goal.currentWeeklyKm ?? meta.goal.firstWeekKm ?? 25) * 0.45,
            ),
          ),
          daysPerWeek: meta.goal.daysPerWeek,
        })
      : null
  const marathonDurability =
    meta.goal?.demandId === 'MARATHON_V1' && meta.blueprints?.length
      ? validateMarathonLongRunDurability({
          level: meta.goal.level,
          highLevel: isHighLevelEnduranceGoal(meta.goal),
          longRunKmByWeek: meta.blueprints.map((b) => b.longRunTargetKm),
          weeklyKmByWeek: meta.blueprints.map((b) => b.targetKm),
          raceWeekIndex: meta.blueprints.find((b) => b.isRaceWeek)?.weekIndex,
          daysPerWeek: meta.goal.daysPerWeek,
        })
      : null
  return [
    `## Why this plan`,
    `Focus: ${meta.priority.primary.adaptation.replaceAll('_', ' ')}.`,
    secondary ? `Secondary: ${secondary}.` : null,
    `Limiting factor: ${meta.limiting.primary.adaptation.replaceAll('_', ' ')} (score ${meta.limiting.primary.score}).`,
    `Methodology: ${meta.methodology.selectedModel} (confidence ${meta.methodology.confidence}).`,
    meta.methodology.reasonCodes.length
      ? `Reasons: ${meta.methodology.reasonCodes.join(', ')}.`
      : null,
    alts ? `Alternatives considered: ${alts}.` : null,
    `Phase: ${meta.phase.phase} (${meta.phase.phaseGoal}).`,
    `Present capacity ~${meta.capacity.maxWeeklyTss} TSS / ${meta.capacity.maxWeeklyKm} km (next week).`,
    meta.capacity.envelope
      ? `Progressive peak ~${meta.capacity.envelope.maxPeakTss} TSS / ${meta.capacity.envelope.maxPeakKm} km.`
      : null,
    `Schedule: ${meta.capacity.maxSessionsPerWeek} sessions/week.`,
    marathonFeasibility
      ? `Preparation pathway: ${marathonFeasibility.preparationDepth} · readiness ${marathonFeasibility.readiness} · ${marathonFeasibility.pathway}.`
      : null,
    marathonFeasibility && !marathonFeasibility.feasible
      ? `Marathon feasibility (${marathonFeasibility.pathway}): preparation may be insufficient in ${meta.goal?.weekCount ?? '?'} weeks.\n${marathonFeasibility.reasons.map((r) => `- ${r}`).join('\n')}${
          marathonFeasibility.recommendedWeekCount
            ? `\n- Consider extending to ~${marathonFeasibility.recommendedWeekCount} weeks, lowering the race goal, or choosing a shorter race first.`
            : ''
        }`
      : null,
    marathonDurability
      ? `Marathon preparation: peak week ${marathonDurability.peakWeeklyKm} km · peak long ${marathonDurability.peakLongRunKm} km · ≥30 km ×${marathonDurability.runsOver30Km} · ≥28 km ×${marathonDurability.runsOver28Km}${marathonDurability.meetsMinimumStandard ? ' · meets minimum standard' : ' · BELOW minimum standard'}.`
      : null,
    marathonDurability?.warnings.length
      ? `Marathon preparation warnings:\n${marathonDurability.warnings.map((w) => `- ${w}`).join('\n')}`
      : null,
    `Plan score: ${meta.planScore}/100 (avg of loading weeks; improve toward ${PLAN_SCORE_IMPROVE_TARGET}, review below ${PLAN_SCORE_REVIEW_BELOW}).`,
    meta.planScore < PLAN_SCORE_REVIEW_BELOW
      ? `Score is below review threshold — check key sessions or regenerate; improvement used deterministic library tweaks only (no extra AI tokens).`
      : meta.planScore < PLAN_SCORE_IMPROVE_TARGET
        ? `Score is below stretch target (${PLAN_SCORE_IMPROVE_TARGET}) but above review bar — optional polish only.`
        : null,
    meta.safetyGate && meta.safetyGate.decision !== 'clear'
      ? `Safety: ${meta.safetyGate.summary}`
      : null,
    phaseLines ? `\n## Week architecture\n${phaseLines}` : null,
    meta.criticSummary
      ? `\n## Critic notes (advisory)\n${meta.criticSummary}${
          meta.criticScore != null ? `\nCritic score: ${meta.criticScore}/100 (does not replace plan score).` : ''
        }${
          meta.criticRepairsApplied?.length
            ? `\nRepairs applied: ${meta.criticRepairsApplied.join(', ')}.`
            : ''
        }`
      : null,
    'Hard constraints and validation run before this draft is saved.',
    skillBlock ? `\n## Skill coaching guidance\n${skillBlock}` : null,
  ]
    .filter(Boolean)
    .join('\n')
}

export function formatWhyThisPlan(meta: CoachEngineMeta): {
  focus: string
  methodology: string
  confidence: number
  limitingFactor: string
  reasons: string[]
  planScore: number
} {
  return {
    focus: meta.focusSummary,
    methodology: meta.methodology.selectedModel,
    confidence: meta.methodology.confidence,
    limitingFactor: meta.limitingFactors.primary.adaptation,
    reasons: meta.methodology.reasonCodes,
    planScore: meta.planScore,
  }
}

export async function runCoachEngineDraft(
  input: CoachEngineDraftInput,
): Promise<CoachEngineDraftResult> {
  const { refreshWorkoutLibraryFromDb } = await import(
    '@/lib/coach-engine/library-store'
  )
  const { refreshSkillOverridesFromDb } = await import(
    '@/lib/ai/skills/skill-store'
  )
  await Promise.all([
    refreshWorkoutLibraryFromDb(),
    refreshSkillOverridesFromDb(),
  ])
  const athleteId = input.athleteId?.trim() || null
  const { emptyCollectedAthleteData } = await import(
    '@/lib/coach-engine/collect'
  )
  const data = athleteId
    ? await collectAthleteData(athleteId)
    : emptyCollectedAthleteData(
        typeof input.brief.athleteName === 'string' &&
          input.brief.athleteName.trim()
          ? input.brief.athleteName.trim()
          : 'General athlete',
      )
  return buildDraftFromCollected({
    data,
    skillSlug: input.skillSlug,
    brief: input.brief,
    allowAi: input.allowAi !== false,
    lockedModel: input.lockedModel,
  })
}

export async function buildDraftFromCollected(args: {
  data: CollectedAthleteData
  skillSlug: string
  brief: Record<string, unknown>
  allowAi: boolean
  lockedModel?: import('@/lib/coach-engine/types').TrainingModelId | null
}): Promise<CoachEngineDraftResult> {
  const allowAi = args.allowAi
  const overrides = parseProfileOverrides(args.brief)
  const overridesApplied = (
    [
      ['paceEasy', overrides.paceEasy],
      ['paceTempo', overrides.paceTempo],
      ['paceThreshold', overrides.paceThreshold],
      ['paceVo2', overrides.paceVo2],
      ['bikeFtpWatts', overrides.bikeFtpWatts],
      ['swimCssSecPer100m', overrides.swimCssSecPer100m],
      ['hrMax', overrides.hrMax],
      ['hrResting', overrides.hrResting],
    ] as const
  )
    .filter(([, v]) => v != null)
    .map(([k]) => k)

  const data: CollectedAthleteData = {
    ...args.data,
    paces: {
      easy: overrides.paceEasy ?? args.data.paces.easy,
      tempo: overrides.paceTempo ?? args.data.paces.tempo,
      threshold: overrides.paceThreshold ?? args.data.paces.threshold,
      vo2: overrides.paceVo2 ?? args.data.paces.vo2,
    },
    bikeFtpWatts: overrides.bikeFtpWatts ?? args.data.bikeFtpWatts,
    swimCssSecPer100m:
      overrides.swimCssSecPer100m ?? args.data.swimCssSecPer100m,
    hr: {
      max: overrides.hrMax ?? args.data.hr.max,
      resting: overrides.hrResting ?? args.data.hr.resting,
    },
  }
  const level = parseAthleteLevel(args.brief.level)
  const athleteState = buildAthleteState(data, level)

  // ── Safety intake gate (before dose / blueprint) ────────────────
  const safetyGate = evaluateSafetyIntake({
    brief: args.brief,
    state: athleteState,
    profileRestingHr: data.hr.resting,
  })
  if (safetyGate.blocked) {
    throw new CoachEngineSafetyError(safetyGate)
  }

  const { getSkillIncludingInactive } = await import('@/lib/ai/skills/registry')
  const skill = getSkillIncludingInactive(args.skillSlug)
  const skillSystemPrompt = skill?.systemPrompt?.trim() || null
  const skillGuidanceForPlan = (() => {
    if (!skillSystemPrompt) return null
    const marker = '## Event-specific coaching brief'
    const idx = skillSystemPrompt.indexOf(marker)
    const body =
      idx >= 0 ? skillSystemPrompt.slice(idx + marker.length) : skillSystemPrompt
    const trimmed = body.replace(/^[\s\-]+/, '').trim()
    return trimmed.slice(0, 1500) || null
  })()
  const goal = resolveGoalProfile({
    skillSlug: args.skillSlug,
    brief: args.brief,
    data,
  })
  const demand = getDemandProfile(goal.demandId)
  const capabilities = calculateCapabilities(athleteState, data, goal)
  const gaps = calculateGaps(capabilities, demand.demands)

  const seedPhase = buildPhaseProfile({
    goal,
    priority: {
      primary: { adaptation: 'aerobic_durability', score: 0.5 },
      secondary: [],
    },
    weekIndex: Math.floor(goal.weekCount / 2),
  })
  const priority = selectPriorities({
    gaps,
    demand,
    phase: seedPhase,
    state: athleteState,
  })
  const limiting = calculateLimitingFactors({
    gaps,
    demand,
    phase: seedPhase,
  })
  let capacity = applySafetyConstraintsToCapacity(
    calculateCapacity(athleteState, goal),
    safetyGate,
  )
  const budget = calculateTrainingBudget({
    brief: args.brief,
    capacity,
    state: athleteState,
  })
  let dose = applySafetyConstraintsToDose(
    calculateDoseProfile({
      state: athleteState,
      goal,
      capacity,
      budget,
    }),
    safetyGate,
  )
  const methodology = selectMethodology({
    state: athleteState,
    goal,
    phase: seedPhase,
    priority,
    lockedModel: args.lockedModel,
  })
  const readiness = decideReadinessAction(athleteState)

  // ── Blueprint-first architecture (one phase per week) ───────────
  let blueprints = buildWeekBlueprints({ goal, dose, priority, capacity })

  // Sync dose scales from blueprints (recovery ≈ 90% volume).
  dose = {
    ...dose,
    volumeScaleByWeek: blueprints.map((b) => b.volumeScale),
    deloadWeekIndexes: blueprints
      .filter((b) => b.isDeload)
      .map((b) => b.weekIndex),
    taperWeekIndexes: blueprints
      .filter((b) => b.isTaper || b.isRaceWeek)
      .map((b) => b.weekIndex),
  }
  // Rebuild week-by-week envelope with real deload/taper indexes + phases.
  capacity = refreshCapacityEnvelope(capacity, {
    weekCount: goal.weekCount,
    deloadWeekIndexes: dose.deloadWeekIndexes,
    taperWeekIndexes: dose.taperWeekIndexes,
    phases: blueprints.map((b) => b.phase),
  })
  // Re-clamp blueprint targets to the refreshed envelope ceilings.
  blueprints = buildWeekBlueprints({ goal, dose, priority, capacity })
  dose = {
    ...dose,
    volumeScaleByWeek: blueprints.map((b) => b.volumeScale),
    deloadWeekIndexes: blueprints
      .filter((b) => b.isDeload)
      .map((b) => b.weekIndex),
    taperWeekIndexes: blueprints
      .filter((b) => b.isTaper || b.isRaceWeek)
      .map((b) => b.weekIndex),
  }

  let tokensIn = 0
  let tokensOut = 0
  let usedAi = false
  let blueprintRationale: string | null = null
  let blueprintAiRefined = false

  // Call A — refine blueprint with AI (optional)
  if (allowAi) {
    const refined = await refineBlueprintWithAi({
      blueprints,
      goal,
      priority,
      methodology,
      athleteState,
      skillSystemPrompt,
    })
    blueprints = refined.blueprints
    tokensIn += refined.tokensIn
    tokensOut += refined.tokensOut
    if (refined.usedAi) {
      usedAi = true
      blueprintAiRefined = true
    }
    blueprintRationale = refined.rationale
    dose = {
      ...dose,
      volumeScaleByWeek: blueprints.map((b) => b.volumeScale),
      deloadWeekIndexes: blueprints
        .filter((b) => b.isDeload)
        .map((b) => b.weekIndex),
      taperWeekIndexes: blueprints
        .filter((b) => b.isTaper || b.isRaceWeek)
        .map((b) => b.weekIndex),
    }
    capacity = refreshCapacityEnvelope(capacity, {
      weekCount: goal.weekCount,
      deloadWeekIndexes: dose.deloadWeekIndexes,
      taperWeekIndexes: dose.taperWeekIndexes,
      phases: blueprints.map((b) => b.phase),
    })
  }

  const sessions: PlannedSession[] = []
  let lastPlanScore = 70
  let prevWeekTrainingKm = 0
  /** Last non-deload / non-race training week — rebound must not use deload km. */
  let prevLoadingWeekTrainingKm = 0
  const previousByFamily = new Map<
    string,
    { id: string; adaptations: WorkoutAdaptations }
  >()
  const recentQualityIds: string[] = []

  for (let weekIndex = 0; weekIndex < goal.weekCount; weekIndex += 1) {
    const bp = blueprints[weekIndex]!
    let phase = blueprintToPhaseProfile(bp, priority)
    phase = {
      ...applyDoseToPhase(phase, dose, weekIndex),
      volumeScale: bp.volumeScale,
      isDeload: bp.isDeload,
      isTaper: bp.isTaper || bp.isRaceWeek,
    }
    phase = {
      ...phase,
      weeksToRace: goal.weekCount - 1 - weekIndex,
    }

    const race = raceDayTargets(goal)
    let weekArch = buildWeeklyArchitecture({
      priority,
      capacity,
      phase,
      methodology,
      daysPerWeek: goal.daysPerWeek,
      longRunDay: goal.longRunDay,
      availableDays: goal.availableDays,
      level: goal.level,
      qualitySessions: bp.qualitySessions,
      preferRaceSpecific: bp.preferRaceSpecific,
      longRunMinMinutes: bp.longRunMinMinutes,
      targetKm: bp.targetKm,
      isRaceWeek: bp.isRaceWeek,
      raceDurationMin: race.durationMin,
      raceWeekday: goal.raceWeekday,
      longIntensityProfile: bp.longIntensityProfile,
      architectureId: bp.architectureId ?? capacity.architectureId,
    })
    weekArch = {
      ...weekArch,
      slots: weekArch.slots.map((s) => applyReadinessToSlot(s, readiness)),
    }

    // Call B — batch materialize quality/long/race for this week when AI on
    const materializeSlots = weekArch.slots.filter(
      (s) =>
        s.stimulus === 'quality' ||
        s.stimulus === 'long' ||
        s.stimulus === 'race' ||
        s.stimulus === 'strength' ||
        (s.modality === 'hyrox' && s.hard),
    )
    let aiProposals = new Map<number, WorkoutProposal>()
    if (allowAi && materializeSlots.length > 0) {
      const batch = await materializeWeekWithAi({
        weekIndex,
        blueprint: bp,
        slots: materializeSlots.map((s) => ({
          dayOfWeek: s.dayOfWeek,
          stimulus: s.stimulus,
          availableMinutes: s.availableMinutes,
          candidateIds: findCandidatesForSlotV2(s, {
            sportFocus: goal.sport,
            limit: 5,
            methodology,
            preferAerobicLong:
              s.stimulus === 'long' && bp.preferAerobicLong,
            preferRaceSpecific:
              s.stimulus === 'race' ||
              Boolean(s.preferRaceSpecific) ||
              (s.stimulus === 'quality' &&
                (Boolean(s.preferRaceSpecific) || bp.preferRaceSpecific)) ||
              (s.stimulus === 'long' &&
                !bp.preferAerobicLong &&
                bp.preferRaceSpecific),
            demandId: goal.demandId,
            athleteLevel: goal.level,
            longIntensityProfile:
              s.stimulus === 'long' ? bp.longIntensityProfile : null,
            thresholdVolumeTargetMin:
              s.stimulus === 'quality' && !s.preferRaceSpecific
                ? bp.thresholdVolumeTargetMin
                : null,
            allowVo2: bp.allowVo2,
            preferStrides: bp.preferStrides,
            weekIndex,
            intensityBand: bp.intensityBand,
            qualityIndex:
              s.stimulus === 'quality'
                ? materializeSlots
                    .slice(
                      0,
                      materializeSlots.indexOf(s),
                    )
                    .filter((x) => x.stimulus === 'quality').length
                : undefined,
          }).map((c) => c.id),
        })),
        goal,
        methodology,
        skillSystemPrompt,
      })
      aiProposals = batch.proposals
      tokensIn += batch.tokensIn
      tokensOut += batch.tokensOut
      if (batch.usedAi) usedAi = true
    }

    const weekSessions: PlannedSession[] = []
    /** Quality sessions already placed this week — drives 1k vs VO2 shape. */
    let weekQualityIndex = 0

    for (const slot of weekArch.slots) {
      if (slot.stimulus === 'rest') continue

      const familyKey = progressionFamilyKey(slot)
      const previous = previousByFamily.get(familyKey)
      // Only race-tagged slots (or longs that want specificity) — never force
      // the week's second quality into MP when the recipe wants VO2 / 1 km.
      const preferRace =
        Boolean(slot.preferRaceSpecific) ||
        (slot.stimulus === 'quality' &&
          Boolean(slot.preferRaceSpecific) &&
          Boolean(slot.isKeySession) &&
          bp.preferRaceSpecific) ||
        (slot.stimulus === 'long' &&
          !bp.preferAerobicLong &&
          bp.preferRaceSpecific)
      const preferAerobicLong =
        slot.stimulus === 'long' && bp.preferAerobicLong
      const qualityIndex =
        slot.stimulus === 'quality' ? weekQualityIndex : undefined

      let proposal: WorkoutProposal

      if (slot.stimulus === 'race') {
        // Always materialize race day from goal — do not depend on library cache.
        weekSessions.push(
          raceDaySession({
            weekIndex,
            dayOfWeek: slot.dayOfWeek,
            goal,
          }),
        )
        recentQualityIds.push('RUN_RACE_DAY_01')
        continue
      }

      // Norwegian double-threshold: AM longer reps + PM shorter reps, same day.
      if (slot.doubleThreshold && slot.stimulus === 'quality') {
        const parts = ['am', 'pm'] as const
        for (const part of parts) {
          const partMinutes =
            part === 'am'
              ? Math.round((slot.availableMinutes || 90) * 0.55)
              : Math.round((slot.availableMinutes || 90) * 0.45)
          const partSlot = { ...slot, availableMinutes: partMinutes }
          const partFamily = `quality:threshold:dt-${part}`
          const partPrevious = previousByFamily.get(partFamily)
          const picked = pickProgressiveCandidateV2({
            slot: partSlot,
            sportFocus: goal.sport,
            methodology,
            previousWorkoutId: partPrevious?.id ?? null,
            previousAdaptations: partPrevious?.adaptations ?? null,
            weekIndex,
            athleteLevel: goal.level,
            preferAerobicLong: false,
            preferRaceSpecific: false,
            demandId: goal.demandId,
            thresholdVolumeTargetMin: bp.thresholdVolumeTargetMin
              ? Math.round(
                  bp.thresholdVolumeTargetMin * (part === 'am' ? 0.55 : 0.45),
                )
              : null,
            recentIds: recentQualityIds.slice(-6),
            doubleThresholdPart: part,
            allowVo2: false,
            preferStrides: false,
            intensityBand: bp.intensityBand,
            qualityIndex,
          })
          let partProposal: WorkoutProposal = {
            selectedWorkoutId: picked.candidate.id,
            adaptations: picked.adaptations,
            reason: picked.reason,
          }
          const validation = validateWorkoutProposal({
            proposal: partProposal,
            slotAvailableMinutes: partMinutes || 60,
            capacity,
            hardSlot: true,
          })
          if (!validation.valid) {
            partProposal = deterministicProposal(
              partSlot,
              goal.sport,
              methodology,
            )
          }
          const session = proposalToSession({
            weekIndex,
            dayOfWeek: slot.dayOfWeek,
            proposal: partProposal,
            longRunMinMinutes: null,
            longRunTargetKm: null,
            volumeScale: null,
          })
          if (!session) continue
          const note =
            part === 'am'
              ? 'Norwegian double-threshold AM — longer controlled reps. Keep lactate/effort controlled; 5–8 h before PM.'
              : 'Norwegian double-threshold PM — shorter controlled reps. Next day is mandatory recovery/easy.'
          weekSessions.push({
            ...session,
            title: `${part.toUpperCase()} · ${session.title}`.slice(0, 120),
            tags: Array.from(
              new Set([
                ...(session.tags ?? []),
                'double-threshold',
                part,
                'norwegian',
                'threshold',
              ]),
            ).slice(0, 8),
            coachNotes: [session.coachNotes, note].filter(Boolean).join(' '),
            isKeySession: part === 'am' ? Boolean(slot.isKeySession) : false,
          })
          previousByFamily.set(partFamily, {
            id: partProposal.selectedWorkoutId,
            adaptations: partProposal.adaptations,
          })
          recentQualityIds.push(partProposal.selectedWorkoutId)
        }
        weekQualityIndex += 1
        continue
      }

      if (aiProposals.has(slot.dayOfWeek)) {
        proposal = aiProposals.get(slot.dayOfWeek)!
        const base = getWorkoutById(proposal.selectedWorkoutId)
        // Reject AI picks that violate phase architecture (HM-pace in base,
        // threshold fartlek long when aerobic long is required, etc.).
        const aiViolatesArchitecture = (() => {
          if (!base) return true
          const tags = base.tags.join(' ')
          if (
            slot.stimulus === 'quality' &&
            !preferRace &&
            (base.sessionType === 'RACE_PACE' ||
              /hm-specific|mp-specific|race-pace/i.test(tags))
          ) {
            return true
          }
          if (
            slot.stimulus === 'long' &&
            preferAerobicLong &&
            /threshold|fartlek|hm-specific|mp-specific|race-pace|norwegian/i.test(
              tags,
            )
          ) {
            return true
          }
          if (
            slot.stimulus === 'long' &&
            bp.longIntensityProfile === 'aerobic' &&
            /threshold|fartlek|hm-specific|mp-specific/i.test(tags)
          ) {
            return true
          }
          return false
        })()
        if (
          base &&
          slot.stimulus === 'quality' &&
          (!preferRace || bp.isRaceWeek || bp.isTaper)
        ) {
          proposal = {
            ...proposal,
            adaptations: clampThresholdAdaptations({
              candidate: base,
              adaptations: proposal.adaptations,
              maxWorkMin: bp.thresholdVolumeTargetMin,
            }),
          }
        }
        const validation = validateWorkoutProposal({
          proposal,
          slotAvailableMinutes: slot.availableMinutes || 120,
          capacity,
          hardSlot: slot.hard,
        })
        if (!validation.valid || aiViolatesArchitecture) {
          const picked = pickProgressiveCandidateV2({
            slot,
            sportFocus: goal.sport,
            methodology,
            previousWorkoutId: previous?.id ?? null,
            previousAdaptations: previous?.adaptations ?? null,
            weekIndex,
            athleteLevel: goal.level,
            preferAerobicLong,
            preferRaceSpecific: preferRace,
            demandId: goal.demandId,
            longIntensityProfile:
              slot.stimulus === 'long' ? bp.longIntensityProfile : null,
            thresholdVolumeTargetMin:
              bp.isRaceWeek || bp.isTaper
                ? bp.thresholdVolumeTargetMin
                : preferRace
                  ? null
                  : bp.thresholdVolumeTargetMin,
            recentIds:
              slot.stimulus === 'quality' || slot.stimulus === 'long'
                ? recentQualityIds.slice(-6)
                : undefined,
            allowVo2: bp.allowVo2,
            preferStrides:
              bp.preferStrides &&
              (slot.stimulus === 'quality' ||
                slot.stimulus === 'easy' ||
                slot.stimulus === 'recovery'),
            intensityBand: bp.intensityBand,
            qualityIndex,
          })
          proposal = {
            selectedWorkoutId: picked.candidate.id,
            adaptations: picked.adaptations,
            reason: picked.reason,
          }
        }
      } else {
        const picked = pickProgressiveCandidateV2({
          slot,
          sportFocus: goal.sport,
          methodology,
          previousWorkoutId: previous?.id ?? null,
          previousAdaptations: previous?.adaptations ?? null,
          weekIndex,
          athleteLevel: goal.level,
          preferAerobicLong,
          preferRaceSpecific: preferRace,
          demandId: goal.demandId,
          longIntensityProfile:
            slot.stimulus === 'long' ? bp.longIntensityProfile : null,
          thresholdVolumeTargetMin:
            bp.isRaceWeek || bp.isTaper
              ? bp.thresholdVolumeTargetMin
              : preferRace
                ? null
                : bp.thresholdVolumeTargetMin,
          recentIds:
            slot.stimulus === 'quality' || slot.stimulus === 'long'
              ? recentQualityIds.slice(-6)
              : undefined,
          allowVo2: bp.allowVo2,
          preferStrides:
            bp.preferStrides &&
            (slot.stimulus === 'quality' ||
              slot.stimulus === 'easy' ||
              slot.stimulus === 'recovery'),
          intensityBand: bp.intensityBand,
          qualityIndex,
        })
        proposal = {
          selectedWorkoutId: picked.candidate.id,
          adaptations: picked.adaptations,
          reason: picked.reason,
        }
      }

      if (
        slot.stimulus === 'quality' &&
        (bp.isRaceWeek || bp.isTaper) &&
        bp.thresholdVolumeTargetMin != null
      ) {
        const base = getWorkoutById(proposal.selectedWorkoutId)
        if (base) {
          proposal = {
            ...proposal,
            adaptations: clampThresholdAdaptations({
              candidate: base,
              adaptations: proposal.adaptations,
              maxWorkMin: bp.thresholdVolumeTargetMin,
            }),
          }
        }
      }

      const validation = validateWorkoutProposal({
        proposal,
        slotAvailableMinutes: slot.availableMinutes || 120,
        capacity,
        hardSlot: slot.hard,
      })
      if (!validation.valid) {
        proposal = deterministicProposal(slot, goal.sport, methodology)
      }

      const session = proposalToSession({
        weekIndex,
        dayOfWeek: slot.dayOfWeek,
        proposal,
        longRunMinMinutes:
          slot.stimulus === 'long' ? bp.longRunMinMinutes : null,
        longRunTargetKm:
          slot.stimulus === 'long' && bp.longRunTargetKm > 0
            ? bp.longRunTargetKm
            : null,
        // targetKm already encodes deload/taper/race volume — do NOT scale
        // sessions again (that previously stacked to ~38% cuts).
        volumeScale: null,
      })

      if (session) {
        weekSessions.push({
          ...session,
          isKeySession: session.isKeySession ?? slot.isKeySession,
        })
        const storeKey = familyKey
        previousByFamily.set(storeKey, {
          id: proposal.selectedWorkoutId,
          adaptations: proposal.adaptations,
        })
        const adaptKey = progressionFamilyKey(slot, proposal.selectedWorkoutId)
        if (adaptKey !== storeKey) {
          previousByFamily.set(adaptKey, {
            id: proposal.selectedWorkoutId,
            adaptations: proposal.adaptations,
          })
        }
        if (slot.stimulus === 'quality' || slot.stimulus === 'long') {
          recentQualityIds.push(proposal.selectedWorkoutId)
        }
        if (slot.stimulus === 'quality') {
          weekQualityIndex += 1
        }
      }
    }

    // Cap actual week km near blueprint target (kills 62→82 spikes).
    // Race week: cap *training* km to targetKm; race distance is additive,
    // so without this Mon–Sat stays full-size and total blows past 90 km.
    if (bp.isRaceWeek) {
      const raceDow =
        goal.raceWeekday != null
          ? ((goal.raceWeekday % 7) + 7) % 7
          : goal.longRunDay
      const hasRace = weekSessions.some((s) => s.tags.includes('race-day'))
      if (!hasRace) {
        weekSessions.push(
          raceDaySession({
            weekIndex,
            dayOfWeek: raceDow,
            goal,
          }),
        )
      } else {
        // Snap any race session onto the requested weekday.
        for (const s of weekSessions) {
          if (s.tags.includes('race-day') && s.dayOfWeek !== raceDow) {
            s.dayOfWeek = raceDow
          }
        }
      }
      // After race: no more workouts.
      for (let i = weekSessions.length - 1; i >= 0; i -= 1) {
        const s = weekSessions[i]!
        if (s.dayOfWeek > raceDow && !s.tags.includes('race-day')) {
          weekSessions.splice(i, 1)
        }
      }
      // Keep a single race session on race day (replace stray long/easy that day).
      const onRaceDay = weekSessions.filter((s) => s.dayOfWeek === raceDow)
      if (onRaceDay.length > 1) {
        const raceOnly =
          onRaceDay.find((s) => s.tags.includes('race-day')) ??
          raceDaySession({ weekIndex, dayOfWeek: raceDow, goal })
        for (let i = weekSessions.length - 1; i >= 0; i -= 1) {
          if (weekSessions[i]!.dayOfWeek === raceDow) {
            weekSessions.splice(i, 1)
          }
        }
        weekSessions.push(raceOnly)
      }

      const trainingOnly = weekSessions.filter(
        (s) => !s.tags.includes('race-day'),
      )
      const raceSessions = weekSessions.filter((s) =>
        s.tags.includes('race-day'),
      )
      const cappedTraining = enforceWeekVolumeCap({
        sessions: trainingOnly,
        targetKm: bp.targetKm,
        tolerance: 0.08,
        longRunFloorKm: null,
      })
      weekSessions.splice(
        0,
        weekSessions.length,
        ...cappedTraining,
        ...raceSessions,
      )
    } else {
      // Trust blueprint week targets. Prior-week *actual* undershoot used to
      // cascade (W1 short → every later week capped), which erased marathon
      // durability. Only soften deload rebound / taper from actual load.
      let volumeTarget = bp.targetKm
      const prevWasDeload = Boolean(blueprints[weekIndex - 1]?.isDeload)
      // Post-deload rebound is vs last *loading* week, never vs the deload itself
      // (32→37 traps the whole peak block).
      if (
        prevLoadingWeekTrainingKm >= 30 &&
        prevWasDeload &&
        !bp.isDeload &&
        !bp.isTaper
      ) {
        volumeTarget = Math.min(
          volumeTarget,
          Math.round(prevLoadingWeekTrainingKm * 1.18 * 10) / 10,
        )
      }
      if (bp.isTaper && prevLoadingWeekTrainingKm >= 30) {
        volumeTarget = Math.min(
          volumeTarget,
          prevLoadingWeekTrainingKm * 0.85,
        )
      }
      if (bp.isDeload && prevLoadingWeekTrainingKm >= 30) {
        volumeTarget = Math.min(
          volumeTarget,
          prevLoadingWeekTrainingKm * DELOAD_VOLUME_RATIO,
        )
      } else if (bp.isDeload && prevWeekTrainingKm >= 30) {
        volumeTarget = Math.min(
          volumeTarget,
          prevWeekTrainingKm * DELOAD_VOLUME_RATIO,
        )
      }
      const baseLongShare = maxLongRunWeeklyRatio({
        demandId: goal.demandId,
        daysPerWeek: goal.daysPerWeek,
        weekIndex,
        level: goal.level,
      })
      // Peak durability weeks may sit near the ceiling so ≥30 km longs still fit.
      const fromEnd = goal.weekCount - 1 - weekIndex
      const longShare =
        goal.demandId === 'MARATHON_V1' && fromEnd >= 2 && fromEnd <= 3
          ? Math.max(baseLongShare, 0.42)
          : baseLongShare
      // Prefer raising the week to host the blueprint long over shrinking the long.
      if (
        !bp.isDeload &&
        !bp.isTaper &&
        !bp.isRaceWeek &&
        bp.longRunTargetKm > 0
      ) {
        const needWeek = Math.ceil(bp.longRunTargetKm / longShare)
        if (needWeek > volumeTarget) {
          volumeTarget = Math.min(
            needWeek,
            Math.round(volumeTarget * 1.12 * 10) / 10,
            bp.targetKm * 1.08,
          )
        }
      }
      const capped = enforceWeekVolumeCap({
        sessions: weekSessions,
        targetKm: volumeTarget,
        tolerance: bp.isDeload || bp.isTaper ? 0.08 : 0.08,
        longRunFloorKm:
          bp.isDeload || bp.isTaper
            ? null
            : bp.longRunTargetKm > 0
              ? Math.min(
                  bp.longRunTargetKm * 0.95,
                  volumeTarget * longShare,
                )
              : null,
      })
      weekSessions.splice(0, weekSessions.length, ...capped)

      // Hard repair: never leave a long run above the weekly ratio ceiling.
      const longs = weekSessions
        .map((s, i) => ({ s, i }))
        .filter(
          ({ s }) =>
            !s.tags.includes('race-day') &&
            (s.sessionType === 'LONG_RUN' ||
              s.primaryAdaptation === 'long_run_tolerance'),
        )
        .sort(
          (a, b) => (b.s.plannedDistance ?? 0) - (a.s.plannedDistance ?? 0),
        )
      // Demote secondary "long" sessions (stolen midweek PROG) to easy.
      for (const extra of longs.slice(1)) {
        weekSessions[extra.i] = {
          ...extra.s,
          sessionType: 'EASY_RUN',
          title: 'Easy run',
          description: 'Easy aerobic run (demoted — only one long run per week).',
          primaryAdaptation: 'aerobic_capacity',
          isKeySession: false,
          tags: [...extra.s.tags.filter((t) => !/long-run|key-session/i.test(t)), 'easy'],
          coachNotes: `${extra.s.coachNotes ?? ''} Demoted second long-run sample.`.trim(),
        }
      }
      const primaryLong = longs[0]
      let weekKm = weekSessions
        .filter((s) => !s.tags.includes('race-day'))
        .reduce((sum, s) => sum + (s.plannedDistance ?? 0), 0)
      if (primaryLong && weekKm > 0) {
        const cur = primaryLong.s.plannedDistance ?? 0
        const ratio = cur / weekKm
        if (ratio > longShare + 0.01 && cur > 0) {
          // Prefer adding easy volume so the long can stay — never inflate
          // deload/taper weeks (those must stay lighter than the prior load).
          const needWeek = Math.ceil(cur / longShare)
          const hostCap = Math.round(Math.max(volumeTarget, weekKm) * 1.12 * 10) / 10
          if (
            !bp.isDeload &&
            !bp.isTaper &&
            !bp.isRaceWeek &&
            needWeek <= hostCap &&
            needWeek > weekKm + 0.5
          ) {
            const addKm = Math.round((needWeek - weekKm) * 10) / 10
            const easyIdx = weekSessions.findIndex(
              (s) =>
                !s.tags.includes('race-day') &&
                !s.isKeySession &&
                (s.sessionType === 'EASY_RUN' ||
                  s.sessionType === 'RECOVERY_RUN'),
            )
            if (easyIdx >= 0) {
              const easy = weekSessions[easyIdx]!
              weekSessions[easyIdx] = {
                ...easy,
                plannedDistance: (easy.plannedDistance ?? 0) + addKm,
                plannedDuration:
                  easy.plannedDuration != null
                    ? easy.plannedDuration + Math.round(addKm * 6)
                    : easy.plannedDuration,
                estimatedTss: easy.estimatedTss + Math.round(addKm * 4),
                coachNotes: `${easy.coachNotes ?? ''} +${addKm} km easy to host long-run ratio.`.trim(),
              }
              weekKm += addKm
            }
          }
          // Still over ceiling after volume add → shrink the long.
          if (cur / Math.max(weekKm, 1) > longShare + 0.01) {
            const maxLong = Math.round(weekKm * longShare * 10) / 10
            if (cur > maxLong) {
              const factor = maxLong / cur
              weekSessions[primaryLong.i] = {
                ...primaryLong.s,
                plannedDistance: maxLong,
                plannedDuration:
                  primaryLong.s.plannedDuration != null
                    ? Math.max(
                        40,
                        Math.round(primaryLong.s.plannedDuration * factor),
                      )
                    : primaryLong.s.plannedDuration,
                estimatedTss: Math.max(
                  20,
                  Math.round(primaryLong.s.estimatedTss * factor),
                ),
                coachNotes: `${primaryLong.s.coachNotes ?? ''} Capped long to ${maxLong} km (≤${Math.round(longShare * 100)}% of week).`.trim(),
              }
            }
          }
        }
      }
    }

    // Weekly stress budget: demote duplicate race-pace / hard-long stacking.
    applyWeeklyStressBudget({
      sessions: weekSessions,
      level: goal.level,
      preferAerobicLong: bp.preferAerobicLong,
      isRaceWeek: bp.isRaceWeek,
    })

    const trainingKmNow = weekSessions
      .filter((s) => !s.tags.includes('race-day'))
      .reduce((sum, s) => sum + (s.plannedDistance ?? 0), 0)
    if (!bp.isRaceWeek) {
      prevWeekTrainingKm = trainingKmNow
      if (!bp.isDeload && !bp.isTaper) {
        prevLoadingWeekTrainingKm = trainingKmNow
      }
    }

    const enforced = enforceWeekValidity({
      sessions: weekSessions,
      capacity,
      architecture: weekArch,
      priority,
      methodology,
      weekIndex,
    })
    lastPlanScore = enforced.score || lastPlanScore
    weekSessions.splice(0, weekSessions.length, ...enforced.sessions)

    if (!enforced.ok) {
      throw new CoachEngineValidationError({
        weekIndex,
        errors: enforced.errors,
        message: `Week ${weekIndex + 1} failed validation after repair and requires review: ${formatValidationErrors(enforced.errors)}`,
      })
    }

    sessions.push(...weekSessions)
  }

  // Call C — critic (advisory score; known blocker codes → deterministic repairs)
  let criticSummary: string | null = blueprintRationale
  let criticScore: number | null = null
  let criticRepairsApplied: string[] = []
  if (allowAi) {
    const critique = await critiquePlanWithAi({
      sessions,
      blueprints,
      goal,
      capacity,
      methodology,
    })
    tokensIn += critique.tokensIn
    tokensOut += critique.tokensOut
    if (critique.usedAi) usedAi = true
    if (critique.result) {
      criticSummary = critique.result.summary
      // Keep critic score advisory — do NOT blend into deterministic planScore.
      criticScore = critique.result.overall_score
      const repair = applyCriticSafeRepairs({
        sessions,
        blueprints,
        critic: critique.result,
        goal,
      })
      sessions.splice(0, sessions.length, ...repair.sessions)
      criticRepairsApplied = repair.repairsApplied
      if (repair.advisoryIssues.length) {
        const advisory = repair.advisoryIssues
          .slice(0, 4)
          .map((i) => `[${i.severity}] ${i.code}: ${i.message}`)
          .join(' · ')
        criticSummary = [critique.result.summary, `Advisory: ${advisory}`]
          .filter(Boolean)
          .join(' ')
      }
      if (repair.repairsApplied.length) {
        criticSummary = [
          criticSummary,
          `Applied repairs: ${repair.repairsApplied.join(', ')}.`,
        ]
          .filter(Boolean)
          .join(' ')
      }
    }
  }

  // Final enforcement / revalidation after critic repairs — refuse invalid drafts.
  const weekValidations: WeekValidationAudit[] = []
  for (let weekIndex = 0; weekIndex < goal.weekCount; weekIndex += 1) {
    const bp = blueprints[weekIndex]!
    const weekArch = buildWeeklyArchitecture({
      priority,
      capacity,
      phase: {
        ...blueprintToPhaseProfile(bp, priority),
        volumeScale: bp.volumeScale,
        isDeload: bp.isDeload,
        isTaper: bp.isTaper || bp.isRaceWeek,
        weeksToRace: goal.weekCount - 1 - weekIndex,
      },
      methodology,
      daysPerWeek: goal.daysPerWeek,
      longRunDay: goal.longRunDay,
      availableDays: goal.availableDays,
      level: goal.level,
      qualitySessions: bp.qualitySessions,
      preferRaceSpecific: bp.preferRaceSpecific,
      longRunMinMinutes: bp.longRunMinMinutes,
      targetKm: bp.targetKm,
      isRaceWeek: bp.isRaceWeek,
      raceWeekday: goal.raceWeekday,
      longIntensityProfile: bp.longIntensityProfile,
      architectureId: bp.architectureId ?? capacity.architectureId,
    })
    const weekSessions = sessions.filter((s) => s.weekIndex === weekIndex)
    if (weekSessions.length === 0) continue
    const enforced = enforceWeekValidity({
      sessions: weekSessions,
      capacity,
      architecture: weekArch,
      priority,
      methodology,
      weekIndex,
    })
    // Replace week slice in-place.
    for (let i = sessions.length - 1; i >= 0; i -= 1) {
      if (sessions[i]!.weekIndex === weekIndex) sessions.splice(i, 1)
    }
    sessions.push(...enforced.sessions)
    sessions.sort(
      (a, b) =>
        a.weekIndex - b.weekIndex || a.dayOfWeek - b.dayOfWeek,
    )
    lastPlanScore = enforced.score || lastPlanScore
    weekValidations.push({
      weekIndex,
      ok: enforced.ok,
      score: enforced.score || 0,
      errors: enforced.ok ? [] : enforced.errors,
    })
    if (!enforced.ok) {
      throw new CoachEngineValidationError({
        weekIndex,
        errors: enforced.errors,
        message: `Plan failed final validation for week ${weekIndex + 1} and was not saved: ${formatValidationErrors(enforced.errors)}`,
      })
    }
  }

  const midBp =
    blueprints[Math.floor(goal.weekCount / 2)] ?? blueprints[0]!
  const midPhase = blueprintToPhaseProfile(midBp, priority)

  const loadingWeekScores = weekValidations
    .filter((w) => w.weekIndex < goal.weekCount - 1)
    .map((w) => w.score)
  const planScoreAggregate =
    loadingWeekScores.length > 0
      ? Math.round(
          loadingWeekScores.reduce((a, b) => a + b, 0) /
            loadingWeekScores.length,
        )
      : lastPlanScore

  const marathonDurabilityWarnings =
    goal.demandId === 'MARATHON_V1'
      ? validateMarathonLongRunDurability({
          level: goal.level,
          highLevel: isHighLevelEnduranceGoal(goal),
          longRunKmByWeek: blueprints.map((b) => b.longRunTargetKm),
          weeklyKmByWeek: blueprints.map((b) => b.targetKm),
          raceWeekIndex: blueprints.find((b) => b.isRaceWeek)?.weekIndex,
          daysPerWeek: goal.daysPerWeek,
        }).warnings
      : []
  const marathonFeasibilityGate =
    goal.demandId === 'MARATHON_V1'
      ? assessMarathonFeasibility({
          level: goal.level,
          highLevel: isHighLevelEnduranceGoal(goal),
          weekCount: goal.weekCount,
          currentWeeklyKm: goal.currentWeeklyKm ?? goal.firstWeekKm ?? 25,
          recentLongestRunKm: Math.max(
            12,
            Math.round((goal.firstWeekKm ?? 25) * 0.45),
          ),
          daysPerWeek: goal.daysPerWeek,
        })
      : null

  const meta: CoachEngineMeta = {
    methodology,
    limitingFactors: limiting,
    dose,
    planScore: planScoreAggregate,
    focusSummary: priority.primary.adaptation.replaceAll('_', ' '),
    safetyGate,
    requiresReview:
      safetyGate.decision === 'require_review' ||
      safetyGate.constraints.includes('require_medical_followup') ||
      planScoreAggregate < PLAN_SCORE_REVIEW_BELOW ||
      marathonDurabilityWarnings.length > 0 ||
      Boolean(marathonFeasibilityGate && !marathonFeasibilityGate.feasible),
    criticSummary,
    criticScore,
    criticRepairsApplied,
  }

  let guidelines = buildGuidelines({
    priority,
    capacity,
    phase: midPhase,
    methodology,
    limiting,
    planScore: planScoreAggregate,
    skillGuidance: skillGuidanceForPlan,
    blueprints,
    criticSummary,
    criticScore,
    criticRepairsApplied,
    safetyGate,
    goal,
  })

  // Call D — explain
  if (allowAi) {
    const explained = await explainPlanWithAi({
      blueprints,
      methodology,
      priority,
      planScore: planScoreAggregate,
      criticSummary,
      skillGuidance: skillGuidanceForPlan,
    })
    tokensIn += explained.tokensIn
    tokensOut += explained.tokensOut
    if (explained.usedAi && explained.text) {
      usedAi = true
      guidelines = explained.text
    }
  }

  const phases = buildPlanPhases(goal, dose, priority)

  const topGaps = gaps.rows
    .slice()
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 4)
    .map((r) => ({ key: r.key, gap: r.gap }))

  const qualitySessions = sessions.filter(
    (s) =>
      s.sessionType === 'THRESHOLD' ||
      s.sessionType === 'TEMPO' ||
      s.sessionType === 'VO2_MAX' ||
      s.sessionType === 'INTERVALS' ||
      s.sessionType === 'RACE_PACE' ||
      s.tags.some((t) => /quality|threshold|hm-specific|race-pace/i.test(t)),
  )
  const uniqueQualityIds = [
    ...new Set(
      qualitySessions
        .map((s) => s.candidateId)
        .filter((id): id is string => Boolean(id)),
    ),
  ]

  const decisionTrace: CoachEngineDecisionTrace = {
    steps: [
      buildCollectStep({ athleteState, goal, overridesApplied }),
      buildSafetyStep({ gate: safetyGate }),
      buildDemandStep({
        goal,
        demandLabel: demand.label,
        priority,
        limiting,
        topGaps,
      }),
      buildMethodologyStep({
        methodology,
        dose,
        capacity,
        lockedModel: args.lockedModel ?? null,
        readiness,
      }),
      buildArchitectureStep({
        blueprints,
        aiRefined: blueprintAiRefined,
        rationale: blueprintRationale,
      }),
      buildAdaptStep({
        usedAi,
        tokensIn,
        tokensOut,
        sessionCount: sessions.filter((s) => s.type !== WorkoutType.REST)
          .length,
        qualityCount: qualitySessions.filter(
          (s) => !s.tags.includes('race-day'),
        ).length,
        raceSpecificCount: sessions.filter((s) =>
          s.tags.some((t) => /hm-specific|race-pace|race-day/i.test(t)),
        ).length,
        longCount: sessions.filter((s) => s.sessionType === 'LONG_RUN').length,
        raceDayCount: sessions.filter((s) => s.tags.includes('race-day'))
          .length,
        uniqueQualityIds,
      }),
      buildValidateStep({
        planScore: planScoreAggregate,
        weekCount: goal.weekCount,
        phaseBlockCount: phases.length,
        criticSummary,
        criticScore,
        criticRepairsApplied,
      }),
    ],
  }

  const decisionMd = formatDecisionTraceMarkdown(decisionTrace)
  // Prefer keeping the full decision log — WhyThisPlanPanel on the plan page
  // is the post-generate review surface (wizard navigates there immediately).
  const combinedGuidelines = [guidelines, decisionMd]
    .filter(Boolean)
    .join('\n\n')
    .slice(0, 16000)

  const draft: PlanDraftWithStructure = {
    title: planTitle(goal, methodology),
    description: [
      `Coach-engine draft for ${athleteState.name}.`,
      `Focus: ${meta.focusSummary}.`,
      `Model: ${methodology.selectedModel} (confidence ${methodology.confidence}).`,
    ].join(' '),
    weekCount: goal.weekCount,
    sportFocus: goal.sport,
    level: goal.level,
    target: goal.target.valueLabel,
    guidelines: combinedGuidelines,
    sessions: sessions
      .filter((s) => s.type !== WorkoutType.REST)
      .map((s) => ({
        weekIndex: s.weekIndex,
        dayOfWeek: s.dayOfWeek,
        type: s.type,
        sessionType: s.sessionType,
        title: s.title,
        description: s.description,
        plannedDistance: s.plannedDistance,
        plannedDuration: s.plannedDuration,
        coachNotes: s.coachNotes,
        tags: [
          ...s.tags,
          ...(s.isKeySession ? ['key-session'] : []),
          `model:${methodology.selectedModel}`,
        ].slice(0, 8),
        candidateId: s.candidateId || null,
        structure: s.structure ?? null,
        swimStructure: s.swimStructure ?? null,
      })),
    phases: phases.map((p) => ({
      phase: p.phase,
      sport: p.sport,
      label: p.label,
      startDay: p.startDay,
      endDay: p.endDay,
    })),
  }

  const audit = buildCoachEngineAudit({
    athleteId: athleteState.athleteId,
    skillSlug: args.skillSlug,
    brief: args.brief,
    goal,
    data,
    lockedModel: args.lockedModel ?? null,
    meta: { ...meta, planScore: planScoreAggregate },
    weekValidations,
    usedAi,
    capabilityConfidence: capabilities.confidence,
  })

  return {
    draft,
    tokensIn: tokensIn || null,
    tokensOut: tokensOut || null,
    usedAi,
    priority,
    capacity,
    guidelines: combinedGuidelines,
    meta,
    decisionTrace,
    audit,
  }
}
