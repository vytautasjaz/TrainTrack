import type {
  AthleteState,
  CapacityProfile,
  DoseProfile,
  GoalProfile,
  LimitingFactorProfile,
  MethodologySelection,
  PriorityProfile,
  SafetyGateResult,
} from '@/lib/coach-engine/types'
import type { WeekBlueprint } from '@/lib/coach-engine/blueprint'
import { DAY_OPTIONS } from '@/lib/coach-engine/brief'
import { formatPaceMinPerKm } from '@/lib/athlete-preferences'

export const COACH_ENGINE_STEP_IDS = [
  'collect',
  'safety',
  'demand',
  'methodology',
  'architecture',
  'adapt',
  'validate',
] as const

export type CoachEngineDecisionStepId = (typeof COACH_ENGINE_STEP_IDS)[number]

export type CoachEngineDecisionStep = {
  id: CoachEngineDecisionStepId
  title: string
  summary: string
  facts: string[]
}

export type CoachEngineDecisionTrace = {
  steps: CoachEngineDecisionStep[]
}

export const COACH_ENGINE_STEP_META: Record<
  CoachEngineDecisionStepId,
  { title: string; hint: string }
> = {
  collect: {
    title: 'Collecting athlete state',
    hint: 'Paces, recent volume, consistency, readiness signals…',
  },
  safety: {
    title: 'Safety & medical intake',
    hint: 'Injury, illness, RED-S, pregnancy, pain, HR/medication gates…',
  },
  demand: {
    title: 'Mapping goal demand & gaps',
    hint: 'Event demands vs current capabilities → priorities…',
  },
  methodology: {
    title: 'Selecting methodology & dose',
    hint: 'Training model, weekly km curve, deload / taper weeks…',
  },
  architecture: {
    title: 'Building weekly architecture',
    hint: 'One phase per week, quality slots, long-run targets…',
  },
  adapt: {
    title: 'Adapting workout candidates',
    hint: 'Library samples + progression (+ AI when available)…',
  },
  validate: {
    title: 'Validating & saving plan',
    hint: 'Hard constraints, week scores, race session check…',
  },
}

function dayLabel(day: number): string {
  return DAY_OPTIONS.find((d) => Number(d.value) === day)?.label ?? `Day ${day}`
}

function paceLabel(secPerKm: number | null | undefined): string {
  if (secPerKm == null || !(secPerKm > 0)) return '—'
  return `${formatPaceMinPerKm(secPerKm)}/km`
}

function adaptLabel(key: string): string {
  return key.replaceAll('_', ' ')
}

export function buildCollectStep(args: {
  athleteState: AthleteState
  goal: GoalProfile
  overridesApplied: string[]
}): CoachEngineDecisionStep {
  const s = args.athleteState
  const facts = [
    `Athlete: ${s.name} · level ${s.level}`,
    `Recent volume: ~${Math.round(s.recentVolume.runningKmPerWeek)} km/wk · ${s.recentVolume.sessionsPerWeek.toFixed(1)} sessions/wk · avg TSS ${Math.round(s.recentVolume.avgWeeklyTss)}`,
    `Consistency: ${Math.round(s.consistency * 100)}% · readiness ${s.readiness.score.toFixed(2)} (confidence ${s.readiness.confidence.toFixed(2)})`,
    `Paces — easy ${paceLabel(s.metrics.easyPace.value)} · threshold ${paceLabel(s.metrics.thresholdPace.value)}`,
    `Schedule: ${args.goal.daysPerWeek} days/wk · long on ${dayLabel(args.goal.longRunDay)}${
      args.goal.availableDays.length
        ? ` · available ${args.goal.availableDays.map(dayLabel).join(', ')}`
        : ''
    }`,
    args.goal.raceWeekday != null
      ? `Race day (final week): ${dayLabel(args.goal.raceWeekday)} — nothing scheduled after`
      : null,
    `Volume brief: current ${args.goal.currentWeeklyKm ?? '—'} km · week-1 target ${args.goal.firstWeekKm ?? '—'} km`,
  ].filter(Boolean) as string[]
  if (args.goal.race) {
    facts.push(
      `Race context: ${args.goal.race.name}${args.goal.race.date ? ` (${args.goal.race.date})` : ''} · priority ${args.goal.race.priority}`,
    )
  }
  if (args.overridesApplied.length) {
    facts.push(`Brief overrides applied: ${args.overridesApplied.join(', ')}`)
  }
  return {
    id: 'collect',
    title: COACH_ENGINE_STEP_META.collect.title,
    summary: `Loaded ${s.name}'s state for a ${args.goal.weekCount}-week ${args.goal.demandId.replaceAll('_', ' ')} block.`,
    facts,
  }
}

export function buildSafetyStep(args: {
  gate: SafetyGateResult
}): CoachEngineDecisionStep {
  const { gate } = args
  const intake = gate.intake
  const facts = [
    `Decision: ${gate.decision}${gate.blocked ? ' (blocked)' : ''}`,
    `Injury: ${intake.injurySeverity}${intake.injuryLocation ? ` @ ${intake.injuryLocation}` : ''}${intake.painEscalating ? ' · pain escalating' : ''}`,
    `Illness: ${intake.illness}`,
    `RED-S / EA: ${intake.redsRisk}${intake.energyAvailabilityConcern ? ' · EA concern' : ''}`,
    `Pregnancy: ${intake.pregnancyStatus}${
      intake.pregnancyTrimester != null
        ? ` (T${intake.pregnancyTrimester})`
        : ''
    }${
      intake.postpartumWeeks != null
        ? ` · ${intake.postpartumWeeks}w postpartum`
        : ''
    }`,
    `Medical clearance: ${
      intake.medicalClearance === true
        ? 'yes'
        : intake.medicalClearance === false
          ? 'no'
          : 'unknown'
    }`,
    intake.medicationsAffectingHr || intake.restingHrAnomaly
      ? `HR signals: ${[
          intake.medicationsAffectingHr ? 'meds affecting HR' : null,
          intake.restingHrAnomaly ? 'resting HR anomaly' : null,
        ]
          .filter(Boolean)
          .join(' · ')}`
      : null,
    gate.constraints.length
      ? `Constraints: ${gate.constraints.join(', ')}`
      : 'No planning constraints',
    ...gate.flags.slice(0, 6).map((f) => `[${f.severity}] ${f.message}`),
  ].filter((f): f is string => f != null)
  return {
    id: 'safety',
    title: COACH_ENGINE_STEP_META.safety.title,
    summary: gate.summary,
    facts,
  }
}

export function buildDemandStep(args: {
  goal: GoalProfile
  demandLabel: string
  priority: PriorityProfile
  limiting: LimitingFactorProfile
  topGaps: { key: string; gap: number }[]
}): CoachEngineDecisionStep {
  const secondary = args.priority.secondary
    .slice(0, 2)
    .map((s) => adaptLabel(s.adaptation))
    .join(', ')
  const facts = [
    `Demand profile: ${args.demandLabel} (${args.goal.demandId})`,
    `Primary focus: ${adaptLabel(args.priority.primary.adaptation)} (score ${args.priority.primary.score.toFixed(2)})`,
    secondary
      ? `Secondary: ${secondary}`
      : 'Secondary: none strongly indicated',
    `Limiting factor: ${adaptLabel(args.limiting.primary.adaptation)} (score ${args.limiting.primary.score.toFixed(2)}, gap ${args.limiting.primary.gap.toFixed(2)})`,
  ]
  if (args.topGaps.length) {
    facts.push(
      `Largest gaps: ${args.topGaps
        .map((g) => `${adaptLabel(g.key)} ${g.gap.toFixed(2)}`)
        .join(' · ')}`,
    )
  }
  if (args.goal.target.valueLabel) {
    facts.push(`Time target: ${args.goal.target.valueLabel}`)
  }
  return {
    id: 'demand',
    title: COACH_ENGINE_STEP_META.demand.title,
    summary: `Prioritized ${adaptLabel(args.priority.primary.adaptation)} for ${args.demandLabel}.`,
    facts,
  }
}

export function buildMethodologyStep(args: {
  methodology: MethodologySelection
  dose: DoseProfile
  capacity: CapacityProfile
  lockedModel: string | null
  readiness: string
}): CoachEngineDecisionStep {
  const alts = args.methodology.alternatives
    .slice(0, 3)
    .map((a) => `${a.model} (${a.score})`)
    .join(', ')
  const deloads = args.dose.deloadWeekIndexes.map((w) => `W${w + 1}`).join(', ')
  const tapers = args.dose.taperWeekIndexes.map((w) => `W${w + 1}`).join(', ')
  const facts = [
    args.lockedModel
      ? `Methodology locked by coach: ${args.methodology.selectedModel}`
      : `Selected model: ${args.methodology.selectedModel} (confidence ${args.methodology.confidence})`,
    args.methodology.reasonCodes.length
      ? `Reasons: ${args.methodology.reasonCodes.join(', ')}`
      : 'Reasons: default scoring',
    alts ? `Alternatives: ${alts}` : 'No strong alternatives',
    `Constraints: ${args.methodology.constraints.join(', ') || 'none'}`,
    `Present capacity: ${args.capacity.maxWeeklyKm} km/wk · ${args.capacity.maxWeeklyTss} TSS · ${args.capacity.maxHardSessionsPerWeek} hard sessions`,
    args.capacity.envelope
      ? `Progressive peak: ${args.capacity.envelope.maxPeakKm} km · ${args.capacity.envelope.maxPeakTss} TSS (${args.capacity.envelope.weekCount} weeks)`
      : null,
    `Dose anchors: MED ${args.dose.medTss} / OPT ${args.dose.optTss} / MRD ${args.dose.mrdTss} TSS · target ~${args.dose.targetWeeklyKm} km`,
    `Deload weeks: ${deloads || 'none'} · Taper/race weeks: ${tapers || 'none'}`,
    `Readiness action seed: ${args.readiness}`,
  ].filter((f): f is string => f != null)
  return {
    id: 'methodology',
    title: COACH_ENGINE_STEP_META.methodology.title,
    summary: `${args.methodology.selectedModel} with ${args.dose.deloadWeekIndexes.length} recovery week(s).`,
    facts,
  }
}

export function buildArchitectureStep(args: {
  blueprints: WeekBlueprint[]
  aiRefined: boolean
  rationale: string | null
}): CoachEngineDecisionStep {
  const phaseCounts = new Map<string, number>()
  for (const bp of args.blueprints) {
    phaseCounts.set(bp.label, (phaseCounts.get(bp.label) ?? 0) + 1)
  }
  const phaseSummary = [...phaseCounts.entries()]
    .map(([label, n]) => `${label}×${n}`)
    .join(' · ')
  const facts = [
    `Week-aligned phases (no mid-week splits): ${phaseSummary}`,
    `AI blueprint refine: ${args.aiRefined ? 'yes' : 'no (deterministic)'}`,
  ]
  if (args.rationale) facts.push(`Architect note: ${args.rationale}`)

  for (const bp of args.blueprints) {
    const flags = [
      bp.isDeload ? 'recovery' : null,
      bp.isTaper ? 'taper' : null,
      bp.isRaceWeek ? 'race' : null,
      bp.preferRaceSpecific ? 'race-specific' : null,
    ].filter(Boolean)
    facts.push(
      `W${bp.weekIndex + 1} ${bp.label}: ~${bp.targetKm} km · ${bp.qualitySessions}Q · long ≥${bp.longRunTargetKm || bp.longRunMinMinutes}${bp.longRunTargetKm ? 'km' : '′'}${
        flags.length ? ` · ${flags.join(', ')}` : ''
      }`,
    )
  }

  return {
    id: 'architecture',
    title: COACH_ENGINE_STEP_META.architecture.title,
    summary: `${args.blueprints.length}-week skeleton with one phase per week.`,
    facts,
  }
}

export function buildAdaptStep(args: {
  usedAi: boolean
  tokensIn: number
  tokensOut: number
  sessionCount: number
  qualityCount: number
  raceSpecificCount: number
  longCount: number
  raceDayCount: number
  uniqueQualityIds: string[]
}): CoachEngineDecisionStep {
  const facts = [
    `Sessions placed: ${args.sessionCount} (${args.qualityCount} quality · ${args.longCount} long · ${args.raceDayCount} race-day)`,
    `Race-specific / HM tags: ${args.raceSpecificCount}`,
    `AI adaptation layer: ${args.usedAi ? `used (${args.tokensIn} in / ${args.tokensOut} out)` : 'off — library progression only'}`,
  ]
  if (args.uniqueQualityIds.length) {
    facts.push(
      `Quality samples used: ${args.uniqueQualityIds.slice(0, 12).join(', ')}${
        args.uniqueQualityIds.length > 12 ? '…' : ''
      }`,
    )
  }
  return {
    id: 'adapt',
    title: COACH_ENGINE_STEP_META.adapt.title,
    summary: args.usedAi
      ? 'Library picks refined with multi-call AI where available.'
      : 'Deterministic library progression across weeks.',
    facts,
  }
}

export function buildValidateStep(args: {
  planScore: number
  weekCount: number
  phaseBlockCount: number
  criticSummary: string | null
  criticScore?: number | null
  criticRepairsApplied?: string[]
}): CoachEngineDecisionStep {
  const facts = [
    `Plan score (deterministic): ${args.planScore}/100`,
    `Weeks validated: ${args.weekCount} · phase blocks: ${args.phaseBlockCount}`,
    'Hard rules: ≤2 threshold/week, protect key sessions, easy means easy, structure→duration/distance',
  ]
  if (args.criticScore != null) {
    facts.push(
      `Critic score (advisory only): ${args.criticScore}/100 — does not replace plan score`,
    )
  }
  if (args.criticRepairsApplied?.length) {
    facts.push(
      `Critic repairs applied: ${args.criticRepairsApplied.join(', ')}`,
    )
  }
  if (args.criticSummary) {
    facts.push(`Critic notes: ${args.criticSummary}`)
  }
  return {
    id: 'validate',
    title: COACH_ENGINE_STEP_META.validate.title,
    summary: `Validated draft scored ${args.planScore}/100.`,
    facts,
  }
}

/** Compact markdown for plan description / Why panel. */
export function formatDecisionTraceMarkdown(
  trace: CoachEngineDecisionTrace,
): string {
  const lines = ['## Decision log']
  for (const step of trace.steps) {
    lines.push(`### ${step.title}`)
    lines.push(step.summary)
    for (const fact of step.facts.slice(0, 14)) {
      lines.push(`- ${fact}`)
    }
  }
  return lines.join('\n')
}
