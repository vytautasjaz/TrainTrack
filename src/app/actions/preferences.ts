'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
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
  parseWorkoutBuilderPrefs,
  type WorkoutBuilderPrefs,
} from '@/lib/workout-builder/workout-builder-prefs'
import { requireSession, resolveAthleteId } from '@/lib/session'

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
}

export async function updateAthleteName(formData: FormData) {
  const session = await requireSession()
  const name = ((formData.get('name') as string) ?? '').trim()
  if (!name) throw new Error('Name is required.')
  if (name.length > 120) throw new Error('Name is too long.')

  await prisma.user.update({
    where: { id: session.userId },
    data: { name },
  })

  if (session.role === 'ATHLETE' && session.athleteId) {
    await prisma.athlete.update({
      where: { id: session.athleteId },
      data: { name },
    })
  }

  revalidatePath('/settings/preferences')
  revalidatePath('/dashboard')
}

const AVATAR_MAX_BYTES = 2 * 1024 * 1024
const AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export async function uploadAthleteAvatar(formData: FormData) {
  const session = await requireSession()
  if (session.role !== 'ATHLETE' || !session.athleteId) {
    throw new Error('Only athletes can upload a profile photo.')
  }

  const file = formData.get('avatar')
  if (!(file instanceof File) || file.size === 0) {
    throw new Error('Choose an image to upload.')
  }
  if (!AVATAR_TYPES.has(file.type)) {
    throw new Error('Use a JPEG, PNG, WebP, or GIF image.')
  }
  if (file.size > AVATAR_MAX_BYTES) {
    throw new Error('Image must be 2 MB or smaller.')
  }

  const { mkdir, writeFile } = await import('fs/promises')
  const path = await import('path')
  const ext =
    file.type === 'image/png'
      ? 'png'
      : file.type === 'image/webp'
        ? 'webp'
        : file.type === 'image/gif'
          ? 'gif'
          : 'jpg'

  const dir = path.join(process.cwd(), 'public', 'uploads', 'avatars')
  await mkdir(dir, { recursive: true })
  const filename = `${session.athleteId}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(path.join(dir, filename), buffer)

  const avatarUrl = `/uploads/avatars/${filename}?v=${Date.now()}`
  await prisma.athlete.update({
    where: { id: session.athleteId },
    data: { avatarUrl },
  })

  revalidatePath('/settings/preferences')
  revalidatePath('/dashboard')
  revalidatePath('/training')
}

export async function syncAvatarFromStrava() {
  const session = await requireSession()
  if (session.role !== 'ATHLETE' || !session.athleteId) {
    throw new Error('Only athletes can sync a Strava photo.')
  }

  const { syncStravaAvatarForUser } = await import('@/lib/strava/avatar')
  const url = await syncStravaAvatarForUser(session.userId, session.athleteId)
  if (!url) throw new Error('No Strava profile photo found.')

  revalidatePath('/settings/preferences')
  revalidatePath('/dashboard')
  revalidatePath('/training')
}

export async function clearAthleteAvatar() {
  const session = await requireSession()
  if (session.role !== 'ATHLETE' || !session.athleteId) {
    throw new Error('Only athletes can clear a profile photo.')
  }

  await prisma.athlete.update({
    where: { id: session.athleteId },
    data: { avatarUrl: null },
  })

  revalidatePath('/settings/preferences')
  revalidatePath('/dashboard')
  revalidatePath('/training')
}

export async function updateCoachPlanningLeadDays(formData: FormData) {
  const session = await requireSession()
  if (session.role !== 'COACH') {
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

export async function getCoachWorkoutBuilderPrefs(): Promise<WorkoutBuilderPrefs> {
  const session = await requireSession()
  if (session.role !== 'COACH') return {}

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { workoutBuilderPrefs: true },
  })
  return parseWorkoutBuilderPrefs(user?.workoutBuilderPrefs)
}

export async function updateCoachWorkoutBuilderPrefs(prefs: WorkoutBuilderPrefs) {
  const session = await requireSession()
  if (session.role !== 'COACH') {
    throw new Error('Only coaches can update workout builder preferences.')
  }

  const cleaned = parseWorkoutBuilderPrefs(prefs)
  await prisma.user.update({
    where: { id: session.userId },
    data: {
      workoutBuilderPrefs: cleaned as Prisma.InputJsonValue,
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
