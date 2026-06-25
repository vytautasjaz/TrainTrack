export function getStravaConfig() {
  const clientId = process.env.STRAVA_CLIENT_ID
  const clientSecret = process.env.STRAVA_CLIENT_SECRET
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  if (!clientId || !clientSecret) {
    throw new Error('STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET must be set')
  }

  return {
    clientId,
    clientSecret,
    appUrl,
    redirectUri: `${appUrl.replace(/\/$/, '')}/api/strava/callback`,
    scopes: process.env.STRAVA_SCOPES ?? 'read,activity:read_all,profile:read_all',
  }
}

export function isStravaConfigured(): boolean {
  return Boolean(process.env.STRAVA_CLIENT_ID && process.env.STRAVA_CLIENT_SECRET)
}
