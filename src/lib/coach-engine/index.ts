export type * from '@/lib/coach-engine/types'
export {
  collectAthleteData,
  emptyCollectedAthleteData,
  estimateRoughSessionTss,
} from '@/lib/coach-engine/collect'
export { buildAthleteState, parseAthleteLevel } from '@/lib/coach-engine/state'
export { resolveGoalProfile } from '@/lib/coach-engine/goal'
export {
  getDemandProfile,
  demandIdForSkillSlug,
  RACE_DEMAND_PROFILES,
} from '@/lib/coach-engine/demand'
export {
  resolveSportArchitecture,
  sportArchitectureIdForDemand,
  findSportInterferenceErrors,
  modalityOfSession,
  scaleArchitectureChannels,
} from '@/lib/coach-engine/sport-architecture'
export {
  calculateCapabilities,
  calculateGaps,
  deriveCapabilityOutcomeSignals,
} from '@/lib/coach-engine/capability'
export type { CapabilityOutcomeSignals } from '@/lib/coach-engine/capability'
export { buildCoachEngineAudit } from '@/lib/coach-engine/audit'
export type { WeekValidationAudit } from '@/lib/coach-engine/audit'
export {
  COACH_ENGINE_VERSION,
  COACH_ENGINE_LIBRARY_VERSION,
} from '@/lib/coach-engine/versions'
export { calculateLimitingFactors } from '@/lib/coach-engine/limiting-factors'
export { selectPriorities } from '@/lib/coach-engine/priority'
export {
  calculateCapacity,
  buildWeeklyCapacityEnvelope,
  capacityCeilingForWeek,
  refreshCapacityEnvelope,
  progressivePeakMultiplier,
  stubCapacityEnvelope,
  stubCapacityProfile,
} from '@/lib/coach-engine/capacity'
export {
  buildPhaseProfile,
  buildPlanPhases,
} from '@/lib/coach-engine/periodization'
export {
  buildWeekBlueprints,
  buildPlanPhasesFromBlueprints,
  blueprintToPhaseProfile,
  assignWeekPhases,
  raceDayTargets,
} from '@/lib/coach-engine/blueprint'
export type { WeekBlueprint } from '@/lib/coach-engine/blueprint'
export {
  assessMarathonFeasibility,
  calculateLongRunTarget,
  getLongRunRangeKm,
  getMarathonLongRunProfile,
  getMarathonPreparationStandard,
  isHighLevelEnduranceGoal,
  marathonSpecificMpKmInLong,
  maxLongRunWeeklyRatio,
  validateMarathonLongRunDurability,
} from '@/lib/coach-engine/long-run-target'
export {
  adaptationShare,
  qualityShapeForSlot,
  qualityShapeMatchers,
  resolveEnduranceIntensityBudget,
} from '@/lib/coach-engine/intensity-ramp'
export type {
  IntensityBand,
  QualityShape,
  WeekIntensityBudget,
} from '@/lib/coach-engine/intensity-ramp'
export {
  classifyMarathonReadiness,
  describeRoadmap,
  determinePreparationPathway,
  planCapabilityForWeekCount,
  resolveRoadmapBand,
} from '@/lib/coach-engine/preparation-roadmap'
export type {
  AthleteReadinessTier,
  PreparationDepth,
  PreparationPathway,
} from '@/lib/coach-engine/preparation-roadmap'
export type {
  LongIntensityProfile,
  LongRunTarget,
  MarathonFeasibility,
  MarathonLongRunProfile,
  MarathonLongRunValidation,
  MarathonPreparationStandard,
} from '@/lib/coach-engine/long-run-target'
export { selectMethodology, evaluateNorwegianEligibility } from '@/lib/coach-engine/methodology'
export {
  calculateDoseProfile,
  calculateTrainingBudget,
  applyDoseToPhase,
} from '@/lib/coach-engine/dose'
export {
  DELOAD_VOLUME_RATIO,
  DELOAD_VOLUME_RATIO_MIN,
} from '@/lib/coach-engine/deload'
export {
  buildWeeklyArchitecture,
  resolveTargetSessionCount,
  longRunIsHighLoad,
  applyNorwegianDoubleThreshold,
} from '@/lib/coach-engine/weekly'
export {
  classifyCandidateLoad,
  classifyPlannedSessionLoad,
  summarizeWeekLoad,
  weeklyStressBudget,
  type SessionLoadClass,
} from '@/lib/coach-engine/session-load'
export {
  findCandidatesForSlot,
  pickDeterministicCandidate,
  listWorkoutLibrary,
  getWorkoutById,
  estimateCandidateTss,
} from '@/lib/coach-engine/library'
export {
  findCandidatesForSlotV2,
  pickDeterministicCandidateV2,
  pickProgressiveCandidateV2,
  buildProgressiveAdaptations,
  isClimbingIntervalLadder,
  canProgressTo,
  progressionTargets,
  progressionFamilyKey,
  seedLibraryCatalog,
  PROGRESSION_GRAPH,
} from '@/lib/coach-engine/library-v2'
export {
  validateWorkoutProposal,
  validateWeeklyPlan,
  proposalToSession,
  applyAdaptations,
} from '@/lib/coach-engine/validate'
export {
  validateWeekComprehensive,
  scorePlan,
  PLAN_SCORE_TARGET,
  PLAN_SCORE_IMPROVE_TARGET,
  PLAN_SCORE_REVIEW_BELOW,
  PLAN_SCORE_HARD_FLOOR,
  improvePlanScoreOnce,
} from '@/lib/coach-engine/plan-score'
export {
  enforceWeekValidity,
  CoachEngineValidationError,
  formatValidationErrors,
} from '@/lib/coach-engine/enforce-week'
export {
  decideReadinessAction,
  findInterferenceErrors,
  findKeySessionProtectionErrors,
} from '@/lib/coach-engine/safety'
export {
  evaluateSafetyIntake,
  parseSafetyIntake,
  inferSafetyFromNotes,
  applySafetyConstraintsToCapacity,
  applySafetyConstraintsToDose,
  CoachEngineSafetyError,
  SAFETY_BRIEF_FIELDS,
} from '@/lib/coach-engine/safety-intake'
export {
  expectedResponseForSession,
  compareResponse,
  updateCapabilitiesFromResponses,
  applyAdaptationDecay,
  missedWorkoutAction,
} from '@/lib/coach-engine/learning'
export {
  replanAfterMissedSession,
  replanFromResponse,
  methodologyExperimentPlan,
} from '@/lib/coach-engine/replan'
export {
  adaptExistingTrainingPlan,
  applyCalendarReplanAfterLog,
} from '@/lib/coach-engine/adapt-existing-plan'
export {
  runCoachEngineDraft,
  buildDraftFromCollected,
  formatWhyThisPlan,
  MAX_AI_RETRIES,
} from '@/lib/coach-engine/pipeline'
export {
  refineBlueprintWithAi,
  materializeWeekWithAi,
  critiquePlanWithAi,
  explainPlanWithAi,
  applyCriticSafeRepairs,
  resolveCriticRepairCode,
  CRITIC_REPAIRABLE_CODES,
} from '@/lib/coach-engine/ai-multi'
export type { CriticAiResult, CriticRepairResult } from '@/lib/coach-engine/ai-multi'
export {
  COACH_ENGINE_STEP_META,
  formatDecisionTraceMarkdown,
} from '@/lib/coach-engine/decision-trace'
export type {
  CoachEngineDecisionTrace,
  CoachEngineDecisionStep,
  CoachEngineDecisionStepId,
} from '@/lib/coach-engine/decision-trace'
export {
  enforceWeekVolumeCap,
  clampThresholdAdaptations,
  estimateThresholdWorkMin,
  isUnsafeVolumeJump,
} from '@/lib/coach-engine/volume-guards'
