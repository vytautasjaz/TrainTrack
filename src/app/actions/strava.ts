'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAthleteSession } from '@/lib/session'
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
  revalidateWorkoutPaths(result.workoutId)
  return result
}

function revalidateRacePaths(athleteId: string, raceId?: string) {
  revalidateStravaPaths()
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
