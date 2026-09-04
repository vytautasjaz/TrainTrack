import { cookies } from 'next/headers'
import { CoachAthleteLinkStatus } from '@prisma/client'
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

/**
 * Link athlete user to coach from a validated invite.
 * Replaces any other ACCEPTED/PENDING coach links.
 */
export async function linkAthleteToCoachInvite(
  userId: string,
  invite: CoachInviteInfo,
): Promise<'linked' | 'self' | 'no_athlete'> {
  if (invite.coachUserId === userId) return 'self'

  const athlete = await prisma.athlete.findUnique({
    where: { userId },
    select: { id: true },
  })
  if (!athlete) return 'no_athlete'

  await prisma.$transaction(async (tx) => {
    await tx.coachAthleteLink.updateMany({
      where: {
        athleteId: athlete.id,
        status: {
          in: [CoachAthleteLinkStatus.ACCEPTED, CoachAthleteLinkStatus.PENDING],
        },
        NOT: { coachProfileId: invite.coachProfileId },
      },
      data: { status: CoachAthleteLinkStatus.REMOVED },
    })

    await tx.coachAthleteLink.upsert({
      where: {
        coachProfileId_athleteId: {
          coachProfileId: invite.coachProfileId,
          athleteId: athlete.id,
        },
      },
      create: {
        coachProfileId: invite.coachProfileId,
        athleteId: athlete.id,
        status: CoachAthleteLinkStatus.ACCEPTED,
      },
      update: {
        status: CoachAthleteLinkStatus.ACCEPTED,
      },
    })

    await tx.athlete.update({
      where: { id: athlete.id },
      data: { coachId: invite.coachUserId },
    })
  })

  return 'linked'
}

/**
 * After athlete profile exists: auto-link when invite is safe (no other coach),
 * otherwise return the join path for an explicit Accept / replace confirmation.
 * Returns null when there is no pending invite work (go to dashboard).
 */
export async function resolvePendingCoachInviteRedirect(
  userId: string,
): Promise<string | null> {
  const inviteCode = await getCoachInviteCookie()
  if (!inviteCode) return null

  const invite = await resolveCoachInvite(inviteCode)
  if (!invite) {
    await clearCoachInviteCookie()
    return null
  }

  if (invite.coachUserId === userId) {
    await clearCoachInviteCookie()
    return null
  }

  const athlete = await prisma.athlete.findUnique({
    where: { userId },
    select: {
      id: true,
      coachId: true,
      coachLinks: {
        where: {
          coachProfileId: invite.coachProfileId,
          status: CoachAthleteLinkStatus.ACCEPTED,
        },
        select: { id: true },
        take: 1,
      },
    },
  })

  if (!athlete) {
    return coachInvitePath(inviteCode)
  }

  if (athlete.coachLinks.length > 0) {
    await clearCoachInviteCookie()
    return null
  }

  // Other coach already linked — confirm replace on accept page.
  if (athlete.coachId && athlete.coachId !== invite.coachUserId) {
    return coachInvitePath(inviteCode)
  }

  const result = await linkAthleteToCoachInvite(userId, invite)
  if (result === 'linked') {
    await clearCoachInviteCookie()
    return null
  }

  return coachInvitePath(inviteCode)
}

/** Drop stale invite cookies and avoid sending coaches to their own athlete invite flow. */
export async function resolveSignInRedirect(
  email?: string | null,
  userId?: string | null,
  preferredInviteCode?: string | null,
): Promise<string> {
  const preferred = parseCoachInviteCode(preferredInviteCode)
  if (preferred) {
    await setCoachInviteCookie(preferred)
  }

  const inviteCode = preferred ?? (await getCoachInviteCookie())
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
