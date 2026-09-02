import {
  CoachingAuthorRole,
  RaceOutcome,
  RacePriority,
  RaceType,
  WorkoutType,
  type AthleteStatus,
} from '@prisma/client'
import {
  addDateOnlyDays,
  formatDateKeyCompact,
  parseDateOnly,
  startOfWeekDateOnly,
  todayDateKey,
  todayDateOnly,
  toDateKey,
} from '@/lib/dates'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import type { CoachingThreadView } from '@/components/inbox/coaching-thread-panel'
import {
  type CoachHomeActivityFeedItem,
  type CoachHomeNeedsReplyThread,
  type CoachRosterRow,
} from '@/lib/coach-roster'
import {
  COMPLETION_SOURCE_LABELS,
  type WorkoutCompletionSource,
} from '@/lib/workout-history'
import { daysUntil, formatDistance, formatDuration } from '@/lib/utils'
import { formatPaceMinPerKm } from '@/lib/athlete-preferences'
import { formatSwimDistance } from '@/lib/swim-workout/format'
import { parseWorkoutFeeling } from '@/lib/workout-feeling'
import type { RaceLegView } from '@/lib/race-legs'
import { RACE_OUTCOME_LABELS } from '@/lib/constants'

export type CoachHomeAttentionKind =
  | 'message'
  | 'join_request'
  | 'under_planned'
  | 'missed_session'
  | 'low_compliance'

export type CoachHomeAttentionItem = {
  id: string
  kind: CoachHomeAttentionKind
  athleteId: string
  athleteName: string
  avatarUrl: string | null
  categoryLabel: string
  description: string
  contextLine: string | null
  workoutTitle: string | null
  workoutDateKey: string | null
  workoutType: WorkoutType | null
  statusLabel: string
  occurredAt: string
  actionLabel: string
  actionHref: string
  action: CoachHomeAttentionAction
}

export type CoachHomeAttentionAction =
  | { type: 'reply'; thread: CoachingThreadView; headline: string }
  | { type: 'join_request'; linkId: string }
  | { type: 'open_plan'; lastPlannedKey: string | null }
  | { type: 'review_athlete' }
  | { type: 'missed_session'; workoutId: string }

export type CoachHomePlanningCoverageRow = {
  athleteId: string
  athleteName: string
  avatarUrl: string | null
  status: AthleteStatus
  lastPlannedKey: string | null
  daysAhead: number | null
  daysUnplanned: number
}

export type CoachHomePlanAheadTone = 'critical' | 'warning' | 'ok'

export type CoachHomeActivityMetric = {
  label: string
  value: string
  unit?: string | null
}

export type CoachHomeRaceFeedData = {
  raceId: string
  name: string
  raceDateKey: string
  location: string | null
  raceType: RaceType
  priority: RacePriority
  outcome: RaceOutcome | null
  resultTime: string | null
  resultPlace: string | null
  resultNotes: string | null
  stravaActivityUrl: string | null
  stravaActivityName: string | null
  legs: RaceLegView[]
  hasReport: boolean
}

export type CoachHomeWorkoutActivityRow = {
  entryKind: 'workout'
  id: string
  activityAt: string
  dateKey: string
  athleteId: string
  athleteName: string
  avatarUrl: string | null
  activityType: WorkoutType
  activityTitle: string
  details: string
  sourceLabel: string
  status: 'completed' | 'skipped'
  hasFeedback: boolean
  feedbackFeeling: number | null
  feedbackNotes: string | null
  feedbackReply: string | null
  stravaActivityUrl: string | null
  plannedSummary: string | null
  actualSummary: string | null
  metricChips: Array<{ label: string; value: string }>
  primaryMetrics: CoachHomeActivityMetric[]
  secondaryMetrics: CoachHomeActivityMetric[]
  completionRatio: number | null
  asPlanned: boolean
  workout: PlanWorkoutDetail
}

export type CoachHomeRaceActivityRow = {
  entryKind: 'race'
  id: string
  activityAt: string
  dateKey: string
  athleteId: string
  athleteName: string
  avatarUrl: string | null
  activityType: WorkoutType
  activityTitle: string
  racePhase: 'upcoming' | 'race_day' | 'report'
  race: CoachHomeRaceFeedData
}

export type CoachHomeActivityTableRow =
  | CoachHomeWorkoutActivityRow
  | CoachHomeRaceActivityRow

export function isCoachHomeWorkoutActivityRow(
  row: CoachHomeActivityTableRow,
): row is CoachHomeWorkoutActivityRow {
  return row.entryKind === 'workout'
}

export function isCoachHomeRaceActivityRow(
  row: CoachHomeActivityTableRow,
): row is CoachHomeRaceActivityRow {
  return row.entryKind === 'race'
}

export type CoachHomeRaceFeedSource = {
  id: string
  name: string
  date: Date
  location: string | null
  type: RaceType
  sport: WorkoutType
  priority: RacePriority
  outcome: RaceOutcome | null
  resultTime: string | null
  resultPlace: string | null
  resultNotes: string | null
  resultLoggedAt: Date | null
  stravaActivityUrl: string | null
  stravaActivityName: string | null
  legs: RaceLegView[]
  athlete: { id: string; name: string; avatarUrl: string | null }
}

const RACE_REPORT_OUTCOMES: RaceOutcome[] = [
  RaceOutcome.FINISHED,
  RaceOutcome.DID_NOT_START,
  RaceOutcome.DNF,
]

function threadCategoryLabel(threadKind: string): string {
  if (threadKind === 'GENERAL') return 'Message'
  if (threadKind === 'ASK') return 'Message'
  if (threadKind === 'FEEDBACK') return 'Feedback'
  if (threadKind === 'RACE_REPORT') return 'Race report'
  return 'Message'
}

const ATTENTION_KIND_PRIORITY: Record<CoachHomeAttentionKind, number> = {
  join_request: 0,
  message: 1,
  missed_session: 2,
  under_planned: 3,
  low_compliance: 4,
}

function isWorkoutAttentionContext(
  title: string | null,
  dateKey: string | null,
  threadKind: string,
): boolean {
  if (!title?.trim() || !dateKey) return false
  if (threadKind === 'GENERAL') return false
  if (threadKind === 'RACE_REPORT') return false
  if (title === 'Ask coach' || title === 'General chat') return false
  return true
}

function attentionThreadHeadline(thread: CoachHomeNeedsReplyThread): string {
  if (thread.threadKind === 'GENERAL') return 'General chat'
  const title = thread.contextTitle ?? 'Conversation'
  if (thread.contextDateKey) {
    return `${formatDateKeyCompact(thread.contextDateKey)} · ${title}`
  }
  return title
}

/** Coach home alerts (attention, plan coverage counts) only for actively coached athletes. */
export function coachHomeAlertsAthleteStatus(status: AthleteStatus): boolean {
  return status === 'ACTIVE'
}

export function buildCoachHomeAttentionItems(input: {
  joinRequests: Array<{
    id: string
    athlete: { id: string; name: string }
    createdAt: Date
  }>
  needsReplyThreads: CoachHomeNeedsReplyThread[]
  planningWarnings: Array<{
    athleteId: string
    athleteName: string
    avatarUrl: string | null
    lastPlannedKey: string | null
  }>
  rosterRows: CoachRosterRow[]
}): CoachHomeAttentionItem[] {
  const items: CoachHomeAttentionItem[] = []
  const statusByAthleteId = new Map(input.rosterRows.map((row) => [row.id, row.status]))

  for (const link of input.joinRequests) {
    items.push({
      id: `join-${link.id}`,
      kind: 'join_request',
      athleteId: link.athlete.id,
      athleteName: link.athlete.name,
      avatarUrl: null,
      categoryLabel: 'Join request',
      description: `${link.athlete.name} wants to connect`,
      contextLine: null,
      workoutTitle: null,
      workoutDateKey: null,
      workoutType: null,
      statusLabel: 'Pending approval',
      occurredAt: link.createdAt.toISOString(),
      actionLabel: 'Review',
      actionHref: '/athletes',
      action: { type: 'join_request', linkId: link.id },
    })
  }

  for (const thread of input.needsReplyThreads) {
    if (!coachHomeAlertsAthleteStatus(statusByAthleteId.get(thread.athleteId) ?? 'INACTIVE')) {
      continue
    }
    const hasWorkout = isWorkoutAttentionContext(
      thread.contextTitle,
      thread.contextDateKey,
      thread.threadKind,
    )
    const context =
      !hasWorkout && thread.contextTitle
        ? thread.contextDateKey
          ? `${formatDateKeyCompact(thread.contextDateKey)} · ${thread.contextTitle}`
          : thread.contextTitle
        : null
    items.push({
      id: `reply-${thread.id}`,
      kind: 'message',
      athleteId: thread.athleteId,
      athleteName: thread.athleteName,
      avatarUrl: thread.avatarUrl,
      categoryLabel: threadCategoryLabel(thread.threadKind),
      description: thread.preview,
      contextLine: context,
      workoutTitle: hasWorkout ? thread.contextTitle : null,
      workoutDateKey: hasWorkout ? thread.contextDateKey : null,
      workoutType: hasWorkout ? (thread.workoutType ?? null) : null,
      statusLabel: 'Unread message',
      occurredAt: thread.lastMessageAt,
      actionLabel: 'Reply',
      actionHref: `/inbox?thread=${thread.id}`,
      action: {
        type: 'reply',
        thread: thread.thread,
        headline: attentionThreadHeadline(thread),
      },
    })
  }

  for (const warning of input.planningWarnings) {
    if (!coachHomeAlertsAthleteStatus(statusByAthleteId.get(warning.athleteId) ?? 'INACTIVE')) {
      continue
    }
    items.push({
      id: `plan-${warning.athleteId}`,
      kind: 'under_planned',
      athleteId: warning.athleteId,
      athleteName: warning.athleteName,
      avatarUrl: warning.avatarUrl,
      categoryLabel: 'Planning',
      description: 'Needs more days planned ahead',
      contextLine: warning.lastPlannedKey
        ? `Last planned ${formatDateKeyCompact(warning.lastPlannedKey)}`
        : 'No upcoming plan',
      workoutTitle: null,
      workoutDateKey: null,
      workoutType: null,
      statusLabel: 'Under-planned',
      occurredAt: new Date().toISOString(),
      actionLabel: 'Review athlete',
      actionHref: `/athletes/${warning.athleteId}`,
      action: { type: 'open_plan', lastPlannedKey: warning.lastPlannedKey },
    })
  }

  for (const row of input.rosterRows) {
    if (row.status !== 'ACTIVE') continue
    if (row.planned <= 0 || row.compliance >= 50) continue
    if (items.some((item) => item.athleteId === row.id && item.kind === 'low_compliance')) {
      continue
    }
    items.push({
      id: `compliance-${row.id}`,
      kind: 'low_compliance',
      athleteId: row.id,
      athleteName: row.name,
      avatarUrl: null,
      categoryLabel: 'Compliance',
      description: `${row.completed}/${row.planned} sessions completed this week`,
      contextLine: 'This week',
      workoutTitle: null,
      workoutDateKey: null,
      workoutType: null,
      statusLabel: 'At risk',
      occurredAt: new Date().toISOString(),
      actionLabel: 'Review athlete',
      actionHref: `/athletes/${row.id}`,
      action: { type: 'review_athlete' },
    })
  }

  items.sort((a, b) => {
    const kindDelta = ATTENTION_KIND_PRIORITY[a.kind] - ATTENTION_KIND_PRIORITY[b.kind]
    if (kindDelta !== 0) return kindDelta
    return new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  })

  return items
}

export type CoachAttentionDismissalRow = {
  itemKey: string
  contextAt: string
  dismissedAt: Date
}

export function coachHomeAttentionContextAt(item: CoachHomeAttentionItem): string {
  switch (item.kind) {
    case 'message':
      return item.occurredAt
    case 'under_planned':
      return item.action.type === 'open_plan' ? (item.action.lastPlannedKey ?? '') : ''
    case 'low_compliance':
      return toDateKey(startOfWeekDateOnly(todayDateOnly()))
    default:
      return item.occurredAt
  }
}

function isCoachHomeAttentionDismissed(
  item: CoachHomeAttentionItem,
  dismissal: CoachAttentionDismissalRow,
): boolean {
  switch (item.kind) {
    case 'message':
      return (
        new Date(item.occurredAt).getTime() <= new Date(dismissal.contextAt).getTime()
      )
    case 'under_planned': {
      const currentKey =
        item.action.type === 'open_plan' ? (item.action.lastPlannedKey ?? '') : ''
      return currentKey === dismissal.contextAt
    }
    case 'low_compliance':
      return dismissal.contextAt === toDateKey(startOfWeekDateOnly(todayDateOnly()))
    case 'missed_session':
    case 'join_request':
      return true
    default:
      return true
  }
}

export function filterDismissedCoachHomeAttentionItems(
  items: CoachHomeAttentionItem[],
  dismissals: CoachAttentionDismissalRow[],
): CoachHomeAttentionItem[] {
  const byKey = new Map(dismissals.map((d) => [d.itemKey, d]))
  return items.filter((item) => {
    const dismissal = byKey.get(item.id)
    if (!dismissal) return true
    return !isCoachHomeAttentionDismissed(item, dismissal)
  })
}

export function formatCoachHomePlanAhead(daysAhead: number | null): string {
  if (daysAhead == null) return 'Nothing planned'
  if (daysAhead <= 0) return 'Today'
  if (daysAhead === 1) return '1 day'
  return `${daysAhead} days`
}

export function coachHomePlanAheadTone(
  daysAhead: number | null,
): CoachHomePlanAheadTone {
  if (daysAhead == null) return 'critical'
  if (daysAhead <= 3) return 'warning'
  return 'ok'
}

export function formatCoachHomeDaysUnplanned(daysUnplanned: number): string {
  if (daysUnplanned <= 0) return '—'
  if (daysUnplanned === 1) return '1 day'
  return `${daysUnplanned} days`
}

function computeDaysUnplanned(
  lastPlannedKey: string | null,
  planningLeadDays: number,
): number {
  const horizon = addDateOnlyDays(todayDateOnly(), planningLeadDays)
  if (!lastPlannedKey) return planningLeadDays
  const lastPlanned = parseDateOnly(lastPlannedKey)
  if (lastPlanned >= horizon) return 0
  return Math.ceil(
    (horizon.getTime() - lastPlanned.getTime()) / (1000 * 60 * 60 * 24),
  )
}

export function buildCoachHomePlanningCoverageRows(input: {
  rosterRows: CoachRosterRow[]
  planningLeadDays: number
}): CoachHomePlanningCoverageRow[] {
  const rows = input.rosterRows
    .filter((row) => coachHomeAlertsAthleteStatus(row.status))
    .map((row) => {
      const lastPlannedKey = row.lastPlannedKey
      const daysAhead = lastPlannedKey
        ? daysUntil(parseDateOnly(lastPlannedKey))
        : null
      const daysUnplanned = computeDaysUnplanned(
        lastPlannedKey,
        input.planningLeadDays,
      )

      return {
        athleteId: row.id,
        athleteName: row.name,
        avatarUrl: null,
        status: row.status,
        lastPlannedKey,
        daysAhead,
        daysUnplanned,
      }
    })
    .sort((a, b) => {
      if (a.lastPlannedKey === null && b.lastPlannedKey !== null) return -1
      if (a.lastPlannedKey !== null && b.lastPlannedKey === null) return 1
      if (!a.lastPlannedKey || !b.lastPlannedKey) {
        return a.athleteName.localeCompare(b.athleteName)
      }
      const dateDelta = a.lastPlannedKey.localeCompare(b.lastPlannedKey)
      if (dateDelta !== 0) return dateDelta
      return a.athleteName.localeCompare(b.athleteName)
    })

  return rows
}

export type CoachHomeTableSortDir = 'asc' | 'desc'

export type CoachHomeAttentionSortKey = 'athlete' | 'type' | 'when'

export function sortCoachHomeAttentionItems(
  items: CoachHomeAttentionItem[],
  key: CoachHomeAttentionSortKey,
  dir: CoachHomeTableSortDir,
): CoachHomeAttentionItem[] {
  const mul = dir === 'asc' ? 1 : -1
  return [...items].sort((a, b) => {
    switch (key) {
      case 'athlete':
        return a.athleteName.localeCompare(b.athleteName) * mul
      case 'type': {
        const kindDelta = ATTENTION_KIND_PRIORITY[a.kind] - ATTENTION_KIND_PRIORITY[b.kind]
        if (kindDelta !== 0) return kindDelta * mul
        return a.categoryLabel.localeCompare(b.categoryLabel) * mul
      }
      case 'when':
        return (
          (new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()) * mul
        )
      default:
        return 0
    }
  })
}

export type CoachHomePlanningSortKey = 'athlete' | 'status' | 'planAhead'

const PLANNING_STATUS_ORDER: Record<AthleteStatus, number> = {
  ACTIVE: 0,
  INACTIVE: 1,
  ARCHIVED: 2,
}

function planAheadSortValue(daysAhead: number | null): number {
  if (daysAhead == null) return -1
  return daysAhead
}

export function sortCoachHomePlanningCoverageRows(
  rows: CoachHomePlanningCoverageRow[],
  key: CoachHomePlanningSortKey,
  dir: CoachHomeTableSortDir,
): CoachHomePlanningCoverageRow[] {
  const mul = dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    switch (key) {
      case 'athlete':
        return a.athleteName.localeCompare(b.athleteName) * mul
      case 'status':
        return (
          (PLANNING_STATUS_ORDER[a.status] - PLANNING_STATUS_ORDER[b.status]) * mul
        )
      case 'planAhead': {
        const delta = planAheadSortValue(a.daysAhead) - planAheadSortValue(b.daysAhead)
        if (delta !== 0) return delta * mul
        return a.athleteName.localeCompare(b.athleteName)
      }
      default:
        return 0
    }
  })
}

export function formatCoachHomeActivityDetails(
  workout: PlanWorkoutDetail,
  kind: 'completed' | 'skipped',
): string {
  if (kind === 'skipped') return '—'
  const built = buildCoachHomeActivityDetailParts(workout, kind)
  const lines = [built.actualSummary, built.plannedSummary].filter(Boolean)
  const chips = built.metricChips.map((c) => `${c.value}${c.label ? ` ${c.label}` : ''}`)
  const parts = [...lines, ...chips]
  return parts.length > 0 ? parts.join(' · ') : '—'
}

function formatActivityDistance(
  workout: PlanWorkoutDetail,
  km: number | null | undefined,
  meters: number | null | undefined,
): string | null {
  if (workout.type === WorkoutType.SWIM && meters != null && meters > 0) {
    return formatSwimDistance(meters)
  }
  if (km != null && km > 0) {
    const formatted = formatDistance(km)
    return formatted === '—' ? null : formatted
  }
  return null
}

function formatActivityDuration(min: number | null | undefined): string | null {
  if (min == null || min <= 0) return null
  const formatted = formatDuration(min)
  return formatted === '—' ? null : formatted
}

function activityPaceOrSpeed(
  workout: PlanWorkoutDetail,
  distanceKm: number | null | undefined,
  durationMin: number | null | undefined,
  averageSpeedMps: number | null | undefined,
): { label: string; value: string } | null {
  if (workout.type === WorkoutType.BIKE) {
    const kph =
      averageSpeedMps != null && averageSpeedMps > 0
        ? averageSpeedMps * 3.6
        : distanceKm != null &&
            distanceKm > 0 &&
            durationMin != null &&
            durationMin > 0
          ? distanceKm / (durationMin / 60)
          : null
    if (kph == null || !Number.isFinite(kph) || kph <= 0) return null
    return {
      label: 'km/h',
      value: kph >= 10 ? kph.toFixed(1) : kph.toFixed(2),
    }
  }

  if (
    distanceKm == null ||
    distanceKm <= 0 ||
    durationMin == null ||
    durationMin <= 0
  ) {
    return null
  }

  if (workout.type === WorkoutType.SWIM) {
    const pace100 = formatPaceMinPerKm(durationMin / (distanceKm * 10))
    if (!pace100) return null
    return { label: '/100m', value: pace100 }
  }

  if (
    workout.type === WorkoutType.RUN ||
    workout.type === WorkoutType.TRIATHLON ||
    workout.type === WorkoutType.HYROX
  ) {
    const pace = formatPaceMinPerKm(durationMin / distanceKm)
    if (!pace) return null
    return { label: '/km', value: pace }
  }

  return null
}

function formatActivityClock(min: number | null | undefined): string | null {
  if (min == null || min <= 0) return null
  const totalSecs = Math.max(0, Math.round(min * 60))
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m}:${s.toString().padStart(2, '0')}`
}

function activityCompletionRatio(workout: PlanWorkoutDetail): number | null {
  if (workout.selfLogged) return null
  const result = workout.result
  if (!result) return null

  const plannedKm = workout.plannedDistance
  const actualKm = result.actualDistance
  if (
    plannedKm != null &&
    plannedKm > 0 &&
    actualKm != null &&
    actualKm > 0
  ) {
    return Math.min(1.5, actualKm / plannedKm)
  }

  const plannedMin = workout.plannedDuration
  const actualMin = result.actualDuration
  if (
    plannedMin != null &&
    plannedMin > 0 &&
    actualMin != null &&
    actualMin > 0
  ) {
    return Math.min(1.5, actualMin / plannedMin)
  }

  return null
}

function buildActivityFeedMetricSlots(
  workout: PlanWorkoutDetail,
  kind: 'completed' | 'skipped',
): {
  primaryMetrics: CoachHomeActivityMetric[]
  secondaryMetrics: CoachHomeActivityMetric[]
  completionRatio: number | null
  asPlanned: boolean
} {
  if (kind === 'skipped') {
    return {
      primaryMetrics: [],
      secondaryMetrics: [],
      completionRatio: null,
      asPlanned: false,
    }
  }

  const result = workout.result
  const primary: CoachHomeActivityMetric[] = []
  const secondary: CoachHomeActivityMetric[] = []

  const actualDistanceMeters =
    workout.type === WorkoutType.SWIM &&
    result?.actualDistance != null &&
    result.actualDistance > 0
      ? Math.round(result.actualDistance * 1000)
      : null
  const distance = formatActivityDistance(
    workout,
    result?.actualDistance,
    actualDistanceMeters,
  )
  const durationClock = formatActivityClock(result?.actualDuration)
  const durationLabel = formatActivityDuration(result?.actualDuration)
  const pace = activityPaceOrSpeed(
    workout,
    result?.actualDistance,
    result?.actualDuration,
    result?.averageSpeedMps,
  )
  const elev =
    result?.elevationGainM != null && result.elevationGainM >= 10
      ? `${Math.round(result.elevationGainM)} m`
      : null
  const watts =
    result?.averageWatts != null && result.averageWatts > 0
      ? String(Math.round(result.averageWatts))
      : null

  switch (workout.type) {
    case WorkoutType.BIKE: {
      if (distance) primary.push({ label: 'Distance', value: distance })
      if (durationClock) {
        primary.push({ label: 'Time', value: durationClock })
      } else if (durationLabel) {
        primary.push({ label: 'Time', value: durationLabel })
      }
      if (watts) primary.push({ label: 'Avg power', value: watts, unit: 'W' })
      else if (pace) primary.push({ label: 'Avg speed', value: pace.value, unit: pace.label })
      if (elev) primary.push({ label: 'Elev', value: elev })
      break
    }
    case WorkoutType.SWIM: {
      if (distance) primary.push({ label: 'Distance', value: distance })
      if (durationClock) {
        primary.push({ label: 'Time', value: durationClock })
      } else if (durationLabel) {
        primary.push({ label: 'Time', value: durationLabel })
      }
      if (pace) primary.push({ label: 'Avg pace', value: pace.value, unit: pace.label })
      break
    }
    case WorkoutType.STRENGTH:
    case WorkoutType.RECOVERY:
    case WorkoutType.REST: {
      if (durationClock) {
        primary.push({ label: 'Duration', value: durationClock })
      } else if (durationLabel) {
        primary.push({ label: 'Duration', value: durationLabel })
      }
      break
    }
    default: {
      if (distance) primary.push({ label: 'Distance', value: distance })
      if (durationClock) {
        primary.push({ label: 'Time', value: durationClock })
      } else if (durationLabel) {
        primary.push({ label: 'Time', value: durationLabel })
      }
      if (pace) primary.push({ label: 'Avg pace', value: pace.value, unit: pace.label })
      if (elev) primary.push({ label: 'Elev', value: elev })
      break
    }
  }

  if (result?.averageHeartrate != null && result.averageHeartrate > 0) {
    secondary.push({
      label: 'Avg HR',
      value: String(Math.round(result.averageHeartrate)),
      unit: 'bpm',
    })
  }
  if (result?.maxHeartrate != null && result.maxHeartrate > 0) {
    secondary.push({
      label: 'Max HR',
      value: String(Math.round(result.maxHeartrate)),
      unit: 'bpm',
    })
  }
  if (result?.averageCadence != null && result.averageCadence > 0) {
    secondary.push({
      label: 'Cadence',
      value: String(Math.round(result.averageCadence)),
      unit: workout.type === WorkoutType.BIKE ? 'rpm' : 'spm',
    })
  }
  if (result?.calories != null && result.calories > 0) {
    secondary.push({
      label: 'Calories',
      value: String(Math.round(result.calories)),
    })
  }
  if (
    watts &&
    workout.type !== WorkoutType.BIKE &&
    !primary.some((m) => m.label === 'Avg power')
  ) {
    secondary.push({ label: 'Avg power', value: watts, unit: 'W' })
  }

  const completionRatio = activityCompletionRatio(workout)
  const asPlanned =
    completionRatio != null && completionRatio >= 0.95 && completionRatio <= 1.05

  return {
    primaryMetrics: primary.slice(0, 4),
    secondaryMetrics: secondary.slice(0, 4),
    completionRatio,
    asPlanned,
  }
}

export function buildCoachHomeActivityDetailParts(
  workout: PlanWorkoutDetail,
  kind: 'completed' | 'skipped',
): {
  plannedSummary: string | null
  actualSummary: string | null
  metricChips: Array<{ label: string; value: string }>
  stravaActivityUrl: string | null
  primaryMetrics: CoachHomeActivityMetric[]
  secondaryMetrics: CoachHomeActivityMetric[]
  completionRatio: number | null
  asPlanned: boolean
} {
  const result = workout.result
  const stravaActivityUrl = result?.stravaActivityUrl ?? null
  const slots = buildActivityFeedMetricSlots(workout, kind)

  if (kind === 'skipped') {
    const plannedDistance = formatActivityDistance(
      workout,
      workout.plannedDistance,
      workout.plannedDistanceMeters,
    )
    const plannedDuration = formatActivityDuration(workout.plannedDuration)
    const plannedParts = [plannedDistance, plannedDuration].filter(Boolean)
    return {
      plannedSummary: plannedParts.length > 0 ? plannedParts.join(' · ') : null,
      actualSummary: null,
      metricChips: [],
      stravaActivityUrl,
      ...slots,
    }
  }

  const plannedDistance = workout.selfLogged
    ? null
    : formatActivityDistance(
        workout,
        workout.plannedDistance,
        workout.plannedDistanceMeters,
      )
  const plannedDuration = workout.selfLogged
    ? null
    : formatActivityDuration(workout.plannedDuration)
  const plannedParts = [plannedDistance, plannedDuration].filter(Boolean)

  const actualDistanceMeters =
    workout.type === WorkoutType.SWIM &&
    result?.actualDistance != null &&
    result.actualDistance > 0
      ? Math.round(result.actualDistance * 1000)
      : null
  const actualDistance = formatActivityDistance(
    workout,
    result?.actualDistance,
    actualDistanceMeters,
  )
  const actualDuration = formatActivityDuration(result?.actualDuration)
  const actualParts = [actualDistance, actualDuration].filter(Boolean)

  const metricChips: Array<{ label: string; value: string }> = []
  const pace = activityPaceOrSpeed(
    workout,
    result?.actualDistance,
    result?.actualDuration,
    result?.averageSpeedMps,
  )
  if (pace) metricChips.push(pace)

  if (result?.averageHeartrate != null && result.averageHeartrate > 0) {
    metricChips.push({
      label: 'bpm',
      value: String(Math.round(result.averageHeartrate)),
    })
  } else if (result?.maxHeartrate != null && result.maxHeartrate > 0) {
    metricChips.push({
      label: 'max bpm',
      value: String(Math.round(result.maxHeartrate)),
    })
  }

  if (result?.elevationGainM != null && result.elevationGainM >= 10) {
    metricChips.push({
      label: 'elev',
      value: `${Math.round(result.elevationGainM)} m`,
    })
  }

  if (result?.averageWatts != null && result.averageWatts > 0) {
    metricChips.push({
      label: 'W',
      value: String(Math.round(result.averageWatts)),
    })
  }

  return {
    plannedSummary: plannedParts.length > 0 ? plannedParts.join(' · ') : null,
    actualSummary: actualParts.length > 0 ? actualParts.join(' · ') : null,
    metricChips,
    stravaActivityUrl,
    ...slots,
  }
}

export function formatCoachHomeActivitySource(
  source: WorkoutCompletionSource | null,
  kind: 'completed' | 'skipped',
): string {
  if (kind === 'skipped') return '—'
  if (!source) return '—'
  return COMPLETION_SOURCE_LABELS[source]
}

export function buildCoachHomeActivityTableRows(
  items: CoachHomeActivityFeedItem[],
): CoachHomeWorkoutActivityRow[] {
  return items.map((item) => {
    const parts = buildCoachHomeActivityDetailParts(item.workout, item.kind)
    const feedback = coachHomeActivityFeedback(item)
    return {
      entryKind: 'workout' as const,
      id: item.workout.id,
      activityAt: item.activityAt,
      dateKey: item.workout.dateKey,
      athleteId: item.athleteId,
      athleteName: item.athleteName,
      avatarUrl: item.avatarUrl,
      activityType: item.workout.type,
      activityTitle: item.workout.title,
      details: formatCoachHomeActivityDetails(item.workout, item.kind),
      sourceLabel: formatCoachHomeActivitySource(item.source, item.kind),
      status: item.kind,
      hasFeedback: Boolean(
        feedback.feeling != null || feedback.notes || feedback.reply,
      ),
      feedbackFeeling: feedback.feeling,
      feedbackNotes: feedback.notes,
      feedbackReply: feedback.reply,
      stravaActivityUrl: parts.stravaActivityUrl,
      plannedSummary: parts.plannedSummary,
      actualSummary: parts.actualSummary,
      metricChips: parts.metricChips,
      primaryMetrics: parts.primaryMetrics,
      secondaryMetrics: parts.secondaryMetrics,
      completionRatio: parts.completionRatio,
      asPlanned: parts.asPlanned,
      workout: item.workout,
    }
  })
}

export function buildCoachHomeRaceActivityRows(
  races: CoachHomeRaceFeedSource[],
): CoachHomeRaceActivityRow[] {
  const todayKey = todayDateKey()

  return races.map((race) => {
    const raceDateKey = toDateKey(race.date)
    const hasReport =
      race.resultLoggedAt != null &&
      race.outcome != null &&
      RACE_REPORT_OUTCOMES.includes(race.outcome)

    let racePhase: CoachHomeRaceActivityRow['racePhase']
    if (hasReport) {
      racePhase = 'report'
    } else if (raceDateKey > todayKey) {
      racePhase = 'upcoming'
    } else {
      racePhase = 'race_day'
    }

    const activityAt =
      hasReport && race.resultLoggedAt
        ? race.resultLoggedAt.toISOString()
        : `${raceDateKey}T12:00:00.000Z`
    const dateKey =
      hasReport && race.resultLoggedAt ? toDateKey(race.resultLoggedAt) : raceDateKey

    return {
      entryKind: 'race' as const,
      id: `race-${race.id}`,
      activityAt,
      dateKey,
      athleteId: race.athlete.id,
      athleteName: race.athlete.name,
      avatarUrl: race.athlete.avatarUrl,
      activityType: race.sport,
      activityTitle: race.name,
      racePhase,
      race: {
        raceId: race.id,
        name: race.name,
        raceDateKey,
        location: race.location,
        raceType: race.type,
        priority: race.priority,
        outcome: race.outcome,
        resultTime: race.resultTime,
        resultPlace: race.resultPlace,
        resultNotes: race.resultNotes,
        stravaActivityUrl: race.stravaActivityUrl,
        stravaActivityName: race.stravaActivityName,
        legs: race.legs,
        hasReport,
      },
    }
  })
}

export function mergeCoachHomeActivityFeed(
  workouts: CoachHomeWorkoutActivityRow[],
  races: CoachHomeRaceActivityRow[],
): CoachHomeActivityTableRow[] {
  return [...workouts, ...races].sort(
    (a, b) => new Date(b.activityAt).getTime() - new Date(a.activityAt).getTime(),
  )
}

export function coachHomeRaceResultLabel(race: CoachHomeRaceFeedData): string {
  if (!race.hasReport || !race.outcome) return '—'
  if (race.outcome === RaceOutcome.FINISHED) {
    return race.resultTime?.trim() || RACE_OUTCOME_LABELS.FINISHED
  }
  if (race.outcome === RaceOutcome.DNF && race.resultTime?.trim()) {
    return `${RACE_OUTCOME_LABELS.DNF} · ${race.resultTime.trim()}`
  }
  return RACE_OUTCOME_LABELS[race.outcome]
}

function coachHomeActivityFeedback(item: CoachHomeActivityFeedItem): {
  feeling: number | null
  notes: string | null
  reply: string | null
} {
  const result = item.workout.result
  const feeling = parseWorkoutFeeling(result?.feeling ?? null)
  const notesRaw = result?.athleteNotes?.trim() || null
  const notes =
    notesRaw && !result?.athleteNotesPrivate
      ? notesRaw
      : feedbackThreadAthleteNotes(item)
  const reply = result?.coachReply?.trim() || null
  return { feeling, notes, reply }
}

function feedbackThreadAthleteNotes(
  item: CoachHomeActivityFeedItem,
): string | null {
  const thread = item.feedbackThread
  if (!thread?.messages?.length) return null
  const athleteMsg = [...thread.messages]
    .reverse()
    .find(
      (m) =>
        m.authorRole === CoachingAuthorRole.ATHLETE && m.body.trim().length > 0,
    )
  return athleteMsg?.body.trim() || null
}

export function groupActivityRowsByDay(
  rows: CoachHomeActivityTableRow[],
): Array<{ dateKey: string; rows: CoachHomeActivityTableRow[] }> {
  const groups = new Map<string, CoachHomeActivityTableRow[]>()

  for (const row of rows) {
    const list = groups.get(row.dateKey) ?? []
    list.push(row)
    groups.set(row.dateKey, list)
  }

  return [...groups.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateKey, groupRows]) => ({ dateKey, rows: groupRows }))
}

export type CoachHomeTimeRange = 'last_7d' | 'this_week' | 'last_30d' | 'all_time'

export function filterActivityByTimeRange(
  rows: CoachHomeActivityTableRow[],
  range: CoachHomeTimeRange,
): CoachHomeActivityTableRow[] {
  if (range === 'all_time') return rows

  const today = todayDateOnly()
  const start =
    range === 'this_week'
      ? startOfWeekDateOnly(today)
      : range === 'last_30d'
        ? addDateOnlyDays(today, -29)
        : addDateOnlyDays(today, -6)
  const startKey = toDateKey(start)
  const endKey = todayDateKey()
  return rows.filter((row) => row.dateKey >= startKey && row.dateKey <= endKey)
}

export function athleteOptionsFromRoster(
  rosterRows: CoachRosterRow[],
): Array<{ id: string; name: string }> {
  return rosterRows
    .filter((r) => r.status === 'ACTIVE')
    .map((r) => ({ id: r.id, name: r.name }))
    .sort((a, b) => a.name.localeCompare(b.name))
}
