import { NextResponse } from 'next/server'
import {
  COACH_INVITE_COOKIE,
  coachInviteCookieOptions,
  parseCoachInviteCode,
  resolveCoachInvite,
} from '@/lib/coach-invite'

type RouteContext = { params: Promise<{ code: string }> }

/** Sets invite cookie (allowed here) then continues to the accept UI. */
export async function GET(request: Request, context: RouteContext) {
  const { code: rawCode } = await context.params
  const code = parseCoachInviteCode(decodeURIComponent(rawCode))
  const origin = new URL(request.url).origin

  if (!code) {
    return NextResponse.redirect(`${origin}/`)
  }

  const invite = await resolveCoachInvite(code)
  const acceptPath = `/join/${encodeURIComponent(code)}/accept`
  const response = NextResponse.redirect(`${origin}${acceptPath}`)

  if (invite) {
    response.cookies.set(COACH_INVITE_COOKIE, invite.code, coachInviteCookieOptions())
  }

  return response
}
