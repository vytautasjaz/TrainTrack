'use server'

import { revalidatePath } from 'next/cache'
import { CalendarFeedType, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  BIKE_SPEED_ZONE_FIELDS,
  HR_ZONE_FIELDS,
  PACE_ZONE_FIELDS,
  parseBikeSpeedKph,
  parsePaceMinPerKm,
  parseSwimCssSecPer100m,
  type AthletePreferences,
  pickAthletePreferences,
} from '@/lib/athlete-preferences'
import {
  mergeWorkoutBuilderPrefsJson,
  parseWorkoutBuilderPrefs,
  sessionOptionsJsonFromRaw,
  type WorkoutBuilderPrefs,
} from '@/lib/workout-builder/workout-builder-prefs'
import {
  parseWorkoutTypePrefs,
  workoutTypePrefsToJson,
  type WorkoutTypePrefs,
} from '@/lib/workout-builder/workout-type-prefs'
import { requireSession, resolveAthleteId, isCoach} from '@/lib/session'
import {
  feedUrlFromToken,
  generateCalendarFeedToken,
  googleCalendarName,
  hashCalendarFeedToken,
  tokenHint,
} from '@/lib/calendar-sync'
import { queueGoogleCalendarSync } from '@/lib/google-calendar-sync'
import { putAvatarFile } from '@/lib/avatar-storage'

async function requireAthleteForPreferences() {
  const session = await requireSession()
  const athleteId = await resolveAthleteId(session)
  if (!athleteId) throw new Error('No athlete selected')
  return { session, athleteId }
}

function parseHrValue(raw: FormDataEntryValue | null): number | null {
  if (typeof raw !== 'string' || !raw.trim()) return null
  const value = parseInt(raw, 10)
  if (Number.isNaN(value) || value <= 0) return null
  return value
}

function parseCoordinate(
  raw: FormDataEntryValue | null,
  kind: 'lat' | 'lon',
): number | null {
  if (typeof raw !== 'string' || !raw.trim()) return null
  const value = Number(raw.trim())
  if (!Number.isFinite(value)) throw new Error('Use valid numeric coordinates.')
  if (kind === 'lat' && (value < -90 || value > 90)) {
    throw new Error('Latitude must be between -90 and 90.')
  }
  if (kind === 'lon' && (value < -180 || value > 180)) {
    throw new Error('Longitude must be between -180 and 180.')
  }
  return Math.round(value * 10000) / 10000
}

export async function updatePaceZones(formData: FormData) {
  const { athleteId } = await requireAthleteForPreferences()

  const data: Record<string, number | null> = {}
  for (const { key, name } of PACE_ZONE_FIELDS) {
    const raw = formData.get(name)
    if (typeof raw !== 'string' || !raw.trim()) {
      data[key] = null
      continue
    }
    const parsed = parsePaceMinPerKm(raw)
    if (parsed == null) {
      throw new Error(`Invalid pace for ${name}. Use format like 5:30.`)
    }
    data[key] = parsed
  }

  await prisma.athlete.update({
    where: { id: athleteId },
    data,
  })

  revalidatePath('/settings/preferences')
  revalidatePath('/settings/account')
}

export async function updateBikeSpeedZones(formData: FormData) {
  const { athleteId } = await requireAthleteForPreferences()

  const data: Record<string, number | null> = {}
  for (const { key, name } of BIKE_SPEED_ZONE_FIELDS) {
    const raw = formData.get(name)
    if (typeof raw !== 'string' || !raw.trim()) {
      data[key] = null
      continue
    }
    const parsed = parseBikeSpeedKph(raw)
    if (parsed == null) {
      throw new Error(`Invalid bike speed for ${name}. Use value like 28.5.`)
    }
    data[key] = parsed
  }

  const ftpRaw = formData.get('bikeFtpWatts')
  let bikeFtpWatts: number | null = null
  if (typeof ftpRaw === 'string' && ftpRaw.trim()) {
    const parsed = parseInt(ftpRaw.trim(), 10)
    if (!Number.isFinite(parsed) || parsed < 50 || parsed > 600) {
      throw new Error('FTP must be between 50 and 600 watts.')
    }
    bikeFtpWatts = parsed
  }

  await prisma.athlete.update({
    where: { id: athleteId },
    data: { ...data, bikeFtpWatts },
  })

  revalidatePath('/settings/preferences')
  revalidatePath('/settings/account')
}

export async function updateSwimCss(formData: FormData) {
  const { athleteId } = await requireAthleteForPreferences()

  const raw = formData.get('swimCss')
  let swimCssSecPer100m: number | null = null
  if (typeof raw === 'string' && raw.trim()) {
    const parsed = parseSwimCssSecPer100m(raw)
    if (parsed == null || parsed < 40 || parsed > 300) {
      throw new Error('CSS must look like 1:35 (per 100m).')
    }
    swimCssSecPer100m = parsed
  }

  await prisma.athlete.update({
    where: { id: athleteId },
    data: { swimCssSecPer100m },
  })

  revalidatePath('/settings/preferences')
  revalidatePath('/settings/account')
}

export async function updateHrZones(formData: FormData) {
  const { athleteId } = await requireAthleteForPreferences()

  const data: Record<string, number | null> = {}
  for (const { key, name } of HR_ZONE_FIELDS) {
    data[key] = parseHrValue(formData.get(name))
  }

  await prisma.athlete.update({
    where: { id: athleteId },
    data,
  })

  revalidatePath('/settings/preferences')
  revalidatePath('/settings/account')
}

export async function updateAthleteWeatherLocation(formData: FormData) {
  const { athleteId } = await requireAthleteForPreferences()
  if (String(formData.get('intent') ?? '') === 'clear') {
    await prisma.athlete.update({
      where: { id: athleteId },
      data: {
        weatherLocationName: null,
        weatherLat: null,
        weatherLon: null,
      },
    })
    revalidatePath('/settings/preferences')
    revalidatePath('/settings/account')
    revalidatePath('/training')
    revalidatePath('/dashboard')
    return
  }

  const locationNameRaw = String(formData.get('weatherLocationName') ?? '').trim()
  const weatherLat = parseCoordinate(formData.get('weatherLat'), 'lat')
  const weatherLon = parseCoordinate(formData.get('weatherLon'), 'lon')

  const hasCoords = weatherLat != null && weatherLon != null
  if (!hasCoords && (weatherLat != null || weatherLon != null)) {
    throw new Error('Set both latitude and longitude.')
  }
  if (locationNameRaw.length > 120) {
    throw new Error('Location name is too long.')
  }

  await prisma.athlete.update({
    where: { id: athleteId },
    data: hasCoords
      ? {
          weatherLocationName: locationNameRaw || 'Default location',
          weatherLat,
          weatherLon,
        }
      : {
          weatherLocationName: null,
          weatherLat: null,
          weatherLon: null,
        },
  })

  revalidatePath('/settings/preferences')
  revalidatePath('/settings/account')
  revalidatePath('/training')
  revalidatePath('/dashboard')
}

export async function updateAthleteShowWeather(formData: FormData) {
  const { athleteId } = await requireAthleteForPreferences()
  const raw = String(formData.get('showWeather') ?? '').trim()
  const showWeather = raw === '1' || raw === 'true'

  await prisma.athlete.update({
    where: { id: athleteId },
    data: { showWeather },
  })

  revalidatePath('/settings/preferences')
  revalidatePath('/training')
  revalidatePath('/dashboard')
}

export async function updateAthleteName(formData: FormData) {
  const session = await requireSession()
  if (!session.hasAthlete) {
    throw new Error('Only athletes can update this display name.')
  }
  const name = ((formData.get('name') as string) ?? '').trim()
  if (!name) throw new Error('Name is required.')
  if (name.length > 120) throw new Error('Name is too long.')

  // Own athlete profile only — never the coach-selected athlete cookie.
  await prisma.athlete.update({
    where: { userId: session.userId },
    data: { name },
  })

  revalidatePath('/settings')
  revalidatePath('/settings/preferences')
  revalidatePath('/settings/account')
  revalidatePath('/dashboard')
}

export async function updateCoachName(formData: FormData) {
  const session = await requireSession()
  if (!isCoach(session)) {
    throw new Error('Only coaches can update this display name.')
  }
  const name = ((formData.get('name') as string) ?? '').trim()
  if (!name) throw new Error('Name is required.')
  if (name.length > 120) throw new Error('Name is too long.')

  await prisma.user.update({
    where: { id: session.userId },
    data: { name },
  })

  revalidatePath('/settings')
  revalidatePath('/settings/preferences')
  revalidatePath('/settings/account')
  revalidatePath('/dashboard')
  revalidatePath('/inbox')
}

const AVATAR_MAX_BYTES = 2 * 1024 * 1024
const AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

async function writeAvatarFile(
  file: File,
  basename: string,
): Promise<string> {
  if (!AVATAR_TYPES.has(file.type)) {
    throw new Error('Use a JPEG, PNG, WebP, or GIF image.')
  }
  if (file.size > AVATAR_MAX_BYTES) {
    throw new Error('Image must be 2 MB or smaller.')
  }

  const ext =
    file.type === 'image/png'
      ? 'png'
      : file.type === 'image/webp'
        ? 'webp'
        : file.type === 'image/gif'
          ? 'gif'
          : 'jpg'

  const filename = `${basename}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())
  await putAvatarFile(filename, buffer, file.type || 'image/jpeg')
  return `/uploads/avatars/${filename}?v=${Date.now()}`
}

export async function uploadAthleteAvatar(formData: FormData) {
  const session = await requireSession()
  if (!session.hasAthlete) {
    throw new Error('Only athletes can upload a profile photo.')
  }

  const own = await prisma.athlete.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  })
  if (!own) throw new Error('Only athletes can upload a profile photo.')

  const file = formData.get('avatar')
  if (!(file instanceof File) || file.size === 0) {
    throw new Error('Choose an image to upload.')
  }

  const avatarUrl = await writeAvatarFile(file, own.id)
  await prisma.athlete.update({
    where: { id: own.id },
    data: { avatarUrl },
  })

  revalidatePath('/settings')
  revalidatePath('/settings/preferences')
  revalidatePath('/settings/account')
  revalidatePath('/dashboard')
  revalidatePath('/training')
}

export async function uploadCoachAvatar(formData: FormData) {
  const session = await requireSession()
  if (!isCoach(session)) {
    throw new Error('Only coaches can upload a coach photo.')
  }

  const coachProfile = await prisma.coachProfile.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  })
  if (!coachProfile) throw new Error('Only coaches can upload a coach photo.')

  const file = formData.get('avatar')
  if (!(file instanceof File) || file.size === 0) {
    throw new Error('Choose an image to upload.')
  }

  const avatarUrl = await writeAvatarFile(file, `coach-${coachProfile.id}`)
  await prisma.coachProfile.update({
    where: { id: coachProfile.id },
    data: { avatarUrl },
  })

  revalidatePath('/settings')
  revalidatePath('/settings/preferences')
  revalidatePath('/settings/account')
  revalidatePath('/dashboard')
  revalidatePath('/inbox')
}

export async function syncAvatarFromStrava() {
  const session = await requireSession()
  if (!session.hasAthlete) {
    throw new Error('Only athletes can sync a Strava photo.')
  }

  const own = await prisma.athlete.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  })
  if (!own) throw new Error('Only athletes can sync a Strava photo.')

  const { syncStravaAvatarForUser } = await import('@/lib/strava/avatar')
  const url = await syncStravaAvatarForUser(session.userId, own.id)
  if (!url) throw new Error('No Strava profile photo found.')

  revalidatePath('/settings')
  revalidatePath('/settings/preferences')
  revalidatePath('/settings/account')
  revalidatePath('/dashboard')
  revalidatePath('/training')
}

export async function clearAthleteAvatar() {
  const session = await requireSession()
  if (!session.hasAthlete) {
    throw new Error('Only athletes can clear a profile photo.')
  }

  await prisma.athlete.update({
    where: { userId: session.userId },
    data: { avatarUrl: null },
  })

  revalidatePath('/settings')
  revalidatePath('/settings/preferences')
  revalidatePath('/settings/account')
  revalidatePath('/dashboard')
  revalidatePath('/training')
}

export async function clearCoachAvatar() {
  const session = await requireSession()
  if (!isCoach(session)) {
    throw new Error('Only coaches can clear a coach photo.')
  }

  await prisma.coachProfile.update({
    where: { userId: session.userId },
    data: { avatarUrl: null },
  })

  revalidatePath('/settings')
  revalidatePath('/settings/preferences')
  revalidatePath('/settings/account')
  revalidatePath('/dashboard')
  revalidatePath('/inbox')
}

export async function updateCoachPlanningLeadDays(formData: FormData) {
  const session = await requireSession()
  if (!isCoach(session)) {
    throw new Error('Only coaches can update planning reminders.')
  }

  const raw = formData.get('planningLeadDays')
  const parsed = typeof raw === 'string' ? parseInt(raw, 10) : NaN
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 30) {
    throw new Error('Choose a lead time between 1 and 30 days.')
  }

  await prisma.user.update({
    where: { id: session.userId },
    data: { planningLeadDays: Math.floor(parsed) },
  })

  revalidatePath('/settings/preferences')
  revalidatePath('/dashboard')
}

async function loadCoachWorkoutBuilderPrefsJson() {
  const session = await requireSession()
  if (!isCoach(session)) return { session, raw: null as unknown }
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { workoutBuilderPrefs: true },
  })
  return { session, raw: user?.workoutBuilderPrefs ?? null }
}

export async function getCoachWorkoutBuilderPrefs(): Promise<WorkoutBuilderPrefs> {
  const { raw } = await loadCoachWorkoutBuilderPrefsJson()
  return parseWorkoutBuilderPrefs(raw)
}

export async function updateCoachWorkoutBuilderPrefs(prefs: WorkoutBuilderPrefs) {
  const session = await requireSession()
  if (!isCoach(session)) {
    throw new Error('Only coaches can update workout builder preferences.')
  }

  const existing = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { workoutBuilderPrefs: true },
  })
  const cleaned = parseWorkoutBuilderPrefs(prefs)
  await prisma.user.update({
    where: { id: session.userId },
    data: {
      workoutBuilderPrefs: mergeWorkoutBuilderPrefsJson(
        cleaned,
        sessionOptionsJsonFromRaw(existing?.workoutBuilderPrefs),
      ) as Prisma.InputJsonValue,
    },
  })

  revalidatePath('/settings/preferences')
  revalidatePath('/training')
  revalidatePath('/workouts')
}

export async function getCoachWorkoutTypePrefs(): Promise<WorkoutTypePrefs> {
  const { raw } = await loadCoachWorkoutBuilderPrefsJson()
  return parseWorkoutTypePrefs(raw)
}

export async function updateCoachWorkoutTypePrefs(prefs: WorkoutTypePrefs) {
  const session = await requireSession()
  if (!isCoach(session)) {
    throw new Error('Only coaches can update workout preferences.')
  }

  const existing = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { workoutBuilderPrefs: true },
  })
  const builder = parseWorkoutBuilderPrefs(existing?.workoutBuilderPrefs)
  const cleaned = parseWorkoutTypePrefs({ sessionOptions: workoutTypePrefsToJson(prefs) })
  await prisma.user.update({
    where: { id: session.userId },
    data: {
      workoutBuilderPrefs: mergeWorkoutBuilderPrefsJson(
        builder,
        workoutTypePrefsToJson(cleaned),
      ) as Prisma.InputJsonValue,
    },
  })

  revalidatePath('/settings/preferences')
  revalidatePath('/training')
  revalidatePath('/workouts')
}

export async function getAthletePreferences(athleteId: string): Promise<AthletePreferences | null> {
  const athlete = await prisma.athlete.findUnique({
    where: { id: athleteId },
    select: {
      paceRecoveryMinPerKm: true,
      paceEasyMinPerKm: true,
      paceTempoMinPerKm: true,
      paceThresholdMinPerKm: true,
      paceVo2MaxMinPerKm: true,
      bikeSpeedRecoveryKph: true,
      bikeSpeedEasyKph: true,
      bikeSpeedTempoKph: true,
      bikeSpeedThresholdKph: true,
      bikeSpeedVo2MaxKph: true,
      bikeFtpWatts: true,
      swimCssSecPer100m: true,
      hrMax: true,
      hrResting: true,
      hrZone1Max: true,
      hrZone2Max: true,
      hrZone3Max: true,
      hrZone4Max: true,
    },
  })
  if (!athlete) return null
  return pickAthletePreferences(athlete)
}

type CalendarFeedSummary = {
  type: CalendarFeedType
  feedUrl: string | null
  tokenHint: string | null
  googleSyncEnabled: boolean
  googleCalendarId: string | null
}

export async function getCalendarFeedSummaries(): Promise<CalendarFeedSummary[]> {
  const { athleteId } = await requireAthleteForPreferences()
  const rows = await prisma.calendarFeed.findMany({
    where: { athleteId },
    select: {
      type: true,
      tokenHint: true,
      googleSyncEnabled: true,
      googleCalendarId: true,
    },
  })
  const byType = new Map(rows.map((row) => [row.type, row]))
  return [CalendarFeedType.TRAINING, CalendarFeedType.RACES].map((type) => {
    const row = byType.get(type)
    return {
      type,
      feedUrl: null,
      tokenHint: row?.tokenHint ?? null,
      googleSyncEnabled: Boolean(row?.googleSyncEnabled),
      googleCalendarId: row?.googleCalendarId ?? null,
    }
  })
}

export async function rotateCalendarFeedToken(type: CalendarFeedType): Promise<{
  type: CalendarFeedType
  feedUrl: string
  tokenHint: string
}> {
  const { athleteId } = await requireAthleteForPreferences()
  const token = generateCalendarFeedToken()
  const hashed = hashCalendarFeedToken(token)
  const hint = tokenHint(token)

  await prisma.calendarFeed.upsert({
    where: {
      athleteId_type: { athleteId, type },
    },
    create: {
      athleteId,
      type,
      tokenHash: hashed,
      tokenHint: hint,
    },
    update: {
      tokenHash: hashed,
      tokenHint: hint,
    },
  })

  revalidatePath('/settings/preferences')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) throw new Error('NEXT_PUBLIC_APP_URL is required for calendar feeds')
  return {
    type,
    feedUrl: feedUrlFromToken(type, token, appUrl),
    tokenHint: hint,
  }
}

export async function disableGoogleCalendarSync(type: CalendarFeedType) {
  const session = await requireSession()
  const athleteId = await resolveAthleteId(session)
  if (!athleteId) throw new Error('No athlete selected')

  await prisma.calendarFeed.updateMany({
    where: { athleteId, type },
    data: { googleSyncEnabled: false },
  })
  await prisma.calendarEventMap.deleteMany({
    where: { athleteId, type },
  })
  revalidatePath('/settings/preferences')
}

export async function enableGoogleCalendarSync(type: CalendarFeedType) {
  const session = await requireSession()
  const athleteId = await resolveAthleteId(session)
  if (!athleteId) throw new Error('No athlete selected')

  const google = await prisma.account.findFirst({
    where: { userId: session.userId, provider: 'google' },
    select: { id: true, scope: true },
  })
  if (!google) {
    throw new Error('Link Google in Account settings first.')
  }
  if (!google.scope?.includes('https://www.googleapis.com/auth/calendar.events')) {
    throw new Error('Relink Google to grant Calendar permission.')
  }

  await prisma.calendarFeed.upsert({
    where: { athleteId_type: { athleteId, type } },
    create: {
      athleteId,
      type,
      tokenHash: hashCalendarFeedToken(generateCalendarFeedToken()),
      tokenHint: null,
      googleSyncEnabled: true,
      googleCalendarId: googleCalendarName(type),
    },
    update: {
      googleSyncEnabled: true,
      googleCalendarId: googleCalendarName(type),
    },
  })

  await queueGoogleCalendarSync(athleteId)
  revalidatePath('/settings/preferences')
}
