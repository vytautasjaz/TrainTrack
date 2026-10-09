import { SignJWT, jwtVerify } from 'jose'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const MOBILE_TYP = 'mobile'
const TOKEN_TTL = '30d'

export type MobileAthleteSession = {
  userId: string
  athleteId: string
  name: string
  email: string
}

function secretKey() {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error('AUTH_SECRET is not set')
  return new TextEncoder().encode(secret)
}

export async function signMobileToken(input: {
  userId: string
  athleteId: string
}): Promise<string> {
  return new SignJWT({
    typ: MOBILE_TYP,
    athleteId: input.athleteId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(input.userId)
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(secretKey())
}

export async function verifyMobileToken(
  token: string,
): Promise<{ userId: string; athleteId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey())
    if (payload.typ !== MOBILE_TYP) return null
    const userId = typeof payload.sub === 'string' ? payload.sub : null
    const athleteId =
      typeof payload.athleteId === 'string' ? payload.athleteId : null
    if (!userId || !athleteId) return null
    return { userId, athleteId }
  } catch {
    return null
  }
}

function bearerFromRequest(request: Request): string | null {
  const header = request.headers.get('authorization')
  if (!header) return null
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || null
}

/**
 * Resolve the signed-in user's own athlete profile for the mobile app.
 * Coach-only accounts are rejected (403).
 */
export async function resolveMobileAthleteForUser(userId: string): Promise<
  | { ok: true; session: MobileAthleteSession }
  | { ok: false; status: 401 | 403; error: string }
> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      disabledAt: true,
      athleteProfile: { select: { id: true } },
    },
  })
  if (!user || user.disabledAt) {
    return { ok: false, status: 401, error: 'Invalid session.' }
  }
  if (!user.athleteProfile) {
    return {
      ok: false,
      status: 403,
      error: 'Athlete profile required. Sign in with an athlete account.',
    }
  }
  return {
    ok: true,
    session: {
      userId: user.id,
      athleteId: user.athleteProfile.id,
      name: user.name?.trim() || 'Athlete',
      email: user.email ?? '',
    },
  }
}

export async function requireMobileAthlete(
  request: Request,
): Promise<
  | { ok: true; session: MobileAthleteSession }
  | { ok: false; response: NextResponse }
> {
  const token = bearerFromRequest(request)
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }
  const claims = await verifyMobileToken(token)
  if (!claims) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Invalid token' }, { status: 401 }),
    }
  }
  // Prefer live athlete id from DB over token claim (profile may change).
  const resolved = await resolveMobileAthleteForUser(claims.userId)
  if (!resolved.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: resolved.error },
        { status: resolved.status },
      ),
    }
  }
  if (resolved.session.athleteId !== claims.athleteId) {
    // Stale token after profile change — still allow if DB athlete exists.
  }
  return { ok: true, session: resolved.session }
}

export function mobileJsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status })
}
