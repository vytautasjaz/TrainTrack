'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { onTrainingCalendarDataChanged } from '@/lib/calendar-invalidation'
import {
  coachCanAccessAthlete,
  requireAthleteSession,
  requireSession,
} from '@/lib/session'
import {
  attachStravaActivityToWorkoutForAthlete,
  attachStravaActivityToRaceForAthlete,
  attachStravaActivityToRaceLegForAthlete,
  ensureTriathlonLegsForRace,
  importStravaActivityAsWorkoutForAthlete,
  listStravaActivitiesForWorkoutForAthlete,
  listStravaActivitiesForRaceForAthlete,
  listUnmatchedStravaActivitiesForAthlete,
  maybeAutoSyncStravaActivitiesForUser,
  setStravaAutoSyncEnabledForUser,
  syncStravaActivitiesForUser,
  unlinkStravaFromWorkoutForAthlete,
  unlinkStravaFromRaceForAthlete,
  unlinkStravaFromRaceLegForAthlete,
} from '@/lib/strava/sync'
import {
  fetchStravaActivityStreams,
  getValidAccessToken,
} from '@/lib/strava/client'
import { downsampleStreamSeries } from '@/lib/strava/stream-chart'

async function revalidateAfterStrava(athleteId: string | null | undefined) {
  if (athleteId) {
    await onTrainingCalendarDataChanged(athleteId)
  } else {
    revalidatePath('/dashboard')
    revalidatePath('/training')
  }
  revalidatePath('/settings/preferences')
  revalidatePath('/progress')
}

async function revalidateWorkoutAfterStrava(athleteId: string, workoutId: string) {
  await revalidateAfterStrava(athleteId)
  revalidatePath(`/workouts/${workoutId}`)
}

export async function disconnectStrava() {
  const session = await requireAthleteSession()

  await prisma.stravaConnection.deleteMany({
    where: { userId: session.userId },
  })

  revalidatePath('/settings/preferences')
  revalidatePath('/dashboard')
}

/** Manual sync of recent activities (uses lastSyncedAt window). */
export async function syncStravaActivities() {
  const session = await requireAthleteSession()
  const result = await syncStravaActivitiesForUser(session.userId, session.athleteId)

  await revalidateAfterStrava(session.athleteId)
  return result
}

/**
 * Manual sync for one day or an inclusive date range (yyyy-MM-DD).
 * Does not advance lastSyncedAt so auto-sync windows stay intact.
 */
export async function syncStravaActivitiesForDateRange(fromKey: string, toKey?: string) {
  const session = await requireAthleteSession()
  const result = await syncStravaActivitiesForUser(session.userId, session.athleteId, {
    fromKey,
    toKey: toKey || fromKey,
    updateLastSyncedAt: false,
  })

  await revalidateAfterStrava(session.athleteId)
  return result
}

export async function setStravaAutoSyncEnabled(enabled: boolean) {
  const session = await requireAthleteSession()
  const result = await setStravaAutoSyncEnabledForUser(session.userId, enabled)
  revalidatePath('/settings/preferences')
  return result
}

/**
 * Background auto-sync on app load. No-ops if not connected, disabled, or synced recently.
 * Prefer hourly cron (`/api/cron/strava-sync`); this is a local/dev fallback.
 */
export async function maybeAutoSyncStravaActivities() {
  const session = await requireAthleteSession()
  const result = await maybeAutoSyncStravaActivitiesForUser(
    session.userId,
    session.athleteId,
  )

  if (result.status === 'synced' && result.matched > 0) {
    await revalidateAfterStrava(session.athleteId)
  }

  return result
}

export async function isStravaConnected() {
  const session = await requireAthleteSession()
  const connection = await prisma.stravaConnection.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  })
  return Boolean(connection)
}

/** Detach a wrongly linked Strava activity and restore the workout to planned. */
export async function unlinkStravaFromWorkout(workoutId: string) {
  const session = await requireAthleteSession()
  await unlinkStravaFromWorkoutForAthlete(session.userId, session.athleteId, workoutId)
  await revalidateWorkoutAfterStrava(session.athleteId, workoutId)
}

/** Same-day compatible Strava activities for manual attach. */
export async function listStravaActivitiesForWorkout(workoutId: string) {
  const session = await requireAthleteSession()
  return listStravaActivitiesForWorkoutForAthlete(
    session.userId,
    session.athleteId,
    workoutId,
  )
}

/** Attach a chosen Strava activity to a planned / detached workout. */
export async function attachStravaActivityToWorkout(workoutId: string, activityId: string) {
  const session = await requireAthleteSession()
  await attachStravaActivityToWorkoutForAthlete(
    session.userId,
    session.athleteId,
    workoutId,
    activityId,
  )
  await revalidateWorkoutAfterStrava(session.athleteId, workoutId)
}

/** Unmatched Strava activities to import as new self-logged workouts. */
export async function listUnmatchedStravaActivities(fromKey?: string, toKey?: string) {
  const session = await requireAthleteSession()
  return listUnmatchedStravaActivitiesForAthlete(session.userId, session.athleteId, {
    fromKey,
    toKey,
  })
}

/** Import a Strava activity as a completed self-logged workout (not on the plan). */
export async function importStravaActivityAsWorkout(activityId: string) {
  const session = await requireAthleteSession()
  const result = await importStravaActivityAsWorkoutForAthlete(
    session.userId,
    session.athleteId,
    activityId,
  )
  await revalidateWorkoutAfterStrava(session.athleteId, result.workoutId)
  return result
}

async function revalidateRacePaths(athleteId: string, raceId?: string) {
  await revalidateAfterStrava(athleteId)
  revalidatePath('/season')
  revalidatePath(`/athletes/${athleteId}`)
  if (raceId) revalidatePath(`/season/${raceId}/edit`)
}

export async function listStravaActivitiesForRace(raceId: string, legId?: string) {
  const session = await requireAthleteSession()
  return listStravaActivitiesForRaceForAthlete(
    session.userId,
    session.athleteId,
    raceId,
    legId,
  )
}

export async function attachStravaActivityToRace(raceId: string, activityId: string) {
  const session = await requireAthleteSession()
  await attachStravaActivityToRaceForAthlete(
    session.userId,
    session.athleteId,
    raceId,
    activityId,
  )
  revalidateRacePaths(session.athleteId, raceId)
}

export async function unlinkStravaFromRace(raceId: string) {
  const session = await requireAthleteSession()
  await unlinkStravaFromRaceForAthlete(session.userId, session.athleteId, raceId)
  revalidateRacePaths(session.athleteId, raceId)
}

export async function attachStravaActivityToRaceLeg(legId: string, activityId: string) {
  const session = await requireAthleteSession()
  await attachStravaActivityToRaceLegForAthlete(
    session.userId,
    session.athleteId,
    legId,
    activityId,
  )
  revalidateRacePaths(session.athleteId)
}

export async function unlinkStravaFromRaceLeg(legId: string) {
  const session = await requireAthleteSession()
  await unlinkStravaFromRaceLegForAthlete(session.userId, session.athleteId, legId)
  revalidateRacePaths(session.athleteId)
}

/** Ensure triathlon legs exist (used after type changes). */
export async function ensureRaceLegs(raceId: string, type: Parameters<typeof ensureTriathlonLegsForRace>[1]) {
  await ensureTriathlonLegsForRace(raceId, type)
}

export type WorkoutStravaStreamsResult = {
  heartrate: { values: number[]; time: number[]; distance: number[] | null } | null
  watts: { values: number[]; time: number[]; distance: number[] | null } | null
  altitude: { values: number[]; time: number[]; distance: number[] | null } | null
}

/**
 * Feed chart streams (power / HR / elevation).
 * Prefer DB cache written at sync time. Legacy rows without a cache get a
 * one-shot Strava fetch that is persisted so charts never re-hit the API.
 */
export async function getWorkoutStravaStreams(
  workoutId: string,
): Promise<WorkoutStravaStreamsResult | null> {
  const session = await requireSession()
  const workout = await prisma.workout.findFirst({
    where: { id: workoutId },
    select: {
      athleteId: true,
      athlete: { select: { userId: true } },
      result: { select: { stravaActivityId: true, stravaStreamsCache: true } },
    },
  })
  if (!workout?.result?.stravaActivityId) return null

  const isOwner = Boolean(
    session.hasAthlete &&
      (await prisma.athlete.findFirst({
        where: { id: workout.athleteId, userId: session.userId },
        select: { id: true },
      })),
  )
  const isCoach =
    !isOwner && (await coachCanAccessAthlete(session.userId, workout.athleteId))
  if (!isOwner && !isCoach) throw new Error('Unauthorized')

  const cachedRaw = workout.result.stravaStreamsCache
  if (hasStreamsCachePayload(cachedRaw)) {
    return parseStreamsCache(cachedRaw)
  }

  const activityId = Number(workout.result.stravaActivityId)
  if (!Number.isFinite(activityId)) return null

  const athleteUserId = workout.athlete.userId
  if (!athleteUserId) return null

  let accessToken: string
  try {
    accessToken = await getValidAccessToken(athleteUserId)
  } catch {
    return null
  }

  const streams = await fetchStravaActivityStreams(accessToken, activityId)
  const pack = (values: number[] | null, withDistance = false) => {
    if (!values || values.length < 2) return null
    const down = downsampleStreamSeries(
      values,
      streams.time,
      140,
      withDistance ? streams.distance : null,
    )
    if (down.values.length < 2) return null
    return {
      values: down.values,
      time: down.time,
      distance: down.companion,
    }
  }

  const result: WorkoutStravaStreamsResult = {
    heartrate: pack(streams.heartrate),
    watts: pack(streams.watts),
    altitude: pack(streams.altitude, true),
  }

  // Persist even when empty so we do not keep calling Strava for this activity.
  await prisma.workoutResult
    .update({
      where: { stravaActivityId: workout.result.stravaActivityId },
      data: { stravaStreamsCache: result },
    })
    .catch(() => {})

  return result
}

function hasStreamsCachePayload(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false
  const obj = raw as Record<string, unknown>
  return 'heartrate' in obj || 'watts' in obj || 'altitude' in obj
}

function parseStreamsCache(raw: unknown): WorkoutStravaStreamsResult | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  const parseSeries = (value: unknown) => {
    if (!value || typeof value !== 'object') return null
    const s = value as { values?: unknown; time?: unknown; distance?: unknown }
    if (!Array.isArray(s.values) || !Array.isArray(s.time) || s.values.length < 2) {
      return null
    }
    return {
      values: s.values as number[],
      time: s.time as number[],
      distance: Array.isArray(s.distance) ? (s.distance as number[]) : null,
    }
  }
  return {
    heartrate: parseSeries(obj.heartrate),
    watts: parseSeries(obj.watts),
    altitude: parseSeries(obj.altitude),
  }
}
