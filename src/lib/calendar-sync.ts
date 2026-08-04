import { createHash, randomBytes } from 'crypto'
import {
  CalendarFeedType,
  type CalendarEventMap,
  type CalendarFeed,
  type RacePriority,
  type SessionType,
  type WorkoutType,
} from '@prisma/client'
import { addDateOnlyDays, toDateKey } from '@/lib/dates'

const TOKEN_BYTES = 24

export function generateCalendarFeedToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url')
}

export function hashCalendarFeedToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function tokenHint(token: string): string {
  return token.slice(-4)
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
}

function formatIcsDate(date: Date): string {
  return toDateKey(date).replaceAll('-', '')
}

function formatIcsDateTime(date: Date): string {
  return (
    `${date.getUTCFullYear()}` +
    `${String(date.getUTCMonth() + 1).padStart(2, '0')}` +
    `${String(date.getUTCDate()).padStart(2, '0')}T` +
    `${String(date.getUTCHours()).padStart(2, '0')}` +
    `${String(date.getUTCMinutes()).padStart(2, '0')}` +
    `${String(date.getUTCSeconds()).padStart(2, '0')}Z`
  )
}

function foldIcsLine(line: string): string {
  const max = 75
  if (line.length <= max) return line
  let out = ''
  let cursor = line
  while (cursor.length > max) {
    out += `${cursor.slice(0, max)}\r\n `
    cursor = cursor.slice(max)
  }
  return `${out}${cursor}`
}

function buildCalendarTitle(type: CalendarFeedType): string {
  return type === CalendarFeedType.TRAINING ? 'TrainTrack - Training' : 'TrainTrack - Races'
}

function sessionLabel(sessionType: SessionType): string {
  return sessionType
    .split('_')
    .map((part) => part[0] + part.slice(1).toLowerCase())
    .join(' ')
}

function sportLabel(type: WorkoutType): string {
  return type[0] + type.slice(1).toLowerCase()
}

function racePriorityLabel(priority: RacePriority): string {
  return `Priority ${priority}`
}

export type TrainingCalendarRow = {
  id: string
  date: Date
  title: string
  description: string | null
  sessionType: SessionType
  type: WorkoutType
  plannedDistance: number | null
  plannedDuration: number | null
  updatedAt: Date
}

export type RaceCalendarRow = {
  id: string
  date: Date
  name: string
  location: string | null
  sport: WorkoutType
  priority: RacePriority
  goal: string | null
  updatedAt: Date
}

function buildTrainingDescription(row: TrainingCalendarRow, appUrl?: string): string {
  const lines: string[] = []
  lines.push(`${sportLabel(row.type)} · ${sessionLabel(row.sessionType)}`)
  if (row.plannedDistance != null) lines.push(`Distance: ${row.plannedDistance.toFixed(1)} km`)
  if (row.plannedDuration != null) lines.push(`Duration: ${row.plannedDuration} min`)
  if (row.description?.trim()) lines.push(row.description.trim())
  if (appUrl) lines.push(`${appUrl}/training?date=${toDateKey(row.date)}`)
  return lines.join('\n')
}

function buildRaceDescription(row: RaceCalendarRow, appUrl?: string): string {
  const lines: string[] = []
  lines.push(`${sportLabel(row.sport)} · ${racePriorityLabel(row.priority)}`)
  if (row.location?.trim()) lines.push(`Location: ${row.location.trim()}`)
  if (row.goal?.trim()) lines.push(`Goal: ${row.goal.trim()}`)
  if (appUrl) lines.push(`${appUrl}/season`)
  return lines.join('\n')
}

type IcsEvent = {
  uid: string
  title: string
  description?: string
  startDate: Date
  endDateExclusive: Date
  updatedAt: Date
}

function serializeEvent(event: IcsEvent): string {
  const lines = [
    'BEGIN:VEVENT',
    `UID:${escapeIcsText(event.uid)}`,
    `DTSTAMP:${formatIcsDateTime(event.updatedAt)}`,
    `LAST-MODIFIED:${formatIcsDateTime(event.updatedAt)}`,
    `DTSTART;VALUE=DATE:${formatIcsDate(event.startDate)}`,
    `DTEND;VALUE=DATE:${formatIcsDate(event.endDateExclusive)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    event.description ? `DESCRIPTION:${escapeIcsText(event.description)}` : null,
    'END:VEVENT',
  ].filter((line): line is string => Boolean(line))
  return lines.map(foldIcsLine).join('\r\n')
}

export function buildTrainingIcs(
  items: TrainingCalendarRow[],
  opts: { appUrl?: string; feedHost: string },
): string {
  const events = items.map((row) =>
    serializeEvent({
      uid: `workout:${row.id}@${opts.feedHost}`,
      title: row.title.trim() || `${sportLabel(row.type)} Workout`,
      description: buildTrainingDescription(row, opts.appUrl),
      startDate: row.date,
      endDateExclusive: addDateOnlyDays(row.date, 1),
      updatedAt: row.updatedAt,
    }),
  )
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TrainTrack//Calendar Sync//EN',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${buildCalendarTitle(CalendarFeedType.TRAINING)}`,
    ...events,
    'END:VCALENDAR',
    '',
  ].join('\r\n')
}

export function buildRacesIcs(
  items: RaceCalendarRow[],
  opts: { appUrl?: string; feedHost: string },
): string {
  const events = items.map((row) =>
    serializeEvent({
      uid: `race:${row.id}@${opts.feedHost}`,
      title: row.name.trim() || 'Race',
      description: buildRaceDescription(row, opts.appUrl),
      startDate: row.date,
      endDateExclusive: addDateOnlyDays(row.date, 1),
      updatedAt: row.updatedAt,
    }),
  )
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TrainTrack//Calendar Sync//EN',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${buildCalendarTitle(CalendarFeedType.RACES)}`,
    ...events,
    'END:VCALENDAR',
    '',
  ].join('\r\n')
}

export function feedUrlFromToken(
  type: CalendarFeedType,
  token: string,
  appUrl: string,
): string {
  const base = appUrl.endsWith('/') ? appUrl.slice(0, -1) : appUrl
  const path = type === CalendarFeedType.TRAINING ? 'training' : 'races'
  return `${base}/api/calendar/ics/${path}?token=${encodeURIComponent(token)}`
}

export function googleCalendarName(type: CalendarFeedType): string {
  return type === CalendarFeedType.TRAINING ? 'TrainTrack - Training' : 'TrainTrack - Races'
}

export function toGoogleEventDate(date: Date): string {
  return toDateKey(date)
}

export function nextDateForGoogle(date: Date): string {
  return toDateKey(addDateOnlyDays(date, 1))
}

export function hasGoogleSyncEnabled(feed: Pick<CalendarFeed, 'googleSyncEnabled' | 'googleCalendarId'>): boolean {
  return Boolean(feed.googleSyncEnabled && feed.googleCalendarId)
}

export type MappedEventKey = Pick<CalendarEventMap, 'type' | 'sourceId'>
