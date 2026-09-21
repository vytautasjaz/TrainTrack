import { NextResponse } from 'next/server'
import { onTrainingCalendarDataChanged } from '@/lib/calendar-invalidation'
import { syncDueStravaConnections } from '@/lib/strava/sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  const header = request.headers.get('authorization')
  if (header === `Bearer ${secret}`) return true
  const url = new URL(request.url)
  return url.searchParams.get('secret') === secret
}

/**
 * Hourly Strava sync for connections with auto-sync enabled and stale lastSyncedAt.
 * Secure with CRON_SECRET (Authorization: Bearer …).
 */
export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const summary = await syncDueStravaConnections({ limit: 15 })

  const athleteIds = [
    ...new Set(
      summary.results
        .filter((row) => row.status === 'synced' && (row.matched ?? 0) > 0 && row.athleteId)
        .map((row) => row.athleteId!),
    ),
  ]

  await Promise.all(athleteIds.map((athleteId) => onTrainingCalendarDataChanged(athleteId)))

  return NextResponse.json({ ok: true, ...summary })
}

export async function POST(request: Request) {
  return GET(request)
}
