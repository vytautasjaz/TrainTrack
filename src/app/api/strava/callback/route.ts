import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { exchangeStravaCode } from '@/lib/strava/client'
import { isStravaConfigured } from '@/lib/strava/config'
import { applyStravaAvatarToAthlete } from '@/lib/strava/avatar'

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const preferencesUrl = new URL('/settings', appUrl)
  preferencesUrl.hash = 'integrations'

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
  const isSwitch = cookieStore.get('strava_oauth_switch')?.value === '1'

  cookieStore.delete('strava_oauth_state')
  cookieStore.delete('strava_oauth_user')
  cookieStore.delete('strava_oauth_switch')

  if (!code || !state || !savedState || state !== savedState || !userId) {
    preferencesUrl.searchParams.set('error', 'invalid_state')
    return NextResponse.redirect(preferencesUrl)
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { athleteProfile: true },
  })
  if (!user?.athleteProfile) {
    return NextResponse.redirect(new URL('/dashboard?strava=athletes_only', appUrl))
  }

  try {
    const token = await exchangeStravaCode(code)
    const grantedScopes = searchParams.get('scope') ?? ''
    const stravaAthleteId = String(token.athlete.id)

    // Block linking a Strava athlete already associated with another TrainTrack user.
    const [existingConn, existingAccount] = await Promise.all([
      prisma.stravaConnection.findFirst({
        where: {
          stravaAthleteId,
          NOT: { userId },
        },
        select: { userId: true },
      }),
      prisma.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider: 'strava',
            providerAccountId: stravaAthleteId,
          },
        },
        select: { userId: true },
      }),
    ])
    if (
      existingConn ||
      (existingAccount && existingAccount.userId !== userId)
    ) {
      preferencesUrl.searchParams.set('error', 'already_linked')
      return NextResponse.redirect(preferencesUrl)
    }

    // Drop previous Strava OAuth Account rows for this user when switching IDs.
    await prisma.account.deleteMany({
      where: {
        userId,
        provider: 'strava',
        NOT: { providerAccountId: stravaAthleteId },
      },
    })

    await prisma.stravaConnection.upsert({
      where: { userId },
      create: {
        userId,
        stravaAthleteId,
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        expiresAt: new Date(token.expires_at * 1000),
        scope: grantedScopes,
      },
      update: {
        stravaAthleteId,
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        expiresAt: new Date(token.expires_at * 1000),
        scope: grantedScopes,
        // Fresh account → reset sync cursor so history can re-import.
        ...(isSwitch ? { lastSyncedAt: null } : {}),
      },
    })

    await prisma.account.upsert({
      where: {
        provider_providerAccountId: {
          provider: 'strava',
          providerAccountId: stravaAthleteId,
        },
      },
      create: {
        userId,
        type: 'oauth',
        provider: 'strava',
        providerAccountId: stravaAthleteId,
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        expires_at: token.expires_at,
        token_type: token.token_type,
        scope: grantedScopes,
      },
      update: {
        userId,
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        expires_at: token.expires_at,
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

    preferencesUrl.searchParams.set('connected', isSwitch ? 'switched' : '1')
    return NextResponse.redirect(preferencesUrl)
  } catch (err) {
    console.error('Strava OAuth callback failed:', err)
    preferencesUrl.searchParams.set('error', 'token_exchange')
    return NextResponse.redirect(preferencesUrl)
  }
}
