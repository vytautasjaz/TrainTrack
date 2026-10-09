/**
 * Shared coach-engine domain types (V1 + V2).
 * Formulas start as transparent heuristics; schemas evolve per stage docs.
 */
import type { SeasonPhase, SessionType, WorkoutType } from '@prisma/client'

export const ADAPTATION_KEYS = [
  'aerobic_capacity',
  'threshold',
  'aerobic_durability',
  'running_economy',
  'long_run_tolerance',
  'speed',
  'max_strength',
] as const

export type AdaptationKey = (typeof ADAPTATION_KEYS)[number]

export type AdaptationScores = Record<AdaptationKey, number>

/** Extended demand dimensions (V2) — tracked separately to avoid breaking core scores. */
export const EXTENDED_DEMAND_KEYS = [
  'fuel_utilization',
  'msk_durability',
  'race_specific_endurance',
  'compromised_running',
  'strength_endurance',
] as const

export type ExtendedDemandKey = (typeof EXTENDED_DEMAND_KEYS)[number]

export type AthleteLevel = 'beginner' | 'intermediate' | 'advanced' | 'elite'

export type DemandProfileId =
  | 'MARATHON_V1'
  | 'HALF_V1'
  | '5K_V1'
  | 'HYROX_V1'
  | 'MULTI_BASE_V1'

export type MetricSource =
  | 'lab_test'
  | 'field_test'
  | 'athlete_entered'
  | 'estimated_from_history'
  | 'missing'

export type MetricWithConfidence<T = number> = {
  value: T | null
  source: MetricSource
  confidence: number
}

/** Primary planning unit for a training modality. */
export type SportVolumeUnit =
  | 'run_km'
  | 'bike_minutes'
  | 'bike_tss'
  | 'swim_meters'
  | 'strength_stations'
  | 'session_minutes'

export type SportModality = 'run' | 'bike' | 'swim' | 'strength' | 'hyrox'

export type SportArchitectureId =
  | 'run_endurance'
  | 'hyrox'
  | 'multi_sport'

/** One volume channel inside a sport architecture (baseline targets). */
export type SportVolumeChannel = {
  modality: SportModality
  unit: SportVolumeUnit
  label: string
  /** Soft weekly planning target in `unit`. */
  baselineTarget: number
  /** Hard weekly ceiling at present capacity. */
  presentMax: number
  /** Progressive peak ceiling by end of block. */
  peakMax: number
  /** Share of weekly sessions that should emphasize this modality (0–1). */
  sessionShare: number
}

/**
 * Concurrent-training interference between two modalities.
 * Severity drives validate/enforce behavior.
 */
export type SportInterferenceRule = {
  a: SportModality
  b: SportModality
  /** Only fire when at least one side is hard/quality. */
  requireHard: boolean
  /** Max allowed calendar gap (1 = adjacent days). */
  maxDayGap: number
  severity: 'low' | 'medium' | 'high'
  message: string
}

/**
 * Sport-specific planning architecture — volume units, session mix, interference.
 * Attached to each demand profile so blueprint/capacity are not run-km-only.
 */
export type SportArchitecture = {
  id: SportArchitectureId
  primaryModality: SportModality
  primaryUnit: SportVolumeUnit
  channels: SportVolumeChannel[]
  /** Prefer a long-run style key session (run endurance). */
  usesLongRunKey: boolean
  /** Prefer HYROX station / compromised-run key sessions. */
  usesStationVolume: boolean
  /** Prefer swim+bike+run distribution (tri / multi). */
  usesMultiSportMix: boolean
  interferenceRules: SportInterferenceRule[]
}

export type RaceDemandProfile = {
  id: DemandProfileId
  label: string
  sportFocus: WorkoutType
  demands: AdaptationScores
  importance: AdaptationScores
  extended?: Partial<Record<ExtendedDemandKey, number>>
  /** Volume units + interference for this sport family. */
  architecture: SportArchitecture
}

export type CollectedSession = {
  date: string
  type: WorkoutType
  title: string
  status: string
  plannedDistanceKm: number | null
  plannedDurationMin: number | null
  actualDistanceKm: number | null
  actualDurationMin: number | null
  rpe: number | null
  estimatedTss: number | null
}

export type CollectedWeek = {
  weekStart: string
  planned: number
  completed: number
  skipped: number
  plannedDistanceKm: number
  completedDistanceKm: number
  estimatedTss: number
}

export type CollectedAthleteData = {
  athleteId: string
  name: string
  paces: {
    easy: number | null
    tempo: number | null
    threshold: number | null
    vo2: number | null
  }
  bikeFtpWatts: number | null
  swimCssSecPer100m: number | null
  hr: {
    max: number | null
    resting: number | null
  }
  races: {
    name: string
    date: string
    type: string
    sport: string
    priority: string
    goal: string | null
  }[]
  recentSessions: CollectedSession[]
  weekSummaries: CollectedWeek[]
}

export type AthleteState = {
  athleteId: string
  name: string
  trainingLoad: {
    cardiovascular: number
    muscular: number
    mechanical: number
  }
  readiness: {
    score: number
    confidence: number
  }
  recentVolume: {
    runningKmPerWeek: number
    sessionsPerWeek: number
    avgWeeklyTss: number
  }
  performanceTrend: {
    running: 'improving' | 'stable' | 'declining' | 'unknown'
  }
  consistency: number
  level: AthleteLevel
  /** V2 data-quality layer for key metrics. */
  metrics: {
    thresholdPace: MetricWithConfidence
    easyPace: MetricWithConfidence
    weeklyVolumeKm: MetricWithConfidence
    ftpWatts: MetricWithConfidence
  }
  /** Explicit safety intake evaluated before planning (may be absent on legacy paths). */
  safetyIntake?: SafetyIntake
}

/** Injury / medical / RED-S / pregnancy intake — pre-generation gate inputs. */
export type InjurySeverity = 'none' | 'mild' | 'moderate' | 'severe'
export type IllnessStatus = 'none' | 'recovering' | 'active'
export type RedsRisk = 'unknown' | 'low' | 'elevated' | 'high'
export type PregnancyStatus = 'none' | 'pregnant' | 'postpartum'

export type SafetyIntake = {
  injuryLocation: string | null
  injurySeverity: InjurySeverity
  illness: IllnessStatus
  /** Relative Energy Deficiency in Sport / low energy availability. */
  redsRisk: RedsRisk
  energyAvailabilityConcern: boolean
  pregnancyStatus: PregnancyStatus
  pregnancyTrimester: 1 | 2 | 3 | null
  postpartumWeeks: number | null
  /** null = unknown / not asked. */
  medicalClearance: boolean | null
  painEscalating: boolean
  medicationsAffectingHr: boolean
  restingHrAnomaly: boolean
  /** Free-text notes that contributed signals. */
  sourceNotes: string | null
}

export type SafetyGateDecision =
  | 'clear'
  | 'constrain'
  | 'require_review'
  | 'block'

export type SafetyPlanningConstraint =
  | 'no_hard_sessions'
  | 'max_one_hard_session'
  | 'reduce_volume'
  | 'avoid_impact_running'
  | 'prefer_cross_train'
  | 'cap_long_run'
  | 'easy_intensity_only'
  | 'no_max_strength'
  | 'require_medical_followup'

export type SafetyFlag = {
  code: string
  severity: 'info' | 'warn' | 'block'
  message: string
}

/** Result of the explicit safety intake gate (runs before blueprint/dose). */
export type SafetyGateResult = {
  decision: SafetyGateDecision
  intake: SafetyIntake
  flags: SafetyFlag[]
  constraints: SafetyPlanningConstraint[]
  /** Human-readable summary for Why-this-plan / review UI. */
  summary: string
  /** Hard stop — do not generate a plan. */
  blocked: boolean
  blockReason: string | null
}

export type GoalProfile = {
  sport: WorkoutType
  type: 'race' | 'general'
  demandId: DemandProfileId
  race: {
    name: string
    date: string | null
    priority: string
  } | null
  target: {
    type: 'time' | 'none'
    valueLabel: string | null
  }
  weekCount: number
  level: AthleteLevel
  notes: string
  /** Declared training days Mon–Sun count (3–7). */
  daysPerWeek: number
  /** Preferred long-run day (0=Mon … 6=Sun). */
  longRunDay: number
  /**
   * Weekday of the goal race in the final plan week (0=Mon … 6=Sun).
   * Null for non-race / general blocks. Sessions after this day are omitted.
   */
  raceWeekday: number | null
  /** Explicit available weekdays; empty means engine picks spread. */
  availableDays: number[]
  /** Athlete-declared current weekly volume; overrides thin history. */
  currentWeeklyKm: number | null
  /** Target mileage for week 0 of the plan. */
  firstWeekKm: number | null
}

export type CapabilityProfile = {
  capabilities: AdaptationScores
  confidence: number
}

export type GapAnalysis = {
  gaps: AdaptationScores
  rows: {
    key: AdaptationKey
    demand: number
    capability: number
    gap: number
  }[]
}

export type LimitingFactor = {
  adaptation: AdaptationKey
  score: number
  gap: number
  phaseRelevance: number
  trainability: number
}

export type LimitingFactorProfile = {
  factors: LimitingFactor[]
  primary: LimitingFactor
}

export type PriorityProfile = {
  primary: { adaptation: AdaptationKey; score: number }
  secondary: { adaptation: AdaptationKey; score: number }[]
}

/** One week inside the progressive capacity envelope. */
/** Per-modality targets/ceilings for one plan week. */
export type WeeklyModalityVolume = {
  modality: SportModality
  unit: SportVolumeUnit
  target: number
  max: number
}

export type WeeklyCapacityWeek = {
  weekIndex: number
  kind: 'baseline' | 'build' | 'deload' | 'peak' | 'taper' | 'race'
  /** Soft planning target (run km — primary for run_endurance). */
  targetKm: number
  targetTss: number
  /** Hard validation ceiling for the week. */
  maxKm: number
  maxTss: number
  /** Sport-specific channels (bike min, swim m, stations, …). */
  modalityVolumes?: WeeklyModalityVolume[]
}

/**
 * Separates present capacity from future progressive capacity.
 * Validation should use weeks[i].maxKm — not a flat maxWeeklyKm for every week.
 */
export type WeeklyCapacityEnvelope = {
  baselineKm: number
  baselineTss: number
  maxPeakKm: number
  maxPeakTss: number
  safeProgressionRatio: number
  deloadRatio: number
  weekCount: number
  weeks: WeeklyCapacityWeek[]
}

export type CapacityProfile = {
  weeklyCapacity: {
    overall: number
    cardiovascular: number
    mechanical: number
  }
  remainingCapacity: {
    overall: number
    mechanical: number
  }
  /**
   * Present / next-week capacity (current training).
   * Do not use as a plan-wide flat ceiling — use `envelope` instead.
   */
  maxWeeklyKm: number
  maxWeeklyTss: number
  maxSessionsPerWeek: number
  maxHardSessionsPerWeek: number
  /** Week-by-week allowable volume / TSS envelope. */
  envelope: WeeklyCapacityEnvelope
  /** Which sport architecture drove capacity / volume units. */
  architectureId: SportArchitectureId
  /** Present + peak ceilings per modality (non-run sports). */
  modalityCaps: WeeklyModalityVolume[]
}

export type PhaseProfile = {
  phase: SeasonPhase
  phaseGoal: string
  weeksToRace: number | null
  weekObjectives: string[]
  /** Deload / taper flags from dose engine. */
  isDeload?: boolean
  isTaper?: boolean
  volumeScale?: number
}

export type TrainingModelId =
  | 'PYRAMIDAL'
  | 'POLARIZED'
  | 'THRESHOLD'
  | 'RACE_SPECIFIC'
  | 'BLOCK'
  | 'HYBRID'
  | 'NORWEGIAN'

export type MethodologyConstraint =
  | 'protect_key_quality_session'
  | 'limit_moderate_intensity_accumulation'
  | 'prefer_high_intensity_sparingly'
  | 'allow_controlled_threshold_density'
  | 'increase_race_specificity'
  | 'require_lactate_or_proxy'
  | 'no_double_threshold'
  /** Norwegian: allow AM+PM controlled threshold on one calendar day. */
  | 'allow_double_threshold_day'

export type MethodologySelection = {
  selectedModel: TrainingModelId
  confidence: number
  alternatives: { model: TrainingModelId; score: number }[]
  reasonCodes: string[]
  constraints: MethodologyConstraint[]
  norwegianEligible: boolean
}

export type DoseProfile = {
  medTss: number
  optTss: number
  mrdTss: number
  targetWeeklyTss: number
  targetWeeklyKm: number
  volumeScaleByWeek: number[]
  deloadWeekIndexes: number[]
  taperWeekIndexes: number[]
}

export type TrainingBudget = {
  availableMinutesPerWeek: number
  maxHardMinutesPerWeek: number
  recoveryDaysRequired: number
}

export type StressDimensions = {
  cardiovascular: number
  mechanical: number
  muscular: number
  neuromuscular: number
}

export type ReadinessDecision = 'keep' | 'reduce' | 'easy' | 'cancel'

export type SlotStimulus =
  | 'easy'
  | 'quality'
  | 'long'
  | 'strength'
  | 'recovery'
  | 'rest'
  | 'race'
  | 'bike'
  | 'swim'

export type WeeklySlot = {
  dayOfWeek: number
  stimulus: SlotStimulus
  primaryAdaptation: AdaptationKey | null
  availableMinutes: number
  hard: boolean
  isKeySession?: boolean
  /** Prefer race-pace / HM-specific library samples for this slot. */
  preferRaceSpecific?: boolean
  /**
   * Norwegian double-threshold day: two controlled threshold sessions
   * (AM longer reps + PM shorter reps), then mandatory recovery next day.
   */
  doubleThreshold?: boolean
  /** Training modality for multi-sport / HYROX scheduling. */
  modality?: SportModality
}

export type WeeklyArchitecture = {
  slots: WeeklySlot[]
  phase: PhaseProfile
  model?: TrainingModelId
}

export type CandidateWorkout = {
  id: string
  primaryAdaptation: AdaptationKey
  sport: WorkoutType
  sessionType: SessionType
  title: string
  description: string
  durationMin: number
  distanceKm: number | null
  cardiovascularLoad: 'low' | 'medium' | 'high'
  muscularLoad: 'low' | 'medium' | 'high'
  mechanicalLoad: 'low' | 'medium' | 'high'
  difficulty: 'easy' | 'medium' | 'medium_high' | 'hard'
  tags: string[]
  intervalCount: number | null
  intervalDurationMin: number | null
  recoveryMin: number | null
  /**
   * Soft methodology / family tags (not limited to TrainingModelId —
   * library seeds also use EASY, AEROBIC, TEMPO, etc.).
   */
  methodologyTags?: string[]
  progressionFrom?: string[]
  progressionTo?: string[]
  family?: 'easy' | 'quality' | 'long' | 'strength' | 'race' | 'rest'
  /** Shared workout-builder structure (same shape as Workout.structure). */
  structure?: import('@/lib/workout-builder/types').WorkoutStructure | null
  swimStructure?: import('@/lib/swim-workout/types').SwimWorkoutStructure | null
}

export type WorkoutAdaptations = {
  intervalCount: number | null
  intervalDurationMin: number | null
  recoveryMin: number | null
  durationMin: number | null
  distanceKm: number | null
}

export type WorkoutProposal = {
  selectedWorkoutId: string
  adaptations: WorkoutAdaptations
  reason: string
}

export type ValidationError = {
  type: string
  message: string
}

export type ValidationResult =
  | { valid: true; score?: number }
  | { valid: false; errors: ValidationError[]; score?: number }

export type PlannedSession = {
  weekIndex: number
  dayOfWeek: number
  type: WorkoutType
  sessionType: SessionType
  title: string
  description: string | null
  plannedDistance: number | null
  plannedDuration: number | null
  coachNotes: string | null
  tags: string[]
  candidateId: string
  primaryAdaptation: AdaptationKey | null
  estimatedTss: number
  isKeySession?: boolean
  structure?: import('@/lib/workout-builder/types').WorkoutStructure | null
  swimStructure?: import('@/lib/swim-workout/types').SwimWorkoutStructure | null
}

export type CoachEngineMeta = {
  methodology: MethodologySelection
  limitingFactors: LimitingFactorProfile
  dose: DoseProfile
  /** Deterministic validation score only — never blended with AI critic opinion. */
  planScore: number
  focusSummary: string
  /** Pre-generation safety intake gate result. */
  safetyGate?: SafetyGateResult
  /** True when safety constraints require human review before trusting the draft. */
  requiresReview?: boolean
  /** AI critic summary — advisory feedback, not an authority over planScore. */
  criticSummary?: string | null
  /** AI critic's own score (advisory). Null when critic did not run. */
  criticScore?: number | null
  /** Critic issue codes that were applied as deterministic repairs. */
  criticRepairsApplied?: string[]
}

export type CoachEngineDraftInput = {
  /**
   * Real athlete id, or null/undefined for a general library plan built from
   * brief-entered (imaginary) athlete data only.
   */
  athleteId?: string | null
  skillSlug: string
  brief: Record<string, unknown>
  allowAi?: boolean
  /** Coach override: force a training model when set. */
  lockedModel?: TrainingModelId | null
}

/** Persisted snapshot for reproducibility / audit of a generated plan. */
export type CoachEngineAuditRecord = {
  schemaVersion: 1
  createdAt: string
  engineVersion: string
  libraryVersion: string
  skillSlug: string
  athleteId: string
  usedAi: boolean
  lockedModel: TrainingModelId | null
  inputs: {
    brief: Record<string, unknown>
    goal: {
      demandId: DemandProfileId
      sport: WorkoutType
      weekCount: number
      level: AthleteLevel
      daysPerWeek: number
      longRunDay: number
      raceWeekday: number | null
      availableDays: number[]
      currentWeeklyKm: number | null
      firstWeekKm: number | null
      raceDate: string | null
      raceName: string | null
      target: string | null
    }
    history: {
      weekSummaryCount: number
      recentSessionCount: number
      hasThresholdPace: boolean
      hasEasyPace: boolean
      raceCount: number
    }
    capabilityConfidence: number
  }
  constraints: {
    safety: string[]
    methodology: MethodologyConstraint[]
    safetyDecision: SafetyGateDecision
    requiresReview: boolean
    selectedModel: TrainingModelId
    methodologyConfidence: number
  }
  validation: {
    planScore: number
    weeks: {
      weekIndex: number
      ok: boolean
      score: number
      errorTypes: string[]
      errorMessages: string[]
    }[]
    criticScore: number | null
    criticRepairsApplied: string[]
  }
}

export type CoachEngineDraftResult = {
  draft: import('@/lib/ai/skills/types').PlanDraftWithStructure
  tokensIn: number | null
  tokensOut: number | null
  usedAi: boolean
  priority: PriorityProfile
  capacity: CapacityProfile
  guidelines: string
  meta: CoachEngineMeta
  decisionTrace: import('@/lib/coach-engine/decision-trace').CoachEngineDecisionTrace
  /** Inputs, versions, constraints, and validation for audit / replay. */
  audit: CoachEngineAuditRecord
}

export type ExpectedResponse = {
  expectedRpe: number
  expectedCompletion: number
  expectedTss: number
  adaptationTarget: AdaptationKey | null
}

export type ActualResponse = {
  actualRpe: number | null
  completion: number
  actualTss: number | null
  feltHarder: boolean
  missed: boolean
}

export type ResponseComparison = {
  rpeDelta: number | null
  completionGap: number
  interpretation: 'on_track' | 'underperformed' | 'overperformed' | 'missed'
  recommendedAction: 'keep' | 'reduce_next_hard' | 'do_not_reschedule' | 'replan_week'
}
