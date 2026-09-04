import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { customAlphabet } from '@/lib/coaching-code-alphabet'
import {
  ATHLETE_CLAIM_COOKIE,
  athleteClaimCookieOptions,
  athleteClaimPath,
  parseAthleteClaimToken,
  type AthleteClaimInfo,
} from '@/lib/athlete-claim-shared'

export {
  ATHLETE_CLAIM_COOKIE,
  athleteClaimCookieOptions,
  athleteClaimPath,
  parseAthleteClaimToken,
  type AthleteClaimInfo,
} from '@/lib/athlete-claim-shared'

const generateToken = customAlphabet(
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789',
  32,
)

export function generateAthleteClaimToken(): string {
  return generateToken()
}

export async function resolveAthleteClaim(
  rawToken: string | null | undefined,
): Promise<AthleteClaimInfo | null> {
  const token = parseAthleteClaimToken(rawToken)
  if (!token) return null

  const athlete = await prisma.athlete.findUnique({
    where: { claimToken: token },
    select: {
      id: true,
      name: true,
      userId: true,
      coachId: true,
      coachLinks: {
        where: { status: 'ACCEPTED' },
        take: 1,
        select: {
          coachProfile: {
            select: {
              userId: true,
              user: { select: { name: true } },
            },
          },
        },
      },
    },
  })
  if (!athlete) return null

  const coachFromLink = athlete.coachLinks[0]?.coachProfile
  let coachUserId: string | null = coachFromLink?.userId ?? null
  let coachName: string | null = coachFromLink?.user.name ?? null

  if (!coachUserId && athlete.coachId) {
    const legacyCoach = await prisma.user.findUnique({
      where: { id: athlete.coachId },
      select: { id: true, name: true },
    })
    coachUserId = legacyCoach?.id ?? null
    coachName = legacyCoach?.name ?? null
  }

  if (!coachUserId || !coachName) return null

  return {
    token,
    athleteId: athlete.id,
    athleteName: athlete.name,
    coachUserId: coachUserId,
    coachName: coachName,
    alreadyClaimed: Boolean(athlete.userId),
  }
}

export async function ensureAthleteClaimToken(athleteId: string): Promise<string | null> {
  const athlete = await prisma.athlete.findUnique({
    where: { id: athleteId },
    select: { userId: true, claimToken: true },
  })
  if (!athlete || athlete.userId) return null
  if (athlete.claimToken) return athlete.claimToken

  for (let attempt = 0; attempt < 5; attempt++) {
    const token = generateAthleteClaimToken()
    try {
      const updated = await prisma.athlete.update({
        where: { id: athleteId },
        data: { claimToken: token },
        select: { claimToken: true, userId: true },
      })
      if (updated.userId) return null
      return updated.claimToken
    } catch {
      // token collision — retry
    }
  }

  throw new Error('Could not generate claim link')
}

export async function getAthleteClaimCookie(): Promise<string | null> {
  const cookieStore = await cookies()
  return parseAthleteClaimToken(cookieStore.get(ATHLETE_CLAIM_COOKIE)?.value)
}

export async function clearAthleteClaimCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete({ name: ATHLETE_CLAIM_COOKIE, path: '/' })
}

/** Prefer athlete claim over generic coach invite when both cookies exist,
 * unless an explicit invite code was provided (e.g. Google sign-in from /?invite=). */
export async function resolvePostAuthRedirect(
  email?: string | null,
  userId?: string | null,
  options?: { preferInviteCode?: string | null },
): Promise<string> {
  const preferredInvite = options?.preferInviteCode?.trim()
  if (preferredInvite) {
    const { resolveSignInRedirect } = await import('@/lib/coach-invite')
    return resolveSignInRedirect(email, userId, preferredInvite)
  }

  const claimToken = await getAthleteClaimCookie()
  if (claimToken) {
    const claim = await resolveAthleteClaim(claimToken)
    if (claim && !claim.alreadyClaimed) {
      if (userId && userId === claim.coachUserId) {
        await clearAthleteClaimCookie()
      } else {
        return `${athleteClaimPath(claimToken)}/accept`
      }
    } else {
      await clearAthleteClaimCookie()
    }
  }

  const { resolveSignInRedirect } = await import('@/lib/coach-invite')
  return resolveSignInRedirect(email, userId)
}

