import { AthleteLogType, SessionType, WorkoutStatus, WorkoutType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { addDateOnlyDays, parseDateOnly, toDateKey } from '@/lib/dates'
import { WORKOUT_TYPE_LABELS } from '@/lib/constants'
import { getNextWorkoutSortOrder } from '@/lib/workout-sort'
import {
  formatElapsedClock,
  raceLegSupportsStrava,
  raceUsesLegs,
  triathlonLegsCreateData,
  workoutTypeForRaceLeg,
} from '@/lib/race-legs'
import { fetchAllRecentActivities, fetchStravaActivity, getValidAccessToken, stravaActivityUrl } from './client'
import { syncStravaAvatarForUser } from './avatar'
import { mapStravaTypeToWorkoutType, workoutTypesCompatible } from './map-sport'
import type { StravaActivity } from './types'

/** Minimum time between automatic (login/app-load) syncs per athlete connection. */
export const STRAVA_AUTO_SYNC_INTERVAL_MS = 60 * 60 * 1000

export type StravaSyncResult = {
  scanned: number
  matched: number
  skipped: number
}

export type StravaAutoSyncResult =
  | { status: 'skipped'; reason: 'not_connected' | 'disabled' | 'recent' }
  | ({ status: 'synced' } & StravaSyncResult)

export type StravaSyncOptions = {
  /** Inclusive activity local-date keys (yyyy-MM-dd). When set, only that window is fetched. */
  fromKey?: string
  toKey?: string
  /** When false, leave lastSyncedAt unchanged (used for targeted manual range syncs). Default true. */
  updateLastSyncedAt?: boolean
}

function activityDateKey(activity: StravaActivity): string {
  return activity.start_date_local.slice(0, 10)
}

function metersToKm(meters: number): number {
  return Math.round((meters / 1000) * 100) / 100
}

/** Convert Strava seconds → minutes. Keeps second precision (26:03 → 26.05). */
function secondsToMinutes(seconds: number): number {
  const sec = Math.max(0, Math.round(seconds))
  return sec / 60
}

/** Whole minutes for Int columns (race legs, previews that expect integers). */
function secondsToWholeMinutes(seconds: number): number {
  return Math.max(1, Math.round(seconds / 60))
}

function optionalFinite(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null
  return value
}

/** Persistable Strava extras beyond distance/duration (for display + future use). */
function stravaMetricsFromActivity(activity: StravaActivity) {
  const summaryPolyline = activity.map?.summary_polyline?.trim() || null
  return {
    averageHeartrate: optionalFinite(activity.average_heartrate),
    maxHeartrate: optionalFinite(activity.max_heartrate),
    averageSpeedMps: optionalFinite(activity.average_speed),
    maxSpeedMps: optionalFinite(activity.max_speed),
    elevationGainM: optionalFinite(activity.total_elevation_gain),
    sufferScore:
      activity.suffer_score != null && Number.isFinite(activity.suffer_score)
        ? Math.round(activity.suffer_score)
        : null,
    averageCadence: optionalFinite(activity.average_cadence),
    kilojoules: optionalFinite(activity.kilojoules),
    calories: optionalFinite(activity.calories),
    averageWatts: optionalFinite(
      activity.average_watts ?? activity.weighted_average_watts,
    ),
    summaryPolyline,
  }
}

function isValidDateKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function resolveSyncWindow(options: StravaSyncOptions | undefined, lastSyncedAt: Date | null) {
  const fromKey = options?.fromKey?.trim() || undefined
  const toKey = options?.toKey?.trim() || fromKey

  if (fromKey || toKey) {
    if (!fromKey || !toKey || !isValidDateKey(fromKey) || !isValidDateKey(toKey)) {
      throw new Error('Enter a valid date or date range (YYYY-MM-DD).')
    }
    if (toKey < fromKey) {
      throw new Error('End date must be on or after the start date.')
    }
    // Cap range to limit Strava API load
    const start = parseDateOnly(fromKey)
    const end = parseDateOnly(toKey)
    const maxMs = 90 * 24 * 60 * 60 * 1000
    if (end.getTime() - start.getTime() > maxMs) {
      throw new Error('Date range cannot exceed 90 days.')
    }
    const afterUnix = Math.floor(start.getTime() / 1000) - 1
    const beforeUnix = Math.floor(addDateOnlyDays(end, 1).getTime() / 1000)
    return {
      afterUnix,
      beforeUnix,
      filterFromKey: fromKey,
      filterToKey: toKey,
      updateLastSyncedAt: options?.updateLastSyncedAt ?? false,
    }
  }

  const afterUnix =
    lastSyncedAt != null
      ? Math.floor(lastSyncedAt.getTime() / 1000) - 24 * 60 * 60
      : Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60

  return {
    afterUnix,
    beforeUnix: undefined as number | undefined,
    filterFromKey: null as string | null,
    filterToKey: null as string | null,
    updateLastSyncedAt: options?.updateLastSyncedAt ?? true,
  }
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
      isRescheduleGhost: false,
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

async function applyActivityToWorkout(
  workoutId: string,
  activity: StravaActivity,
  accessToken: string,
) {
  const activityId = String(activity.id)
  const distanceKm = activity.distance > 0 ? metersToKm(activity.distance) : undefined
  const durationMin = secondsToMinutes(activity.moving_time || activity.elapsed_time)
  const activityName = activity.name?.trim() || null

  // List summaries omit description / calories / sometimes map — fetch detail when needed.
  let activityDescription = activity.description?.trim() || null
  let detailedCalories = optionalFinite(activity.calories)
  let summaryPolyline = activity.map?.summary_polyline?.trim() || null
  if (!activityDescription || detailedCalories == null || !summaryPolyline) {
    try {
      const detailed = await fetchStravaActivity(accessToken, activity.id)
      activityDescription = activityDescription || detailed.description?.trim() || null
      detailedCalories = detailedCalories ?? optionalFinite(detailed.calories)
      summaryPolyline =
        summaryPolyline || detailed.map?.summary_polyline?.trim() || null
      // Prefer richer metrics from the detailed payload when present.
      Object.assign(activity, {
        average_heartrate: activity.average_heartrate ?? detailed.average_heartrate,
        max_heartrate: activity.max_heartrate ?? detailed.max_heartrate,
        average_speed: activity.average_speed ?? detailed.average_speed,
        max_speed: activity.max_speed ?? detailed.max_speed,
        total_elevation_gain:
          activity.total_elevation_gain ?? detailed.total_elevation_gain,
        average_cadence: activity.average_cadence ?? detailed.average_cadence,
        kilojoules: activity.kilojoules ?? detailed.kilojoules,
        average_watts: activity.average_watts ?? detailed.average_watts,
        weighted_average_watts:
          activity.weighted_average_watts ?? detailed.weighted_average_watts,
        suffer_score: activity.suffer_score ?? detailed.suffer_score,
        calories: activity.calories ?? detailed.calories,
        map: activity.map?.summary_polyline ? activity.map : detailed.map,
      })
    } catch (err) {
      console.warn('Strava activity detail fetch skipped:', err)
    }
  }

  await prisma.workout.update({
    where: { id: workoutId },
    data: { status: WorkoutStatus.COMPLETED },
  })

  const existing = await prisma.workoutResult.findUnique({ where: { workoutId } })
  // Older syncs copied the Strava title into athleteNotes — clear that so it is not
  // treated as coach feedback unless the athlete opts in again.
  const existingNotes = existing?.athleteNotes?.trim() || ''
  const clearAutoCopiedNotes =
    Boolean(existingNotes) &&
    (existingNotes === activityName ||
      (Boolean(activityDescription) && existingNotes === activityDescription))

  const metrics = {
    ...stravaMetricsFromActivity(activity),
    calories: detailedCalories ?? optionalFinite(activity.calories),
    summaryPolyline:
      summaryPolyline || stravaMetricsFromActivity(activity).summaryPolyline,
  }

  await prisma.workoutResult.upsert({
    where: { workoutId },
    create: {
      workoutId,
      actualDistance: distanceKm,
      actualDuration: durationMin,
      logType: AthleteLogType.COMPLETED,
      stravaActivityId: activityId,
      stravaActivityUrl: stravaActivityUrl(activity.id),
      stravaActivityName: activityName,
      stravaActivityDescription: activityDescription,
      ...metrics,
      completedAt: new Date(activity.start_date),
    },
    update: {
      actualDistance: distanceKm,
      actualDuration: durationMin,
      logType: AthleteLogType.COMPLETED,
      stravaActivityId: activityId,
      stravaActivityUrl: stravaActivityUrl(activity.id),
      stravaActivityName: activityName,
      stravaActivityDescription: activityDescription,
      ...metrics,
      completedAt: new Date(activity.start_date),
      ...(clearAutoCopiedNotes ? { athleteNotes: null } : {}),
    },
  })
}

export async function syncStravaActivitiesForUser(
  userId: string,
  athleteId: string,
  options?: StravaSyncOptions,
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
  try {
    await syncStravaAvatarForUser(userId, athleteId)
  } catch (err) {
    console.warn('Strava avatar sync skipped:', err)
  }

  const window = resolveSyncWindow(options, connection.lastSyncedAt)
  const activitiesRaw = await fetchAllRecentActivities(accessToken, {
    afterUnix: window.afterUnix,
    beforeUnix: window.beforeUnix,
  })
  const activities =
    window.filterFromKey && window.filterToKey
      ? activitiesRaw.filter((activity) => {
          const key = activityDateKey(activity)
          return key >= window.filterFromKey! && key <= window.filterToKey!
        })
      : activitiesRaw

  let matched = 0
  let skipped = 0

  for (const activity of activities) {
    if (activity.commute) {
      skipped += 1
      continue
    }

    const existing = await prisma.workoutResult.findUnique({
      where: { stravaActivityId: String(activity.id) },
    })
    if (existing) {
      // Backfill description / metrics / GPS / second-precise duration for previously synced activities.
      const needsDescription = !existing.stravaActivityDescription?.trim()
      const needsMetrics = existing.averageHeartrate == null && existing.averageSpeedMps == null
      const needsPolyline = !existing.summaryPolyline?.trim()
      const durationMin = secondsToMinutes(activity.moving_time || activity.elapsed_time)
      const needsDurationPrecision =
        existing.actualDuration == null ||
        Number.isInteger(existing.actualDuration)
      if (needsDescription || needsMetrics || needsPolyline || needsDurationPrecision) {
        try {
          const detailed =
            needsDescription || needsPolyline
              ? await fetchStravaActivity(accessToken, activity.id)
              : activity
          const description =
            existing.stravaActivityDescription?.trim() ||
            detailed.description?.trim() ||
            null
          const metrics = stravaMetricsFromActivity({
            ...activity,
            ...detailed,
            map: detailed.map ?? activity.map,
          })
          const preciseDuration = secondsToMinutes(
            detailed.moving_time ||
              detailed.elapsed_time ||
              activity.moving_time ||
              activity.elapsed_time,
          )
          await prisma.workoutResult.update({
            where: { id: existing.id },
            data: {
              ...(description ? { stravaActivityDescription: description } : {}),
              stravaActivityName:
                existing.stravaActivityName?.trim() ||
                detailed.name?.trim() ||
                activity.name?.trim() ||
                null,
              ...(needsDurationPrecision ? { actualDuration: preciseDuration || durationMin } : {}),
              ...(needsPolyline && metrics.summaryPolyline
                ? { summaryPolyline: metrics.summaryPolyline }
                : {}),
              ...(needsMetrics
                ? {
                    averageHeartrate:
                      existing.averageHeartrate ?? metrics.averageHeartrate,
                    maxHeartrate: existing.maxHeartrate ?? metrics.maxHeartrate,
                    averageSpeedMps:
                      existing.averageSpeedMps ?? metrics.averageSpeedMps,
                    maxSpeedMps: existing.maxSpeedMps ?? metrics.maxSpeedMps,
                    elevationGainM:
                      existing.elevationGainM ?? metrics.elevationGainM,
                    sufferScore: existing.sufferScore ?? metrics.sufferScore,
                    averageCadence:
                      existing.averageCadence ?? metrics.averageCadence,
                    kilojoules: existing.kilojoules ?? metrics.kilojoules,
                    calories: existing.calories ?? metrics.calories,
                    averageWatts: existing.averageWatts ?? metrics.averageWatts,
                  }
                : {}),
            },
          })
        } catch (err) {
          console.warn('Strava activity backfill skipped:', err)
        }
      }
      skipped += 1
      continue
    }

    const workout = await findWorkoutForActivity(athlete.id, activity)
    if (!workout) {
      skipped += 1
      continue
    }

    await applyActivityToWorkout(workout.id, activity, accessToken)
    matched += 1
  }

  if (window.updateLastSyncedAt) {
    await prisma.stravaConnection.update({
      where: { userId },
      data: { lastSyncedAt: new Date() },
    })
  }

  return { scanned: activities.length, matched, skipped }
}

/**
 * Debounced sync for app load / login. Skips Strava API calls if auto-sync is
 * disabled or a sync ran within STRAVA_AUTO_SYNC_INTERVAL_MS. Manual sync should
 * call syncStravaActivitiesForUser directly (always runs).
 */
export async function maybeAutoSyncStravaActivitiesForUser(
  userId: string,
  athleteId: string,
): Promise<StravaAutoSyncResult> {
  const connection = await prisma.stravaConnection.findUnique({ where: { userId } })
  if (!connection) {
    return { status: 'skipped', reason: 'not_connected' }
  }
  if (!connection.autoSyncEnabled) {
    return { status: 'skipped', reason: 'disabled' }
  }

  if (connection.lastSyncedAt) {
    const ageMs = Date.now() - connection.lastSyncedAt.getTime()
    if (ageMs < STRAVA_AUTO_SYNC_INTERVAL_MS) {
      return { status: 'skipped', reason: 'recent' }
    }
  }

  const result = await syncStravaActivitiesForUser(userId, athleteId)
  return { status: 'synced', ...result }
}

export async function setStravaAutoSyncEnabledForUser(userId: string, enabled: boolean) {
  const connection = await prisma.stravaConnection.findUnique({ where: { userId } })
  if (!connection) {
    throw new Error('Strava is not connected')
  }

  await prisma.stravaConnection.update({
    where: { userId },
    data: { autoSyncEnabled: enabled },
  })

  return { autoSyncEnabled: enabled }
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
    autoSyncEnabled: connection.autoSyncEnabled,
    linkedActivities: linkedCount,
  }
}

export function formatActivityPreview(activity: StravaActivity) {
  return {
    id: String(activity.id),
    name: activity.name,
    type: activity.sport_type ?? activity.type,
    date: activityDateKey(activity),
    startTimeLocal: activity.start_date_local.slice(11, 16),
    distanceKm: activity.distance > 0 ? metersToKm(activity.distance) : null,
    durationMin: secondsToMinutes(activity.moving_time || activity.elapsed_time),
    url: stravaActivityUrl(activity.id),
    commute: Boolean(activity.commute),
  }
}

export type StravaActivityPickItem = ReturnType<typeof formatActivityPreview> & {
  /** Already linked to some workout result (this or another). */
  linked: boolean
  linkedToThisWorkout: boolean
}

/**
 * Clear Strava link from a workout and restore it to PLANNED so it can be
 * re-matched or manually attached.
 */
export async function unlinkStravaFromWorkoutForAthlete(
  userId: string,
  athleteId: string,
  workoutId: string,
) {
  const workout = await prisma.workout.findFirst({
    where: { id: workoutId, athleteId },
    include: { result: true },
  })
  if (!workout) throw new Error('Workout not found')
  if (!workout.result?.stravaActivityId && !workout.result?.stravaActivityUrl) {
    throw new Error('This workout is not linked to Strava')
  }

  // Ensure the athlete account owns this profile (defense in depth).
  const athlete = await prisma.athlete.findFirst({
    where: { id: athleteId, userId },
    select: { id: true },
  })
  if (!athlete) throw new Error('You can only detach Strava from your own workouts')

  await prisma.$transaction([
    prisma.workout.update({
      where: { id: workoutId },
      data: { status: WorkoutStatus.PLANNED },
    }),
    prisma.workoutResult.update({
      where: { workoutId },
      data: {
        stravaActivityId: null,
        stravaActivityUrl: null,
        stravaActivityName: null,
        stravaActivityDescription: null,
        averageHeartrate: null,
        maxHeartrate: null,
        averageSpeedMps: null,
        maxSpeedMps: null,
        elevationGainM: null,
        sufferScore: null,
        averageCadence: null,
        kilojoules: null,
        calories: null,
        averageWatts: null,
        summaryPolyline: null,
        actualDistance: null,
        actualDuration: null,
        logType: null,
        rpe: null,
      },
    }),
  ])
}

/**
 * Same-day Strava activities compatible with the workout sport (for manual pick).
 * Commutes are included but flagged so the UI can disable them.
 */
export async function listStravaActivitiesForWorkoutForAthlete(
  userId: string,
  athleteId: string,
  workoutId: string,
): Promise<StravaActivityPickItem[]> {
  const athlete = await prisma.athlete.findFirst({
    where: { id: athleteId, userId },
    select: { id: true },
  })
  if (!athlete) throw new Error('You can only link Strava to your own workouts')

  const workout = await prisma.workout.findFirst({
    where: { id: workoutId, athleteId },
    include: { result: true },
  })
  if (!workout) throw new Error('Workout not found')

  const connection = await prisma.stravaConnection.findUnique({ where: { userId } })
  if (!connection) throw new Error('Strava is not connected')

  const dateKey = toDateKey(workout.date)
  const dayStart = parseDateOnly(dateKey)
  const afterUnix = Math.floor(dayStart.getTime() / 1000) - 1
  const beforeUnix = Math.floor(addDateOnlyDays(dayStart, 1).getTime() / 1000)

  const accessToken = await getValidAccessToken(userId)
  const activitiesRaw = await fetchAllRecentActivities(accessToken, {
    afterUnix,
    beforeUnix,
  })
  const activities = activitiesRaw.filter((activity) => activityDateKey(activity) === dateKey)

  const activityIds = activities.map((a) => String(a.id))
  const linkedResults =
    activityIds.length > 0
      ? await prisma.workoutResult.findMany({
          where: { stravaActivityId: { in: activityIds } },
          select: { stravaActivityId: true, workoutId: true },
        })
      : []
  const linkedByActivityId = new Map(
    linkedResults.map((r) => [r.stravaActivityId!, r.workoutId] as const),
  )

  return activities
    .filter((activity) => {
      const activityType = mapStravaTypeToWorkoutType(activity.sport_type ?? activity.type)
      if (!activityType) return false
      return workoutTypesCompatible(workout.type, activityType)
    })
    .map((activity) => {
      const id = String(activity.id)
      const linkedWorkoutId = linkedByActivityId.get(id)
      return {
        ...formatActivityPreview(activity),
        linked: Boolean(linkedWorkoutId),
        linkedToThisWorkout: linkedWorkoutId === workoutId,
      }
    })
}

/** Manually attach a Strava activity to a planned (or detached) workout. */
export async function attachStravaActivityToWorkoutForAthlete(
  userId: string,
  athleteId: string,
  workoutId: string,
  activityId: string,
) {
  const athlete = await prisma.athlete.findFirst({
    where: { id: athleteId, userId },
    select: { id: true },
  })
  if (!athlete) throw new Error('You can only link Strava to your own workouts')

  const workout = await prisma.workout.findFirst({
    where: { id: workoutId, athleteId },
    include: { result: true },
  })
  if (!workout) throw new Error('Workout not found')
  if (workout.result?.stravaActivityId) {
    throw new Error('Detach the current Strava activity before linking another')
  }

  const connection = await prisma.stravaConnection.findUnique({ where: { userId } })
  if (!connection) throw new Error('Strava is not connected')

  const numericId = Number(activityId)
  if (!Number.isFinite(numericId)) throw new Error('Invalid Strava activity')

  const alreadyLinked = await prisma.workoutResult.findUnique({
    where: { stravaActivityId: String(numericId) },
  })
  if (alreadyLinked) {
    throw new Error('That Strava activity is already linked to another workout')
  }

  const accessToken = await getValidAccessToken(userId)
  const activity = await fetchStravaActivity(accessToken, numericId)
  if (activity.commute) {
    throw new Error('Commute activities cannot be linked to planned workouts')
  }

  const activityType = mapStravaTypeToWorkoutType(activity.sport_type ?? activity.type)
  if (!activityType || !workoutTypesCompatible(workout.type, activityType)) {
    throw new Error('That Strava activity does not match this workout sport')
  }

  const dateKey = toDateKey(workout.date)
  if (activityDateKey(activity) !== dateKey) {
    throw new Error('Pick a Strava activity from the same day as this workout')
  }

  await applyActivityToWorkout(workout.id, activity, accessToken)
}

export type StravaRaceActivityPickItem = ReturnType<typeof formatActivityPreview> & {
  linked: boolean
  linkedToThisTarget: boolean
}

async function assertAthleteOwnsUser(userId: string, athleteId: string) {
  const athlete = await prisma.athlete.findFirst({
    where: { id: athleteId, userId },
    select: { id: true },
  })
  if (!athlete) throw new Error('You can only link Strava to your own races')
}

async function findRaceActivityLinks(activityIds: string[]) {
  if (activityIds.length === 0) {
    return {
      workoutIds: new Map<string, string>(),
      raceIds: new Map<string, string>(),
      legIds: new Map<string, string>(),
    }
  }
  const [linkedResults, linkedRaces, linkedLegs] = await Promise.all([
    prisma.workoutResult.findMany({
      where: { stravaActivityId: { in: activityIds } },
      select: { stravaActivityId: true, workoutId: true },
    }),
    prisma.race.findMany({
      where: { stravaActivityId: { in: activityIds } },
      select: { stravaActivityId: true, id: true },
    }),
    prisma.raceLeg.findMany({
      where: { stravaActivityId: { in: activityIds } },
      select: { stravaActivityId: true, id: true },
    }),
  ])
  return {
    workoutIds: new Map(linkedResults.map((r) => [r.stravaActivityId!, r.workoutId] as const)),
    raceIds: new Map(linkedRaces.map((r) => [r.stravaActivityId!, r.id] as const)),
    legIds: new Map(linkedLegs.map((r) => [r.stravaActivityId!, r.id] as const)),
  }
}

function activityLinkedElsewhere(
  activityId: string,
  links: Awaited<ReturnType<typeof findRaceActivityLinks>>,
  opts: { raceId?: string; legId?: string },
): boolean {
  if (links.workoutIds.has(activityId)) return true
  const raceOwner = links.raceIds.get(activityId)
  if (raceOwner && raceOwner !== opts.raceId) return true
  const legOwner = links.legIds.get(activityId)
  if (legOwner && legOwner !== opts.legId) return true
  return false
}

async function fetchSameDayActivities(userId: string, dateKey: string) {
  const connection = await prisma.stravaConnection.findUnique({ where: { userId } })
  if (!connection) throw new Error('Strava is not connected')

  const dayStart = parseDateOnly(dateKey)
  const afterUnix = Math.floor(dayStart.getTime() / 1000) - 1
  const beforeUnix = Math.floor(addDateOnlyDays(dayStart, 1).getTime() / 1000)
  const accessToken = await getValidAccessToken(userId)
  const activitiesRaw = await fetchAllRecentActivities(accessToken, {
    afterUnix,
    beforeUnix,
  })
  return activitiesRaw.filter((activity) => activityDateKey(activity) === dateKey)
}

function activityMatchesLegSport(
  activity: StravaActivity,
  sportFilter: WorkoutType | null,
): boolean {
  const activityType = mapStravaTypeToWorkoutType(activity.sport_type ?? activity.type)
  if (!activityType) return false
  if (!sportFilter) return true
  return workoutTypesCompatible(sportFilter, activityType)
}

/** Same-day Strava activities for linking to a race (overall) or triathlon leg. */
export async function listStravaActivitiesForRaceForAthlete(
  userId: string,
  athleteId: string,
  raceId: string,
  legId?: string,
): Promise<StravaRaceActivityPickItem[]> {
  await assertAthleteOwnsUser(userId, athleteId)

  const race = await prisma.race.findFirst({
    where: { id: raceId, athleteId },
    include: { legs: true },
  })
  if (!race) throw new Error('Race not found')

  let sportFilter: WorkoutType | null = race.sport
  let currentActivityId: string | null = race.stravaActivityId
  if (legId) {
    const leg = race.legs.find((l) => l.id === legId)
    if (!leg) throw new Error('Race leg not found')
    if (!raceLegSupportsStrava(leg.kind)) {
      throw new Error('Transitions cannot link Strava activities')
    }
    sportFilter = workoutTypeForRaceLeg(leg.kind)
    currentActivityId = leg.stravaActivityId
  }

  const dateKey = toDateKey(race.date)
  const activities = await fetchSameDayActivities(userId, dateKey)
  const activityIds = activities.map((a) => String(a.id))
  const links = await findRaceActivityLinks(activityIds)

  return activities
    .filter((activity) => activityMatchesLegSport(activity, sportFilter))
    .map((activity) => {
      const id = String(activity.id)
      const linkedToThis =
        currentActivityId === id ||
        (legId ? links.legIds.get(id) === legId : links.raceIds.get(id) === raceId)
      const linked =
        linkedToThis ||
        activityLinkedElsewhere(id, links, { raceId, legId })
      return {
        ...formatActivityPreview(activity),
        linked,
        linkedToThisTarget: linkedToThis,
      }
    })
}

async function assertActivityFreeForRace(
  activityId: string,
  opts: { raceId?: string; legId?: string },
) {
  const links = await findRaceActivityLinks([activityId])
  if (activityLinkedElsewhere(activityId, links, opts)) {
    throw new Error('That Strava activity is already linked elsewhere')
  }
}

function stravaFieldsFromActivity(activity: StravaActivity) {
  const elapsed = activity.moving_time || activity.elapsed_time
  return {
    stravaActivityId: String(activity.id),
    stravaActivityUrl: stravaActivityUrl(activity.id),
    stravaActivityName: activity.name?.trim() || null,
    resultTime: formatElapsedClock(elapsed),
    actualDistanceKm: activity.distance > 0 ? metersToKm(activity.distance) : null,
    actualDurationMin: secondsToWholeMinutes(elapsed),
  }
}

export async function attachStravaActivityToRaceForAthlete(
  userId: string,
  athleteId: string,
  raceId: string,
  activityId: string,
) {
  await assertAthleteOwnsUser(userId, athleteId)

  const race = await prisma.race.findFirst({
    where: { id: raceId, athleteId },
  })
  if (!race) throw new Error('Race not found')
  if (race.type === 'TRIATHLON') {
    throw new Error('Link Strava on each triathlon leg instead')
  }
  if (race.stravaActivityId) {
    throw new Error('Detach the current Strava activity before linking another')
  }

  const numericId = Number(activityId)
  if (!Number.isFinite(numericId)) throw new Error('Invalid Strava activity')
  await assertActivityFreeForRace(String(numericId), { raceId })

  const accessToken = await getValidAccessToken(userId)
  const activity = await fetchStravaActivity(accessToken, numericId)
  if (activity.commute) {
    throw new Error('Commute activities cannot be linked')
  }
  if (!activityMatchesLegSport(activity, race.sport)) {
    throw new Error('That Strava activity does not match this race sport')
  }
  const dateKey = toDateKey(race.date)
  if (activityDateKey(activity) !== dateKey) {
    throw new Error('Pick a Strava activity from the same day as this race')
  }

  const fields = stravaFieldsFromActivity(activity)
  await prisma.race.update({
    where: { id: raceId },
    data: {
      stravaActivityId: fields.stravaActivityId,
      stravaActivityUrl: fields.stravaActivityUrl,
      stravaActivityName: fields.stravaActivityName,
      resultTime: race.resultTime || fields.resultTime,
    },
  })
}

export async function unlinkStravaFromRaceForAthlete(
  userId: string,
  athleteId: string,
  raceId: string,
) {
  await assertAthleteOwnsUser(userId, athleteId)
  const race = await prisma.race.findFirst({
    where: { id: raceId, athleteId },
    select: { id: true },
  })
  if (!race) throw new Error('Race not found')

  await prisma.race.update({
    where: { id: raceId },
    data: {
      stravaActivityId: null,
      stravaActivityUrl: null,
      stravaActivityName: null,
    },
  })
}

export async function attachStravaActivityToRaceLegForAthlete(
  userId: string,
  athleteId: string,
  legId: string,
  activityId: string,
) {
  await assertAthleteOwnsUser(userId, athleteId)

  const leg = await prisma.raceLeg.findFirst({
    where: { id: legId, race: { athleteId } },
    include: { race: true },
  })
  if (!leg) throw new Error('Race leg not found')

  if (!raceLegSupportsStrava(leg.kind)) {
    throw new Error('Transitions cannot link Strava activities')
  }
  if (leg.stravaActivityId) {
    throw new Error('Detach the current Strava activity before linking another')
  }

  const numericId = Number(activityId)
  if (!Number.isFinite(numericId)) throw new Error('Invalid Strava activity')
  await assertActivityFreeForRace(String(numericId), { raceId: leg.raceId, legId })

  const accessToken = await getValidAccessToken(userId)
  const activity = await fetchStravaActivity(accessToken, numericId)
  if (activity.commute) {
    throw new Error('Commute activities cannot be linked')
  }
  const sport = workoutTypeForRaceLeg(leg.kind)
  if (!activityMatchesLegSport(activity, sport)) {
    throw new Error('That Strava activity does not match this leg')
  }
  const dateKey = toDateKey(leg.race.date)
  if (activityDateKey(activity) !== dateKey) {
    throw new Error('Pick a Strava activity from the same day as this race')
  }

  const fields = stravaFieldsFromActivity(activity)
  await prisma.raceLeg.update({
    where: { id: legId },
    data: {
      stravaActivityId: fields.stravaActivityId,
      stravaActivityUrl: fields.stravaActivityUrl,
      stravaActivityName: fields.stravaActivityName,
      resultTime: leg.resultTime || fields.resultTime,
      actualDistanceKm: fields.actualDistanceKm,
      actualDurationMin: fields.actualDurationMin,
    },
  })
}

export async function unlinkStravaFromRaceLegForAthlete(
  userId: string,
  athleteId: string,
  legId: string,
) {
  await assertAthleteOwnsUser(userId, athleteId)
  const leg = await prisma.raceLeg.findFirst({
    where: { id: legId, race: { athleteId } },
    select: { id: true },
  })
  if (!leg) throw new Error('Race leg not found')

  await prisma.raceLeg.update({
    where: { id: legId },
    data: {
      stravaActivityId: null,
      stravaActivityUrl: null,
      stravaActivityName: null,
      actualDistanceKm: null,
      actualDurationMin: null,
    },
  })
}

function sessionTypeForImportedWorkout(type: WorkoutType): SessionType {
  if (type === WorkoutType.STRENGTH) return SessionType.STRENGTH
  if (type === WorkoutType.HYROX) return SessionType.HYROX
  return SessionType.CUSTOM
}

export type StravaImportActivityItem = ReturnType<typeof formatActivityPreview> & {
  workoutType: WorkoutType
  linked: boolean
}

/**
 * Recent Strava activities that can be imported as new self-logged workouts
 * (not already linked, mappable sport, optional date window).
 */
export async function listUnmatchedStravaActivitiesForAthlete(
  userId: string,
  athleteId: string,
  options?: { fromKey?: string; toKey?: string },
): Promise<StravaImportActivityItem[]> {
  const athlete = await prisma.athlete.findFirst({
    where: { id: athleteId, userId },
    select: { id: true },
  })
  if (!athlete) throw new Error('You can only import Strava activities for your own account')

  const connection = await prisma.stravaConnection.findUnique({ where: { userId } })
  if (!connection) throw new Error('Strava is not connected')

  const today = toDateKey(new Date())
  const defaultFrom = toDateKey(addDateOnlyDays(parseDateOnly(today), -14))
  const window = resolveSyncWindow(
    {
      fromKey: options?.fromKey?.trim() || defaultFrom,
      toKey: options?.toKey?.trim() || today,
      updateLastSyncedAt: false,
    },
    null,
  )

  const accessToken = await getValidAccessToken(userId)
  const activitiesRaw = await fetchAllRecentActivities(accessToken, {
    afterUnix: window.afterUnix,
    beforeUnix: window.beforeUnix,
  })
  const activities =
    window.filterFromKey && window.filterToKey
      ? activitiesRaw.filter((activity) => {
          const key = activityDateKey(activity)
          return key >= window.filterFromKey! && key <= window.filterToKey!
        })
      : activitiesRaw

  const activityIds = activities.map((a) => String(a.id))
  const links = await findRaceActivityLinks(activityIds)
  const linkedIds = new Set([
    ...links.workoutIds.keys(),
    ...links.raceIds.keys(),
    ...links.legIds.keys(),
  ])

  return activities
    .map((activity) => {
      const workoutType = mapStravaTypeToWorkoutType(activity.sport_type ?? activity.type)
      if (!workoutType || workoutType === WorkoutType.REST) return null
      const id = String(activity.id)
      return {
        ...formatActivityPreview(activity),
        workoutType,
        linked: linkedIds.has(id),
      }
    })
    .filter((item): item is NonNullable<typeof item> => item != null)
    .sort((a, b) =>
      a.date === b.date
        ? b.startTimeLocal.localeCompare(a.startTimeLocal)
        : b.date.localeCompare(a.date),
    )
}

/**
 * Create a completed self-logged workout from a Strava activity that was not on the plan.
 */
export async function importStravaActivityAsWorkoutForAthlete(
  userId: string,
  athleteId: string,
  activityId: string,
): Promise<{ workoutId: string }> {
  const athlete = await prisma.athlete.findFirst({
    where: { id: athleteId, userId },
    select: { id: true },
  })
  if (!athlete) throw new Error('You can only import Strava activities for your own account')

  const connection = await prisma.stravaConnection.findUnique({ where: { userId } })
  if (!connection) throw new Error('Strava is not connected')

  const numericId = Number(activityId)
  if (!Number.isFinite(numericId)) throw new Error('Invalid Strava activity')

  const alreadyLinked = await prisma.workoutResult.findUnique({
    where: { stravaActivityId: String(numericId) },
  })
  if (alreadyLinked) {
    throw new Error('That Strava activity is already linked to a workout')
  }
  const raceLinks = await findRaceActivityLinks([String(numericId)])
  if (
    raceLinks.raceIds.has(String(numericId)) ||
    raceLinks.legIds.has(String(numericId))
  ) {
    throw new Error('That Strava activity is already linked to a race')
  }

  const accessToken = await getValidAccessToken(userId)
  const activity = await fetchStravaActivity(accessToken, numericId)
  if (activity.commute) {
    throw new Error('Commute activities cannot be imported as workouts')
  }

  const workoutType = mapStravaTypeToWorkoutType(activity.sport_type ?? activity.type)
  if (!workoutType || workoutType === WorkoutType.REST) {
    throw new Error('That Strava activity type is not supported')
  }

  const dateKey = activityDateKey(activity)
  const workoutDate = parseDateOnly(dateKey)
  const durationMin = secondsToMinutes(activity.moving_time || activity.elapsed_time)
  const distanceKm = activity.distance > 0 ? metersToKm(activity.distance) : null
  const title =
    activity.name?.trim() || WORKOUT_TYPE_LABELS[workoutType] || 'Workout'
  const sortOrder = await getNextWorkoutSortOrder(athleteId, workoutDate)

  const workout = await prisma.workout.create({
    data: {
      athleteId,
      date: workoutDate,
      sortOrder,
      type: workoutType,
      sessionType: sessionTypeForImportedWorkout(workoutType),
      title,
      status: WorkoutStatus.PLANNED,
      selfLogged: true,
      plannedDuration: durationMin,
      plannedDistance: workoutType === WorkoutType.SWIM ? null : distanceKm,
      plannedDistanceMeters:
        workoutType === WorkoutType.SWIM && activity.distance > 0
          ? Math.round(activity.distance)
          : null,
    },
  })

  await applyActivityToWorkout(workout.id, activity, accessToken)
  return { workoutId: workout.id }
}

export async function ensureTriathlonLegsForRace(raceId: string, type: import('@prisma/client').RaceType) {
  if (!raceUsesLegs(type)) {
    await prisma.raceLeg.deleteMany({ where: { raceId } })
    return
  }
  const existing = await prisma.raceLeg.count({ where: { raceId } })
  if (existing > 0) return
  await prisma.raceLeg.createMany({
    data: triathlonLegsCreateData().map((leg) => ({ ...leg, raceId })),
  })
}
