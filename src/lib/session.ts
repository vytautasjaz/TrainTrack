import { cookies } from 'next/headers'
import { prisma } from './prisma'
import type { UserRole } from '@prisma/client'
import { AthleteStatus } from '@prisma/client'

export type SessionContext = {
  userId: string
  role: UserRole
  athleteId: string | null
  name: string
}

export async function getSession(): Promise<SessionContext | null> {
  const cookieStore = await cookies()
  const userId = cookieStore.get('tt_user')?.value
  if (!userId) return null

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { athleteProfile: true },
  })
  if (!user) return null

  const athleteIdCookie = cookieStore.get('tt_athlete')?.value

  return {
    userId: user.id,
    role: user.role,
    athleteId:
      user.role === 'ATHLETE'
        ? user.athleteProfile?.id ?? athleteIdCookie ?? null
        : athleteIdCookie ?? null,
    name: user.name,
  }
}

export async function requireSession(): Promise<SessionContext> {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')
  return session
}

export async function requireAthleteSession(): Promise<SessionContext & { athleteId: string }> {
  const session = await requireSession()
  if (session.role !== 'ATHLETE') {
    throw new Error('Strava is only available for athlete accounts')
  }
  if (!session.athleteId) {
    throw new Error('No athlete profile linked to this account')
  }
  return { ...session, athleteId: session.athleteId }
}

export async function getCoachAthletes(coachId: string) {
  return prisma.athlete.findMany({
    where: { coachId },
    orderBy: { name: 'asc' },
  })
}

export async function resolveAthleteId(session: SessionContext): Promise<string | null> {
  if (session.role === 'ATHLETE') return session.athleteId
  if (session.athleteId) return session.athleteId
  if (session.role === 'COACH') {
    const active = await prisma.athlete.findFirst({
      where: { coachId: session.userId, status: AthleteStatus.ACTIVE },
      orderBy: { name: 'asc' },
    })
    if (active) return active.id

    const first = await prisma.athlete.findFirst({
      where: { coachId: session.userId },
      orderBy: { name: 'asc' },
    })
    return first?.id ?? null
  }
  return null
}
