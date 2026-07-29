import { prisma } from '@/lib/prisma'
import { getStravaConfig } from './config'
import type { StravaActivity, StravaAthleteSummary, StravaTokenResponse } from './types'

const STRAVA_API = 'https://www.strava.com/api/v3'
const STRAVA_OAUTH = 'https://www.strava.com/oauth'

export function buildStravaAuthorizeUrl(state: string): string {
  const { clientId, redirectUri, scopes } = getStravaConfig()
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    approval_prompt: 'auto',
    scope: scopes,
    state,
  })
  return `${STRAVA_OAUTH}/authorize?${params.toString()}`
}

export async function exchangeStravaCode(code: string): Promise<StravaTokenResponse> {
  const { clientId, clientSecret } = getStravaConfig()
  const response = await fetch(`${STRAVA_OAUTH}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Strava token exchange failed: ${body}`)
  }

  return response.json()
}

async function refreshStravaToken(refreshToken: string): Promise<StravaTokenResponse> {
  const { clientId, clientSecret } = getStravaConfig()
  const response = await fetch(`${STRAVA_OAUTH}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Strava token refresh failed: ${body}`)
  }

  return response.json()
}

export async function getValidAccessToken(userId: string): Promise<string> {
  const connection = await prisma.stravaConnection.findUnique({ where: { userId } })
  if (!connection) throw new Error('Strava is not connected')

  const expiresSoon = connection.expiresAt.getTime() - Date.now() < 60 * 60 * 1000
  if (!expiresSoon) return connection.accessToken

  const refreshed = await refreshStravaToken(connection.refreshToken)
  await prisma.stravaConnection.update({
    where: { userId },
    data: {
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token,
      expiresAt: new Date(refreshed.expires_at * 1000),
    },
  })

  return refreshed.access_token
}

export async function fetchStravaAthlete(accessToken: string): Promise<StravaAthleteSummary> {
  const response = await fetch(`${STRAVA_API}/athlete`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    next: { revalidate: 0 },
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Strava athlete fetch failed: ${body}`)
  }

  return response.json()
}

export async function fetchAthleteActivities(
  accessToken: string,
  options: { after?: number; before?: number; page?: number; perPage?: number } = {},
): Promise<StravaActivity[]> {
  const params = new URLSearchParams()
  if (options.after) params.set('after', String(options.after))
  if (options.before) params.set('before', String(options.before))
  params.set('page', String(options.page ?? 1))
  params.set('per_page', String(options.perPage ?? 50))

  const response = await fetch(`${STRAVA_API}/athlete/activities?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    next: { revalidate: 0 },
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Strava activities fetch failed: ${body}`)
  }

  return response.json()
}

/** Detailed activity — includes description (missing from list summaries). */
export async function fetchStravaActivity(
  accessToken: string,
  activityId: number,
): Promise<StravaActivity> {
  const response = await fetch(`${STRAVA_API}/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    next: { revalidate: 0 },
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Strava activity fetch failed: ${body}`)
  }

  return response.json()
}

export async function fetchAllRecentActivities(
  accessToken: string,
  options: { afterUnix: number; beforeUnix?: number },
): Promise<StravaActivity[]> {
  const activities: StravaActivity[] = []
  let page = 1

  while (page <= 10) {
    const batch = await fetchAthleteActivities(accessToken, {
      after: options.afterUnix,
      before: options.beforeUnix,
      page,
      perPage: 50,
    })
    if (batch.length === 0) break
    activities.push(...batch)
    if (batch.length < 50) break
    page += 1
  }

  return activities
}

export function stravaActivityUrl(activityId: number | string): string {
  return `https://www.strava.com/activities/${activityId}`
}
