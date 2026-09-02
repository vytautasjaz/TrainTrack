import {
  CoachingAuthorRole,
  CoachingMessageKind,
  WorkoutStatus,
  WorkoutType,
} from '@prisma/client'

export const COACHING_MESSAGE_MAX_LEN = 2000
export const COACHING_THREAD_MESSAGE_CAP = 20

export type InboxFilter = 'unread' | 'all' | 'requests'
export type InboxKindFilter = 'all' | 'GENERAL' | 'ASK' | 'FEEDBACK' | 'RACE_REPORT'

export const INBOX_PAGE_SIZES = [20, 50, 100] as const
export type InboxPageSize = (typeof INBOX_PAGE_SIZES)[number]
export const INBOX_DEFAULT_PAGE_SIZE: InboxPageSize = 20
export const INBOX_LIST_MAX = 100

export function trimCoachingMessageBody(raw: string): string {
  return raw.trim().slice(0, COACHING_MESSAGE_MAX_LEN)
}

export function athleteCanAskCoachAboutWorkout(workout: {
  dateKey: string
  status: WorkoutStatus
  isRace?: boolean
  isRescheduleGhost?: boolean
  type: WorkoutType
}): boolean {
  if (workout.isRescheduleGhost) return false
  if (workout.isRace) return false
  if (workout.type === WorkoutType.RECOVERY || workout.type === WorkoutType.REST) return false
  if (workout.status !== WorkoutStatus.PLANNED) return false
  return true
}

/** Follow-up chat on a completed/skipped (or Strava-synced) workout. */
export function athleteCanFollowUpWithCoachAboutWorkout(workout: {
  status: WorkoutStatus
  isRace?: boolean
  isRescheduleGhost?: boolean
  type: WorkoutType
  result?: { stravaActivityUrl?: string | null } | null
}): boolean {
  if (workout.isRescheduleGhost) return false
  if (workout.isRace) return false
  if (workout.type === WorkoutType.RECOVERY || workout.type === WorkoutType.REST) return false
  if (workout.status === WorkoutStatus.COMPLETED || workout.status === WorkoutStatus.SKIPPED) {
    return true
  }
  return Boolean(workout.result?.stravaActivityUrl)
}

export function isThreadUnreadForRole(
  thread: {
    lastMessageAt: Date | string
    coachLastReadAt: Date | string | null
    athleteLastReadAt: Date | string | null
    messages: Array<{ authorRole?: CoachingAuthorRole; createdAt?: Date | string }>
  },
  role: 'athlete' | 'coach',
): boolean {
  const last = thread.messages.at(-1)
  if (!last) return false

  const lastReadRaw = role === 'coach' ? thread.coachLastReadAt : thread.athleteLastReadAt
  // null = never opened or explicitly “Mark as unread” (including when the last
  // message is your own — otherwise mark-unread cannot stick for the athlete).
  if (lastReadRaw == null) return true

  const lastReadMs = new Date(lastReadRaw).getTime()
  if (!Number.isFinite(lastReadMs)) return true

  // Canonical activity time is thread.lastMessageAt (kept in sync on every send).
  const lastAtMs = new Date(thread.lastMessageAt).getTime()
  if (!Number.isFinite(lastAtMs)) return false

  return lastAtMs > lastReadMs
}

export function threadNeedsReplyFrom(
  thread: {
    messages: { authorRole: CoachingAuthorRole }[]
  },
  role: 'athlete' | 'coach',
): boolean {
  const last = thread.messages[thread.messages.length - 1]
  if (!last) return false
  if (role === 'coach') return last.authorRole === CoachingAuthorRole.ATHLETE
  return last.authorRole === CoachingAuthorRole.COACH
}

/** True when the thread is a real chat (coach reply or athlete ASK), not feedback-only. */
export function threadHasChatConversation(
  messages: Array<{
    authorRole: CoachingAuthorRole
    kind?: CoachingMessageKind | 'CHAT' | 'FEEDBACK' | string
  }>,
): boolean {
  if (messages.length === 0) return false
  return (
    messages.some((m) => m.authorRole === CoachingAuthorRole.COACH) ||
    messages.some(
      (m) =>
        m.authorRole === CoachingAuthorRole.ATHLETE &&
        m.kind !== CoachingMessageKind.FEEDBACK &&
        m.kind !== 'FEEDBACK',
    )
  )
}
