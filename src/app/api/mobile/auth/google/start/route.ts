import {
  isAllowedMobileReturnTo,
  mobileGoogleClient,
  mobileGoogleConfigured,
  mobileGoogleOAuthOrigin,
  mobileGoogleRedirectUri,
  signGoogleOAuthState,
} from '@/lib/mobile-google-oauth'
import { NextResponse } from 'next/server'

/**
 * Start Google OAuth for the Expo app (server-hosted — works with Expo Go).
 * Query: returnTo = app deep link (exp://… or traintrack://…)
 *
 * Google forbids raw LAN IPs as redirect URIs — use localhost, a Cloudflare
 * tunnel, or the Netlify host (see npm run mobile:tunnel).
 */
export async function GET(request: Request) {
  if (!mobileGoogleConfigured()) {
    return NextResponse.json(
      { error: 'Google sign-in is not configured on the server.' },
      { status: 503 },
    )
  }

  const url = new URL(request.url)
  const returnTo = url.searchParams.get('returnTo')?.trim() || ''
  if (!returnTo || !isAllowedMobileReturnTo(returnTo)) {
    return NextResponse.json(
      { error: 'Invalid returnTo. Use an Expo / TrainTrack deep link.' },
      { status: 400 },
    )
  }

  const { origin, error } = mobileGoogleOAuthOrigin(request)
  if (!origin) {
    return NextResponse.json({ error: error || 'Invalid OAuth origin.' }, { status: 400 })
  }

  const redirectUri = mobileGoogleRedirectUri(origin)
  const { clientId } = mobileGoogleClient()
  const state = await signGoogleOAuthState({ returnTo, origin })

  const auth = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  auth.searchParams.set('client_id', clientId)
  auth.searchParams.set('redirect_uri', redirectUri)
  auth.searchParams.set('response_type', 'code')
  auth.searchParams.set('scope', 'openid email profile')
  auth.searchParams.set('state', state)
  auth.searchParams.set('prompt', 'select_account')
  auth.searchParams.set('access_type', 'online')

  return NextResponse.redirect(auth.toString())
}
