'use server'

import { UserRole } from '@prisma/client'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import {
  clearAthleteClaimCookie,
  ensureAthleteClaimToken,
  getAthleteClaimCookie,
  parseAthleteClaimToken,
  resolveAthleteClaim,
} from '@/lib/athlete-claim'
import { requireSession, isCoach, requireCoachOwnsAthlete } from '@/lib/session'

export async function claimAthleteProfileForUser(userId: string, athleteId: string) {
  await prisma.$transaction(async (tx) => {
    const athlete = await tx.athlete.findUnique({
      where: { id: athleteId },
      select: { id: true, userId: true },
    })
    if (!athlete || athlete.userId) {
      throw new Error('This athlete profile is no longer available to claim')
    }

    const existing = await tx.athlete.findUnique({
      where: { userId },
      select: { id: true },
    })
    if (existing) {
      throw new Error('Your account already has a training profile')
    }

    await tx.athlete.update({
      where: { id: athleteId },
      data: { userId },
    })

    const user = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { roles: true },
    })
    await tx.user.update({
      where: { id: userId },
      data: {
        roles: { set: Array.from(new Set([...user.roles, UserRole.ATHLETE])) },
        onboardingSkippedAt: null,
      },
    })
  })
}

export async function acceptAthleteClaim(formData: FormData): Promise<void> {
  const session = await requireSession()

  const tokenFromForm = String(formData.get('claimToken') ?? '')
  const token =
    parseAthleteClaimToken(tokenFromForm) ?? (await getAthleteClaimCookie())
  const claim = token ? await resolveAthleteClaim(token) : null
  if (!claim || claim.alreadyClaimed) {
    await clearAthleteClaimCookie()
    throw new Error('This claim link is no longer valid')
  }
  if (claim.coachUserId === session.userId) {
    await clearAthleteClaimCookie()
    redirect('/dashboard')
  }

  await claimAthleteProfileForUser(session.userId, claim.athleteId)
  await clearAthleteClaimCookie()

  revalidatePath('/dashboard')
  revalidatePath('/athletes')
  revalidatePath('/settings/account')
  redirect('/dashboard')
}

export async function declineAthleteClaim(): Promise<void> {
  await clearAthleteClaimCookie()
  redirect('/dashboard')
}

export async function getAthleteClaimLinkForCoach(athleteId: string): Promise<string | null> {
  const session = await requireSession()
  if (!isCoach(session)) throw new Error('Coach only')

  await requireCoachOwnsAthlete(session.userId, athleteId)
  const token = await ensureAthleteClaimToken(athleteId)
  return token
}

export async function regenerateAthleteClaimLink(athleteId: string): Promise<string> {
  const session = await requireSession()
  if (!isCoach(session)) throw new Error('Coach only')

  await requireCoachOwnsAthlete(session.userId, athleteId)

  const athlete = await prisma.athlete.findUnique({
    where: { id: athleteId },
    select: { userId: true },
  })
  if (!athlete || athlete.userId) {
    throw new Error('This athlete already has an app account')
  }

  const { generateAthleteClaimToken } = await import('@/lib/athlete-claim')

  for (let attempt = 0; attempt < 5; attempt++) {
    const token = generateAthleteClaimToken()
    try {
      const updated = await prisma.athlete.update({
        where: { id: athleteId },
        data: { claimToken: token },
        select: { claimToken: true, userId: true },
      })
      if (updated.userId) throw new Error('This athlete already has an app account')
      if (!updated.claimToken) throw new Error('Could not regenerate claim link')
      revalidatePath('/athletes')
      revalidatePath('/dashboard')
      return updated.claimToken
    } catch {
      // retry on unique collision
    }
  }

  throw new Error('Could not regenerate claim link')
}
