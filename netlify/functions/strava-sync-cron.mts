/**
 * Hourly trigger for Strava background sync (Netlify Scheduled Function).
 * Calls the Next.js route so Prisma/app code stays in one place.
 *
 * Requires site env: CRON_SECRET
 */
export default async () => {
  const base =
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    ''
  const secret = process.env.CRON_SECRET?.trim()
  if (!base || !secret) {
    console.warn('[strava-sync-cron] missing URL or CRON_SECRET — skipping')
    return new Response('skipped', { status: 200 })
  }

  const res = await fetch(`${base.replace(/\/$/, '')}/api/cron/strava-sync`, {
    headers: { Authorization: `Bearer ${secret}` },
  })
  const body = await res.text()
  if (!res.ok) {
    console.error('[strava-sync-cron] failed', res.status, body)
    return new Response(body, { status: res.status })
  }
  return new Response(body, { status: 200 })
}

export const config = {
  schedule: '@hourly',
}
