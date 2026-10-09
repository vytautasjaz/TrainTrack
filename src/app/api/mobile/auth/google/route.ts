import { NextResponse } from 'next/server'
import {
  mobileJsonError,
  resolveMobileAthleteForUser,
  signMobileToken,
} from '@/lib/mobile-auth'
import { prisma } from '@/lib/prisma'

function googleAudiences(): string[] {
  return [
    process.env.AUTH_GOOGLE_MOBILE_CLIENT_ID,
    process.env.AUTH_GOOGLE_WEB_CLIENT_ID,
    process.env.AUTH_GOOGLE_IOS_CLIENT_ID,
    process.env.AUTH_GOOGLE_ANDROID_CLIENT_ID,
    process.env.AUTH_GOOGLE_ID,
  ]
    .map((v) => v?.trim())
    .filter((v): v is string => Boolean(v))
}

type GoogleTokenInfo = {
  aud?: string
  email?: string
  email_verified?: string | boolean
  name?: string
  error_description?: string
}

/**
 * Exchange a Google ID token (from Expo AuthSession) for a mobile Bearer JWT.
 */
export async function POST(request: Request) {
  const audiences = googleAudiences()
  if (audiences.length === 0) {
    return mobileJsonError('Google sign-in is not configured.', 503)
  }

  let body: { idToken?: unknown }
  try {
    body = (await request.json()) as { idToken?: unknown }
  } catch {
    return mobileJsonError('Invalid JSON body.', 400)
  }

  const idToken = String(body.idToken ?? '').trim()
  if (!idToken) {
    return mobileJsonError('idToken is required.', 400)
  }

  let info: GoogleTokenInfo
  try {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
    )
    info = (await res.json()) as GoogleTokenInfo
    if (!res.ok) {
      return mobileJsonError(
        info.error_description || 'Invalid Google token.',
        401,
      )
    }
  } catch {
    return mobileJsonError('Could not verify Google token.', 401)
  }

  if (!info.aud || !audiences.includes(info.aud)) {
    return mobileJsonError('Google token audience mismatch.', 401)
  }

  const verified =
    info.email_verified === true || info.email_verified === 'true'
  if (!verified) {
    return mobileJsonError('Google email is not verified.', 401)
  }

  const email = info.email?.trim().toLowerCase() ?? null
  if (!email) {
    return mobileJsonError('Google account has no email.', 401)
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, disabledAt: true },
  })
  if (!user || user.disabledAt) {
    return mobileJsonError(
      'No TrainTrack athlete account for this Google email. Sign up on the web first.',
      401,
    )
  }

  const name = info.name?.trim() || null
  if (name) {
    const current = await prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true },
    })
    if (!current?.name?.trim()) {
      await prisma.user
        .update({ where: { id: user.id }, data: { name } })
        .catch(() => undefined)
    }
  }

  const resolved = await resolveMobileAthleteForUser(user.id)
  if (!resolved.ok) {
    return mobileJsonError(resolved.error, resolved.status)
  }

  const token = await signMobileToken({
    userId: resolved.session.userId,
    athleteId: resolved.session.athleteId,
  })

  return NextResponse.json({
    token,
    user: {
      id: resolved.session.userId,
      name: resolved.session.name,
      email: resolved.session.email,
      athleteId: resolved.session.athleteId,
    },
  })
}
