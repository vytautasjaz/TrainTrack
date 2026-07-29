'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAthleteSession } from '@/lib/session'
import {
  attachStravaActivityToWorkoutForAthlete,
  listStravaActivitiesForWorkoutForAthlete,
  maybeAutoSyncStravaActivitiesForUser,
  setStravaAutoSyncEnabledForUser,
  syncStravaActivitiesForUser,
  unlinkStravaFromWorkoutForAthlete,
} from '@/lib/strava/sync'

function revalidateStravaPaths() {
  revalidatePath('/dashboard')
  revalidatePath('/training')
  revalidatePath('/settings/preferences')
  revalidatePath('/progress')
}

function revalidateWorkoutPaths(workoutId: string) {
  revalidateStravaPaths()
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

  revalidateStravaPaths()
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

  revalidateStravaPaths()
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
 * Safe to call from a client effect; skip cases do not throw.
 */
export async function maybeAutoSyncStravaActivities() {
  const session = await requireAthleteSession()
  const result = await maybeAutoSyncStravaActivitiesForUser(
    session.userId,
    session.athleteId,
  )

  if (result.status === 'synced' && result.matched > 0) {
    revalidateStravaPaths()
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
  revalidateWorkoutPaths(workoutId)
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
  revalidateWorkoutPaths(workoutId)
}
