import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import {
  ATHLETE_CLAIM_COOKIE,
  athleteClaimCookieOptions,
  parseAthleteClaimToken,
  resolveAthleteClaim,
} from '@/lib/athlete-claim'

type RouteContext = { params: Promise<{ token: string }> }

function clearClaimCookie(response: NextResponse) {
  response.cookies.delete({ name: ATHLETE_CLAIM_COOKIE, path: '/' })
}

/** Sets claim cookie then continues to the accept UI. */
export async function GET(request: Request, context: RouteContext) {
  const { token: rawToken } = await context.params
  const token = parseAthleteClaimToken(decodeURIComponent(rawToken))
  const origin = new URL(request.url).origin

  if (!token) {
    return NextResponse.redirect(`${origin}/`)
  }

  const claim = await resolveAthleteClaim(token)
  const session = await auth()

  if (!claim) {
    const response = NextResponse.redirect(`${origin}/`)
    clearClaimCookie(response)
    return response
  }

  if (claim.alreadyClaimed) {
    const response = NextResponse.redirect(`${origin}/`)
    clearClaimCookie(response)
    return response
  }

  if (session?.user?.id === claim.coachUserId) {
    const response = NextResponse.redirect(`${origin}/dashboard`)
    clearClaimCookie(response)
    return response
  }

  const acceptPath = `/claim/${encodeURIComponent(token)}/accept`

  if (!session?.user?.id) {
    const response = NextResponse.redirect(`${origin}/`)
    response.cookies.set(ATHLETE_CLAIM_COOKIE, token, athleteClaimCookieOptions())
    return response
  }

  const response = NextResponse.redirect(`${origin}${acceptPath}`)
  response.cookies.set(ATHLETE_CLAIM_COOKIE, token, athleteClaimCookieOptions())
  return response
}
