import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import {
  COACH_INVITE_COOKIE,
  coachInviteCookieOptions,
  coachInvitePath,
  parseCoachInviteCode,
  type CoachInviteInfo,
} from '@/lib/coach-invite-shared'

export {
  COACH_INVITE_COOKIE,
  coachInviteCookieOptions,
  coachInvitePath,
  parseCoachInviteCode,
  type CoachInviteInfo,
} from '@/lib/coach-invite-shared'

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
  cookieStore.delete({ name: COACH_INVITE_COOKIE, path: '/' })
}

/** Drop stale invite cookies and avoid sending coaches to their own athlete invite flow. */
export async function resolveSignInRedirect(
  email?: string | null,
  userId?: string | null,
): Promise<string> {
  const inviteCode = await getCoachInviteCookie()
  if (!inviteCode) return '/dashboard'

  const invite = await resolveCoachInvite(inviteCode)
  if (!invite) {
    await clearCoachInviteCookie()
    return '/dashboard'
  }

  if (userId && userId === invite.coachUserId) {
    await clearCoachInviteCookie()
    return '/dashboard'
  }

  const normalizedEmail = email?.trim().toLowerCase()
  if (normalizedEmail) {
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    })
    if (user?.id === invite.coachUserId) {
      await clearCoachInviteCookie()
      return '/dashboard'
    }
  }

  return coachInvitePath(inviteCode)
}
