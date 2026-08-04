'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { Prisma, SessionType, WorkoutType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { parseDateOnly } from '@/lib/dates'
import { requireAthleteSession, requireSession, resolveAthleteId, isCoach} from '@/lib/session'
import { builderPayloadSchema } from '@/lib/workout-builder/schema'
import { loadAthletePreferencesForBuilder } from '@/lib/workout-builder/load-athlete-preferences'
import {
  estimateStructureDurationMinutes,
  resolvePlannedWorkoutMetrics,
} from '@/lib/workout-builder/segment-estimation'
import { sportUsesPlannedDistance } from '@/lib/plan-week-totals'
import { getNextWorkoutSortOrder } from '@/lib/workout-sort'
import { RECOVERY_DAY_DEFAULT_NOTE } from '@/lib/recovery-day'
import { hasStructureContent, parseStructure } from '@/lib/workout-builder/utils'
import { sessionTypesForSport } from '@/lib/workout-builder/session-modes'
import { withDerivedApproxTags } from '@/lib/workout-approx-tags'
import {
  parseWorkoutBuilderPrefs,
  type WorkoutBuilderPrefs,
} from '@/lib/workout-builder/workout-builder-prefs'
import { onTrainingCalendarDataChanged } from '@/lib/calendar-invalidation'

function requireCoach() {
  return requireSession().then((session) => {
    if (!isCoach(session)) throw new Error('Coach only')
    return session
  })
}

export type CreateWorkoutModalPayload = {
  title: string
  description?: string
  sportType: WorkoutType
  sessionType: SessionType
  scheduledDate: string
  plannedDistance?: number
  plannedDuration?: number
  coachNotes?: string
  structure?: unknown
  templateId?: string
  tags?: string[]
  /** When false, missing duration/distance is not filled from pace/speed zones. */
  allowPaceEstimate?: boolean
}

export type WorkoutTemplatePickerItem = {
  id: string
  title: string
  type: WorkoutType
  sessionType: SessionType
  description: string | null
  distanceKm: number | null
  durationMin: number | null
  notes: string | null
  structure: unknown
}

export async function getCoachTemplatesForPicker(): Promise<WorkoutTemplatePickerItem[]> {
  const session = await requireCoach()
  return prisma.workoutTemplate.findMany({
    where: { coachId: session.userId },
    orderBy: { title: 'asc' },
    select: {
      id: true,
      title: true,
      type: true,
      sessionType: true,
      description: true,
      distanceKm: true,
      durationMin: true,
      notes: true,
      structure: true,
    },
  })
}

export async function getAthletePreferencesForWorkoutModal() {
  const session = await requireSession()
  const athleteId =
    session.hasAthlete
      ? (await requireAthleteSession()).athleteId
      : await resolveAthleteId(session)
  return loadAthletePreferencesForBuilder(athleteId)
}

export async function getWorkoutBuilderPrefsForModal(): Promise<WorkoutBuilderPrefs> {
  const session = await requireSession()
  if (!isCoach(session)) return {}
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { workoutBuilderPrefs: true },
  })
  return parseWorkoutBuilderPrefs(user?.workoutBuilderPrefs)
}

export type SaveRecoveryDayPayload = {
  date: string
  coachNotes?: string
  workoutId?: string
}

export async function saveRecoveryDay(payload: SaveRecoveryDayPayload) {
  const session = await requireCoach()
  const athleteId = await resolveAthleteId(session)
  if (!athleteId) throw new Error('No athlete selected')

  const date = parseDateOnly(payload.date)

  const coachNotes =
    payload.coachNotes?.trim() || RECOVERY_DAY_DEFAULT_NOTE

  if (payload.workoutId) {
    await prisma.workout.update({
      where: { id: payload.workoutId },
      data: { coachNotes },
    })
  } else {
    const existing = await prisma.workout.findFirst({
      where: { athleteId, date, type: WorkoutType.RECOVERY },
    })
    if (existing) {
      await prisma.workout.update({
        where: { id: existing.id },
        data: { coachNotes },
      })
    } else {
      const sortOrder = await getNextWorkoutSortOrder(athleteId, date)
      await prisma.workout.create({
        data: {
          athleteId,
          date,
          sortOrder,
          type: WorkoutType.RECOVERY,
          sessionType: SessionType.RECOVERY_RUN,
          title: 'Recovery',
          coachNotes,
        },
      })
    }
  }

  revalidatePath('/training')
  revalidatePath('/dashboard')
  await onTrainingCalendarDataChanged(athleteId)
}

export async function createWorkoutFromModal(payload: CreateWorkoutModalPayload) {
  const session = await requireCoach()
  const athleteId = await resolveAthleteId(session)
  if (!athleteId) throw new Error('No athlete selected')

  const scheduledDate = parseDateOnly(payload.scheduledDate)
  const sortOrder = await getNextWorkoutSortOrder(athleteId, scheduledDate)
  const structure = parseStructure(payload.structure)
  const hasIncludeItems = (structure.includeItems?.length ?? 0) > 0
  const saveStructure = hasStructureContent(structure) || hasIncludeItems
  const athletePreferences = await loadAthletePreferencesForBuilder(athleteId)
  const metrics = resolvePlannedWorkoutMetrics({
    plannedDistance: payload.plannedDistance,
    plannedDuration: payload.plannedDuration,
    structure: saveStructure ? structure : null,
    preferences: athletePreferences,
    sportUsesDistance: sportUsesPlannedDistance(payload.sportType),
    sessionType: payload.sessionType,
    sportType: payload.sportType,
    allowPaceEstimate: payload.allowPaceEstimate,
  })
  const tags = withDerivedApproxTags(payload.tags, {
    hadDuration: Boolean(payload.plannedDuration),
    hadDistance: Boolean(payload.plannedDistance),
    resolvedDuration: metrics.plannedDuration,
    resolvedDistance: metrics.plannedDistance,
  })

  if (!saveStructure) {
    await prisma.workout.create({
      data: {
        athleteId,
        templateId: payload.templateId,
        date: scheduledDate,
        sortOrder,
        type: payload.sportType,
        sessionType: payload.sessionType,
        title: payload.title,
        description: payload.description?.trim() || null,
        plannedDistance: metrics.plannedDistance ?? null,
        plannedDuration: metrics.plannedDuration ?? null,
        coachNotes: payload.coachNotes,
        tags,
      },
    })
  } else {
    const data = builderPayloadSchema.parse({
      title: payload.title.trim() || ' ',
      sportType: payload.sportType,
      sessionType: payload.sessionType,
      scheduledDate: payload.scheduledDate,
      tags,
      structure: payload.structure,
    })
    await prisma.workout.create({
      data: {
        athleteId,
        templateId: payload.templateId,
        date: scheduledDate,
        sortOrder,
        type: data.sportType,
        sessionType: data.sessionType,
        title: payload.title,
        description: payload.description?.trim() || null,
        plannedDuration: metrics.plannedDuration ?? null,
        plannedDistance: metrics.plannedDistance ?? null,
        coachNotes: data.structure.coachNotes ?? payload.coachNotes,
        structure: data.structure as Prisma.InputJsonValue,
        tags: data.tags,
      },
    })
  }

  revalidatePath('/training')
  revalidatePath('/dashboard')
  await onTrainingCalendarDataChanged(athleteId)
}

export async function updateWorkoutFromModal(
  payload: CreateWorkoutModalPayload & { workoutId: string },
) {
  const session = await requireCoach()
  const athleteId = await resolveAthleteId(session)
  if (!athleteId) throw new Error('No athlete selected')

  const existing = await prisma.workout.findFirst({
    where: { id: payload.workoutId, athleteId },
  })
  if (!existing) throw new Error('Workout not found')

  const scheduledDate = parseDateOnly(payload.scheduledDate)
  const structure = parseStructure(payload.structure)
  const hasIncludeItems = (structure.includeItems?.length ?? 0) > 0
  const saveStructure = hasStructureContent(structure) || hasIncludeItems
  const athletePreferences = await loadAthletePreferencesForBuilder(athleteId)
  const metrics = resolvePlannedWorkoutMetrics({
    plannedDistance: payload.plannedDistance,
    plannedDuration: payload.plannedDuration,
    structure: saveStructure ? structure : null,
    preferences: athletePreferences,
    sportUsesDistance: sportUsesPlannedDistance(payload.sportType),
    sessionType: payload.sessionType,
    sportType: payload.sportType,
    allowPaceEstimate: payload.allowPaceEstimate,
  })
  const tags = withDerivedApproxTags(payload.tags, {
    hadDuration: Boolean(payload.plannedDuration),
    hadDistance: Boolean(payload.plannedDistance),
    resolvedDuration: metrics.plannedDuration,
    resolvedDistance: metrics.plannedDistance,
  })

  if (!saveStructure) {
    await prisma.workout.update({
      where: { id: payload.workoutId },
      data: {
        date: scheduledDate,
        type: payload.sportType,
        sessionType: payload.sessionType,
        title: payload.title,
        description: payload.description?.trim() || null,
        plannedDistance: metrics.plannedDistance ?? null,
        plannedDuration: metrics.plannedDuration ?? null,
        coachNotes: payload.coachNotes,
        structure: Prisma.DbNull,
        tags,
      },
    })
  } else {
    const data = builderPayloadSchema.parse({
      title: payload.title.trim() || ' ',
      sportType: payload.sportType,
      sessionType: payload.sessionType,
      scheduledDate: payload.scheduledDate,
      tags,
      structure: payload.structure,
    })
    await prisma.workout.update({
      where: { id: payload.workoutId },
      data: {
        date: scheduledDate,
        type: data.sportType,
        sessionType: data.sessionType,
        title: payload.title,
        description: payload.description?.trim() || null,
        plannedDuration: metrics.plannedDuration ?? null,
        plannedDistance: metrics.plannedDistance ?? null,
        coachNotes: data.structure.coachNotes ?? payload.coachNotes,
        structure: data.structure as Prisma.InputJsonValue,
        tags: data.tags,
      },
    })
  }

  revalidatePath('/training')
  revalidatePath('/dashboard')
  revalidatePath(`/workouts/${payload.workoutId}`)
  await onTrainingCalendarDataChanged(athleteId)
}

const ATHLETE_ADD_SPORT_TYPES: WorkoutType[] = [
  WorkoutType.RUN,
  WorkoutType.BIKE,
  WorkoutType.SWIM,
  WorkoutType.STRENGTH,
  WorkoutType.HYROX,
  WorkoutType.TRIATHLON,
]

export type AthleteCreateWorkoutPayload = Pick<
  CreateWorkoutModalPayload,
  'title' | 'sportType' | 'sessionType' | 'scheduledDate' | 'plannedDistance' | 'plannedDuration'
> & {
  description?: string
}

export async function createAthleteWorkoutFromModal(payload: AthleteCreateWorkoutPayload) {
  const session = await requireAthleteSession()

  if (!ATHLETE_ADD_SPORT_TYPES.includes(payload.sportType)) {
    throw new Error('Invalid sport type')
  }
  // Athletes submit distance/duration/description only (no block builder).
  // Allow any session type valid for the sport — including CUSTOM when unset in the UI.
  if (!sessionTypesForSport(payload.sportType).includes(payload.sessionType)) {
    throw new Error('Invalid session type')
  }

  const scheduledDate = parseDateOnly(payload.scheduledDate)
  const sortOrder = await getNextWorkoutSortOrder(session.athleteId, scheduledDate)
  const athletePreferences = await loadAthletePreferencesForBuilder(session.athleteId)
  const metrics = resolvePlannedWorkoutMetrics({
    plannedDistance: payload.plannedDistance,
    plannedDuration: payload.plannedDuration,
    structure: null,
    preferences: athletePreferences,
    sportUsesDistance: sportUsesPlannedDistance(payload.sportType),
    sessionType: payload.sessionType,
    sportType: payload.sportType,
  })

  await prisma.workout.create({
    data: {
      athleteId: session.athleteId,
      date: scheduledDate,
      sortOrder,
      type: payload.sportType,
      sessionType: payload.sessionType,
      title: payload.title,
      description: payload.description?.trim() || null,
      plannedDistance: metrics.plannedDistance,
      plannedDuration: metrics.plannedDuration,
      selfLogged: true,
    },
  })

  revalidatePath('/training')
  revalidatePath('/dashboard')
  await onTrainingCalendarDataChanged(session.athleteId)
}

export async function saveWorkoutBuilder(payload: unknown, workoutId?: string) {
  const session = await requireCoach()
  const athleteId = await resolveAthleteId(session)
  if (!athleteId) throw new Error('No athlete selected')

  const data = builderPayloadSchema.parse(payload)
  if (!data.scheduledDate) throw new Error('Scheduled date is required')

  const athletePreferences = await loadAthletePreferencesForBuilder(athleteId)
  const estimatedDuration =
    data.estimatedDuration ??
    estimateStructureDurationMinutes(data.structure, athletePreferences, data.sportType)
  const structure = data.structure as Prisma.InputJsonValue

  if (workoutId) {
    await prisma.workout.update({
      where: { id: workoutId },
      data: {
        title: data.title,
        type: data.sportType,
        sessionType: data.sessionType,
        date: parseDateOnly(data.scheduledDate),
        plannedDuration: estimatedDuration || undefined,
        coachNotes: data.structure.coachNotes,
        structure,
        tags: data.tags,
      },
    })
    revalidatePath('/training')
    revalidatePath('/dashboard')
    revalidatePath(`/workouts/${workoutId}`)
    revalidatePath(`/workouts/builder/${workoutId}`)
    await onTrainingCalendarDataChanged(athleteId)
    return { id: workoutId, savedAt: new Date().toISOString() }
  }

  const workout = await prisma.workout.create({
    data: {
      athleteId,
      title: data.title,
      type: data.sportType,
      sessionType: data.sessionType,
      date: parseDateOnly(data.scheduledDate),
      sortOrder: await getNextWorkoutSortOrder(athleteId, parseDateOnly(data.scheduledDate)),
      plannedDuration: estimatedDuration || undefined,
      coachNotes: data.structure.coachNotes,
      structure,
      tags: data.tags,
    },
  })

  revalidatePath('/training')
  revalidatePath('/dashboard')
  await onTrainingCalendarDataChanged(athleteId)
  return { id: workout.id, savedAt: new Date().toISOString() }
}

export async function saveWorkoutBuilderAndRedirect(payload: unknown, workoutId?: string) {
  const result = await saveWorkoutBuilder(payload, workoutId)
  redirect(`/workouts/${result.id}`)
}

export async function saveTemplateBuilder(payload: unknown, templateId?: string) {
  const session = await requireCoach()

  const parsed = builderPayloadSchema.omit({ scheduledDate: true }).parse(payload)
  const estimatedDuration =
    parsed.estimatedDuration ??
    estimateStructureDurationMinutes(parsed.structure, undefined, parsed.sportType)
  const structure = parsed.structure as Prisma.InputJsonValue

  if (templateId) {
    await prisma.workoutTemplate.update({
      where: { id: templateId, coachId: session.userId },
      data: {
        title: parsed.title,
        type: parsed.sportType,
        sessionType: parsed.sessionType,
        durationMin: estimatedDuration || undefined,
        notes: parsed.structure.coachNotes,
        structure,
        tags: parsed.tags,
      },
    })
    revalidatePath('/workouts')
    revalidatePath(`/workouts/templates/builder/${templateId}`)
    return { id: templateId, savedAt: new Date().toISOString() }
  }

  const template = await prisma.workoutTemplate.create({
    data: {
      coachId: session.userId,
      title: parsed.title,
      type: parsed.sportType,
      sessionType: parsed.sessionType,
      durationMin: estimatedDuration || undefined,
      notes: parsed.structure.coachNotes,
      structure,
      tags: parsed.tags,
    },
  })

  revalidatePath('/workouts')
  return { id: template.id, savedAt: new Date().toISOString() }
}

export async function saveTemplateBuilderAndRedirect(payload: unknown, templateId?: string) {
  await saveTemplateBuilder(payload, templateId)
  redirect('/workouts')
}

export async function saveWorkoutAsTemplate(workoutId: string) {
  const session = await requireCoach()

  const workout = await prisma.workout.findUniqueOrThrow({ where: { id: workoutId } })

  const template = await prisma.workoutTemplate.create({
    data: {
      coachId: session.userId,
      title: workout.title,
      type: workout.type,
      sessionType: workout.sessionType,
      durationMin: workout.plannedDuration ?? undefined,
      distanceKm: workout.plannedDistance ?? undefined,
      notes: workout.coachNotes ?? undefined,
      structure: workout.structure ?? Prisma.JsonNull,
      tags: workout.tags,
    },
  })

  revalidatePath('/workouts')
  redirect(`/workouts/templates/builder/${template.id}`)
}
