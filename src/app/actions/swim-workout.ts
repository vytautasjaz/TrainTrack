'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { Prisma, SessionType, SwimEnvironment, WorkoutType, PlannedMetricSource } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { parseDateOnly } from '@/lib/dates'
import { requireSession, resolveAthleteId, isCoachView } from '@/lib/session'
import { getNextWorkoutSortOrder } from '@/lib/workout-sort'
import { swimWorkoutFormSchema, swimTemplateFormSchema } from '@/lib/swim-workout/schema'
import { workoutDistanceMeters } from '@/lib/swim-workout/calculations'
import type { SwimWorkoutForm } from '@/lib/swim-workout/types'

function revalidateSwimLibrary() {
  revalidatePath('/workouts')
  revalidatePath('/workouts/swim')
  revalidatePath('/workouts/library/swim')
}

/** Match training UI (`isCoachView`), not only the COACH role bit. */
function requireCoach() {
  return requireSession().then((session) => {
    if (!isCoachView(session)) throw new Error('Coach only')
    return session
  })
}

export type SwimTemplateListItem = {
  id: string
  title: string
  description: string | null
  swimEnvironment: SwimEnvironment | null
  plannedDistanceMeters: number | null
  durationMin: number | null
  swimStructure: unknown
  tags: string[]
  updatedAt: Date
}

export type SwimWorkoutListItem = {
  id: string
  title: string
  description: string | null
  swimEnvironment: SwimEnvironment | null
  plannedDistanceMeters: number | null
  plannedDuration: number | null
  swimStructure: unknown
  updatedAt: Date
}

function swimStructureJson(structure: SwimWorkoutForm['swimStructure']): Prisma.InputJsonValue | undefined {
  if (!structure) return undefined
  return structure as Prisma.InputJsonValue
}

function resolvedDistanceMeters(form: SwimWorkoutForm): number | null {
  if (form.plannedDistanceMeters && form.plannedDistanceMeters > 0) {
    return form.plannedDistanceMeters
  }
  if (form.builderEnabled && form.swimStructure) {
    const computed = workoutDistanceMeters(form.swimStructure)
    return computed > 0 ? computed : null
  }
  return null
}

export async function getSwimTemplatesForCoach(): Promise<SwimTemplateListItem[]> {
  const session = await requireCoach()
  return prisma.workoutTemplate.findMany({
    where: { coachId: session.userId, type: WorkoutType.SWIM },
    orderBy: { title: 'asc' },
    select: {
      id: true,
      title: true,
      description: true,
      swimEnvironment: true,
      plannedDistanceMeters: true,
      durationMin: true,
      swimStructure: true,
      tags: true,
      updatedAt: true,
    },
  })
}

export async function getSwimWorkoutsForCoach(): Promise<SwimWorkoutListItem[]> {
  const session = await requireCoach()
  const athleteId = await resolveAthleteId(session)
  if (!athleteId) return []

  return prisma.workout.findMany({
    where: { athleteId, type: WorkoutType.SWIM },
    orderBy: { updatedAt: 'desc' },
    take: 50,
    select: {
      id: true,
      title: true,
      description: true,
      swimEnvironment: true,
      plannedDistanceMeters: true,
      plannedDuration: true,
      swimStructure: true,
      updatedAt: true,
    },
  })
}

export async function getSwimWorkoutForEdit(id: string) {
  const session = await requireCoach()
  const workout = await prisma.workout.findUnique({
    where: { id },
    include: { athlete: { select: { coachId: true } } },
  })
  if (!workout || workout.type !== WorkoutType.SWIM) throw new Error('Workout not found')
  if (workout.athlete.coachId !== session.userId) throw new Error('Unauthorized')
  return workout
}

export async function getSwimTemplateForEdit(id: string) {
  const session = await requireCoach()
  const template = await prisma.workoutTemplate.findUnique({ where: { id } })
  if (!template || template.type !== WorkoutType.SWIM) throw new Error('Template not found')
  if (template.coachId !== session.userId) throw new Error('Unauthorized')
  return template
}

export async function createSwimWorkoutFromModal(payload: unknown) {
  const session = await requireCoach()
  const athleteId = await resolveAthleteId(session)
  if (!athleteId) throw new Error('No athlete selected')

  const parsed = swimWorkoutFormSchema.parse(payload)
  const scheduledDate = parseDateOnly(parsed.scheduledDate ?? new Date().toISOString().slice(0, 10))
  const sortOrder = await getNextWorkoutSortOrder(athleteId, scheduledDate)

  const meters = resolvedDistanceMeters(parsed)
  const workout = await prisma.workout.create({
    data: {
      athleteId,
      date: scheduledDate,
      sortOrder,
      type: WorkoutType.SWIM,
      sessionType: SessionType.CUSTOM,
      title: parsed.title,
      description: parsed.description || null,
      swimEnvironment: parsed.swimEnvironment,
      plannedDistanceMeters: meters,
      plannedDistanceMetersSource:
        meters != null && meters > 0 ? PlannedMetricSource.MANUAL : null,
      plannedDuration: parsed.plannedDuration ?? null,
      plannedDurationSource:
        parsed.plannedDuration != null && parsed.plannedDuration > 0
          ? PlannedMetricSource.MANUAL
          : null,
      coachNotes: parsed.coachNotes ?? null,
      coachNotesPrivate: Boolean(parsed.coachNotesPrivate),
      swimStructure: swimStructureJson(parsed.swimStructure),
      templateId: parsed.templateId,
    },
  })

  revalidatePath('/training')
  revalidatePath('/dashboard')
  revalidateSwimLibrary()
  return workout.id
}

export async function updateSwimWorkoutFromModal(workoutId: string, payload: unknown) {
  await getSwimWorkoutForEdit(workoutId)

  const parsed = swimWorkoutFormSchema.parse(payload)
  const scheduledDate = parseDateOnly(
    parsed.scheduledDate ?? new Date().toISOString().slice(0, 10),
  )

  await prisma.workout.update({
    where: { id: workoutId },
    data: {
      date: scheduledDate,
      title: parsed.title,
      description: parsed.description || null,
      swimEnvironment: parsed.swimEnvironment,
      plannedDistanceMeters: resolvedDistanceMeters(parsed),
      plannedDuration: parsed.plannedDuration ?? null,
      coachNotes: parsed.coachNotes ?? null,
      coachNotesPrivate: Boolean(parsed.coachNotesPrivate),
      swimStructure:
        parsed.builderEnabled && parsed.swimStructure
          ? swimStructureJson(parsed.swimStructure)
          : Prisma.DbNull,
    },
  })

  revalidatePath('/training')
  revalidatePath('/dashboard')
  revalidateSwimLibrary()
}

export async function saveSwimWorkout(id: string | null, payload: unknown) {
  const session = await requireCoach()
  const athleteId = await resolveAthleteId(session)
  if (!athleteId) throw new Error('No athlete selected')

  const parsed = swimWorkoutFormSchema.parse(payload)
  const scheduledDate = parsed.scheduledDate
    ? parseDateOnly(parsed.scheduledDate)
    : parseDateOnly(new Date().toISOString().slice(0, 10))

  const data = {
    title: parsed.title,
    description: parsed.description || null,
    swimEnvironment: parsed.swimEnvironment,
    plannedDistanceMeters: resolvedDistanceMeters(parsed),
    plannedDuration: parsed.plannedDuration ?? null,
    coachNotes: parsed.coachNotes ?? null,
    swimStructure: swimStructureJson(parsed.swimStructure),
    templateId: parsed.templateId,
  }

  if (id) {
    const existing = await getSwimWorkoutForEdit(id)
    await prisma.workout.update({
      where: { id: existing.id },
      data: { ...data, date: scheduledDate },
    })
    revalidatePath('/training')
    revalidatePath('/dashboard')
    revalidateSwimLibrary()
    revalidatePath(`/workouts/swim/builder/${id}`)
    return existing.id
  }

  const sortOrder = await getNextWorkoutSortOrder(athleteId, scheduledDate)
  const workout = await prisma.workout.create({
    data: {
      athleteId,
      date: scheduledDate,
      sortOrder,
      type: WorkoutType.SWIM,
      sessionType: SessionType.CUSTOM,
      ...data,
    },
  })

  revalidatePath('/training')
  revalidatePath('/dashboard')
  revalidateSwimLibrary()
  redirect(`/workouts/swim/builder/${workout.id}`)
}

export async function saveSwimTemplate(id: string | null, payload: unknown) {
  const resultId = await saveSwimTemplateFromModal(id, payload)
  if (!id) redirect(`/workouts/templates/builder/${resultId}`)
  return resultId
}

/** Same as saveSwimTemplate but never redirects — for shared editor / modal flows. */
export async function saveSwimTemplateFromModal(id: string | null, payload: unknown) {
  const session = await requireCoach()
  const parsed = swimTemplateFormSchema.parse(payload)

  const data = {
    title: parsed.title,
    description: parsed.description || null,
    swimEnvironment: parsed.swimEnvironment,
    plannedDistanceMeters: resolvedDistanceMeters(parsed),
    durationMin: parsed.plannedDuration ?? null,
    notes: parsed.coachNotes ?? null,
    swimStructure: swimStructureJson(parsed.swimStructure),
    tags: parsed.tags ?? [],
  }

  if (id) {
    const existing = await getSwimTemplateForEdit(id)
    await prisma.workoutTemplate.update({
      where: { id: existing.id },
      data,
    })
    revalidateSwimLibrary()
    revalidatePath('/workouts')
    revalidatePath(`/workouts/templates/builder/${id}`)
    return existing.id
  }

  const template = await prisma.workoutTemplate.create({
    data: {
      coachId: session.userId,
      type: WorkoutType.SWIM,
      sessionType: SessionType.CUSTOM,
      ...data,
    },
  })

  revalidateSwimLibrary()
  revalidatePath('/workouts')
  return template.id
}

export async function deleteSwimTemplate(formData: FormData) {
  const templateId = formData.get('templateId') as string
  if (!templateId) throw new Error('Template required')
  const session = await requireCoach()
  const template = await prisma.workoutTemplate.findUnique({ where: { id: templateId } })
  if (!template || template.coachId !== session.userId) throw new Error('Unauthorized')
  await prisma.workoutTemplate.delete({ where: { id: templateId } })
  revalidateSwimLibrary()
}

export async function deleteSwimWorkout(workoutId: string) {
  await getSwimWorkoutForEdit(workoutId)
  await prisma.workout.delete({ where: { id: workoutId } })
  revalidatePath('/training')
  revalidatePath('/dashboard')
  revalidateSwimLibrary()
}

export async function duplicateSwimTemplate(formData: FormData) {
  const templateId = formData.get('templateId') as string
  if (!templateId) throw new Error('Template required')
  const session = await requireCoach()
  const source = await getSwimTemplateForEdit(templateId)
  await prisma.workoutTemplate.create({
    data: {
      coachId: session.userId,
      type: WorkoutType.SWIM,
      sessionType: SessionType.CUSTOM,
      title: `${source.title} (copy)`,
      description: source.description,
      swimEnvironment: source.swimEnvironment,
      plannedDistanceMeters: source.plannedDistanceMeters,
      durationMin: source.durationMin,
      notes: source.notes,
      swimStructure: source.swimStructure ?? undefined,
      tags: source.tags,
    },
  })
  revalidateSwimLibrary()
}

export async function scheduleSwimFromTemplate(formData: FormData) {
  const session = await requireCoach()
  const athleteId = await resolveAthleteId(session)
  if (!athleteId) throw new Error('No athlete selected')

  const templateId = formData.get('templateId') as string
  const date = formData.get('date') as string
  if (!templateId || !date) throw new Error('Template and date required')

  const template = await getSwimTemplateForEdit(templateId)
  const scheduledDate = parseDateOnly(date)
  const sortOrder = await getNextWorkoutSortOrder(athleteId, scheduledDate)

  await prisma.workout.create({
    data: {
      athleteId,
      date: scheduledDate,
      sortOrder,
      type: WorkoutType.SWIM,
      sessionType: SessionType.CUSTOM,
      title: template.title,
      description: template.description,
      swimEnvironment: template.swimEnvironment,
      plannedDistanceMeters: template.plannedDistanceMeters,
      plannedDistanceMetersSource:
        template.plannedDistanceMetersSource ??
        (template.plannedDistanceMeters != null && template.plannedDistanceMeters > 0
          ? PlannedMetricSource.MANUAL
          : null),
      plannedDuration: template.durationMin,
      plannedDurationSource:
        template.durationSource ??
        (template.durationMin != null && template.durationMin > 0
          ? PlannedMetricSource.MANUAL
          : null),
      coachNotes: template.notes,
      swimStructure: template.swimStructure ?? undefined,
      templateId: template.id,
    },
  })

  revalidatePath('/training')
  revalidatePath('/dashboard')
  revalidateSwimLibrary()
}
