import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  COACH_INVITE_COOKIE,
  coachInviteCookieOptions,
  parseCoachInviteCode,
} from '@/lib/coach-invite-shared'

/** Persist `?invite=` on the sign-in page so registration keeps coach context. */
export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', request.nextUrl.pathname)

  if (request.nextUrl.pathname !== '/') {
    return NextResponse.next({
      request: { headers: requestHeaders },
    })
  }

  const invite = parseCoachInviteCode(request.nextUrl.searchParams.get('invite'))
  if (!invite) {
    return NextResponse.next({
      request: { headers: requestHeaders },
    })
  }

  const existing = parseCoachInviteCode(request.cookies.get(COACH_INVITE_COOKIE)?.value)
  if (existing === invite) {
    return NextResponse.next({
      request: { headers: requestHeaders },
    })
  }

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })
  response.cookies.set(COACH_INVITE_COOKIE, invite, coachInviteCookieOptions())
  return response
}

export const config = {
  matcher: ['/', '/style-guide', '/style-guide/:path*', '/design-preview', '/design-preview/:path*'],
}
