import { SignJWT, jwtVerify } from 'jose'

function secretKey() {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error('AUTH_SECRET is not set')
  return new TextEncoder().encode(secret)
}

/** Public origin for this request (LAN IP when phone hits Mac by IP). */
export function requestOrigin(request: Request): string {
  const url = new URL(request.url)
  const forwarded = request.headers.get('x-forwarded-host')
  const proto =
    request.headers.get('x-forwarded-proto') ||
    (url.protocol === 'https:' ? 'https' : 'http')
  if (forwarded) return `${proto}://${forwarded.split(',')[0]!.trim()}`
  return url.origin
}

function isRawIpHost(hostname: string): boolean {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)
}

/**
 * Origin used for Google `redirect_uri`.
 * Google rejects raw LAN IPs — use AUTH_URL / tunnel / production host, never 192.168.x.x.
 */
export function mobileGoogleOAuthOrigin(request: Request): {
  origin: string
  error?: string
} {
  const forced =
    process.env.MOBILE_GOOGLE_OAUTH_ORIGIN?.trim() ||
    process.env.AUTH_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    ''

  if (forced) {
    try {
      const host = new URL(forced).hostname
      if (isRawIpHost(host)) {
        return {
          origin: '',
          error:
            'MOBILE_GOOGLE_OAUTH_ORIGIN / AUTH_URL cannot be a LAN IP. Use localhost, a tunnel URL, or your Netlify domain.',
        }
      }
      return { origin: forced.replace(/\/$/, '') }
    } catch {
      return { origin: '', error: 'Invalid MOBILE_GOOGLE_OAUTH_ORIGIN / AUTH_URL.' }
    }
  }

  const origin = requestOrigin(request).replace(/\/$/, '')
  try {
    const host = new URL(origin).hostname
    if (isRawIpHost(host)) {
      return {
        origin: '',
        error:
          'Google blocks LAN IP redirect URIs. Point Expo at a tunnel (npm run mobile:tunnel) or set EXPO_PUBLIC_GOOGLE_OAUTH_URL to https://traintrack3000.netlify.app after deploying.',
      }
    }
  } catch {
    return { origin: '', error: 'Invalid request origin.' }
  }
  return { origin }
}

export function mobileGoogleRedirectUri(origin: string): string {
  return `${origin.replace(/\/$/, '')}/api/mobile/auth/google/callback`
}

export function mobileGoogleConfigured(): boolean {
  return Boolean(
    process.env.AUTH_GOOGLE_ID?.trim() &&
      process.env.AUTH_GOOGLE_SECRET?.trim(),
  )
}

export function mobileGoogleClient() {
  const clientId = process.env.AUTH_GOOGLE_ID?.trim()
  const clientSecret = process.env.AUTH_GOOGLE_SECRET?.trim()
  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth is not configured (AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET).')
  }
  return { clientId, clientSecret }
}

/** App deep-link / Expo return URL after OAuth. */
export function isAllowedMobileReturnTo(returnTo: string): boolean {
  try {
    const u = new URL(returnTo)
    const protocol = u.protocol.toLowerCase()
    if (protocol === 'traintrack:') return true
    if (protocol === 'exp:' || protocol === 'exps:') return true
    if (protocol === 'http:' || protocol === 'https:') {
      const host = u.hostname
      return (
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host.endsWith('.exp.direct') ||
        host.endsWith('.expo.dev')
      )
    }
    return false
  } catch {
    return false
  }
}

type GoogleOAuthState = {
  returnTo: string
  origin: string
}

export async function signGoogleOAuthState(state: GoogleOAuthState): Promise<string> {
  return new SignJWT({
    typ: 'mobile-google-oauth',
    returnTo: state.returnTo,
    origin: state.origin,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(secretKey())
}

export async function verifyGoogleOAuthState(
  state: string,
): Promise<GoogleOAuthState | null> {
  try {
    const { payload } = await jwtVerify(state, secretKey())
    if (payload.typ !== 'mobile-google-oauth') return null
    const returnTo = typeof payload.returnTo === 'string' ? payload.returnTo : null
    const origin = typeof payload.origin === 'string' ? payload.origin : null
    if (!returnTo || !origin) return null
    if (!isAllowedMobileReturnTo(returnTo)) return null
    return { returnTo, origin }
  } catch {
    return null
  }
}

export function appendTokenToReturnTo(returnTo: string, token: string): string {
  const u = new URL(returnTo)
  u.searchParams.set('token', token)
  return u.toString()
}

export function appendErrorToReturnTo(returnTo: string, error: string): string {
  const u = new URL(returnTo)
  u.searchParams.set('error', error)
  return u.toString()
}

export async function exchangeGoogleAuthCode(input: {
  code: string
  redirectUri: string
}): Promise<{ email: string; name: string | null; emailVerified: boolean }> {
  const { clientId, clientSecret } = mobileGoogleClient()
  const body = new URLSearchParams({
    code: input.code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: input.redirectUri,
    grant_type: 'authorization_code',
  })
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const tokenJson = (await tokenRes.json()) as {
    access_token?: string
    id_token?: string
    error?: string
    error_description?: string
  }
  if (!tokenRes.ok || !tokenJson.access_token) {
    throw new Error(
      tokenJson.error_description || tokenJson.error || 'Google token exchange failed.',
    )
  }

  const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  })
  const profile = (await profileRes.json()) as {
    email?: string
    email_verified?: boolean | string
    name?: string
  }
  if (!profileRes.ok || !profile.email) {
    throw new Error('Could not load Google profile.')
  }
  const emailVerified =
    profile.email_verified === true || profile.email_verified === 'true'
  return {
    email: profile.email.trim().toLowerCase(),
    name: profile.name?.trim() || null,
    emailVerified,
  }
}
