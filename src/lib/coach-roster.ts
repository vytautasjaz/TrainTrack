import type { AthleteStatus, WorkoutStatus, WorkoutType } from '@prisma/client'
import { addDateOnlyDays, startOfWeekDateOnly, todayDateOnly, toDateKey } from '@/lib/dates'
import { percent } from '@/lib/utils'

export function countsTowardCompliance(workout: {
  type: WorkoutType
  isRescheduleGhost?: boolean
  selfLogged?: boolean
}): boolean {
  if (workout.isRescheduleGhost) return false
  if (workout.selfLogged) return false
  return workout.type !== 'REST' && workout.type !== 'RECOVERY'
}

import type { CoachingThreadView } from '@/components/inbox/coaching-thread-panel'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'

export type CoachNeedsReplySummary = {
  athleteId: string
  athleteName: string
  avatarUrl: string | null
  preview: string
  count: number
  lastMessageAt: string
}

export type CoachRosterFeedbackItem = {
  id: string
  athleteId: string
  athleteName: string
  avatarUrl: string | null
  unread: boolean
  preview: string
  lastMessageAt: string
  title: string
  body: string
  workoutTitle: string | null
  workoutDateKey: string | null
  thread: CoachingThreadView
}

export type CoachRosterChatThread = {
  id: string
  unread: boolean
  needsReply: boolean
  preview: string
  lastMessageAt: string
  contextTitle: string | null
  contextSubtitle: string | null
  contextMetric: string | null
  contextDateKey: string | null
  threadKind: string
  workoutDetail: PlanWorkoutDetail | null
  thread: CoachingThreadView
}

export type CoachAthleteAttentionLevel = 0 | 1 | 2 | 3

import type { WorkoutCompletionSource } from '@/lib/workout-history'

export type CoachHomeActivityFeedKind = 'completed' | 'skipped'

export type CoachHomeActivityFeedItem = {
  athleteId: string
  athleteName: string
  avatarUrl: string | null
  activityAt: string
  kind: CoachHomeActivityFeedKind
  source: WorkoutCompletionSource | null
  workout: PlanWorkoutDetail
  /** Workout feedback thread (feeling / notes conversation). */
  feedbackThread: CoachingThreadView | null
}

export type CoachHomeNeedsReplyThread = {
  id: string
  athleteId: string
  athleteName: string
  avatarUrl: string | null
  preview: string
  lastMessageAt: string
  contextTitle: string | null
  contextDateKey: string | null
  threadKind: string
  workoutType: WorkoutType | null
  thread: CoachingThreadView
}

export type CoachHomeTodayAthlete = {
  athleteId: string
  athleteName: string
  avatarUrl: string | null
  status: AthleteStatus
  workouts: PlanWorkoutDetail[]
}

export type CoachRosterRow = {
  id: string
  initials: string
  name: string
  status: AthleteStatus
  compliance: number
  completed: number
  planned: number
  lastWeekCompliance: number
  lastWeekCompleted: number
  lastWeekPlanned: number
  nextRace: string | null
  nextRaceDays: number | null
  warning: string | null
  attention: CoachAthleteAttentionLevel
  attentionLabel: string | null
  lastPlannedKey: string | null
  needsReplyCount: number
  unreadChatCount: number
  unreadFeedbackCount: number
  generalChatThread: CoachRosterChatThread | null
  chatThreads: CoachRosterChatThread[]
  feedback: CoachRosterFeedbackItem[]
}

type WorkoutSlice = {
  date: Date
  status: WorkoutStatus
  type: import('@prisma/client').WorkoutType
  isRescheduleGhost?: boolean
  selfLogged?: boolean
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase()
  }
  return (parts[0]?.slice(0, 2) ?? '?').toUpperCase()
}

export function weekCompliance(workouts: WorkoutSlice[], from: Date, to: Date) {
  const fromKey = toDateKey(from)
  const toKey = toDateKey(to)
  const inRange = workouts.filter((w) => {
    const key = toDateKey(w.date)
    return key >= fromKey && key <= toKey
  })
  const planned = inRange.filter(countsTowardCompliance).length
  const completed = inRange.filter(
    (w) => countsTowardCompliance(w) && w.status === 'COMPLETED',
  ).length
  return { planned, completed, compliance: percent(completed, planned) }
}

export function weekToDateCompliance(workouts: WorkoutSlice[]) {
  const today = todayDateOnly()
  const weekStart = startOfWeekDateOnly(today)
  return weekCompliance(workouts, weekStart, today)
}

export function lastWeekCompliance(workouts: WorkoutSlice[]) {
  const today = todayDateOnly()
  const weekStart = startOfWeekDateOnly(today)
  const lastWeekStart = addDateOnlyDays(weekStart, -7)
  const lastWeekEnd = addDateOnlyDays(weekStart, -1)
  return weekCompliance(workouts, lastWeekStart, lastWeekEnd)
}

function attentionForAthlete(input: {
  needsReplyCount: number
  unreadChatCount: number
  unreadFeedbackCount: number
  isUnderPlanned: boolean
  compliance: number
  planned: number
}): { attention: CoachAthleteAttentionLevel; label: string | null; warning: string | null } {
  const unreadTotal = input.unreadChatCount + input.unreadFeedbackCount

  if (input.needsReplyCount > 0 || unreadTotal > 0) {
    return {
      attention: 3,
      label: input.needsReplyCount > 0 ? 'Needs reply' : 'Unread',
      warning: unreadTotal > 0 ? `${unreadTotal} unread` : null,
    }
  }
  if (input.isUnderPlanned) {
    return {
      attention: 2,
      label: 'Under-planned',
      warning: 'Plan ahead',
    }
  }
  if (input.planned > 0 && input.compliance < 50) {
    return {
      attention: 1,
      label: 'Low compliance',
      warning: `${input.compliance}% to today`,
    }
  }
  return { attention: 0, label: null, warning: null }
}

export function buildCoachRosterRows(input: {
  athletes: Array<{
    id: string
    name: string
    status: AthleteStatus
    avatarUrl: string | null
    races: Array<{ name: string; date: Date }>
    workouts: WorkoutSlice[]
  }>
  lastWeekWorkoutsByAthlete: Map<string, WorkoutSlice[]>
  planningWarningIds: Set<string>
  lastPlannedKeyByAthlete: Map<string, string | null>
  needsReplyByAthlete: Map<string, number>
  chatThreadsByAthlete: Map<string, CoachRosterChatThread[]>
  generalChatByAthlete: Map<string, CoachRosterChatThread>
  feedbackThreadsByAthlete: Map<string, CoachRosterFeedbackItem[]>
  formatNextRace: (race: { name: string; date: Date }) => { label: string; days: number }
}): CoachRosterRow[] {
  return input.athletes.map((athlete) => {
    const wtd = weekToDateCompliance(athlete.workouts)
    const lastWeek = lastWeekCompliance(
      input.lastWeekWorkoutsByAthlete.get(athlete.id) ?? [],
    )

    const chatThreads = input.chatThreadsByAthlete.get(athlete.id) ?? []
    const generalChatThread = input.generalChatByAthlete.get(athlete.id) ?? null
    const feedback = input.feedbackThreadsByAthlete.get(athlete.id) ?? []
    const unreadChatCount =
      (generalChatThread?.unread ? 1 : 0) + chatThreads.filter((t) => t.unread).length
    const unreadFeedbackCount = feedback.filter((t) => t.unread).length
    const needsReplyCount =
      (input.needsReplyByAthlete.get(athlete.id) ?? 0) + (generalChatThread?.needsReply ? 1 : 0)
    const isUnderPlanned = input.planningWarningIds.has(athlete.id)
    const { attention, label, warning } = attentionForAthlete({
      needsReplyCount,
      unreadChatCount,
      unreadFeedbackCount,
      isUnderPlanned,
      compliance: wtd.compliance,
      planned: wtd.planned,
    })

    const nextRace = athlete.races[0]
    const nextRaceFmt = nextRace ? input.formatNextRace(nextRace) : null

    return {
      id: athlete.id,
      initials: initialsFromName(athlete.name),
      name: athlete.name,
      status: athlete.status,
      compliance: wtd.compliance,
      completed: wtd.completed,
      planned: wtd.planned,
      lastWeekCompliance: lastWeek.compliance,
      lastWeekCompleted: lastWeek.completed,
      lastWeekPlanned: lastWeek.planned,
      nextRace: nextRaceFmt?.label ?? null,
      nextRaceDays: nextRaceFmt?.days ?? null,
      warning,
      attention,
      attentionLabel: label,
      lastPlannedKey: input.lastPlannedKeyByAthlete.get(athlete.id) ?? null,
      needsReplyCount,
      unreadChatCount,
      unreadFeedbackCount,
      generalChatThread,
      chatThreads,
      feedback,
    }
  })
}
