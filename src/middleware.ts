import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  COACH_INVITE_COOKIE,
  coachInviteCookieOptions,
  parseCoachInviteCode,
} from '@/lib/coach-invite-shared'

/** Persist `?invite=` on the sign-in page so registration keeps coach context. */
export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname !== '/') {
    return NextResponse.next()
  }

  const invite = parseCoachInviteCode(request.nextUrl.searchParams.get('invite'))
  if (!invite) {
    return NextResponse.next()
  }

  const existing = parseCoachInviteCode(request.cookies.get(COACH_INVITE_COOKIE)?.value)
  if (existing === invite) {
    return NextResponse.next()
  }

  const response = NextResponse.next()
  response.cookies.set(COACH_INVITE_COOKIE, invite, coachInviteCookieOptions())
  return response
}

export const config = {
  matcher: '/',
}
