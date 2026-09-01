import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import {
  COACH_INVITE_COOKIE,
  parseCoachInviteCode,
  type CoachInviteInfo,
} from '@/lib/coach-invite-shared'

export {
  COACH_INVITE_COOKIE,
  coachInvitePath,
  parseCoachInviteCode,
  type CoachInviteInfo,
} from '@/lib/coach-invite-shared'

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

export async function resolveCoachInvite(
  rawCode: string | null | undefined,
): Promise<CoachInviteInfo | null> {
  const code = parseCoachInviteCode(rawCode)
  if (!code) return null

  const coachProfile = await prisma.coachProfile.findUnique({
    where: { coachingCode: code },
    select: {
      id: true,
      userId: true,
      coachingCode: true,
      user: { select: { name: true } },
    },
  })
  if (!coachProfile) return null

  return {
    code: coachProfile.coachingCode,
    coachProfileId: coachProfile.id,
    coachUserId: coachProfile.userId,
    coachName: coachProfile.user.name,
  }
}

export async function getCoachInviteCookie(): Promise<string | null> {
  const cookieStore = await cookies()
  return parseCoachInviteCode(cookieStore.get(COACH_INVITE_COOKIE)?.value)
}

export async function setCoachInviteCookie(code: string): Promise<void> {
  const normalized = parseCoachInviteCode(code)
  if (!normalized) return
  const cookieStore = await cookies()
  cookieStore.set(COACH_INVITE_COOKIE, normalized, coachInviteCookieOptions())
}

export async function clearCoachInviteCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COACH_INVITE_COOKIE)
}
