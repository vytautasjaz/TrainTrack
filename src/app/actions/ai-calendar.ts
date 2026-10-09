'use server'

import { revalidatePath } from 'next/cache'
import { WorkoutType, type Prisma } from '@prisma/client'
import {
  requireSession,
  isCoach,
  resolveAthleteId,
  requireCoachOwnsAthlete,
} from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { parseDateOnly } from '@/lib/dates'
import { getNextWorkoutSortOrder } from '@/lib/workout-sort'
import { onTrainingCalendarDataChanged } from '@/lib/calendar-invalidation'
import { suggestCalendarWorkouts } from '@/lib/coach-engine/suggest-calendar'
import { structureDiagramPrismaValue } from '@/lib/workout-builder/structure-diagram'

export type AiCalendarCreateResult =
  | {
      ok: true
      created: { id: string; dateKey: string; title: string }[]
    }
  | { ok: false; error: string }

async function resolveCalendarAthleteId(athleteId?: string | null) {
  const session = await requireSession()
  if (athleteId) {
    if (isCoach(session)) {
      await requireCoachOwnsAthlete(session.userId, athleteId)
      return athleteId
    }
    const own = await resolveAthleteId(session)
    if (own !== athleteId) throw new Error('You do not have access to this athlete')
    return athleteId
  }
  const id = await resolveAthleteId(session)
  if (!id) throw new Error('No athlete selected')
  return id
}

/** Create AI-suggested workouts on the athlete calendar for the given dates. */
export async function createAiSuggestedCalendarWorkouts(input: {
  dateKeys: string[]
  athleteId?: string | null
  sportFocus?: WorkoutType | null
}): Promise<AiCalendarCreateResult> {
  try {
    const session = await requireSession()
    if (!isCoach(session)) {
      return { ok: false, error: 'Only coaches can add AI suggested workouts.' }
    }
    const dateKeys = [...new Set(input.dateKeys.filter(Boolean))].sort()
    if (dateKeys.length === 0) {
      return { ok: false, error: 'Select at least one day.' }
    }
    if (dateKeys.length > 21) {
      return { ok: false, error: 'Select at most 21 days at a time.' }
    }

    const athleteId = await resolveCalendarAthleteId(input.athleteId)
    const suggestions = await suggestCalendarWorkouts({
      athleteId,
      dateKeys,
      sportFocus: input.sportFocus,
    })

    const created: { id: string; dateKey: string; title: string }[] = []
    for (const suggestion of suggestions) {
      const date = parseDateOnly(suggestion.dateKey)
      const sortOrder = await getNextWorkoutSortOrder(athleteId, date)
      const row = await prisma.workout.create({
        data: {
          athleteId,
          date,
          sortOrder,
          type: suggestion.sportType,
          sessionType: suggestion.sessionType,
          title: suggestion.title,
          description: suggestion.description,
          plannedDistance: suggestion.plannedDistance,
          plannedDuration: suggestion.plannedDuration,
          coachNotes: suggestion.coachNotes,
          tags: suggestion.tags,
          structure: (suggestion.structure ??
            undefined) as Prisma.InputJsonValue | undefined,
          structureDiagram: structureDiagramPrismaValue(suggestion.structure, {
            durationMinutes: suggestion.plannedDuration,
          }),
          swimStructure: (suggestion.swimStructure ??
            undefined) as Prisma.InputJsonValue | undefined,
        },
        select: { id: true },
      })
      created.push({
        id: row.id,
        dateKey: suggestion.dateKey,
        title: suggestion.title,
      })
    }

    await onTrainingCalendarDataChanged(athleteId)
    revalidatePath('/training')
    revalidatePath('/dashboard')
    return { ok: true, created }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Could not create AI workouts',
    }
  }
}
