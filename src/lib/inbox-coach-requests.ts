export const INBOX_COACH_REQUEST_PREFIX = 'coach-request:'

export type InboxCoachRequest = {
  id: string
  createdAt: string
  athlete: { id: string; name: string; avatarUrl: string | null }
}

export function inboxCoachRequestListId(linkId: string): string {
  return `${INBOX_COACH_REQUEST_PREFIX}${linkId}`
}

export function parseInboxCoachRequestListId(id: string): string | null {
  if (!id.startsWith(INBOX_COACH_REQUEST_PREFIX)) return null
  return id.slice(INBOX_COACH_REQUEST_PREFIX.length)
}

export function isInboxCoachRequestListId(id: string): boolean {
  return id.startsWith(INBOX_COACH_REQUEST_PREFIX)
}
