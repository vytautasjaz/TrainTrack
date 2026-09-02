import { CoachAthleteLinkStatus, UserRole, AthleteStatus } from '@prisma/client'
import { cookies } from 'next/headers'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export type AppViewMode = 'coach' | 'athlete'

export const VIEW_MODE_COOKIE = 'tt_view_mode'

export type SessionContext = {
  userId: string
  /** Primary role for legacy checks: COACH if coach, else ATHLETE if athlete, else first role. */
  role: UserRole
  roles: UserRole[]
  athleteId: string | null
  name: string
  hasAthlete: boolean
  hasCoach: boolean
  /** Active workspace when user has both athlete + coach profiles. */
  viewMode: AppViewMode
  onboardingSkipped: boolean
  needsOnboarding: boolean
}

export function hasRole(roles: UserRole[], role: UserRole): boolean {
  return roles.includes(role)
}

/**
 * Permission: user can act as coach (regardless of UI workspace).
 * Prefer `hasCoach` (profile) when present — `roles` can lag behind profile creation.
 */
export function isCoach(
  session: Pick<SessionContext, 'roles'> & Partial<Pick<SessionContext, 'hasCoach'>>,
): boolean {
  if (session.hasCoach) return true
  return hasRole(session.roles, UserRole.COACH)
}

export function isAthleteRole(
  session: Pick<SessionContext, 'roles'> & Partial<Pick<SessionContext, 'hasAthlete'>>,
): boolean {
  if (session.hasAthlete) return true
  return hasRole(session.roles, UserRole.ATHLETE)
}

export function isAdmin(session: Pick<SessionContext, 'roles'>): boolean {
  return hasRole(session.roles, UserRole.ADMIN)
}

/** UI workspace: coach nav/plan editing vs athlete self-view. */
export function isCoachView(
  session: Pick<SessionContext, 'viewMode' | 'hasCoach'>,
): boolean {
  return session.hasCoach && session.viewMode === 'coach'
}

export function canSwitchViewMode(
  session: Pick<SessionContext, 'hasAthlete' | 'hasCoach'>,
): boolean {
  return session.hasAthlete && session.hasCoach
}

function resolveViewMode(
  raw: string | undefined,
  hasAthlete: boolean,
  hasCoach: boolean,
): AppViewMode {
  if (hasCoach && hasAthlete) {
    if (raw === 'athlete' || raw === 'coach') return raw
    return 'coach'
  }
  if (hasCoach) return 'coach'
  return 'athlete'
}

function primaryRole(
  roles: UserRole[],
  opts?: { hasCoach?: boolean; hasAthlete?: boolean },
): UserRole {
  if (roles.includes(UserRole.COACH) || opts?.hasCoach) return UserRole.COACH
  if (roles.includes(UserRole.ATHLETE) || opts?.hasAthlete) return UserRole.ATHLETE
  if (roles.includes(UserRole.ADMIN)) return UserRole.ADMIN
  return UserRole.ATHLETE
}

/** Keep `User.roles` aligned with athlete/coach profiles (roles can lag onboarding). */
function rolesWithProfiles(
  roles: UserRole[],
  hasAthlete: boolean,
  hasCoach: boolean,
): UserRole[] {
  const next = new Set(roles)
  if (hasAthlete) next.add(UserRole.ATHLETE)
  if (hasCoach) next.add(UserRole.COACH)
  return [...next]
}

export async function getSession(): Promise<SessionContext | null> {
  const cookieStore = await cookies()

  const session = await auth()
  if (session?.user?.id) {
    const athleteIdCookie = cookieStore.get('tt_athlete')?.value ?? null
    const hasAthlete = session.user.hasAthlete
    const hasCoach = session.user.hasCoach
    const roles = rolesWithProfiles(session.user.roles ?? [], hasAthlete, hasCoach)
    if (roles.length !== (session.user.roles ?? []).length) {
      void prisma.user
        .update({ where: { id: session.user.id }, data: { roles } })
        .catch(() => {})
    }
    const onboardingSkipped = session.user.onboardingSkipped
    const viewMode = resolveViewMode(
      cookieStore.get(VIEW_MODE_COOKIE)?.value,
      hasAthlete,
      hasCoach,
    )

    let athleteId: string | null = null
    if (hasAthlete) {
      const profile = await prisma.athlete.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      })
      athleteId = profile?.id ?? null
    }
    if (viewMode === 'coach' && hasCoach && athleteIdCookie) {
      const allowed = await coachCanAccessAthlete(session.user.id, athleteIdCookie)
      if (allowed) athleteId = athleteIdCookie
    } else if (viewMode === 'athlete' && hasAthlete) {
      // keep own athlete id
    } else if (!hasAthlete && athleteIdCookie && hasCoach) {
      const allowed = await coachCanAccessAthlete(session.user.id, athleteIdCookie)
      if (allowed) athleteId = athleteIdCookie
    }

    return {
      userId: session.user.id,
      role: primaryRole(roles, { hasAthlete, hasCoach }),
      roles,
      athleteId,
      name: session.user.name ?? 'User',
      hasAthlete,
      hasCoach,
      viewMode,
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
  // Athlete workspace: always the signed-in user's own athlete profile.
  if (session.hasAthlete && session.viewMode === 'athlete') {
    const own = await prisma.athlete.findUnique({
      where: { userId: session.userId },
      select: { id: true },
    })
    return own?.id ?? session.athleteId
  }

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

  if (isCoachView(session)) {
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
