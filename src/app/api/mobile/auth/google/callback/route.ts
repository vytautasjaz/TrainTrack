import {
  appendErrorToReturnTo,
  appendTokenToReturnTo,
  exchangeGoogleAuthCode,
  mobileGoogleRedirectUri,
  verifyGoogleOAuthState,
} from '@/lib/mobile-google-oauth'
import {
  resolveMobileAthleteForUser,
  signMobileToken,
} from '@/lib/mobile-auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

/**
 * Google OAuth callback for Expo. Issues a mobile JWT and redirects to the app.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const oauthError = url.searchParams.get('error')

  const parsed = state ? await verifyGoogleOAuthState(state) : null
  if (!parsed) {
    return NextResponse.json(
      { error: 'Invalid or expired OAuth state. Try again from the app.' },
      { status: 400 },
    )
  }

  if (oauthError || !code) {
    return NextResponse.redirect(
      appendErrorToReturnTo(
        parsed.returnTo,
        oauthError || 'Google sign-in was cancelled.',
      ),
    )
  }

  try {
    const redirectUri = mobileGoogleRedirectUri(parsed.origin)
    const profile = await exchangeGoogleAuthCode({ code, redirectUri })
    if (!profile.emailVerified) {
      return NextResponse.redirect(
        appendErrorToReturnTo(parsed.returnTo, 'Google email is not verified.'),
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: profile.email },
      select: { id: true, disabledAt: true },
    })
    if (!user || user.disabledAt) {
      return NextResponse.redirect(
        appendErrorToReturnTo(
          parsed.returnTo,
          'No TrainTrack athlete account for this Google email. Sign up on the web first.',
        ),
      )
    }

    if (profile.name) {
      const current = await prisma.user.findUnique({
        where: { id: user.id },
        select: { name: true },
      })
      if (!current?.name?.trim()) {
        await prisma.user
          .update({ where: { id: user.id }, data: { name: profile.name } })
          .catch(() => undefined)
      }
    }

    const resolved = await resolveMobileAthleteForUser(user.id)
    if (!resolved.ok) {
      return NextResponse.redirect(
        appendErrorToReturnTo(parsed.returnTo, resolved.error),
      )
    }

    const token = await signMobileToken({
      userId: resolved.session.userId,
      athleteId: resolved.session.athleteId,
    })

    return NextResponse.redirect(appendTokenToReturnTo(parsed.returnTo, token))
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Google sign-in failed.'
    return NextResponse.redirect(appendErrorToReturnTo(parsed.returnTo, message))
  }
}
