'use server'

import bcrypt from 'bcryptjs'
import { AuthError } from 'next-auth'
import { redirect } from 'next/navigation'
import { UserRole } from '@prisma/client'
import { signIn, signOut } from '@/auth'
import { prisma } from '@/lib/prisma'
import { generateCoachingCode, normalizeCoachingCode } from '@/lib/coaching-code'
import {
  requireSession,
  isCoach,
  coachCanAccessAthlete,
} from '@/lib/session'
import { cookies } from 'next/headers'
import { CoachAthleteLinkStatus } from '@prisma/client'
import { safeRedirectPath } from '@/lib/safe-redirect'
import { revalidatePath } from 'next/cache'

export async function registerWithEmail(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim()
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase()
  const password = String(formData.get('password') ?? '')

  if (!name || name.length < 2) throw new Error('Name is required')
  if (!email || !email.includes('@')) throw new Error('Valid email is required')
  if (password.length < 8) throw new Error('Password must be at least 8 characters')

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) throw new Error('An account with this email already exists')

  const passwordHash = await bcrypt.hash(password, 12)
  const cookieStore = await cookies()
  cookieStore.delete('tt_user')
  cookieStore.delete('tt_athlete')

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      roles: [],
    },
  })

  await signIn('credentials', {
    email,
    password,
    redirectTo: '/onboarding',
  })
}

export async function signInWithEmail(formData: FormData) {
  const cookieStore = await cookies()
  cookieStore.delete('tt_user')
  cookieStore.delete('tt_athlete')

  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase()
  const password = String(formData.get('password') ?? '')
  try {
    await signIn('credentials', {
      email,
      password,
      redirectTo: '/dashboard',
    })
  } catch (err) {
    if (err instanceof AuthError) {
      throw new Error('Invalid email or password')
    }
    throw err
  }
}

export async function signInWithGoogle() {
  const cookieStore = await cookies()
  cookieStore.delete('tt_user')
  cookieStore.delete('tt_athlete')
  await signIn('google', { redirectTo: '/dashboard' })
}

export async function signInWithStrava() {
  const cookieStore = await cookies()
  cookieStore.delete('tt_user')
  cookieStore.delete('tt_athlete')
  await signIn('strava', { redirectTo: '/dashboard' })
}

export async function signOutAction() {
  const cookieStore = await cookies()
  cookieStore.delete('tt_user')
  cookieStore.delete('tt_athlete')
  await signOut({ redirectTo: '/' })
}

export async function startTraining() {
  const session = await requireSession()
  const existing = await prisma.athlete.findUnique({
    where: { userId: session.userId },
  })
  if (existing) {
    await prisma.user.update({
      where: { id: session.userId },
      data: {
        roles: { set: Array.from(new Set([...session.roles, UserRole.ATHLETE])) },
      },
    })
    redirect('/dashboard')
  }

  await prisma.$transaction(async (tx) => {
    await tx.athlete.create({
      data: {
        userId: session.userId,
        name: session.name,
        coachId: null,
      },
    })
    const user = await tx.user.findUniqueOrThrow({ where: { id: session.userId } })
    await tx.user.update({
      where: { id: session.userId },
      data: {
        roles: { set: Array.from(new Set([...user.roles, UserRole.ATHLETE])) },
        onboardingSkippedAt: null,
      },
    })
  })

  redirect('/dashboard')
}

export async function becomeCoach() {
  const session = await requireSession()
  const existing = await prisma.coachProfile.findUnique({
    where: { userId: session.userId },
  })
  if (existing) {
    await prisma.user.update({
      where: { id: session.userId },
      data: {
        roles: { set: Array.from(new Set([...session.roles, UserRole.COACH])) },
      },
    })
    redirect('/dashboard')
  }

  let code = generateCoachingCode()
  for (let i = 0; i < 5; i++) {
    const clash = await prisma.coachProfile.findUnique({ where: { coachingCode: code } })
    if (!clash) break
    code = generateCoachingCode()
  }

  await prisma.$transaction(async (tx) => {
    await tx.coachProfile.create({
      data: {
        userId: session.userId,
        coachingCode: code,
      },
    })
    const user = await tx.user.findUniqueOrThrow({ where: { id: session.userId } })
    await tx.user.update({
      where: { id: session.userId },
      data: {
        roles: { set: Array.from(new Set([...user.roles, UserRole.COACH])) },
        onboardingSkippedAt: null,
      },
    })
  })

  redirect('/dashboard')
}

export async function skipOnboarding() {
  const session = await requireSession()
  await prisma.user.update({
    where: { id: session.userId },
    data: { onboardingSkippedAt: new Date() },
  })
  redirect('/dashboard')
}

export async function linkGoogleAccount() {
  await signIn('google', { redirectTo: '/settings/account' })
}

export async function linkStravaAccount() {
  await signIn('strava', { redirectTo: '/settings/account' })
}

export async function setPassword(formData: FormData) {
  const session = await requireSession()
  const password = String(formData.get('password') ?? '')
  if (password.length < 8) throw new Error('Password must be at least 8 characters')
  const passwordHash = await bcrypt.hash(password, 12)
  await prisma.user.update({
    where: { id: session.userId },
    data: { passwordHash },
  })
  revalidatePath('/settings/account')
}

export async function unlinkProvider(formData: FormData) {
  const session = await requireSession()
  const provider = String(formData.get('provider') ?? '')
  if (provider !== 'google' && provider !== 'strava') {
    throw new Error('Invalid provider')
  }

  const accounts = await prisma.account.findMany({
    where: { userId: session.userId },
  })
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { passwordHash: true },
  })
  const remaining = accounts.filter((a) => a.provider !== provider)
  if (remaining.length === 0 && !user?.passwordHash) {
    throw new Error('Add a password or another sign-in method before unlinking')
  }

  await prisma.account.deleteMany({
    where: { userId: session.userId, provider },
  })
  if (provider === 'strava') {
    await prisma.stravaConnection.deleteMany({ where: { userId: session.userId } })
  }
  revalidatePath('/settings/account')
}

export async function requestCoachConnection(formData: FormData) {
  const session = await requireSession()
  if (!session.hasAthlete) throw new Error('Start training before connecting to a coach')

  const athlete = await prisma.athlete.findUnique({
    where: { userId: session.userId },
  })
  if (!athlete) throw new Error('Athlete profile not found')

  const code = normalizeCoachingCode(String(formData.get('coachingCode') ?? ''))
  const coachProfile = await prisma.coachProfile.findUnique({
    where: { coachingCode: code },
  })
  if (!coachProfile) throw new Error('Invalid coach code')
  if (coachProfile.userId === session.userId) {
    throw new Error('You cannot connect to yourself')
  }

  await prisma.coachAthleteLink.upsert({
    where: {
      coachProfileId_athleteId: {
        coachProfileId: coachProfile.id,
        athleteId: athlete.id,
      },
    },
    create: {
      coachProfileId: coachProfile.id,
      athleteId: athlete.id,
      status: CoachAthleteLinkStatus.PENDING,
    },
    update: {
      status: CoachAthleteLinkStatus.PENDING,
    },
  })

  revalidatePath('/settings/account')
  revalidatePath('/dashboard')
}

export async function respondCoachRequest(formData: FormData) {
  const session = await requireSession()
  if (!isCoach(session) && !session.hasCoach) throw new Error('Coach only')

  const linkId = String(formData.get('linkId') ?? '')
  const decision = String(formData.get('decision') ?? '')
  if (decision !== 'accept' && decision !== 'reject') {
    throw new Error('Invalid decision')
  }

  const link = await prisma.coachAthleteLink.findFirst({
    where: {
      id: linkId,
      coachProfile: { userId: session.userId },
    },
    include: { athlete: true, coachProfile: true },
  })
  if (!link) throw new Error('Request not found')

  const status =
    decision === 'accept'
      ? CoachAthleteLinkStatus.ACCEPTED
      : CoachAthleteLinkStatus.REJECTED

  await prisma.$transaction(async (tx) => {
    await tx.coachAthleteLink.update({
      where: { id: link.id },
      data: { status },
    })
    if (decision === 'accept' && !link.athlete.coachId) {
      await tx.athlete.update({
        where: { id: link.athleteId },
        data: { coachId: session.userId },
      })
    }
  })

  revalidatePath('/settings/account')
  revalidatePath('/dashboard')
}

export async function switchAthlete(formData: FormData) {
  const session = await requireSession()
  if (!isCoach(session)) throw new Error('Coach only')

  const athleteId = formData.get('athleteId') as string
  const redirectTo = safeRedirectPath(formData.get('redirectTo') as string | null, '/training')

  const ok = await coachCanAccessAthlete(session.userId, athleteId)
  if (!ok) throw new Error('Athlete not found')

  const cookieStore = await cookies()
  cookieStore.set('tt_athlete', athleteId, { path: '/' })
  redirect(redirectTo)
}

export async function setDemoSession(userId: string, athleteId?: string) {
  if (process.env.NODE_ENV !== 'development' && process.env.ALLOW_DEMO_LOGIN !== '1') {
    throw new Error('Demo login disabled')
  }
  const cookieStore = await cookies()
  cookieStore.set('tt_user', userId, { path: '/' })
  if (athleteId) cookieStore.set('tt_athlete', athleteId, { path: '/' })
}
