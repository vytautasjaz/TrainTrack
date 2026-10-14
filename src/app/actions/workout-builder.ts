'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { Prisma, PlannedMetricSource, SessionType, WorkoutType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { parseDateOnly } from '@/lib/dates'
import {
  athleteOwnedByCoachWhere,
  requireAthleteSession,
  requireSession,
  resolveAthleteId,
  isCoachView,
} from '@/lib/session'
import { rethrowActionError } from '@/lib/action-error'
import { builderPayloadSchema } from '@/lib/workout-builder/schema'
import { loadAthletePreferencesForBuilder } from '@/lib/workout-builder/load-athlete-preferences'
import {
  estimateStructureDurationMinutes,
  resolvePlannedWorkoutMetrics,
} from '@/lib/workout-builder/segment-estimation'
import { sportUsesPlannedDistance } from '@/lib/plan-week-totals'
import { getNextWorkoutSortOrder } from '@/lib/workout-sort'
import { RECOVERY_DAY_DEFAULT_NOTE } from '@/lib/recovery-day'
import { prepareStructureForPersist } from '@/lib/workout-builder/structure-compat'
import { structureDiagramPrismaValue } from '@/lib/workout-builder/structure-diagram'
import { sessionTypesForSport } from '@/lib/workout-builder/session-modes'
import { syncApproxTagsFromSources } from '@/lib/workout-metric-source'
import {
  parseWorkoutBuilderPrefs,
  type WorkoutBuilderPrefs,
} from '@/lib/workout-builder/workout-builder-prefs'
import {
  defaultWorkoutTypePrefs,
  parseWorkoutTypePrefs,
  type WorkoutTypePrefs,
} from '@/lib/workout-builder/workout-type-prefs'
import { onTrainingCalendarDataChanged } from '@/lib/calendar-invalidation'

/** Coach workspace actions — match training UI (`isCoachView`), not only COACH role. */
function requireCoach() {
  return requireSession().then((session) => {
    if (!isCoachView(session)) throw new Error('Coach only')
    return session
  })
}

function parseModalScheduledDate(raw: string | undefined): Date {
  const key = raw?.trim()
  if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(key)) {
    throw new Error('Scheduled date is required')
  }
  return parseDateOnly(key)
}

function modalWorkoutTitle(raw: string | undefined, fallback: string): string {
  const title = raw?.trim()
  return title || fallback
}

export type CreateWorkoutModalPayload = {
  title: string
  description?: string
  sportType: WorkoutType
  sessionType: SessionType
  scheduledDate: string
  plannedDistance?: number
  plannedDuration?: number
  /** Provenance for plannedDistance when provided by the editor. */
  plannedDistanceSource?: PlannedMetricSource | null
  /** Provenance for plannedDuration when provided by the editor. */
  plannedDurationSource?: PlannedMetricSource | null
  coachNotes?: string
  coachNotesPrivate?: boolean
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
  folderId: string | null
}

export type WorkoutLibraryFolderPickerItem = {
  id: string
  sport: WorkoutType
  name: string
}

export async function getCoachLibraryForPicker(): Promise<{
  templates: WorkoutTemplatePickerItem[]
  folders: WorkoutLibraryFolderPickerItem[]
}> {
  const session = await requireCoach()
  const [rows, folders] = await Promise.all([
    prisma.workoutTemplate.findMany({
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
        swimStructure: true,
        plannedDistanceMeters: true,
        folderId: true,
      },
    }),
    prisma.workoutTemplateFolder.findMany({
      where: { coachId: session.userId },
      orderBy: [{ sport: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, sport: true, name: true },
    }),
  ])

  return {
    folders,
    templates: rows.map((t) => ({
      id: t.id,
      title: t.title,
      type: t.type,
      sessionType: t.sessionType,
      description: t.description,
      distanceKm:
        t.type === WorkoutType.SWIM && t.plannedDistanceMeters != null
          ? t.plannedDistanceMeters / 1000
          : t.distanceKm,
      durationMin: t.durationMin,
      notes: t.notes,
      structure: t.type === WorkoutType.SWIM ? t.swimStructure : t.structure,
      folderId: t.folderId,
    })),
  }
}

export async function getCoachTemplatesForPicker(): Promise<WorkoutTemplatePickerItem[]> {
  const { templates } = await getCoachLibraryForPicker()
  return templates
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
  const prefs = await getCoachEditorPrefsForModal()
  return prefs.builder
}

export async function getCoachEditorPrefsForModal(): Promise<{
  builder: WorkoutBuilderPrefs
  sessionOptions: WorkoutTypePrefs
}> {
  const session = await requireSession()
  if (!isCoachView(session)) {
    return { builder: {}, sessionOptions: defaultWorkoutTypePrefs() }
  }
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { workoutBuilderPrefs: true },
  })
  return {
    builder: parseWorkoutBuilderPrefs(user?.workoutBuilderPrefs),
    sessionOptions: parseWorkoutTypePrefs(user?.workoutBuilderPrefs),
  }
}

export type SaveRecoveryDayPayload = {
  date: string
  coachNotes?: string
  coachNotesPrivate?: boolean
  workoutId?: string
}

export async function saveRecoveryDay(payload: SaveRecoveryDayPayload) {
  const session = await requireCoach()
  const athleteId = await resolveAthleteId(session)
  if (!athleteId) throw new Error('No athlete selected')

  const date = parseDateOnly(payload.date)

  const coachNotes =
    payload.coachNotes?.trim() || RECOVERY_DAY_DEFAULT_NOTE
  const coachNotesPrivate = Boolean(payload.coachNotesPrivate)

  if (payload.workoutId) {
    await prisma.workout.update({
      where: { id: payload.workoutId },
      data: { coachNotes, coachNotesPrivate },
    })
  } else {
    const existing = await prisma.workout.findFirst({
      where: { athleteId, date, type: WorkoutType.RECOVERY },
    })
    if (existing) {
      await prisma.workout.update({
        where: { id: existing.id },
        data: { coachNotes, coachNotesPrivate },
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
          coachNotesPrivate,
        },
      })
    }
  }

  revalidatePath('/training')
  revalidatePath('/dashboard')
  await onTrainingCalendarDataChanged(athleteId)
}

export async function createWorkoutFromModal(payload: CreateWorkoutModalPayload) {
  try {
    const session = await requireCoach()
    const athleteId = await resolveAthleteId(session)
    if (!athleteId) throw new Error('No athlete selected')

    const scheduledDate = parseModalScheduledDate(payload.scheduledDate)
    const sortOrder = await getNextWorkoutSortOrder(athleteId, scheduledDate)
    const prepared = prepareStructureForPersist(payload.structure)
    const saveStructure = prepared.shouldSave
    const athletePreferences = await loadAthletePreferencesForBuilder(athleteId)
    const metrics = resolvePlannedWorkoutMetrics({
      plannedDistance: payload.plannedDistance,
      plannedDuration: payload.plannedDuration,
      structure: saveStructure ? prepared.display : null,
      preferences: athletePreferences,
      sportUsesDistance: sportUsesPlannedDistance(payload.sportType),
      sessionType: payload.sessionType,
      sportType: payload.sportType,
      allowPaceEstimate: payload.allowPaceEstimate,
      distanceSource: payload.plannedDistanceSource,
      durationSource: payload.plannedDurationSource,
    })
    const tags = syncApproxTagsFromSources(payload.tags, {
      distance: metrics.distanceSource,
      duration: metrics.durationSource,
    })
    const title = modalWorkoutTitle(payload.title, 'Workout')
    const storedCoachNotes =
      prepared.stored && 'coachNotes' in prepared.stored
        ? prepared.stored.coachNotes
        : undefined

    if (!saveStructure || !prepared.stored) {
      await prisma.workout.create({
        data: {
          athleteId,
          templateId: payload.templateId,
          date: scheduledDate,
          sortOrder,
          type: payload.sportType,
          sessionType: payload.sessionType,
          title,
          description: payload.description?.trim() || null,
          plannedDistance: metrics.plannedDistance ?? null,
          plannedDuration: metrics.plannedDuration ?? null,
          plannedDistanceSource: metrics.distanceSource,
          plannedDurationSource: metrics.durationSource,
          coachNotes: payload.coachNotes,
          coachNotesPrivate: Boolean(payload.coachNotesPrivate),
          tags,
        },
      })
    } else {
      await prisma.workout.create({
        data: {
          athleteId,
          templateId: payload.templateId,
          date: scheduledDate,
          sortOrder,
          type: payload.sportType,
          sessionType: payload.sessionType,
          title,
          description: payload.description?.trim() || null,
          plannedDuration: metrics.plannedDuration ?? null,
          plannedDistance: metrics.plannedDistance ?? null,
          plannedDistanceSource: metrics.distanceSource,
          plannedDurationSource: metrics.durationSource,
          coachNotes: storedCoachNotes ?? payload.coachNotes,
          coachNotesPrivate: Boolean(payload.coachNotesPrivate),
          structure: prepared.stored as Prisma.InputJsonValue,
          structureDiagram: structureDiagramPrismaValue(prepared.display, {
            durationMinutes: metrics.plannedDuration,
          }),
          tags,
        },
      })
    }

    revalidatePath('/training')
    revalidatePath('/dashboard')
    await onTrainingCalendarDataChanged(athleteId)
  } catch (error) {
    rethrowActionError('createWorkoutFromModal', error, 'Could not save workout')
  }
}

async function persistWorkoutFromModalUpdate(
  existing: { id: string; athleteId: string; title: string },
  payload: CreateWorkoutModalPayload & { workoutId: string },
) {
  const scheduledDate = parseModalScheduledDate(payload.scheduledDate)
  const prepared = prepareStructureForPersist(payload.structure)
  const saveStructure = prepared.shouldSave
  const athletePreferences = await loadAthletePreferencesForBuilder(existing.athleteId)
  const metrics = resolvePlannedWorkoutMetrics({
    plannedDistance: payload.plannedDistance,
    plannedDuration: payload.plannedDuration,
    structure: saveStructure ? prepared.display : null,
    preferences: athletePreferences,
    sportUsesDistance: sportUsesPlannedDistance(payload.sportType),
    sessionType: payload.sessionType,
    sportType: payload.sportType,
    allowPaceEstimate: payload.allowPaceEstimate,
    distanceSource: payload.plannedDistanceSource,
    durationSource: payload.plannedDurationSource,
  })
  const tags = syncApproxTagsFromSources(payload.tags, {
    distance: metrics.distanceSource,
    duration: metrics.durationSource,
  })
  const title = modalWorkoutTitle(payload.title, existing.title)
  const storedCoachNotes =
    prepared.stored && 'coachNotes' in prepared.stored
      ? prepared.stored.coachNotes
      : undefined

  if (!saveStructure || !prepared.stored) {
    await prisma.workout.update({
      where: { id: payload.workoutId },
      data: {
        date: scheduledDate,
        type: payload.sportType,
        sessionType: payload.sessionType,
        title,
        description: payload.description?.trim() || null,
        plannedDistance: metrics.plannedDistance ?? null,
        plannedDuration: metrics.plannedDuration ?? null,
        plannedDistanceSource: metrics.distanceSource,
        plannedDurationSource: metrics.durationSource,
        coachNotes: payload.coachNotes,
        coachNotesPrivate: Boolean(payload.coachNotesPrivate),
        structure: Prisma.DbNull,
        structureDiagram: Prisma.DbNull,
        tags,
      },
    })
  } else {
    await prisma.workout.update({
      where: { id: payload.workoutId },
      data: {
        date: scheduledDate,
        type: payload.sportType,
        sessionType: payload.sessionType,
        title,
        description: payload.description?.trim() || null,
        plannedDuration: metrics.plannedDuration ?? null,
        plannedDistance: metrics.plannedDistance ?? null,
        plannedDistanceSource: metrics.distanceSource,
        plannedDurationSource: metrics.durationSource,
        coachNotes: storedCoachNotes ?? payload.coachNotes,
        coachNotesPrivate: Boolean(payload.coachNotesPrivate),
        structure: prepared.stored as Prisma.InputJsonValue,
        structureDiagram: structureDiagramPrismaValue(prepared.display, {
          durationMinutes: metrics.plannedDuration,
        }),
        tags,
      },
    })
  }

  revalidatePath('/training')
  revalidatePath('/dashboard')
  revalidatePath(`/workouts/${payload.workoutId}`)
  await onTrainingCalendarDataChanged(existing.athleteId)
}

export async function updateWorkoutFromModal(
  payload: CreateWorkoutModalPayload & { workoutId: string },
) {
  try {
    const session = await requireCoach()
    const athleteId = await resolveAthleteId(session)
    if (!athleteId) throw new Error('No athlete selected')

    const existing = await prisma.workout.findFirst({
      where: {
        id: payload.workoutId,
        athlete: athleteOwnedByCoachWhere(session.userId),
      },
    })
    if (!existing) throw new Error('Workout not found')

    await persistWorkoutFromModalUpdate(existing, payload)
  } catch (error) {
    rethrowActionError('updateWorkoutFromModal', error, 'Could not save workout')
  }
}

const ATHLETE_ADD_SPORT_TYPES: WorkoutType[] = [
  WorkoutType.RUN,
  WorkoutType.BIKE,
  WorkoutType.SWIM,
  WorkoutType.STRENGTH,
  WorkoutType.HYROX,
  WorkoutType.TRIATHLON,
]

/** Full coach-parity create payload; always marks the row as athlete self-added. */
export type AthleteCreateWorkoutPayload = CreateWorkoutModalPayload

/** Athlete edits a workout they self-added (same modal payload as create). */
export async function updateAthleteWorkoutFromModal(
  payload: AthleteCreateWorkoutPayload & { workoutId: string },
) {
  try {
    const session = await requireAthleteSession()

    if (!ATHLETE_ADD_SPORT_TYPES.includes(payload.sportType)) {
      throw new Error('Invalid sport type')
    }
    if (!sessionTypesForSport(payload.sportType).includes(payload.sessionType)) {
      throw new Error('Invalid session type')
    }

    const existing = await prisma.workout.findFirst({
      where: {
        id: payload.workoutId,
        athleteId: session.athleteId,
        selfLogged: true,
      },
    })
    if (!existing) throw new Error('Workout not found')

    await persistWorkoutFromModalUpdate(existing, payload)
  } catch (error) {
    rethrowActionError('updateAthleteWorkoutFromModal', error, 'Could not save workout')
  }
}

export async function createAthleteWorkoutFromModal(payload: AthleteCreateWorkoutPayload) {
  try {
    const session = await requireAthleteSession()

    if (!ATHLETE_ADD_SPORT_TYPES.includes(payload.sportType)) {
      throw new Error('Invalid sport type')
    }
    if (!sessionTypesForSport(payload.sportType).includes(payload.sessionType)) {
      throw new Error('Invalid session type')
    }

    const athleteId = session.athleteId
    const scheduledDate = parseModalScheduledDate(payload.scheduledDate)
    const sortOrder = await getNextWorkoutSortOrder(athleteId, scheduledDate)
    const prepared = prepareStructureForPersist(payload.structure)
    const saveStructure = prepared.shouldSave
    const athletePreferences = await loadAthletePreferencesForBuilder(athleteId)
    const metrics = resolvePlannedWorkoutMetrics({
      plannedDistance: payload.plannedDistance,
      plannedDuration: payload.plannedDuration,
      structure: saveStructure ? prepared.display : null,
      preferences: athletePreferences,
      sportUsesDistance: sportUsesPlannedDistance(payload.sportType),
      sessionType: payload.sessionType,
      sportType: payload.sportType,
      allowPaceEstimate: payload.allowPaceEstimate,
      distanceSource: payload.plannedDistanceSource,
      durationSource: payload.plannedDurationSource,
    })
    const tags = syncApproxTagsFromSources(payload.tags, {
      distance: metrics.distanceSource,
      duration: metrics.durationSource,
    })
    const title = modalWorkoutTitle(payload.title, 'Workout')
    const storedCoachNotes =
      prepared.stored && 'coachNotes' in prepared.stored
        ? prepared.stored.coachNotes
        : undefined

    if (!saveStructure || !prepared.stored) {
      await prisma.workout.create({
        data: {
          athleteId,
          templateId: payload.templateId,
          date: scheduledDate,
          sortOrder,
          type: payload.sportType,
          sessionType: payload.sessionType,
          title,
          description: payload.description?.trim() || null,
          plannedDistance: metrics.plannedDistance ?? null,
          plannedDuration: metrics.plannedDuration ?? null,
          plannedDistanceSource: metrics.distanceSource,
          plannedDurationSource: metrics.durationSource,
          coachNotes: payload.coachNotes,
          coachNotesPrivate: Boolean(payload.coachNotesPrivate),
          selfLogged: true,
          tags,
        },
      })
    } else {
      await prisma.workout.create({
        data: {
          athleteId,
          templateId: payload.templateId,
          date: scheduledDate,
          sortOrder,
          type: payload.sportType,
          sessionType: payload.sessionType,
          title,
          description: payload.description?.trim() || null,
          plannedDuration: metrics.plannedDuration ?? null,
          plannedDistance: metrics.plannedDistance ?? null,
          plannedDistanceSource: metrics.distanceSource,
          plannedDurationSource: metrics.durationSource,
          coachNotes: storedCoachNotes ?? payload.coachNotes,
          coachNotesPrivate: Boolean(payload.coachNotesPrivate),
          structure: prepared.stored as Prisma.InputJsonValue,
          structureDiagram: structureDiagramPrismaValue(prepared.display, {
            durationMinutes: metrics.plannedDuration,
          }),
          selfLogged: true,
          tags,
        },
      })
    }

    revalidatePath('/training')
    revalidatePath('/dashboard')
    await onTrainingCalendarDataChanged(athleteId)
  } catch (error) {
    rethrowActionError('createAthleteWorkoutFromModal', error, 'Could not save workout')
  }
}

export async function saveWorkoutBuilder(payload: unknown, workoutId?: string) {
  const session = await requireCoach()
  const athleteId = await resolveAthleteId(session)
  if (!athleteId) throw new Error('No athlete selected')

  const data = builderPayloadSchema.parse(payload)
  if (!data.scheduledDate) throw new Error('Scheduled date is required')

  const prepared = prepareStructureForPersist(data.structure)
  const athletePreferences = await loadAthletePreferencesForBuilder(athleteId)
  const estimatedDuration =
    data.estimatedDuration ??
    estimateStructureDurationMinutes(
      prepared.display,
      athletePreferences,
      data.sportType,
    )
  const structure = (prepared.stored ?? prepared.display) as Prisma.InputJsonValue
  const durationSource =
    estimatedDuration > 0 ? PlannedMetricSource.STRUCTURE : null
  const tags = syncApproxTagsFromSources(data.tags, {
    duration: durationSource,
    distance: null,
  })

  if (workoutId) {
    await prisma.workout.update({
      where: { id: workoutId },
      data: {
        title: data.title,
        description: data.description?.trim() || null,
        type: data.sportType,
        sessionType: data.sessionType,
        date: parseDateOnly(data.scheduledDate),
        plannedDuration: estimatedDuration || undefined,
        plannedDurationSource: durationSource,
        coachNotes: prepared.display.coachNotes ?? data.structure.coachNotes,
        structure,
        structureDiagram: structureDiagramPrismaValue(prepared.display, {
          durationMinutes: estimatedDuration || null,
        }),
        tags,
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
      description: data.description?.trim() || null,
      type: data.sportType,
      sessionType: data.sessionType,
      date: parseDateOnly(data.scheduledDate),
      sortOrder: await getNextWorkoutSortOrder(athleteId, parseDateOnly(data.scheduledDate)),
      plannedDuration: estimatedDuration || undefined,
      plannedDurationSource: durationSource,
      coachNotes: prepared.display.coachNotes ?? data.structure.coachNotes,
      structure,
      structureDiagram: structureDiagramPrismaValue(prepared.display, {
        durationMinutes: estimatedDuration || null,
      }),
      tags,
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
  const prepared = prepareStructureForPersist(parsed.structure)
  const estimatedDuration =
    parsed.estimatedDuration ??
    estimateStructureDurationMinutes(
      prepared.display,
      undefined,
      parsed.sportType,
    )
  const structure = (prepared.stored ?? prepared.display) as Prisma.InputJsonValue
  const durationSource =
    estimatedDuration > 0 ? PlannedMetricSource.STRUCTURE : null
  const tags = syncApproxTagsFromSources(parsed.tags, {
    duration: durationSource,
    distance: null,
  })
  const notes = prepared.display.coachNotes ?? parsed.structure.coachNotes

  if (templateId) {
    await prisma.workoutTemplate.update({
      where: { id: templateId, coachId: session.userId },
      data: {
        title: parsed.title,
        description: parsed.description?.trim() || null,
        type: parsed.sportType,
        sessionType: parsed.sessionType,
        durationMin: estimatedDuration || undefined,
        durationSource,
        notes,
        structure,
        tags,
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
      description: parsed.description?.trim() || null,
      type: parsed.sportType,
      sessionType: parsed.sessionType,
      durationMin: estimatedDuration || undefined,
      durationSource,
      notes,
      structure,
      tags,
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
      description: workout.description ?? undefined,
      type: workout.type,
      sessionType: workout.sessionType,
      durationMin: workout.plannedDuration ?? undefined,
      distanceKm: workout.plannedDistance ?? undefined,
      durationSource: workout.plannedDurationSource ?? undefined,
      distanceSource: workout.plannedDistanceSource ?? undefined,
      notes: workout.coachNotes ?? undefined,
      structure: workout.structure ?? Prisma.JsonNull,
      plannedDistanceMeters: workout.plannedDistanceMeters ?? undefined,
      plannedDistanceMetersSource: workout.plannedDistanceMetersSource ?? undefined,
      tags: workout.tags,
    },
  })

  revalidatePath('/workouts')
  redirect(`/workouts/templates/builder/${template.id}`)
}

export type SaveWorkoutDraftToLibraryPayload = {
  title: string
  description?: string | null
  sportType: WorkoutType
  sessionType: SessionType
  folderId?: string | null
  durationMin?: number | null
  distanceKm?: number | null
  durationSource?: PlannedMetricSource | null
  distanceSource?: PlannedMetricSource | null
  notes?: string | null
  structure?: unknown
  tags?: string[]
  /** Swim-specific */
  swimEnvironment?: import('@prisma/client').SwimEnvironment | null
  swimStructure?: unknown
  plannedDistanceMeters?: number | null
  plannedDistanceMetersSource?: PlannedMetricSource | null
}

/** Save the current modal draft as a new library template (does not create a plan workout). */
export async function saveWorkoutDraftToLibrary(
  payload: SaveWorkoutDraftToLibraryPayload,
) {
  const session = await requireCoach()
  const title = payload.title.trim()
  if (!title) throw new Error('Title required')
  if (payload.sportType === WorkoutType.REST) {
    throw new Error('Cannot save rest days to library')
  }

  let folderId: string | null = payload.folderId?.trim() || null
  if (folderId) {
    const folder = await prisma.workoutTemplateFolder.findFirst({
      where: {
        id: folderId,
        coachId: session.userId,
        sport: payload.sportType,
      },
      select: { id: true },
    })
    if (!folder) throw new Error('Folder not found')
    folderId = folder.id
  }

  const isSwim = payload.sportType === WorkoutType.SWIM
  const tags = payload.tags ?? []

  const template = await prisma.workoutTemplate.create({
    data: {
      coachId: session.userId,
      folderId,
      title,
      type: payload.sportType,
      sessionType: payload.sessionType,
      description: payload.description?.trim() || null,
      durationMin:
        payload.durationMin != null && payload.durationMin > 0
          ? Math.round(payload.durationMin)
          : null,
      distanceKm:
        !isSwim && payload.distanceKm != null && payload.distanceKm > 0
          ? payload.distanceKm
          : null,
      durationSource: payload.durationSource ?? undefined,
      distanceSource: isSwim ? undefined : (payload.distanceSource ?? undefined),
      notes: payload.notes?.trim() || null,
      structure: isSwim
        ? undefined
        : payload.structure != null
          ? (payload.structure as Prisma.InputJsonValue)
          : undefined,
      swimEnvironment: isSwim ? (payload.swimEnvironment ?? undefined) : undefined,
      swimStructure: isSwim
        ? payload.swimStructure != null
          ? (payload.swimStructure as Prisma.InputJsonValue)
          : undefined
        : undefined,
      plannedDistanceMeters:
        isSwim &&
        payload.plannedDistanceMeters != null &&
        payload.plannedDistanceMeters > 0
          ? Math.round(payload.plannedDistanceMeters)
          : null,
      plannedDistanceMetersSource: isSwim
        ? (payload.plannedDistanceMetersSource ?? undefined)
        : undefined,
      tags,
    },
    select: {
      id: true,
      title: true,
      type: true,
      folderId: true,
    },
  })

  revalidatePath('/workouts')
  revalidatePath('/training')
  return template
}
