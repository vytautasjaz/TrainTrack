'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireSession, resolveAthleteId, requireAthleteSession, athleteOwnedByCoachWhere, isCoach, coachCanAccessAthlete } from '@/lib/session'
import { parseDateOnly, toDateKey } from '@/lib/dates'
import { WorkoutStatus, WorkoutType, RaceType, SessionType, RacePriority, RaceIntent, RaceOutcome, RaceCourseType, TriathlonDistance, CoachAthleteLinkStatus } from '@prisma/client'
import { AthleteLogTypeValues, parseAthleteLogType, isAthleteLogSkipped } from '@/lib/athlete-log-type'
import { defaultSportForRaceType } from '@/lib/races'
import {
  raceLegSupportsStrava,
  raceUsesLegs,
  triathlonLegsCreateData,
  TRIATHLON_LEG_ORDER,
} from '@/lib/race-legs'
import { ensureTriathlonLegsForRace } from '@/lib/strava/sync'
import { WORKOUT_TYPE_LABELS } from '@/lib/constants'
import { getNextWorkoutSortOrder } from '@/lib/workout-sort'
import { safeRedirectPath } from '@/lib/safe-redirect'
import { sportSlug } from '@/lib/workout-library/config'
import { loadAthletePreferencesForBuilder } from '@/lib/workout-builder/load-athlete-preferences'
import { resolveLibraryTemplateMetricsForAthlete } from '@/lib/workout-library/template-metrics'

function parseOptionalFloat(value: FormDataEntryValue | null) {
  if (!value || value === '') return undefined
  return parseFloat(value as string)
}

function parseOptionalInt(value: FormDataEntryValue | null) {
  if (!value || value === '') return undefined
  return parseInt(value as string, 10)
}

function parseOptionalString(value: FormDataEntryValue | null) {
  const str = (value as string)?.trim()
  return str || undefined
}

async function requireRaceAccess(raceId: string) {
  const session = await requireSession()
  const race = await prisma.race.findUnique({
    where: { id: raceId },
    select: { id: true, athleteId: true },
  })
  if (!race) throw new Error('Race not found')

  if (isCoach(session)) {
    const ok = await coachCanAccessAthlete(session.userId, race.athleteId)
    if (!ok) throw new Error('Race not found')
  } else {
    const ownId = await resolveAthleteId(session)
    if (!ownId || race.athleteId !== ownId) throw new Error('Race not found')
  }

  return { session, race }
}

function parseRaceCourseType(value: FormDataEntryValue | null): RaceCourseType | null {
  const raw = typeof value === 'string' ? value.trim() : ''
  if (!raw) return null
  return (Object.values(RaceCourseType) as string[]).includes(raw)
    ? (raw as RaceCourseType)
    : null
}

function parseTriathlonDistance(value: FormDataEntryValue | null): TriathlonDistance | null {
  const raw = typeof value === 'string' ? value.trim() : ''
  if (!raw) return null
  return (Object.values(TriathlonDistance) as string[]).includes(raw)
    ? (raw as TriathlonDistance)
    : null
}

function parseCustomDistanceKm(value: FormDataEntryValue | null): number | null {
  if (!value || value === '') return null
  const n = parseFloat(value as string)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 10) / 10
}

/** Swim: meters field → km; bike/run: km field. */
function parseLegPlannedDistanceKm(
  formData: FormData,
  kind: (typeof TRIATHLON_LEG_ORDER)[number],
): number | null {
  if (kind === 'SWIM') {
    const raw = formData.get('legPlannedDistanceM_SWIM')
    if (!raw || raw === '') return null
    const meters = parseFloat(raw as string)
    if (!Number.isFinite(meters) || meters <= 0) return null
    return Math.round((meters / 1000) * 1000) / 1000
  }
  if (kind === 'BIKE' || kind === 'RUN') {
    return parseCustomDistanceKm(formData.get(`legPlannedDistanceKm_${kind}`))
  }
  return null
}

function sumTriCustomDistanceKm(formData: FormData): number | null {
  let sum = 0
  for (const kind of TRIATHLON_LEG_ORDER) {
    if (!raceLegSupportsStrava(kind)) continue
    const km = parseLegPlannedDistanceKm(formData, kind)
    if (km != null) sum += km
  }
  if (sum <= 0) return null
  return Math.round(sum * 10) / 10
}

function buildWorkoutResultData({
  actualDistance,
  actualDuration,
  rpe,
  athleteNotes,
  logType,
}: {
  actualDistance?: number
  actualDuration?: number
  rpe?: number
  athleteNotes?: string
  logType: ReturnType<typeof parseAthleteLogType>
}) {
  return {
    ...(actualDistance !== undefined ? { actualDistance } : {}),
    ...(actualDuration !== undefined ? { actualDuration } : {}),
    ...(rpe !== undefined ? { rpe } : {}),
    ...(athleteNotes !== undefined ? { athleteNotes } : {}),
    logType,
  }
}

function revalidateWorkoutPaths(workoutId?: string) {
  revalidatePath('/dashboard')
  revalidatePath('/training')
  if (workoutId) revalidatePath(`/workouts/${workoutId}`)
}

async function cleanupLegacyRescheduleArtifacts(workout: {
  id: string
  athleteId: string
  isRescheduleGhost: boolean
  rescheduledFromId: string | null
  rescheduledCopy: { id: string } | null
}) {
  if (workout.isRescheduleGhost) {
    if (workout.rescheduledCopy) {
      await prisma.workout.delete({ where: { id: workout.id } })
      return workout.rescheduledCopy.id
    }
    await prisma.workout.update({
      where: { id: workout.id },
      data: { isRescheduleGhost: false },
    })
  }

  if (workout.rescheduledFromId) {
    const ghost = await prisma.workout.findUnique({
      where: { id: workout.rescheduledFromId },
      select: { id: true, isRescheduleGhost: true },
    })
    if (ghost?.isRescheduleGhost) {
      await prisma.workout.delete({ where: { id: ghost.id } })
    }
    await prisma.workout.update({
      where: { id: workout.id },
      data: { rescheduledFromId: null },
    })
  }

  if (workout.rescheduledCopy) {
    await prisma.workout.delete({ where: { id: workout.rescheduledCopy.id } })
    await prisma.workout.update({
      where: { id: workout.id },
      data: { isRescheduleGhost: false },
    })
  }

  return workout.id
}

async function requireAthleteOwnedWorkout(workoutId: string) {
  const session = await requireSession()
  if (!session.hasAthlete) throw new Error('Athlete only')

  const athleteId = await resolveAthleteId(session)
  if (!athleteId) throw new Error('No athlete profile')

  const workout = await prisma.workout.findFirst({
    where: { id: workoutId, athleteId },
    include: { result: true },
  })
  if (!workout) throw new Error('Workout not found')

  return workout
}

function assertNotStravaSynced(workout: { result: { stravaActivityUrl: string | null } | null }) {
  if (workout.result?.stravaActivityUrl) {
    throw new Error('Cannot modify a workout synced from Strava')
  }
}

/**
 * Athletes can add/edit a coach-facing comment on Strava-synced workouts
 * without changing imported stats. Empty clears the comment (no coach notification).
 */
export async function updateStravaWorkoutComment(formData: FormData) {
  const workoutId = formData.get('workoutId') as string
  if (!workoutId) throw new Error('Workout required')

  const workout = await requireAthleteOwnedWorkout(workoutId)
  if (!workout.result?.stravaActivityUrl) {
    throw new Error('This workout is not synced from Strava')
  }

  const athleteNotesRaw = (formData.get('athleteNotes') as string)?.trim()
  const athleteNotes = athleteNotesRaw || null

  await prisma.workoutResult.update({
    where: { workoutId },
    data: {
      athleteNotes,
      // Re-surface on coach dashboard when athlete shares/updates a comment
      feedbackDismissedAt: athleteNotes ? null : workout.result.feedbackDismissedAt,
    },
  })

  revalidateWorkoutPaths(workoutId)
}

export async function completeWorkout(formData: FormData) {
  const workoutId = formData.get('workoutId') as string
  if (!workoutId) throw new Error('Workout required')

  const workout = await requireAthleteOwnedWorkout(workoutId)
  assertNotStravaSynced(workout)
  const actualDistance = formData.get('actualDistance')
    ? parseFloat(formData.get('actualDistance') as string)
    : undefined
  const actualDuration = formData.get('actualDuration')
    ? parseInt(formData.get('actualDuration') as string, 10)
    : undefined
  const rpe = formData.get('rpe') ? parseInt(formData.get('rpe') as string, 10) : undefined
  const athleteNotesRaw = (formData.get('athleteNotes') as string)?.trim()
  const athleteNotes = athleteNotesRaw || undefined
  const logType = parseAthleteLogType(formData.get('logType'))
  const status = isAthleteLogSkipped(logType) ? WorkoutStatus.SKIPPED : WorkoutStatus.COMPLETED
  const resultData = buildWorkoutResultData({
    actualDistance,
    actualDuration,
    rpe,
    athleteNotes,
    logType,
  })

  await prisma.workout.update({
    where: { id: workoutId },
    data: { status },
  })

  await prisma.workoutResult.upsert({
    where: { workoutId },
    create: {
      workoutId,
      ...resultData,
    },
    update: resultData,
  })

  revalidateWorkoutPaths(workoutId)
}

export async function rescheduleWorkout(formData: FormData) {
  const session = await requireSession()
  if (!session.hasAthlete) throw new Error('Athlete only')

  const athleteId = await resolveAthleteId(session)
  if (!athleteId) throw new Error('No athlete profile')

  const workoutId = formData.get('workoutId') as string
  const rescheduledDate = formData.get('rescheduledDate') as string
  if (!workoutId || !rescheduledDate) throw new Error('Workout and date required')

  const athleteNotesRaw = (formData.get('athleteNotes') as string)?.trim()
  const athleteNotes = athleteNotesRaw || undefined
  const newDate = parseDateOnly(rescheduledDate)
  const actualDistance = parseOptionalFloat(formData.get('actualDistance'))
  const actualDuration = parseOptionalInt(formData.get('actualDuration'))

  const workout = await prisma.workout.findFirst({
    where: { id: workoutId, athleteId },
    include: { result: true, rescheduledCopy: true },
  })
  if (!workout) throw new Error('Workout not found')
  assertNotStravaSynced(workout)

  const activeWorkoutId = await cleanupLegacyRescheduleArtifacts(workout)
  const activeWorkout = await prisma.workout.findFirstOrThrow({
    where: { id: activeWorkoutId, athleteId },
  })

  const originalPlanDate = activeWorkout.rescheduledFromDate ?? activeWorkout.date
  const movingBackToOriginal = toDateKey(originalPlanDate) === rescheduledDate
  const sortOrder = await getNextWorkoutSortOrder(athleteId, newDate)

  const resultData = {
    logType: AthleteLogTypeValues.ADJUSTED,
    ...(actualDistance !== undefined ? { actualDistance } : {}),
    ...(actualDuration !== undefined ? { actualDuration } : {}),
    ...(athleteNotes !== undefined ? { athleteNotes } : {}),
  }

  await prisma.$transaction([
    prisma.workout.update({
      where: { id: activeWorkout.id },
      data: {
        date: newDate,
        sortOrder,
        rescheduledFromDate: movingBackToOriginal ? null : originalPlanDate,
        isRescheduleGhost: false,
        rescheduledFromId: null,
      },
    }),
    prisma.workoutResult.upsert({
      where: { workoutId: activeWorkout.id },
      create: { workoutId: activeWorkout.id, ...resultData },
      update: resultData,
    }),
  ])

  revalidateWorkoutPaths(activeWorkout.id)
}

export async function unlogWorkout(formData: FormData) {
  const session = await requireSession()
  if (!session.hasAthlete) throw new Error('Athlete only')

  const athleteId = await resolveAthleteId(session)
  if (!athleteId) throw new Error('No athlete profile')

  const workoutId = formData.get('workoutId') as string
  if (!workoutId) throw new Error('Workout required')

  const workout = await prisma.workout.findFirst({
    where: { id: workoutId, athleteId },
    include: { result: true, rescheduledCopy: true },
  })
  if (!workout) throw new Error('Workout not found')
  assertNotStravaSynced(workout)

  const activeWorkoutId = await cleanupLegacyRescheduleArtifacts(workout)
  const activeWorkout = await prisma.workout.findFirstOrThrow({
    where: { id: activeWorkoutId, athleteId },
  })

  const restoreDate = activeWorkout.rescheduledFromDate
  const sortOrder = restoreDate
    ? await getNextWorkoutSortOrder(athleteId, restoreDate)
    : undefined

  await prisma.workoutResult.deleteMany({ where: { workoutId: activeWorkout.id } })
  await prisma.workout.update({
    where: { id: activeWorkout.id },
    data: {
      status: WorkoutStatus.PLANNED,
      ...(restoreDate
        ? { date: restoreDate, rescheduledFromDate: null, sortOrder }
        : {}),
    },
  })

  revalidateWorkoutPaths(activeWorkout.id)
}

export async function markWorkoutDone(formData: FormData) {
  const session = await requireSession()
  if (!session.hasAthlete) throw new Error('Athlete only')

  const athleteId = await resolveAthleteId(session)
  if (!athleteId) throw new Error('No athlete profile')

  const workoutId = formData.get('workoutId') as string
  if (!workoutId) throw new Error('Workout required')

  const workout = await prisma.workout.findFirst({
    where: { id: workoutId, athleteId },
    include: { result: true },
  })
  if (!workout) throw new Error('Workout not found')
  assertNotStravaSynced(workout)

  await prisma.workout.update({
    where: { id: workoutId },
    data: { status: WorkoutStatus.COMPLETED },
  })

  await prisma.workoutResult.upsert({
    where: { workoutId },
    create: {
      workoutId,
      actualDistance: workout.plannedDistance,
      actualDuration: workout.plannedDuration,
      logType: AthleteLogTypeValues.COMPLETED,
    },
    update: { logType: AthleteLogTypeValues.COMPLETED },
  })

  revalidateWorkoutPaths(workoutId)
}

export async function markWorkoutSkipped(formData: FormData) {
  const session = await requireSession()
  if (!session.hasAthlete) throw new Error('Athlete only')

  const athleteId = await resolveAthleteId(session)
  if (!athleteId) throw new Error('No athlete profile')

  const workoutId = formData.get('workoutId') as string
  if (!workoutId) throw new Error('Workout required')

  const workout = await prisma.workout.findFirst({
    where: { id: workoutId, athleteId },
    include: { result: true },
  })
  if (!workout) throw new Error('Workout not found')
  assertNotStravaSynced(workout)

  await prisma.workout.update({
    where: { id: workoutId },
    data: { status: WorkoutStatus.SKIPPED },
  })

  await prisma.workoutResult.upsert({
    where: { workoutId },
    create: {
      workoutId,
      logType: AthleteLogTypeValues.SKIPPED,
    },
    update: { logType: AthleteLogTypeValues.SKIPPED },
  })

  revalidateWorkoutPaths(workoutId)
}

export async function createWorkoutFromTemplate(formData: FormData) {
  const session = await requireSession()
  if (!isCoach(session)) throw new Error('Coach only')
  const athleteId = await resolveAthleteId(session)
  if (!athleteId) throw new Error('No athlete selected')

  const templateId = formData.get('templateId') as string
  const date = formData.get('date') as string

  const template = await prisma.workoutTemplate.findUniqueOrThrow({
    where: { id: templateId, coachId: session.userId },
  })

  const workoutDate = parseDateOnly(date)
  const sortOrder = await getNextWorkoutSortOrder(athleteId, workoutDate)
  const preferences = await loadAthletePreferencesForBuilder(athleteId)
  const metrics = resolveLibraryTemplateMetricsForAthlete(template, preferences)
  const tags = [
    ...template.tags.filter((t) => t !== 'approx:duration' && t !== 'approx:distance'),
    ...(metrics.durationApprox ? ['approx:duration'] : []),
    ...(metrics.distanceApprox ? ['approx:distance'] : []),
  ]

  await prisma.workout.create({
    data: {
      athleteId,
      templateId,
      date: workoutDate,
      sortOrder,
      type: template.type,
      sessionType: template.sessionType,
      title: template.title,
      description: template.description,
      plannedDistance: metrics.distanceKm,
      plannedDuration: metrics.durationMin,
      coachNotes: template.notes,
      structure: template.structure ?? undefined,
      swimEnvironment: template.swimEnvironment ?? undefined,
      swimStructure: template.swimStructure ?? undefined,
      plannedDistanceMeters: template.plannedDistanceMeters ?? undefined,
      tags,
    },
  })

  revalidatePath('/training')
  revalidatePath('/dashboard')
}

/** Copy a planned workout into the coach library as a new template. */
export async function createTemplateFromWorkout(workoutId: string) {
  const session = await requireSession()
  if (!isCoach(session)) throw new Error('Coach only')
  if (!workoutId) throw new Error('Workout required')

  const workout = await prisma.workout.findFirst({
    where: {
      id: workoutId,
      athlete: athleteOwnedByCoachWhere(session.userId),
    },
  })
  if (!workout) throw new Error('Workout not found')

  const template = await prisma.workoutTemplate.create({
    data: {
      coachId: session.userId,
      title: workout.title,
      type: workout.type,
      sessionType: workout.sessionType,
      description: workout.description,
      distanceKm: workout.plannedDistance,
      durationMin: workout.plannedDuration,
      notes: workout.coachNotes,
      structure: workout.structure ?? undefined,
      swimEnvironment: workout.swimEnvironment ?? undefined,
      swimStructure: workout.swimStructure ?? undefined,
      plannedDistanceMeters: workout.plannedDistanceMeters ?? undefined,
      tags: workout.tags,
    },
    select: {
      id: true,
      title: true,
      type: true,
      sessionType: true,
      distanceKm: true,
      durationMin: true,
      plannedDistanceMeters: true,
    },
  })

  revalidatePath('/training')
  revalidatePath('/workouts')
  revalidatePath(`/workouts/library/${sportSlug(template.type)}`)

  return template
}

export async function createTemplate(formData: FormData) {
  const session = await requireSession()
  if (!isCoach(session)) throw new Error('Coach only')

  const type = formData.get('type') as WorkoutType

  await prisma.workoutTemplate.create({
    data: {
      coachId: session.userId,
      title: formData.get('title') as string,
      type,
      description: (formData.get('description') as string) || undefined,
      durationMin: formData.get('durationMin')
        ? parseInt(formData.get('durationMin') as string, 10)
        : undefined,
      distanceKm: formData.get('distanceKm')
        ? parseFloat(formData.get('distanceKm') as string)
        : undefined,
      notes: (formData.get('notes') as string) || undefined,
    },
  })

  revalidatePath('/workouts')
  revalidatePath(`/workouts/library/${sportSlug(type)}`)

  const returnSport = formData.get('returnSport') as WorkoutType | null
  if (returnSport) {
    redirect(`/workouts/library/${sportSlug(returnSport)}`)
  }
}

export async function createRace(formData: FormData) {
  const session = await requireSession()

  const formAthleteId = formData.get('athleteId') as string | null
  let athleteId: string | null = formAthleteId?.trim() || null

  if (isCoach(session) && athleteId) {
    const owned = await prisma.athlete.findFirst({
      where: { id: athleteId, ...athleteOwnedByCoachWhere(session.userId) },
      select: { id: true },
    })
    if (!owned) throw new Error('Athlete not found')
  } else if (isCoach(session)) {
    athleteId = await resolveAthleteId(session)
    if (athleteId) {
      const owned = await prisma.athlete.findFirst({
        where: { id: athleteId, ...athleteOwnedByCoachWhere(session.userId) },
        select: { id: true },
      })
      if (!owned) throw new Error('Athlete not found')
    }
  } else {
    athleteId = await resolveAthleteId(session)
  }

  if (!athleteId) throw new Error('No athlete selected')

  const raceType = formData.get('type') as RaceType
  const sportRaw = formData.get('sport') as WorkoutType | null
  const priorityRaw = (formData.get('priority') as RacePriority | null) || RacePriority.C
  const intentRaw = (formData.get('intent') as RaceIntent | null) || RaceIntent.PLANNED
  const courseType = parseRaceCourseType(formData.get('courseType'))
  const triathlonDistance =
    raceType === RaceType.TRIATHLON ? parseTriathlonDistance(formData.get('triathlonDistance')) : null
  const isTriCustom = triathlonDistance === TriathlonDistance.CUSTOM
  const customDistanceKm = isTriCustom
    ? sumTriCustomDistanceKm(formData)
    : parseCustomDistanceKm(formData.get('customDistanceKm'))
  const prepRaw = formData.get('preparationWeeks')
  let preparationWeeks: number | null = null
  if (typeof prepRaw === 'string' && prepRaw.trim()) {
    const parsed = parseInt(prepRaw.trim(), 10)
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 52) {
      throw new Error('Preparation weeks must be between 1 and 52.')
    }
    preparationWeeks = parsed
  }

  const created = await prisma.race.create({
    data: {
      athleteId,
      name: formData.get('name') as string,
      date: parseDateOnly(formData.get('date') as string),
      location: (formData.get('location') as string) || undefined,
      type: raceType,
      sport: sportRaw || defaultSportForRaceType(raceType),
      courseType,
      triathlonDistance,
      customDistanceKm,
      priority: priorityRaw,
      intent: intentRaw,
      goal: (formData.get('goal') as string) || undefined,
      url: parseOptionalString(formData.get('url')),
      preparationWeeks,
      ...(raceUsesLegs(raceType)
        ? { legs: { create: triathlonLegsCreateData() } }
        : {}),
    },
    select: { id: true },
  })

  // Optional planned split times from the add form (triathlon).
  if (raceUsesLegs(raceType)) {
    await saveRaceLegPlanFields(created.id, formData, { persistDistances: isTriCustom })
  }

  revalidatePath('/season')
  revalidatePath('/dashboard')
  revalidatePath('/training')
  revalidatePath(`/athletes/${athleteId}`)
}

async function saveRaceLegPlanFields(
  raceId: string,
  formData: FormData,
  options?: { persistDistances: boolean },
) {
  const persistDistances = options?.persistDistances ?? false
  for (const kind of TRIATHLON_LEG_ORDER) {
    const plannedTime = parseOptionalString(formData.get(`legPlannedTime_${kind}`)) ?? null
    const plannedNotes = parseOptionalString(formData.get(`legPlannedNotes_${kind}`)) ?? null
    const data: {
      plannedTime: string | null
      plannedNotes: string | null
      plannedDistanceKm?: number | null
    } = { plannedTime, plannedNotes }

    if (raceLegSupportsStrava(kind)) {
      data.plannedDistanceKm = persistDistances
        ? parseLegPlannedDistanceKm(formData, kind)
        : null
    }

    await prisma.raceLeg.updateMany({
      where: { raceId, kind },
      data,
    })
  }
}

async function saveRaceLegResultFields(raceId: string, formData: FormData) {
  for (const kind of TRIATHLON_LEG_ORDER) {
    const resultTime = parseOptionalString(formData.get(`legResultTime_${kind}`)) ?? null
    // Only overwrite when the field was present in the form.
    if (!formData.has(`legResultTime_${kind}`)) continue
    await prisma.raceLeg.updateMany({
      where: { raceId, kind },
      data: { resultTime },
    })
  }
}

export async function createAthlete(formData: FormData) {
  const session = await requireSession()
  if (!isCoach(session)) throw new Error('Coach only')

  const name = String(formData.get('name') ?? '').trim()
  if (!name) throw new Error('Name is required')

  const coachProfile = await prisma.coachProfile.findUnique({
    where: { userId: session.userId },
  })
  if (!coachProfile) throw new Error('Coach profile required — become a coach first')

  await prisma.$transaction(async (tx) => {
    const athlete = await tx.athlete.create({
      data: {
        coachId: session.userId,
        name,
      },
    })
    await tx.coachAthleteLink.create({
      data: {
        coachProfileId: coachProfile.id,
        athleteId: athlete.id,
        status: CoachAthleteLinkStatus.ACCEPTED,
      },
    })
  })

  revalidatePath('/dashboard')
}

export async function moveWorkout(formData: FormData) {
  await requireSession()
  const workoutId = formData.get('workoutId') as string
  const date = formData.get('date') as string

  await prisma.workout.update({
    where: { id: workoutId },
    data: { date: parseDateOnly(date) },
  })

  revalidatePath('/training')
}

export async function moveWorkoutToDate(workoutId: string, dateKey: string) {
  const session = await requireSession()
  if (!isCoach(session)) throw new Error('Only coaches can move workouts')

  const workout = await prisma.workout.findUniqueOrThrow({
    where: { id: workoutId },
    select: { athleteId: true },
  })
  const date = parseDateOnly(dateKey)
  const sortOrder = await getNextWorkoutSortOrder(workout.athleteId, date)

  await prisma.workout.update({
    where: { id: workoutId },
    data: { date, sortOrder },
  })

  revalidatePath('/training')
  revalidatePath('/dashboard')
}

export async function reorderDayWorkouts(dateKey: string, workoutIds: string[]) {
  const session = await requireSession()
  if (!isCoach(session)) throw new Error('Only coaches can reorder workouts')

  const athleteId = await resolveAthleteId(session)
  if (!athleteId) throw new Error('No athlete selected')

  const date = parseDateOnly(dateKey)
  const workouts = await prisma.workout.findMany({
    where: { id: { in: workoutIds }, athleteId, date },
    select: { id: true },
  })

  if (workouts.length !== workoutIds.length) {
    throw new Error('Invalid workouts for this day')
  }

  await prisma.$transaction(
    workoutIds.map((id, index) =>
      prisma.workout.update({
        where: { id },
        data: { sortOrder: index },
      }),
    ),
  )

  revalidatePath('/training')
  revalidatePath('/dashboard')
}

export async function duplicateWorkout(formData: FormData) {
  const date = formData.get('date') as string
  await copyWorkoutToDates({
    workoutId: formData.get('workoutId') as string,
    dates: date ? [date] : [],
  })
}

/** Copy a planned workout onto one or more calendar dates (coach). */
export async function copyWorkoutToDates(payload: {
  workoutId: string
  dates: string[]
}) {
  const session = await requireSession()
  if (!isCoach(session)) throw new Error('Coach only')

  const dates = [...new Set(payload.dates.map((d) => d.trim()).filter(Boolean))]
  if (!payload.workoutId || dates.length === 0) {
    throw new Error('Select at least one date')
  }

  const athleteId = await resolveAthleteId(session)
  if (!athleteId) throw new Error('No athlete selected')

  const source = await prisma.workout.findFirst({
    where: { id: payload.workoutId, athleteId },
  })
  if (!source) throw new Error('Workout not found')

  for (const date of dates) {
    const workoutDate = parseDateOnly(date)
    const sortOrder = await getNextWorkoutSortOrder(source.athleteId, workoutDate)
    await prisma.workout.create({
      data: {
        athleteId: source.athleteId,
        templateId: source.templateId,
        date: workoutDate,
        sortOrder,
        type: source.type,
        sessionType: source.sessionType,
        title: source.title,
        description: source.description,
        plannedDistance: source.plannedDistance,
        plannedDuration: source.plannedDuration,
        plannedDistanceMeters: source.plannedDistanceMeters,
        swimEnvironment: source.swimEnvironment,
        swimStructure: source.swimStructure ?? undefined,
        coachNotes: source.coachNotes,
        structure: source.structure ?? undefined,
        tags: source.tags,
      },
    })
  }

  revalidatePath('/training')
  revalidatePath('/dashboard')
}

/** Unique sport types already planned per day in a month (for copy calendar). */
export async function getAthleteDaySportsForMonth(year: number, month: number) {
  const session = await requireSession()
  if (!isCoach(session)) throw new Error('Coach only')

  const athleteId = await resolveAthleteId(session)
  if (!athleteId) return {} as Record<string, WorkoutType[]>

  const start = new Date(Date.UTC(year, month - 1, 1))
  const end = new Date(Date.UTC(year, month, 0))

  const workouts = await prisma.workout.findMany({
    where: {
      athleteId,
      date: { gte: start, lte: end },
    },
    select: {
      date: true,
      type: true,
    },
    orderBy: [{ date: 'asc' }, { sortOrder: 'asc' }],
  })

  const byDay: Record<string, WorkoutType[]> = {}
  for (const workout of workouts) {
    const key = toDateKey(workout.date)
    const list = byDay[key] ?? (byDay[key] = [])
    if (!list.includes(workout.type)) list.push(workout.type)
  }
  return byDay
}

export async function createWorkout(formData: FormData) {
  const session = await requireSession()
  if (!isCoach(session)) throw new Error('Coach only')

  const athleteId = await resolveAthleteId(session)
  if (!athleteId) throw new Error('No athlete selected')

  const workoutDate = parseDateOnly(formData.get('date') as string)
  const sortOrder = await getNextWorkoutSortOrder(athleteId, workoutDate)

  await prisma.workout.create({
    data: {
      athleteId,
      date: workoutDate,
      sortOrder,
      type: formData.get('type') as WorkoutType,
      title: formData.get('title') as string,
      description: parseOptionalString(formData.get('description')),
      plannedDistance: parseOptionalFloat(formData.get('plannedDistance')),
      plannedDuration: parseOptionalInt(formData.get('plannedDuration')),
      coachNotes: parseOptionalString(formData.get('coachNotes')),
    },
  })

  revalidatePath('/training')
  revalidatePath('/dashboard')
}

export async function updateWorkout(formData: FormData) {
  const session = await requireSession()
  if (!isCoach(session)) throw new Error('Coach only')

  const workoutId = formData.get('workoutId') as string

  await prisma.workout.update({
    where: { id: workoutId },
    data: {
      date: parseDateOnly(formData.get('date') as string),
      type: formData.get('type') as WorkoutType,
      title: formData.get('title') as string,
      description: parseOptionalString(formData.get('description')),
      plannedDistance: parseOptionalFloat(formData.get('plannedDistance')),
      plannedDuration: parseOptionalInt(formData.get('plannedDuration')),
      coachNotes: parseOptionalString(formData.get('coachNotes')),
    },
  })

  revalidatePath('/training')
  revalidatePath('/dashboard')
  revalidatePath(`/workouts/${workoutId}`)
}

/** Quick coach edit from plan cards (title / planned distance / duration). */
export async function patchPlanWorkoutCard(input: {
  workoutId: string
  title?: string
  plannedDistance?: number | null
  plannedDuration?: number | null
  plannedDistanceMeters?: number | null
}) {
  const session = await requireSession()
  if (!isCoach(session)) throw new Error('Coach only')

  const workoutId = input.workoutId?.trim()
  if (!workoutId) throw new Error('Workout required')

  const existing = await prisma.workout.findFirst({
    where: {
      id: workoutId,
      athlete: athleteOwnedByCoachWhere(session.userId),
    },
    select: { id: true, type: true },
  })
  if (!existing) throw new Error('Workout not found')

  const data: {
    title?: string
    plannedDistance?: number | null
    plannedDuration?: number | null
    plannedDistanceMeters?: number | null
  } = {}

  if (input.title !== undefined) {
    const title = input.title.trim()
    if (!title) throw new Error('Title required')
    data.title = title
  }
  if (input.plannedDistance !== undefined) {
    data.plannedDistance = input.plannedDistance
  }
  if (input.plannedDuration !== undefined) {
    data.plannedDuration = input.plannedDuration
  }
  if (input.plannedDistanceMeters !== undefined) {
    data.plannedDistanceMeters = input.plannedDistanceMeters
  }

  if (Object.keys(data).length === 0) return

  await prisma.workout.update({
    where: { id: workoutId },
    data,
  })

  revalidatePath('/training')
  revalidatePath('/dashboard')
  revalidatePath(`/workouts/${workoutId}`)
}

export async function deleteWorkout(formData: FormData) {
  const session = await requireSession()
  if (!isCoach(session)) throw new Error('Coach only')

  const workoutId = formData.get('workoutId') as string
  await prisma.workout.delete({ where: { id: workoutId } })

  revalidatePath('/training')
  revalidatePath('/dashboard')
  revalidatePath(`/workouts/${workoutId}`)

  const redirectTo = formData.get('redirectTo') as string | null
  if (redirectTo) {
    redirect(safeRedirectPath(redirectTo, '/training'))
  }
}

export async function updateTemplate(formData: FormData) {
  const session = await requireSession()
  if (!isCoach(session)) throw new Error('Coach only')

  const templateId = formData.get('templateId') as string

  const template = await prisma.workoutTemplate.findFirst({
    where: { id: templateId, coachId: session.userId },
  })
  if (!template) throw new Error('Template not found')

  await prisma.workoutTemplate.update({
    where: { id: templateId, coachId: session.userId },
    data: {
      title: formData.get('title') as string,
      type: formData.get('type') as WorkoutType,
      description: parseOptionalString(formData.get('description')),
      durationMin: parseOptionalInt(formData.get('durationMin')),
      distanceKm: parseOptionalFloat(formData.get('distanceKm')),
      notes: parseOptionalString(formData.get('notes')),
    },
  })

  revalidatePath('/workouts')
  revalidatePath(`/workouts/library/${sportSlug(template.type)}`)
  redirect(`/workouts/library/${sportSlug(template.type)}`)
}

export async function deleteTemplate(formData: FormData) {
  const session = await requireSession()
  if (!isCoach(session)) throw new Error('Coach only')

  const templateId = formData.get('templateId') as string
  const template = await prisma.workoutTemplate.findFirst({
    where: { id: templateId, coachId: session.userId },
  })
  if (!template) throw new Error('Template not found')

  await prisma.workoutTemplate.delete({
    where: { id: templateId, coachId: session.userId },
  })

  revalidatePath('/workouts')
  revalidatePath(`/workouts/library/${sportSlug(template.type)}`)
}

export async function duplicateTemplate(formData: FormData) {
  const session = await requireSession()
  if (!isCoach(session)) throw new Error('Coach only')

  const templateId = formData.get('templateId') as string
  if (!templateId) throw new Error('Template required')

  const source = await prisma.workoutTemplate.findFirst({
    where: { id: templateId, coachId: session.userId },
  })
  if (!source) throw new Error('Template not found')

  await prisma.workoutTemplate.create({
    data: {
      coachId: session.userId,
      type: source.type,
      sessionType: source.sessionType,
      title: `${source.title} (copy)`,
      description: source.description,
      distanceKm: source.distanceKm,
      durationMin: source.durationMin,
      notes: source.notes,
      structure: source.structure ?? undefined,
      swimEnvironment: source.swimEnvironment ?? undefined,
      swimStructure: source.swimStructure ?? undefined,
      plannedDistanceMeters: source.plannedDistanceMeters ?? undefined,
      tags: source.tags,
    },
  })

  revalidatePath('/workouts')
  revalidatePath(`/workouts/library/${sportSlug(source.type)}`)
}

export async function updateRace(formData: FormData) {
  const raceId = formData.get('raceId') as string
  await requireRaceAccess(raceId)
  const raceType = formData.get('type') as RaceType
  const sportRaw = formData.get('sport') as WorkoutType | null
  const priorityRaw = (formData.get('priority') as RacePriority | null) || RacePriority.C
  const intentRaw = (formData.get('intent') as RaceIntent | null) || RaceIntent.PLANNED
  const courseType = parseRaceCourseType(formData.get('courseType'))
  const triathlonDistance =
    raceType === RaceType.TRIATHLON ? parseTriathlonDistance(formData.get('triathlonDistance')) : null
  const isTriCustom = triathlonDistance === TriathlonDistance.CUSTOM
  const customDistanceKm = isTriCustom
    ? sumTriCustomDistanceKm(formData)
    : parseCustomDistanceKm(formData.get('customDistanceKm'))
  const returnTo = (formData.get('returnTo') as string) || '/season'
  const prepRaw = formData.get('preparationWeeks')
  let preparationWeeks: number | null = null
  if (typeof prepRaw === 'string' && prepRaw.trim()) {
    const parsed = parseInt(prepRaw.trim(), 10)
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 52) {
      throw new Error('Preparation weeks must be between 1 and 52.')
    }
    preparationWeeks = parsed
  }

  const race = await prisma.race.update({
    where: { id: raceId },
    data: {
      name: formData.get('name') as string,
      date: parseDateOnly(formData.get('date') as string),
      location: parseOptionalString(formData.get('location')),
      type: raceType,
      sport: sportRaw || defaultSportForRaceType(raceType),
      courseType,
      triathlonDistance,
      customDistanceKm,
      priority: priorityRaw,
      intent: intentRaw,
      goal: parseOptionalString(formData.get('goal')),
      url: parseOptionalString(formData.get('url')),
      preparationWeeks,
    },
    select: { id: true, athleteId: true },
  })

  await ensureTriathlonLegsForRace(race.id, raceType)
  if (raceUsesLegs(raceType)) {
    await saveRaceLegPlanFields(race.id, formData, { persistDistances: isTriCustom })
  } else {
    // Clear overall Strava when converting away is handled by ensure (deletes legs).
  }

  revalidatePath('/season')
  revalidatePath('/dashboard')
  revalidatePath('/training')
  revalidatePath(`/athletes/${race.athleteId}`)
  revalidatePath(`/season/${race.id}/edit`)
  const skipRedirect = formData.get('skipRedirect') === '1'
  if (!skipRedirect) {
    redirect(returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/season')
  }
}

export async function setRaceIntent(formData: FormData) {
  const raceId = formData.get('raceId') as string
  await requireRaceAccess(raceId)
  const intentRaw = formData.get('intent') as RaceIntent
  if (intentRaw !== RaceIntent.PLANNED && intentRaw !== RaceIntent.WATCHING) {
    throw new Error('Invalid race intent')
  }

  const race = await prisma.race.update({
    where: { id: raceId },
    data: { intent: intentRaw },
    select: { athleteId: true },
  })

  revalidatePath('/season')
  revalidatePath('/dashboard')
  revalidatePath('/training')
  revalidatePath(`/athletes/${race.athleteId}`)
}

export async function logRaceOutcome(formData: FormData) {
  const session = await requireSession()
  const raceId = formData.get('raceId') as string
  const outcomeRaw = formData.get('outcome') as RaceOutcome
  const allowed: RaceOutcome[] = [
    RaceOutcome.FINISHED,
    RaceOutcome.DID_NOT_START,
    RaceOutcome.DNF,
    RaceOutcome.DISMISSED,
  ]
  if (!allowed.includes(outcomeRaw)) {
    throw new Error('Invalid race outcome')
  }

  const existing =
    isCoach(session)
      ? await prisma.race.findFirst({
        where: { id: raceId, athlete: athleteOwnedByCoachWhere(session.userId) },
        select: { id: true, athleteId: true, type: true },
      })
      : await prisma.race.findFirst({
        where: {
          id: raceId,
          athleteId: (await resolveAthleteId(session)) ?? '',
        },
        select: { id: true, athleteId: true, type: true },
      })

  if (!existing) throw new Error('Race not found')

  const resultTime =
    outcomeRaw === RaceOutcome.FINISHED
      ? parseOptionalString(formData.get('resultTime'))
      : null
  const resultNotes =
    outcomeRaw === RaceOutcome.DISMISSED
      ? null
      : parseOptionalString(formData.get('resultNotes'))

  const isLoggedResult =
    outcomeRaw === RaceOutcome.FINISHED ||
    outcomeRaw === RaceOutcome.DID_NOT_START ||
    outcomeRaw === RaceOutcome.DNF

  await prisma.race.update({
    where: { id: raceId },
    data: {
      outcome: outcomeRaw,
      resultTime: outcomeRaw === RaceOutcome.FINISHED ? resultTime : null,
      resultNotes,
      resultLoggedAt: new Date(),
      resultDismissedAt:
        isLoggedResult && session.hasAthlete ? null : undefined,
    },
  })

  if (raceUsesLegs(existing.type) && outcomeRaw !== RaceOutcome.DISMISSED) {
    await ensureTriathlonLegsForRace(existing.id, existing.type)
    await saveRaceLegResultFields(existing.id, formData)
  }

  revalidatePath('/dashboard')
  revalidatePath('/season')
  revalidatePath(`/athletes/${existing.athleteId}`)
}

export async function logManualWorkout(formData: FormData) {
  const session = await requireAthleteSession()

  const date = formData.get('date') as string
  const type = formData.get('type') as WorkoutType
  const titleInput = parseOptionalString(formData.get('title'))
  const title = titleInput || WORKOUT_TYPE_LABELS[type] || 'Workout'
  const actualDistance = parseOptionalFloat(formData.get('actualDistance'))
  const actualDuration = parseOptionalInt(formData.get('actualDuration'))
  const rpe = parseOptionalInt(formData.get('rpe'))
  const athleteNotes = parseOptionalString(formData.get('athleteNotes'))
  const completedAt = parseDateOnly(date)
  const sortOrder = await getNextWorkoutSortOrder(session.athleteId, completedAt)

  await prisma.workout.create({
    data: {
      athleteId: session.athleteId,
      date: completedAt,
      sortOrder,
      type,
      sessionType: SessionType.CUSTOM,
      title,
      status: WorkoutStatus.COMPLETED,
      selfLogged: true,
      result: {
        create: {
          actualDistance,
          actualDuration,
          rpe,
          athleteNotes,
          completedAt,
        },
      },
    },
  })

  revalidatePath('/training')
  revalidatePath('/dashboard')
  revalidatePath('/training')
  revalidatePath('/progress')
}

export async function deleteRace(formData: FormData) {
  const raceId = formData.get('raceId') as string
  const { race } = await requireRaceAccess(raceId)
  await prisma.race.delete({ where: { id: raceId } })

  revalidatePath('/season')
  revalidatePath('/dashboard')
  revalidatePath('/training')
  revalidatePath(`/athletes/${race.athleteId}`)
}
