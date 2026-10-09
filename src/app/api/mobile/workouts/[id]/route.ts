import { NextResponse } from 'next/server'
import { requireMobileAthlete, mobileJsonError } from '@/lib/mobile-auth'
import { toMobileWorkoutDto } from '@/lib/mobile-workout-dto'
import {
  redactPlanWorkoutNotesForViewer,
  toPlanWorkoutDetail,
} from '@/lib/plan-workout'
import { prisma } from '@/lib/prisma'
import { WORKOUT_PLAN_INCLUDE } from '@/lib/queries'
import { loadAthletePreferencesForBuilder } from '@/lib/workout-builder/load-athlete-preferences'
import { sessionLoadThresholdsFromPreferences } from '@/lib/training-load/session-tss'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireMobileAthlete(request)
  if (!auth.ok) return auth.response

  const { id } = await context.params
  if (!id) return mobileJsonError('Workout id required.', 400)

  const workout = await prisma.workout.findFirst({
    where: { id, athleteId: auth.session.athleteId },
    include: WORKOUT_PLAN_INCLUDE,
  })
  if (!workout) {
    return mobileJsonError('Workout not found.', 404)
  }

  const detail = redactPlanWorkoutNotesForViewer(
    toPlanWorkoutDetail(workout),
    'athlete',
  )

  const prefs = await loadAthletePreferencesForBuilder(auth.session.athleteId)

  return NextResponse.json({
    workout: toMobileWorkoutDto(
      detail,
      sessionLoadThresholdsFromPreferences(prefs),
    ),
  })
}
