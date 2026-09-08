/** Client-safe notification preference helpers (no server imports). */

export const DEFAULT_COMPLIANCE_ALERT_BELOW_PCT = 50
export const MIN_COMPLIANCE_ALERT_BELOW_PCT = 1
export const MAX_COMPLIANCE_ALERT_BELOW_PCT = 100

export const DEFAULT_UNDER_PLANNED_ALERT_BELOW_DAYS = 3
export const MIN_UNDER_PLANNED_ALERT_BELOW_DAYS = 1
export const MAX_UNDER_PLANNED_ALERT_BELOW_DAYS = 30

export type NotificationPrefs = {
  messages?: boolean
  workoutAsks?: boolean
  workoutFeedback?: boolean
  raceThreads?: boolean
  mentions?: boolean
  /** Coach: Needs attention when last week’s plan was under-completed. */
  complianceAlerts?: boolean
  /** Alert when last-week compliance is strictly below this percent. */
  complianceAlertBelowPct?: number
  /** Coach: Needs attention when athlete has little plan ahead. */
  underPlannedAlerts?: boolean
  /** Alert when planned coverage ahead is strictly below this many days. */
  underPlannedAlertBelowDays?: number
}

export function clampComplianceAlertBelowPct(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return DEFAULT_COMPLIANCE_ALERT_BELOW_PCT
  return Math.min(
    MAX_COMPLIANCE_ALERT_BELOW_PCT,
    Math.max(MIN_COMPLIANCE_ALERT_BELOW_PCT, Math.round(n)),
  )
}

export function clampUnderPlannedAlertBelowDays(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return DEFAULT_UNDER_PLANNED_ALERT_BELOW_DAYS
  return Math.min(
    MAX_UNDER_PLANNED_ALERT_BELOW_DAYS,
    Math.max(MIN_UNDER_PLANNED_ALERT_BELOW_DAYS, Math.floor(n)),
  )
}

export function normalizeNotificationPrefs(raw: unknown): Required<
  Pick<
    NotificationPrefs,
    | 'messages'
    | 'workoutAsks'
    | 'workoutFeedback'
    | 'raceThreads'
    | 'complianceAlerts'
    | 'complianceAlertBelowPct'
    | 'underPlannedAlerts'
    | 'underPlannedAlertBelowDays'
  >
> {
  const prefs =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as NotificationPrefs)
      : null
  return {
    messages: prefs?.messages !== false,
    workoutAsks: prefs?.workoutAsks !== false,
    workoutFeedback: prefs?.workoutFeedback !== false,
    raceThreads: prefs?.raceThreads !== false,
    complianceAlerts: prefs?.complianceAlerts !== false,
    complianceAlertBelowPct: clampComplianceAlertBelowPct(
      prefs?.complianceAlertBelowPct ?? DEFAULT_COMPLIANCE_ALERT_BELOW_PCT,
    ),
    underPlannedAlerts: prefs?.underPlannedAlerts !== false,
    underPlannedAlertBelowDays: clampUnderPlannedAlertBelowDays(
      prefs?.underPlannedAlertBelowDays ?? DEFAULT_UNDER_PLANNED_ALERT_BELOW_DAYS,
    ),
  }
}
