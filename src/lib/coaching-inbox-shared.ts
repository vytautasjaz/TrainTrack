import {
  CoachingAuthorRole,
  WorkoutStatus,
  WorkoutType,
} from '@prisma/client'
import { todayDateKey } from '@/lib/dates'

export const COACHING_MESSAGE_MAX_LEN = 2000
export const COACHING_THREAD_MESSAGE_CAP = 20

export type InboxFilter = 'unread' | 'all'
export type InboxKindFilter = 'all' | 'ASK' | 'FEEDBACK' | 'RACE_REPORT'

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
  if (workout.dateKey < todayDateKey()) return false
  return true
}

export function isThreadUnreadForRole(
  thread: {
    lastMessageAt: Date
    coachLastReadAt: Date | null
    athleteLastReadAt: Date | null
    messages: { length: number }
  },
  role: 'athlete' | 'coach',
): boolean {
  if (thread.messages.length === 0) return false
  const lastRead = role === 'coach' ? thread.coachLastReadAt : thread.athleteLastReadAt
  if (!lastRead) return true
  return thread.lastMessageAt.getTime() > lastRead.getTime()
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
