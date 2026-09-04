import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import {
  COACH_INVITE_COOKIE,
  coachInviteCookieOptions,
  parseCoachInviteCode,
  resolveCoachInvite,
} from '@/lib/coach-invite'

type RouteContext = { params: Promise<{ code: string }> }

function clearInviteCookie(response: NextResponse) {
  response.cookies.delete({ name: COACH_INVITE_COOKIE, path: '/' })
}

/** Sets invite cookie (allowed here) then continues to the accept UI. */
export async function GET(request: Request, context: RouteContext) {
  const { code: rawCode } = await context.params
  const code = parseCoachInviteCode(decodeURIComponent(rawCode))
  const origin = new URL(request.url).origin

  if (!code) {
    return NextResponse.redirect(`${origin}/?error=InviteNotFound`)
  }

  const invite = await resolveCoachInvite(code)
  if (!invite) {
    return NextResponse.redirect(`${origin}/?error=InviteNotFound`)
  }

  const session = await auth()

  if (session?.user?.id === invite.coachUserId) {
    const response = NextResponse.redirect(`${origin}/dashboard`)
    clearInviteCookie(response)
    return response
  }

  const acceptPath = `/join/${encodeURIComponent(invite.code)}/accept`
  const response = NextResponse.redirect(`${origin}${acceptPath}`)
  response.cookies.set(COACH_INVITE_COOKIE, invite.code, coachInviteCookieOptions())
  return response
}
