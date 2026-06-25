'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireSession, resolveAthleteId } from '@/lib/session'
import { parseDateOnly } from '@/lib/dates'
import { WorkoutStatus, WorkoutType, RaceType, SessionType } from '@prisma/client'
import { defaultSportForRaceType } from '@/lib/races'
import { WORKOUT_TYPE_LABELS } from '@/lib/constants'
import { requireAthleteSession } from '@/lib/session'

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

export async function completeWorkout(formData: FormData) {
  await requireSession()
  const workoutId = formData.get('workoutId') as string
  const actualDistance = formData.get('actualDistance')
    ? parseFloat(formData.get('actualDistance') as string)
    : undefined
  const actualDuration = formData.get('actualDuration')
    ? parseInt(formData.get('actualDuration') as string, 10)
    : undefined
  const rpe = formData.get('rpe') ? parseInt(formData.get('rpe') as string, 10) : undefined
  const athleteNotes = (formData.get('athleteNotes') as string) || undefined
  const status = (formData.get('status') as WorkoutStatus) || WorkoutStatus.COMPLETED

  await prisma.workout.update({
    where: { id: workoutId },
    data: { status },
  })

  await prisma.workoutResult.upsert({
    where: { workoutId },
    create: {
      workoutId,
      actualDistance,
      actualDuration,
      rpe,
      athleteNotes,
    },
    update: { actualDistance, actualDuration, rpe, athleteNotes },
  })

  revalidatePath('/dashboard')
  revalidatePath('/training')
  revalidatePath(`/workouts/${workoutId}`)
}

export async function markWorkoutDone(formData: FormData) {
  const session = await requireSession()
  if (session.role !== 'ATHLETE') throw new Error('Athlete only')

  const athleteId = await resolveAthleteId(session)
  if (!athleteId) throw new Error('No athlete profile')

  const workoutId = formData.get('workoutId') as string
  if (!workoutId) throw new Error('Workout required')

  const workout = await prisma.workout.findFirst({
    where: { id: workoutId, athleteId },
  })
  if (!workout) throw new Error('Workout not found')

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
    },
    update: {},
  })

  revalidatePath('/dashboard')
  revalidatePath('/training')
  revalidatePath(`/workouts/${workoutId}`)
}

export async function markWorkoutSkipped(formData: FormData) {
  const session = await requireSession()
  if (session.role !== 'ATHLETE') throw new Error('Athlete only')

  const athleteId = await resolveAthleteId(session)
  if (!athleteId) throw new Error('No athlete profile')

  const workoutId = formData.get('workoutId') as string
  if (!workoutId) throw new Error('Workout required')

  const workout = await prisma.workout.findFirst({
    where: { id: workoutId, athleteId },
  })
  if (!workout) throw new Error('Workout not found')

  await prisma.workout.update({
    where: { id: workoutId },
    data: { status: WorkoutStatus.SKIPPED },
  })

  revalidatePath('/dashboard')
  revalidatePath('/training')
  revalidatePath(`/workouts/${workoutId}`)
}

export async function createWorkoutFromTemplate(formData: FormData) {
  const session = await requireSession()
  if (session.role !== 'COACH') throw new Error('Coach only')
  const athleteId = await resolveAthleteId(session)
  if (!athleteId) throw new Error('No athlete selected')

  const templateId = formData.get('templateId') as string
  const date = formData.get('date') as string

  const template = await prisma.workoutTemplate.findUniqueOrThrow({
    where: { id: templateId, coachId: session.userId },
  })

  await prisma.workout.create({
    data: {
      athleteId,
      templateId,
      date: parseDateOnly(date),
      type: template.type,
      sessionType: template.sessionType,
      title: template.title,
      description: template.description,
      plannedDistance: template.distanceKm,
      plannedDuration: template.durationMin,
      coachNotes: template.notes,
      structure: template.structure ?? undefined,
      tags: template.tags,
    },
  })

  revalidatePath('/training')
  revalidatePath('/dashboard')
}

export async function createTemplate(formData: FormData) {
  const session = await requireSession()
  if (session.role !== 'COACH') throw new Error('Coach only')

  await prisma.workoutTemplate.create({
    data: {
      coachId: session.userId,
      title: formData.get('title') as string,
      type: formData.get('type') as WorkoutType,
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
}

export async function createRace(formData: FormData) {
  const session = await requireSession()

  const formAthleteId = formData.get('athleteId') as string | null
  let athleteId: string | null = formAthleteId?.trim() || null

  if (session.role === 'COACH' && athleteId) {
    const owned = await prisma.athlete.findFirst({
      where: { id: athleteId, coachId: session.userId },
      select: { id: true },
    })
    if (!owned) throw new Error('Athlete not found')
  } else {
    athleteId = await resolveAthleteId(session)
  }

  if (!athleteId) throw new Error('No athlete selected')

  const raceType = formData.get('type') as RaceType
  const sportRaw = formData.get('sport') as WorkoutType | null

  await prisma.race.create({
    data: {
      athleteId,
      name: formData.get('name') as string,
      date: parseDateOnly(formData.get('date') as string),
      location: (formData.get('location') as string) || undefined,
      type: raceType,
      sport: sportRaw || defaultSportForRaceType(raceType),
      goal: (formData.get('goal') as string) || undefined,
    },
  })

  revalidatePath('/races')
  revalidatePath('/dashboard')
  revalidatePath('/training')
  revalidatePath(`/athletes/${athleteId}`)
}

export async function createAthlete(formData: FormData) {
  const session = await requireSession()
  if (session.role !== 'COACH') throw new Error('Coach only')

  await prisma.athlete.create({
    data: {
      coachId: session.userId,
      name: formData.get('name') as string,
    },
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
  if (session.role !== 'COACH') throw new Error('Only coaches can move workouts')

  await prisma.workout.update({
    where: { id: workoutId },
    data: { date: parseDateOnly(dateKey) },
  })

  revalidatePath('/training')
  revalidatePath('/dashboard')
}

export async function duplicateWorkout(formData: FormData) {
  await requireSession()
  const workoutId = formData.get('workoutId') as string
  const date = formData.get('date') as string

  const source = await prisma.workout.findUniqueOrThrow({ where: { id: workoutId } })

  await prisma.workout.create({
    data: {
      athleteId: source.athleteId,
      templateId: source.templateId,
      date: parseDateOnly(date),
      type: source.type,
      sessionType: source.sessionType,
      title: source.title,
      description: source.description,
      plannedDistance: source.plannedDistance,
      plannedDuration: source.plannedDuration,
      coachNotes: source.coachNotes,
      structure: source.structure ?? undefined,
      tags: source.tags,
    },
  })

  revalidatePath('/training')
}

export async function createWorkout(formData: FormData) {
  const session = await requireSession()
  if (session.role !== 'COACH') throw new Error('Coach only')

  const athleteId = await resolveAthleteId(session)
  if (!athleteId) throw new Error('No athlete selected')

  await prisma.workout.create({
    data: {
      athleteId,
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
}

export async function updateWorkout(formData: FormData) {
  const session = await requireSession()
  if (session.role !== 'COACH') throw new Error('Coach only')

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

export async function deleteWorkout(formData: FormData) {
  const session = await requireSession()
  if (session.role !== 'COACH') throw new Error('Coach only')

  const workoutId = formData.get('workoutId') as string
  await prisma.workout.delete({ where: { id: workoutId } })

  revalidatePath('/training')
  revalidatePath('/dashboard')
  redirect('/training')
}

export async function updateTemplate(formData: FormData) {
  const session = await requireSession()
  if (session.role !== 'COACH') throw new Error('Coach only')

  const templateId = formData.get('templateId') as string

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
  redirect('/workouts')
}

export async function deleteTemplate(formData: FormData) {
  const session = await requireSession()
  if (session.role !== 'COACH') throw new Error('Coach only')

  const templateId = formData.get('templateId') as string
  await prisma.workoutTemplate.delete({
    where: { id: templateId, coachId: session.userId },
  })

  revalidatePath('/workouts')
}

export async function updateRace(formData: FormData) {
  await requireSession()
  const raceId = formData.get('raceId') as string
  const raceType = formData.get('type') as RaceType
  const sportRaw = formData.get('sport') as WorkoutType | null
  const returnTo = (formData.get('returnTo') as string) || '/races'

  const race = await prisma.race.update({
    where: { id: raceId },
    data: {
      name: formData.get('name') as string,
      date: parseDateOnly(formData.get('date') as string),
      location: parseOptionalString(formData.get('location')),
      type: raceType,
      sport: sportRaw || defaultSportForRaceType(raceType),
      goal: parseOptionalString(formData.get('goal')),
    },
    select: { athleteId: true },
  })

  revalidatePath('/races')
  revalidatePath('/dashboard')
  revalidatePath('/training')
  revalidatePath(`/athletes/${race.athleteId}`)
  redirect(returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/races')
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

  await prisma.workout.create({
    data: {
      athleteId: session.athleteId,
      date: completedAt,
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
  await requireSession()
  const raceId = formData.get('raceId') as string
  const race = await prisma.race.findUnique({
    where: { id: raceId },
    select: { athleteId: true },
  })
  await prisma.race.delete({ where: { id: raceId } })

  revalidatePath('/races')
  revalidatePath('/dashboard')
  revalidatePath('/training')
  if (race) revalidatePath(`/athletes/${race.athleteId}`)
}
