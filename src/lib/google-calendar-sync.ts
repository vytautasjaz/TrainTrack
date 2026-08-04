import { CalendarFeedType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { todayDateOnly } from '@/lib/dates'
import {
  googleCalendarName,
  nextDateForGoogle,
  toGoogleEventDate,
} from '@/lib/calendar-sync'
import { getCalendarRaceEvents, getCalendarTrainingEvents } from '@/lib/queries'

type GoogleTokens = {
  accessToken: string
  refreshToken: string | null
  expiresAt: number | null
}

function googleConfigured(): boolean {
  return Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)
}

async function refreshGoogleAccessToken(accountId: string, refreshToken: string) {
  const params = new URLSearchParams({
    client_id: process.env.AUTH_GOOGLE_ID ?? '',
    client_secret: process.env.AUTH_GOOGLE_SECRET ?? '',
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  })

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })
  if (!res.ok) throw new Error(`Google token refresh failed (${res.status})`)
  const json = (await res.json()) as {
    access_token: string
    expires_in?: number
    refresh_token?: string
  }
  await prisma.account.update({
    where: { id: accountId },
    data: {
      access_token: json.access_token,
      refresh_token: json.refresh_token ?? undefined,
      expires_at: json.expires_in ? Math.floor(Date.now() / 1000) + json.expires_in : undefined,
    },
  })
  return json.access_token
}

async function getGoogleAccessTokenForUser(userId: string): Promise<GoogleTokens | null> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: 'google' },
    select: {
      id: true,
      access_token: true,
      refresh_token: true,
      expires_at: true,
    },
  })
  if (!account?.access_token) return null

  const nowSec = Math.floor(Date.now() / 1000)
  const expiresSoon = account.expires_at != null && account.expires_at - 60 < nowSec
  if (expiresSoon && account.refresh_token) {
    const refreshed = await refreshGoogleAccessToken(account.id, account.refresh_token)
    return {
      accessToken: refreshed,
      refreshToken: account.refresh_token,
      expiresAt: account.expires_at ?? null,
    }
  }

  return {
    accessToken: account.access_token,
    refreshToken: account.refresh_token ?? null,
    expiresAt: account.expires_at ?? null,
  }
}

async function googleFetch(
  token: string,
  input: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(input, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
}

async function ensureGoogleCalendar(token: string, preferredName: string, existingId: string | null) {
  if (existingId) {
    const check = await googleFetch(
      token,
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(existingId)}`,
    )
    if (check.ok) return existingId
  }

  const list = await googleFetch(token, 'https://www.googleapis.com/calendar/v3/users/me/calendarList')
  if (list.ok) {
    const body = (await list.json()) as { items?: { id: string; summary?: string }[] }
    const byName = body.items?.find((it) => it.summary === preferredName)
    if (byName) return byName.id
  }

  const created = await googleFetch(token, 'https://www.googleapis.com/calendar/v3/calendars', {
    method: 'POST',
    body: JSON.stringify({ summary: preferredName }),
  })
  if (!created.ok) throw new Error(`Failed to create Google calendar (${created.status})`)
  const payload = (await created.json()) as { id: string }
  return payload.id
}

function trainingGooglePayload(item: Awaited<ReturnType<typeof getCalendarTrainingEvents>>[number]) {
  const details: string[] = []
  if (item.description?.trim()) details.push(item.description.trim())
  if (item.plannedDistance != null) details.push(`Distance: ${item.plannedDistance.toFixed(1)} km`)
  if (item.plannedDuration != null) details.push(`Duration: ${item.plannedDuration} min`)
  return {
    summary: item.title,
    description: details.join('\n') || undefined,
    start: { date: toGoogleEventDate(item.date) },
    end: { date: nextDateForGoogle(item.date) },
  }
}

function racesGooglePayload(item: Awaited<ReturnType<typeof getCalendarRaceEvents>>[number]) {
  const details: string[] = [`Priority ${item.priority}`]
  if (item.location?.trim()) details.push(`Location: ${item.location.trim()}`)
  if (item.goal?.trim()) details.push(`Goal: ${item.goal.trim()}`)
  return {
    summary: item.name,
    description: details.join('\n'),
    start: { date: toGoogleEventDate(item.date) },
    end: { date: nextDateForGoogle(item.date) },
  }
}

async function upsertGoogleEvent(
  token: string,
  calendarId: string,
  externalId: string | null,
  payload: object,
): Promise<string> {
  if (externalId) {
    const patch = await googleFetch(
      token,
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(externalId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
    )
    if (patch.ok) {
      const body = (await patch.json()) as { id: string }
      return body.id
    }
  }

  const created = await googleFetch(
    token,
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
  if (!created.ok) throw new Error(`Failed to create Google event (${created.status})`)
  const body = (await created.json()) as { id: string }
  return body.id
}

async function deleteGoogleEvent(token: string, calendarId: string, eventId: string) {
  const res = await googleFetch(
    token,
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: 'DELETE' },
  )
  // 404 means already gone.
  if (!res.ok && res.status !== 404) {
    throw new Error(`Failed to delete Google event (${res.status})`)
  }
}

export async function syncGoogleCalendarsForAthlete(athleteId: string) {
  if (!googleConfigured()) return

  const athlete = await prisma.athlete.findUnique({
    where: { id: athleteId },
    select: { userId: true },
  })
  if (!athlete?.userId) return

  const auth = await getGoogleAccessTokenForUser(athlete.userId)
  if (!auth?.accessToken) return

  const feeds = await prisma.calendarFeed.findMany({
    where: {
      athleteId,
      googleSyncEnabled: true,
    },
    select: {
      id: true,
      type: true,
      googleCalendarId: true,
    },
  })
  if (feeds.length === 0) return

  const from = todayDateOnly()
  const [training, races] = await Promise.all([
    getCalendarTrainingEvents(athleteId, from),
    getCalendarRaceEvents(athleteId, from),
  ])

  for (const feed of feeds) {
    const calendarId = await ensureGoogleCalendar(
      auth.accessToken,
      googleCalendarName(feed.type),
      feed.googleCalendarId,
    )
    if (calendarId !== feed.googleCalendarId) {
      await prisma.calendarFeed.update({
        where: { id: feed.id },
        data: { googleCalendarId: calendarId },
      })
    }

    const sourceItems =
      feed.type === CalendarFeedType.TRAINING
        ? training.map((row) => ({ sourceId: row.id, payload: trainingGooglePayload(row) }))
        : races.map((row) => ({ sourceId: row.id, payload: racesGooglePayload(row) }))

    const existing = await prisma.calendarEventMap.findMany({
      where: { athleteId, type: feed.type },
      select: { sourceId: true, externalId: true },
    })
    const bySource = new Map(existing.map((row) => [row.sourceId, row.externalId]))
    const sourceIds = new Set(sourceItems.map((item) => item.sourceId))

    for (const old of existing) {
      if (sourceIds.has(old.sourceId)) continue
      await deleteGoogleEvent(auth.accessToken, calendarId, old.externalId)
      await prisma.calendarEventMap.deleteMany({
        where: {
          athleteId,
          type: feed.type,
          sourceId: old.sourceId,
        },
      })
    }

    for (const item of sourceItems) {
      const eventId = await upsertGoogleEvent(
        auth.accessToken,
        calendarId,
        bySource.get(item.sourceId) ?? null,
        item.payload,
      )
      await prisma.calendarEventMap.upsert({
        where: {
          type_sourceId: {
            type: feed.type,
            sourceId: item.sourceId,
          },
        },
        create: {
          athleteId,
          type: feed.type,
          sourceId: item.sourceId,
          externalId: eventId,
        },
        update: {
          externalId: eventId,
        },
      })
    }
  }
}

export async function queueGoogleCalendarSync(athleteId: string) {
  try {
    await syncGoogleCalendarsForAthlete(athleteId)
  } catch {
    // Non-blocking integration: app writes must still succeed.
  }
}
