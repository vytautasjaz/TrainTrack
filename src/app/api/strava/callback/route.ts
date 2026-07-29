import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { exchangeStravaCode } from '@/lib/strava/client'
import { isStravaConfigured } from '@/lib/strava/config'
import { applyStravaAvatarToAthlete } from '@/lib/strava/avatar'
import { UserRole } from '@prisma/client'

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const preferencesUrl = new URL('/settings/preferences', appUrl)

  if (!isStravaConfigured()) {
    preferencesUrl.searchParams.set('error', 'not_configured')
    return NextResponse.redirect(preferencesUrl)
  }

  const { searchParams } = request.nextUrl
  const error = searchParams.get('error')
  if (error) {
    preferencesUrl.searchParams.set('error', error)
    return NextResponse.redirect(preferencesUrl)
  }

  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const cookieStore = await cookies()
  const savedState = cookieStore.get('strava_oauth_state')?.value
  const userId = cookieStore.get('strava_oauth_user')?.value

  cookieStore.delete('strava_oauth_state')
  cookieStore.delete('strava_oauth_user')

  if (!code || !state || !savedState || state !== savedState || !userId) {
    preferencesUrl.searchParams.set('error', 'invalid_state')
    return NextResponse.redirect(preferencesUrl)
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { athleteProfile: true },
  })
  if (!user || user.role !== UserRole.ATHLETE || !user.athleteProfile) {
    return NextResponse.redirect(new URL('/dashboard?strava=athletes_only', appUrl))
  }

  try {
    const token = await exchangeStravaCode(code)
    const grantedScopes = searchParams.get('scope') ?? ''

    await prisma.stravaConnection.upsert({
      where: { userId },
      create: {
        userId,
        stravaAthleteId: String(token.athlete.id),
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        expiresAt: new Date(token.expires_at * 1000),
        scope: grantedScopes,
      },
      update: {
        stravaAthleteId: String(token.athlete.id),
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        expiresAt: new Date(token.expires_at * 1000),
        scope: grantedScopes,
      },
    })

    await applyStravaAvatarToAthlete(user.athleteProfile.id, token.athlete)

    try {
      const { syncStravaActivitiesForUser } = await import('@/lib/strava/sync')
      await syncStravaActivitiesForUser(userId, user.athleteProfile.id)
    } catch (err) {
      console.warn('Initial Strava sync after connect skipped:', err)
    }

    preferencesUrl.searchParams.set('connected', '1')
    return NextResponse.redirect(preferencesUrl)
  } catch (err) {
    console.error('Strava OAuth callback failed:', err)
    preferencesUrl.searchParams.set('error', 'token_exchange')
    return NextResponse.redirect(preferencesUrl)
  }
}
