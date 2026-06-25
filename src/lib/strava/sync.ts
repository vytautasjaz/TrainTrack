import { WorkoutStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { parseDateOnly, toDateKey } from '@/lib/dates'
import { fetchAllRecentActivities, getValidAccessToken, stravaActivityUrl } from './client'
import { mapStravaTypeToWorkoutType, workoutTypesCompatible } from './map-sport'
import type { StravaActivity } from './types'

export type StravaSyncResult = {
  scanned: number
  matched: number
  skipped: number
}

function activityDateKey(activity: StravaActivity): string {
  return activity.start_date_local.slice(0, 10)
}

function metersToKm(meters: number): number {
  return Math.round((meters / 1000) * 100) / 100
}

function secondsToMinutes(seconds: number): number {
  return Math.max(1, Math.round(seconds / 60))
}

async function findWorkoutForActivity(athleteId: string, activity: StravaActivity) {
  const activityType = mapStravaTypeToWorkoutType(activity.sport_type ?? activity.type)
  if (!activityType) return null

  const dateKey = activityDateKey(activity)
  const workoutDate = parseDateOnly(dateKey)

  const candidates = await prisma.workout.findMany({
    where: {
      athleteId,
      date: workoutDate,
      status: { in: [WorkoutStatus.PLANNED, WorkoutStatus.COMPLETED] },
      type: { not: 'REST' },
    },
    include: { result: true },
    orderBy: { createdAt: 'asc' },
  })

  const exact = candidates.find(
    (w) =>
      workoutTypesCompatible(w.type, activityType) &&
      !w.result?.stravaActivityId &&
      w.status === WorkoutStatus.PLANNED,
  )
  if (exact) return exact

  return (
    candidates.find(
      (w) =>
        workoutTypesCompatible(w.type, activityType) &&
        !w.result?.stravaActivityId &&
        w.status === WorkoutStatus.COMPLETED &&
        !w.result?.actualDistance,
    ) ?? null
  )
}

async function applyActivityToWorkout(workoutId: string, activity: StravaActivity) {
  const activityId = String(activity.id)
  const distanceKm = activity.distance > 0 ? metersToKm(activity.distance) : undefined
  const durationMin = secondsToMinutes(activity.moving_time || activity.elapsed_time)
  const notes = activity.name !== 'Morning Activity' ? activity.name : undefined

  await prisma.workout.update({
    where: { id: workoutId },
    data: { status: WorkoutStatus.COMPLETED },
  })

  await prisma.workoutResult.upsert({
    where: { workoutId },
    create: {
      workoutId,
      actualDistance: distanceKm,
      actualDuration: durationMin,
      athleteNotes: notes,
      stravaActivityId: activityId,
      stravaActivityUrl: stravaActivityUrl(activity.id),
      completedAt: new Date(activity.start_date),
    },
    update: {
      actualDistance: distanceKm,
      actualDuration: durationMin,
      athleteNotes: notes,
      stravaActivityId: activityId,
      stravaActivityUrl: stravaActivityUrl(activity.id),
      completedAt: new Date(activity.start_date),
    },
  })
}

export async function syncStravaActivitiesForUser(
  userId: string,
  athleteId: string,
): Promise<StravaSyncResult> {
  const athlete = await prisma.athlete.findUnique({ where: { id: athleteId } })
  if (!athlete) {
    throw new Error('Athlete not found')
  }
  if (athlete.userId !== userId) {
    throw new Error('Strava can only be synced for your own athlete profile')
  }

  const connection = await prisma.stravaConnection.findUnique({ where: { userId } })
  if (!connection) {
    throw new Error('Strava is not connected')
  }

  const accessToken = await getValidAccessToken(userId)
  const afterUnix =
    connection.lastSyncedAt != null
      ? Math.floor(connection.lastSyncedAt.getTime() / 1000) - 24 * 60 * 60
      : Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60

  const activities = await fetchAllRecentActivities(accessToken, afterUnix)

  let matched = 0
  let skipped = 0

  for (const activity of activities) {
    const existing = await prisma.workoutResult.findUnique({
      where: { stravaActivityId: String(activity.id) },
    })
    if (existing) {
      skipped += 1
      continue
    }

    const workout = await findWorkoutForActivity(athlete.id, activity)
    if (!workout) {
      skipped += 1
      continue
    }

    await applyActivityToWorkout(workout.id, activity)
    matched += 1
  }

  await prisma.stravaConnection.update({
    where: { userId },
    data: { lastSyncedAt: new Date() },
  })

  return { scanned: activities.length, matched, skipped }
}

export async function getStravaConnectionSummary(userId: string, athleteId?: string | null) {
  const connection = await prisma.stravaConnection.findUnique({ where: { userId } })
  if (!connection) return null

  const linkedCount = athleteId
    ? await prisma.workoutResult.count({
        where: {
          stravaActivityId: { not: null },
          workout: { athleteId },
        },
      })
    : await prisma.workoutResult.count({
        where: {
          stravaActivityId: { not: null },
          workout: { athlete: { userId } },
        },
      })

  return {
    stravaAthleteId: connection.stravaAthleteId,
    scope: connection.scope,
    expiresAt: connection.expiresAt,
    lastSyncedAt: connection.lastSyncedAt,
    linkedActivities: linkedCount,
  }
}

export function formatActivityPreview(activity: StravaActivity) {
  return {
    id: String(activity.id),
    name: activity.name,
    type: activity.sport_type ?? activity.type,
    date: toDateKey(new Date(activity.start_date_local)),
    distanceKm: activity.distance > 0 ? metersToKm(activity.distance) : null,
    durationMin: secondsToMinutes(activity.moving_time || activity.elapsed_time),
    url: stravaActivityUrl(activity.id),
  }
}
