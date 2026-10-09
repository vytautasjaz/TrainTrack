import { NextResponse } from 'next/server'
import {
  mobileGoogleConfigured,
  mobileGoogleOAuthOrigin,
  mobileGoogleRedirectUri,
  requestOrigin,
} from '@/lib/mobile-google-oauth'

/** Helps configure Google Console — shows the redirect URI for this host. */
export async function GET(request: Request) {
  const { origin, error } = mobileGoogleOAuthOrigin(request)
  return NextResponse.json({
    configured: mobileGoogleConfigured(),
    requestOrigin: requestOrigin(request),
    oauthOrigin: origin || null,
    redirectUri: origin ? mobileGoogleRedirectUri(origin) : null,
    error: error || null,
    hint: origin
      ? 'Add redirectUri under Authorized redirect URIs on your AUTH_GOOGLE_ID Web client.'
      : 'Google rejects LAN IPs. Run npm run mobile:tunnel (or use Netlify) and set EXPO_PUBLIC_GOOGLE_OAUTH_URL / MOBILE_GOOGLE_OAUTH_ORIGIN.',
  })
}
