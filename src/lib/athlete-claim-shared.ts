export const ATHLETE_CLAIM_COOKIE = 'tt_athlete_claim'

export type AthleteClaimInfo = {
  token: string
  athleteId: string
  athleteName: string
  coachUserId: string
  coachName: string
  alreadyClaimed: boolean
}

const CLAIM_TOKEN_RE = /^[A-Za-z0-9_-]{24,64}$/

export function parseAthleteClaimToken(raw: string | null | undefined): string | null {
  if (!raw) return null
  const token = raw.trim()
  if (!CLAIM_TOKEN_RE.test(token)) return null
  return token
}

export function athleteClaimPath(token: string): string {
  return `/claim/${encodeURIComponent(token)}`
}

const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 30 // 30 days

export function athleteClaimCookieOptions(maxAge = COOKIE_MAX_AGE_SEC) {
  return {
    path: '/',
    maxAge,
    sameSite: 'lax' as const,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  }
}
