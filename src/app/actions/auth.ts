'use server'

import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'
import { UserRole } from '@prisma/client'
import { signIn, signOut } from '@/auth'
import { prisma } from '@/lib/prisma'
import { generateCoachingCode, normalizeCoachingCode } from '@/lib/coaching-code'
import {
  clearCoachInviteCookie,
  coachInvitePath,
  getCoachInviteCookie,
  resolveCoachInvite,
} from '@/lib/coach-invite'
import {
  requireSession,
  isCoach,
  coachCanAccessAthlete,
} from '@/lib/session'
import { cookies } from 'next/headers'
import { CoachAthleteLinkStatus } from '@prisma/client'
import { safeRedirectPath } from '@/lib/safe-redirect'
import { revalidatePath } from 'next/cache'
import {
  type AuthFormState,
  INITIAL_AUTH_FORM_STATE,
  isRedirectError,
  mapAuthActionError,
} from '@/lib/auth-form-errors'

export async function registerWithEmail(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const name = String(formData.get('name') ?? '').trim()
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase()
  const password = String(formData.get('password') ?? '')

  if (!name || name.length < 2) {
    return { error: 'Name is required.' }
  }
  if (!email || !email.includes('@')) {
    return { error: 'Enter a valid email address.' }
  }
  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters.' }
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return { error: 'An account with this email already exists. Sign in instead.' }
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const cookieStore = await cookies()
  cookieStore.delete('tt_user')
  cookieStore.delete('tt_athlete')

  try {
    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        roles: [],
      },
    })
  } catch (err) {
    return { error: mapAuthActionError(err, 'Could not create your account.') }
  }

  try {
    await signIn('credentials', {
      email,
      password,
      redirectTo: '/onboarding',
    })
  } catch (err) {
    if (isRedirectError(err)) throw err
    return {
      error: mapAuthActionError(
        err,
        'Account created, but sign-in failed. Try signing in with your email and password.',
      ),
    }
  }

  return INITIAL_AUTH_FORM_STATE
}

export async function signInWithEmail(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const cookieStore = await cookies()
  cookieStore.delete('tt_user')
  cookieStore.delete('tt_athlete')

  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase()
  const password = String(formData.get('password') ?? '')
  if (!email || !email.includes('@')) {
    return { error: 'Enter a valid email address.' }
  }
  if (!password) {
    return { error: 'Password is required.' }
  }

  const inviteCode = await getCoachInviteCookie()
  const redirectTo = inviteCode ? coachInvitePath(inviteCode) : '/dashboard'
  try {
    await signIn('credentials', {
      email,
      password,
      redirectTo,
    })
  } catch (err) {
    if (isRedirectError(err)) throw err
    return { error: mapAuthActionError(err, 'Invalid email or password.') }
  }

  return INITIAL_AUTH_FORM_STATE
}

export async function signInWithGoogle() {
  const cookieStore = await cookies()
  cookieStore.delete('tt_user')
  cookieStore.delete('tt_athlete')
  const inviteCode = await getCoachInviteCookie()
  await signIn('google', {
    redirectTo: inviteCode ? coachInvitePath(inviteCode) : '/dashboard',
  })
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
    const inviteCode = await getCoachInviteCookie()
    if (inviteCode) {
      redirect(coachInvitePath(inviteCode))
    }
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

  const inviteCode = await getCoachInviteCookie()
  if (inviteCode) {
    redirect(coachInvitePath(inviteCode))
  }

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
  await signIn('google', {
    redirectTo: '/settings#sign-in',
    scope: 'openid email profile https://www.googleapis.com/auth/calendar.events',
    access_type: 'offline',
    prompt: 'consent',
  })
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
  revalidatePath('/settings/preferences')
  revalidatePath('/settings/account')
}

export async function unlinkProvider(formData: FormData) {
  const session = await requireSession()
  const provider = String(formData.get('provider') ?? '')
  if (provider !== 'google') {
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
  revalidatePath('/settings/preferences')
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
    await coachMyself()
    return
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

/**
 * Dual-role user: link own athlete profile to own coach profile (ACCEPTED immediately).
 */
export async function coachMyself(): Promise<void> {
  const session = await requireSession()
  if (!session.hasAthlete) throw new Error('Start training before coaching yourself')
  if (!session.hasCoach) throw new Error('Become a coach before coaching yourself')

  const athlete = await prisma.athlete.findUnique({
    where: { userId: session.userId },
    select: { id: true, coachId: true },
  })
  if (!athlete) throw new Error('Athlete profile not found')

  const coachProfile = await prisma.coachProfile.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  })
  if (!coachProfile) throw new Error('Coach profile not found')

  const alreadySelf = await prisma.coachAthleteLink.findFirst({
    where: {
      athleteId: athlete.id,
      coachProfileId: coachProfile.id,
      status: CoachAthleteLinkStatus.ACCEPTED,
    },
  })
  if (alreadySelf && athlete.coachId === session.userId) {
    return
  }

  await prisma.$transaction(async (tx) => {
    await tx.coachAthleteLink.updateMany({
      where: {
        athleteId: athlete.id,
        status: {
          in: [CoachAthleteLinkStatus.ACCEPTED, CoachAthleteLinkStatus.PENDING],
        },
        NOT: { coachProfileId: coachProfile.id },
      },
      data: { status: CoachAthleteLinkStatus.REMOVED },
    })

    await tx.coachAthleteLink.upsert({
      where: {
        coachProfileId_athleteId: {
          coachProfileId: coachProfile.id,
          athleteId: athlete.id,
        },
      },
      create: {
        coachProfileId: coachProfile.id,
        athleteId: athlete.id,
        status: CoachAthleteLinkStatus.ACCEPTED,
      },
      update: {
        status: CoachAthleteLinkStatus.ACCEPTED,
      },
    })

    await tx.athlete.update({
      where: { id: athlete.id },
      data: { coachId: session.userId },
    })
  })

  revalidatePath('/settings/account')
  revalidatePath('/dashboard')
  revalidatePath('/training')
}

/** Athlete leaves their accepted coach (and cancels pending requests). */
export async function leaveCoach(): Promise<void> {
  const session = await requireSession()
  if (!session.hasAthlete) throw new Error('Athlete only')

  const athlete = await prisma.athlete.findUnique({
    where: { userId: session.userId },
    select: { id: true, coachId: true },
  })
  if (!athlete) throw new Error('Athlete profile not found')

  await prisma.$transaction(async (tx) => {
    await tx.coachAthleteLink.updateMany({
      where: {
        athleteId: athlete.id,
        status: {
          in: [CoachAthleteLinkStatus.ACCEPTED, CoachAthleteLinkStatus.PENDING],
        },
      },
      data: { status: CoachAthleteLinkStatus.REMOVED },
    })
    if (athlete.coachId) {
      await tx.athlete.update({
        where: { id: athlete.id },
        data: { coachId: null },
      })
    }
  })

  revalidatePath('/settings/account')
  revalidatePath('/dashboard')
  revalidatePath('/training')
}

/**
 * Athlete switches to a new coach by invite code:
 * removes current accepted/pending links, then requests the new coach.
 * Own coaching code → coachMyself() (accepted immediately).
 */
export async function switchCoach(formData: FormData): Promise<void> {
  const session = await requireSession()
  if (!session.hasAthlete) throw new Error('Start training before connecting to a coach')

  const athlete = await prisma.athlete.findUnique({
    where: { userId: session.userId },
    select: { id: true, coachId: true },
  })
  if (!athlete) throw new Error('Athlete profile not found')

  const code = normalizeCoachingCode(String(formData.get('coachingCode') ?? ''))
  const coachProfile = await prisma.coachProfile.findUnique({
    where: { coachingCode: code },
    select: { id: true, userId: true },
  })
  if (!coachProfile) throw new Error('Invalid coach code')
  if (coachProfile.userId === session.userId) {
    await coachMyself()
    return
  }

  const alreadyAccepted = await prisma.coachAthleteLink.findFirst({
    where: {
      athleteId: athlete.id,
      coachProfileId: coachProfile.id,
      status: CoachAthleteLinkStatus.ACCEPTED,
    },
  })
  if (alreadyAccepted) {
    throw new Error('You are already connected to this coach')
  }

  await prisma.$transaction(async (tx) => {
    await tx.coachAthleteLink.updateMany({
      where: {
        athleteId: athlete.id,
        status: {
          in: [CoachAthleteLinkStatus.ACCEPTED, CoachAthleteLinkStatus.PENDING],
        },
        NOT: { coachProfileId: coachProfile.id },
      },
      data: { status: CoachAthleteLinkStatus.REMOVED },
    })

    if (athlete.coachId && athlete.coachId !== coachProfile.userId) {
      await tx.athlete.update({
        where: { id: athlete.id },
        data: { coachId: null },
      })
    }

    await tx.coachAthleteLink.upsert({
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
  })

  revalidatePath('/settings/account')
  revalidatePath('/dashboard')
  revalidatePath('/training')
}

/**
 * Athlete accepts a coach-generated invite link.
 * Coach already invited them, so the link becomes ACCEPTED immediately.
 */
export async function acceptCoachInvite(formData: FormData): Promise<void> {
  const session = await requireSession()
  if (!session.hasAthlete) throw new Error('Start training before connecting to a coach')

  const codeFromForm = String(formData.get('coachingCode') ?? '')
  const code = (await getCoachInviteCookie()) ?? codeFromForm
  const invite = await resolveCoachInvite(code)
  if (!invite) {
    await clearCoachInviteCookie()
    throw new Error('This invite link is no longer valid')
  }
  if (invite.coachUserId === session.userId) {
    await clearCoachInviteCookie()
    await coachMyself()
    redirect('/dashboard')
  }

  const athlete = await prisma.athlete.findUnique({
    where: { userId: session.userId },
    select: { id: true, coachId: true },
  })
  if (!athlete) throw new Error('Athlete profile not found')

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

  await clearCoachInviteCookie()
  revalidatePath('/settings/account')
  revalidatePath('/dashboard')
  revalidatePath('/training')
  revalidatePath('/athletes')
  redirect('/dashboard')
}

export async function declineCoachInvite(): Promise<void> {
  await clearCoachInviteCookie()
  redirect('/dashboard')
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
