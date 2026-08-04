import { CoachAthleteLinkStatus, UserRole, AthleteStatus } from '@prisma/client'
import { cookies } from 'next/headers'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export type SessionContext = {
  userId: string
  /** Primary role for legacy checks: COACH if coach, else ATHLETE if athlete, else first role. */
  role: UserRole
  roles: UserRole[]
  athleteId: string | null
  name: string
  hasAthlete: boolean
  hasCoach: boolean
  onboardingSkipped: boolean
  needsOnboarding: boolean
}

export function hasRole(roles: UserRole[], role: UserRole): boolean {
  return roles.includes(role)
}

export function isCoach(session: Pick<SessionContext, 'roles'>): boolean {
  return hasRole(session.roles, UserRole.COACH)
}

export function isAthleteRole(session: Pick<SessionContext, 'roles'>): boolean {
  return hasRole(session.roles, UserRole.ATHLETE)
}

export function isAdmin(session: Pick<SessionContext, 'roles'>): boolean {
  return hasRole(session.roles, UserRole.ADMIN)
}

function primaryRole(roles: UserRole[]): UserRole {
  if (roles.includes(UserRole.COACH)) return UserRole.COACH
  if (roles.includes(UserRole.ATHLETE)) return UserRole.ATHLETE
  if (roles.includes(UserRole.ADMIN)) return UserRole.ADMIN
  return UserRole.ATHLETE
}

export async function getSession(): Promise<SessionContext | null> {
  const cookieStore = await cookies()
  const demoEnabled =
    process.env.NODE_ENV === 'development' || process.env.ALLOW_DEMO_LOGIN === '1'
  const demoUserId = demoEnabled ? cookieStore.get('tt_user')?.value : undefined

  // Demo picker / switch overrides Auth.js so you can jump to Coach Alex while testing.
  if (demoUserId) {
    const user = await prisma.user.findUnique({
      where: { id: demoUserId },
      include: {
        athleteProfile: { select: { id: true } },
        coachProfile: { select: { id: true } },
      },
    })
    if (user) {
      const athleteIdCookie = cookieStore.get('tt_athlete')?.value
      const hasAthlete = Boolean(user.athleteProfile)
      const hasCoach = Boolean(user.coachProfile)
      let athleteId: string | null = user.athleteProfile?.id ?? null
      if (hasCoach && athleteIdCookie) {
        const allowed = await coachCanAccessAthlete(user.id, athleteIdCookie)
        if (allowed) athleteId = athleteIdCookie
      } else if (!hasAthlete && athleteIdCookie && hasCoach) {
        const allowed = await coachCanAccessAthlete(user.id, athleteIdCookie)
        if (allowed) athleteId = athleteIdCookie
      }
      return {
        userId: user.id,
        role: primaryRole(user.roles),
        roles: user.roles,
        athleteId,
        name: user.name,
        hasAthlete,
        hasCoach,
        onboardingSkipped: Boolean(user.onboardingSkippedAt),
        needsOnboarding: !hasAthlete && !hasCoach && !user.onboardingSkippedAt,
      }
    }
  }

  const session = await auth()
  if (session?.user?.id) {
    const roles = session.user.roles ?? []
    const athleteIdCookie = cookieStore.get('tt_athlete')?.value ?? null
    const hasAthlete = session.user.hasAthlete
    const hasCoach = session.user.hasCoach
    const onboardingSkipped = session.user.onboardingSkipped

    let athleteId: string | null = null
    if (hasAthlete) {
      const profile = await prisma.athlete.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      })
      athleteId = profile?.id ?? null
    }
    if (hasCoach && athleteIdCookie) {
      const allowed = await coachCanAccessAthlete(session.user.id, athleteIdCookie)
      if (allowed) athleteId = athleteIdCookie
    } else if (!hasAthlete && athleteIdCookie && hasCoach) {
      const allowed = await coachCanAccessAthlete(session.user.id, athleteIdCookie)
      if (allowed) athleteId = athleteIdCookie
    }

    // Athlete viewing own plan takes precedence unless coach explicitly switched
    if (hasAthlete && hasCoach && athleteIdCookie) {
      const allowed = await coachCanAccessAthlete(session.user.id, athleteIdCookie)
      athleteId = allowed ? athleteIdCookie : athleteId
    } else if (hasAthlete && !athleteIdCookie) {
      // keep own athlete id
    }

    return {
      userId: session.user.id,
      role: primaryRole(roles),
      roles,
      athleteId,
      name: session.user.name ?? 'User',
      hasAthlete,
      hasCoach,
      onboardingSkipped,
      needsOnboarding: !hasAthlete && !hasCoach && !onboardingSkipped,
    }
  }

  return null
}

export async function requireSession(): Promise<SessionContext> {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')
  return session
}

export async function requireAthleteSession(): Promise<SessionContext & { athleteId: string }> {
  const session = await requireSession()
  if (!session.hasAthlete) {
    throw new Error('Strava is only available for athlete accounts')
  }
  const own = await prisma.athlete.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  })
  if (!own) {
    throw new Error('No athlete profile linked to this account')
  }
  return { ...session, athleteId: own.id }
}

export async function coachCanAccessAthlete(
  coachUserId: string,
  athleteId: string,
): Promise<boolean> {
  const link = await prisma.coachAthleteLink.findFirst({
    where: {
      athleteId,
      status: CoachAthleteLinkStatus.ACCEPTED,
      coachProfile: { userId: coachUserId },
    },
    select: { id: true },
  })
  if (link) return true
  const legacy = await prisma.athlete.findFirst({
    where: { id: athleteId, coachId: coachUserId },
    select: { id: true },
  })
  return Boolean(legacy)
}

export async function requireCoachOwnsAthlete(coachUserId: string, athleteId: string) {
  const ok = await coachCanAccessAthlete(coachUserId, athleteId)
  if (!ok) throw new Error('Athlete not found')
}

export async function getCoachAthletes(coachUserId: string) {
  const fromLinks = await prisma.athlete.findMany({
    where: {
      OR: [
        { coachId: coachUserId },
        {
          coachLinks: {
            some: {
              status: CoachAthleteLinkStatus.ACCEPTED,
              coachProfile: { userId: coachUserId },
            },
          },
        },
      ],
    },
    orderBy: { name: 'asc' },
  })
  // Dedupe by id
  const seen = new Set<string>()
  return fromLinks.filter((a) => {
    if (seen.has(a.id)) return false
    seen.add(a.id)
    return true
  })
}

export async function resolveAthleteId(session: SessionContext): Promise<string | null> {
  if (session.athleteId) {
    if (isCoach(session) && session.hasAthlete && session.athleteId) {
      return session.athleteId
    }
    if (isAthleteRole(session) && !isCoach(session)) return session.athleteId
    if (isCoach(session)) return session.athleteId
  }

  if (isAthleteRole(session) && session.hasAthlete) {
    const own = await prisma.athlete.findUnique({
      where: { userId: session.userId },
      select: { id: true },
    })
    if (own) return own.id
  }

  if (isCoach(session)) {
    const athletes = await getCoachAthletes(session.userId)
    const active = athletes.find((a) => a.status === AthleteStatus.ACTIVE)
    return active?.id ?? athletes[0]?.id ?? null
  }

  return null
}

/** Prisma where fragment: athletes this coach may access. */
export function athleteOwnedByCoachWhere(coachUserId: string) {
  return {
    OR: [
      { coachId: coachUserId },
      {
        coachLinks: {
          some: {
            status: CoachAthleteLinkStatus.ACCEPTED,
            coachProfile: { userId: coachUserId },
          },
        },
      },
    ],
  }
}

/** True if the athlete has an accepted coach link (or legacy coachId). */
export async function athleteHasConnectedCoach(athleteId: string): Promise<boolean> {
  const accepted = await prisma.coachAthleteLink.findFirst({
    where: {
      athleteId,
      status: CoachAthleteLinkStatus.ACCEPTED,
    },
    select: { id: true },
  })
  if (accepted) return true
  const legacy = await prisma.athlete.findFirst({
    where: { id: athleteId, coachId: { not: null } },
    select: { id: true },
  })
  return Boolean(legacy)
}
