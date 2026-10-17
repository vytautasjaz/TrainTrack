export type {
  AerobicProfile,
  AthleteFingerprint,
  AthletePhysiologyModel,
  DurabilityProfile,
  FatigueProfile,
  IntensityProfile,
  MetricEnvelope,
  MetricTrend,
  PhysiologyAuditSnapshot,
  RecoveryProfile,
  ResponseIntervention,
  ResponsePrediction,
  ThresholdProfile,
  ToleranceRange,
} from './types'

export { buildAthletePhysiologyModel } from './build-apm'
export { buildAthleteFingerprint } from './fingerprint'
export { predictResponse } from './predict'
export {
  applyPhysiologyToCapacity,
  applyPhysiologyToPriorities,
  buildPhysiologyAuditSnapshot,
  formatPhysiologySummary,
  norwegianBlockedByPhysiology,
  physiologyInfluencesNorwegian,
} from './apply'
export {
  applyPriorValuesToModel,
  mergeFingerprintWithPrior,
} from './merge'
export {
  getLatestPhysiologySnapshot,
  hasPhysiologySnapshotToday,
  listPhysiologySnapshots,
  savePhysiologySnapshot,
  savePhysiologySnapshotThrottled,
} from './store'
export type {
  PhysiologySnapshotSource,
  StoredPhysiologySnapshot,
} from './store'
export {
  adaptationKeyFromSessionType,
  recordPhysiologyLearningPhase,
  recordPhysiologyLearningWeek,
} from './learn'
export {
  aggregateStreamFeatures,
  extractSessionStreamFeatures,
} from './stream-features'
export type {
  AggregatedStreamFeatures,
  SessionStreamFeatures,
} from './stream-features'
export { getPhysiologyDashboard } from './dashboard'
export type {
  PhysiologyDashboardVm,
  PhysiologyMetricCardVm,
  PhysiologyMetricGroupId,
  PhysiologyTrendPoint,
  PhysiologyTrendSeriesVm,
} from './dashboard'
