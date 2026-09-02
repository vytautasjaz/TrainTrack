import { normalizeCoachingCode } from '@/lib/coaching-code'

export const COACH_INVITE_COOKIE = 'tt_coach_invite'

export type CoachInviteInfo = {
  code: string
  coachProfileId: string
  coachUserId: string
  coachName: string
}

export function parseCoachInviteCode(raw: string | null | undefined): string | null {
  if (!raw) return null
  const code = normalizeCoachingCode(raw)
  if (!/^TT-[A-Z0-9]{5}$/.test(code)) return null
  return code
}

export function coachInvitePath(code: string): string {
  return `/join/${encodeURIComponent(normalizeCoachingCode(code))}`
}

const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 30 // 30 days

export function coachInviteCookieOptions(maxAge = COOKIE_MAX_AGE_SEC) {
  return {
    path: '/',
    maxAge,
    sameSite: 'lax' as const,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  }
}
