import { NextResponse } from 'next/server'
import { CalendarFeedType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { todayDateOnly } from '@/lib/dates'
import { buildTrainingIcs, hashCalendarFeedToken } from '@/lib/calendar-sync'
import { getCalendarTrainingEvents } from '@/lib/queries'

export const dynamic = 'force-dynamic'

function appUrlFromRequest(req: Request): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  const u = new URL(req.url)
  return `${u.protocol}//${u.host}`
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const token = url.searchParams.get('token')?.trim()
  if (!token) return new NextResponse('Missing token', { status: 400 })

  const tokenHash = hashCalendarFeedToken(token)
  const feed = await prisma.calendarFeed.findFirst({
    where: { type: CalendarFeedType.TRAINING, tokenHash },
    select: { athleteId: true },
  })
  if (!feed) return new NextResponse('Invalid token', { status: 404 })

  const workouts = await getCalendarTrainingEvents(feed.athleteId, todayDateOnly())
  const ics = buildTrainingIcs(workouts, {
    appUrl: appUrlFromRequest(req),
    feedHost: new URL(req.url).host,
  })

  return new NextResponse(ics, {
    status: 200,
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'cache-control': 'no-store',
      'content-disposition': 'inline; filename="traintrack-training.ics"',
    },
  })
}
