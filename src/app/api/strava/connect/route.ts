import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { buildStravaAuthorizeUrl } from '@/lib/strava/client'
import { isStravaConfigured } from '@/lib/strava/config'
import { getSession } from '@/lib/session'

export async function GET() {
  if (!isStravaConfigured()) {
    return NextResponse.json({ error: 'Strava is not configured' }, { status: 503 })
  }

  const session = await getSession()
  if (!session) {
    return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'))
  }

  if (!session.hasAthlete || !session.athleteId) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    return NextResponse.redirect(new URL('/dashboard?strava=athletes_only', appUrl))
  }

  const state = crypto.randomUUID()
  const cookieStore = await cookies()
  cookieStore.set('strava_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600,
    path: '/',
  })
  cookieStore.set('strava_oauth_user', session.userId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600,
    path: '/',
  })

  return NextResponse.redirect(buildStravaAuthorizeUrl(state))
}
