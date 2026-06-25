'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { Prisma, SessionType, WorkoutType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { parseDateOnly } from '@/lib/dates'
import { requireAthleteSession, requireSession, resolveAthleteId } from '@/lib/session'
import { builderPayloadSchema } from '@/lib/workout-builder/schema'
import { isSimpleSessionType } from '@/lib/workout-builder/session-modes'
import { estimateDurationMinutes } from '@/lib/workout-builder/utils'
import { getNextWorkoutSortOrder } from '@/lib/workout-sort'

function requireCoach() {
  return requireSession().then((session) => {
    if (session.role !== 'COACH') throw new Error('Coach only')
    return session
  })
}

export type CreateWorkoutModalPayload = {
  title: string
  sportType: WorkoutType
  sessionType: SessionType
  scheduledDate: string
  plannedDistance?: number
  plannedDuration?: number
  coachNotes?: string
  structure?: unknown
  templateId?: string
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

  if (payload.workoutId) {
    await prisma.workout.update({
      where: { id: payload.workoutId },
      data: { coachNotes: payload.coachNotes ?? null },
    })
  } else {
    const existing = await prisma.workout.findFirst({
      where: { athleteId, date, type: WorkoutType.RECOVERY },
    })
    if (existing) {
      await prisma.workout.update({
        where: { id: existing.id },
        data: { coachNotes: payload.coachNotes ?? null },
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
          coachNotes: payload.coachNotes,
        },
      })
    }
  }

  revalidatePath('/training')
  revalidatePath('/dashboard')
}

export async function createWorkoutFromModal(payload: CreateWorkoutModalPayload) {
  const session = await requireCoach()
  const athleteId = await resolveAthleteId(session)
  if (!athleteId) throw new Error('No athlete selected')

  const scheduledDate = parseDateOnly(payload.scheduledDate)
  const sortOrder = await getNextWorkoutSortOrder(athleteId, scheduledDate)

  if (isSimpleSessionType(payload.sessionType)) {
    await prisma.workout.create({
      data: {
        athleteId,
        templateId: payload.templateId,
        date: scheduledDate,
        sortOrder,
        type: payload.sportType,
        sessionType: payload.sessionType,
        title: payload.title,
        plannedDistance: payload.plannedDistance,
        plannedDuration: payload.plannedDuration,
        coachNotes: payload.coachNotes,
      },
    })
  } else {
    const data = builderPayloadSchema.parse({
      title: payload.title,
      sportType: payload.sportType,
      sessionType: payload.sessionType,
      scheduledDate: payload.scheduledDate,
      tags: [],
      structure: payload.structure,
    })
    const estimatedDuration = estimateDurationMinutes(data.structure)
    await prisma.workout.create({
      data: {
        athleteId,
        templateId: payload.templateId,
        date: scheduledDate,
        sortOrder,
        type: data.sportType,
        sessionType: data.sessionType,
        title: data.title,
        plannedDuration: estimatedDuration || payload.plannedDuration || undefined,
        plannedDistance: payload.plannedDistance,
        coachNotes: data.structure.coachNotes ?? payload.coachNotes,
        structure: data.structure as Prisma.InputJsonValue,
      },
    })
  }

  revalidatePath('/training')
  revalidatePath('/dashboard')
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
>

export async function createAthleteWorkoutFromModal(payload: AthleteCreateWorkoutPayload) {
  const session = await requireAthleteSession()

  if (!ATHLETE_ADD_SPORT_TYPES.includes(payload.sportType)) {
    throw new Error('Invalid sport type')
  }
  if (!isSimpleSessionType(payload.sessionType)) {
    throw new Error('Athletes can only add simple workouts')
  }

  const scheduledDate = parseDateOnly(payload.scheduledDate)
  const sortOrder = await getNextWorkoutSortOrder(session.athleteId, scheduledDate)

  await prisma.workout.create({
    data: {
      athleteId: session.athleteId,
      date: scheduledDate,
      sortOrder,
      type: payload.sportType,
      sessionType: payload.sessionType,
      title: payload.title,
      plannedDistance: payload.plannedDistance,
      plannedDuration: payload.plannedDuration,
      selfLogged: true,
    },
  })

  revalidatePath('/training')
  revalidatePath('/dashboard')
}

export async function saveWorkoutBuilder(payload: unknown, workoutId?: string) {
  const session = await requireCoach()
  const athleteId = await resolveAthleteId(session)
  if (!athleteId) throw new Error('No athlete selected')

  const data = builderPayloadSchema.parse(payload)
  if (!data.scheduledDate) throw new Error('Scheduled date is required')

  const estimatedDuration = data.estimatedDuration ?? estimateDurationMinutes(data.structure)
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
  return { id: workout.id, savedAt: new Date().toISOString() }
}

export async function saveWorkoutBuilderAndRedirect(payload: unknown, workoutId?: string) {
  const result = await saveWorkoutBuilder(payload, workoutId)
  redirect(`/workouts/${result.id}`)
}

export async function saveTemplateBuilder(payload: unknown, templateId?: string) {
  const session = await requireCoach()

  const parsed = builderPayloadSchema.omit({ scheduledDate: true }).parse(payload)
  const estimatedDuration = parsed.estimatedDuration ?? estimateDurationMinutes(parsed.structure)
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
