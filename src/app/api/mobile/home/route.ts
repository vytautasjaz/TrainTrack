import { NextResponse } from 'next/server'
import { requireMobileAthlete } from '@/lib/mobile-auth'
import {
  buildMobileTrainingLoadWeeks,
  buildMobileUpcoming,
  buildMobileWeekStatsWindow,
  filterTodayWorkouts,
  formatGreeting,
  formatGreetingName,
  toMobileWorkoutDto,
} from '@/lib/mobile-workout-dto'
import {
  redactPlanWorkoutNotesForViewer,
  toPlanWorkoutDetail,
} from '@/lib/plan-workout'
import { getAthleteDashboard } from '@/lib/queries'

export async function GET(request: Request) {
  const auth = await requireMobileAthlete(request)
  if (!auth.ok) return auth.response

  const url = new URL(request.url)
  const weekOffsetRaw = Number(url.searchParams.get('weekOffset') ?? '0')
  const weekOffset = Number.isFinite(weekOffsetRaw) ? weekOffsetRaw : 0

  const data = await getAthleteDashboard(auth.session.athleteId)
  const todayWorkouts = filterTodayWorkouts(
    data.todayWorkouts.map((w) =>
      redactPlanWorkoutNotesForViewer(toPlanWorkoutDetail(w), 'athlete'),
    ),
  )
  const weekPlanWorkouts = data.weekPlanWorkouts.map((w) =>
    redactPlanWorkoutNotesForViewer(toPlanWorkoutDetail(w), 'athlete'),
  )
  const weekStatsWorkouts = data.weekStatsWindowWorkouts.map((w) =>
    redactPlanWorkoutNotesForViewer(toPlanWorkoutDetail(w), 'athlete'),
  )

  const upcoming = buildMobileUpcoming({
    weekPlanWorkouts,
    weekOffset,
    thresholds: data.trainingLoadThresholds,
  })
  const weekStatsWeeks = buildMobileWeekStatsWindow({
    workouts: weekStatsWorkouts,
    anchorWeekStartKey: data.weekStatsAnchorStartKey,
    planSportRows: data.planSportRows,
    swimCssSecPer100m: data.swimCssSecPer100m,
  })
  const weekStats =
    weekStatsWeeks.find((w) => w.weekOffset === 0) ?? weekStatsWeeks[0]!

  const trainingLoadWeeks = buildMobileTrainingLoadWeeks({
    workouts: weekStatsWorkouts,
    anchorWeekStartKey: data.weekStatsAnchorStartKey,
    thresholds: data.trainingLoadThresholds,
  })

  return NextResponse.json({
    greeting: formatGreeting(),
    name: formatGreetingName(auth.session.name),
    today: todayWorkouts.map((workout) =>
      toMobileWorkoutDto(workout, data.trainingLoadThresholds),
    ),
    upcoming: upcoming.upcoming,
    weekLabel: upcoming.weekLabel,
    weekTitle: upcoming.weekTitle,
    canGoPrev: upcoming.canGoPrev,
    canGoNext: upcoming.canGoNext,
    weekOffset: upcoming.weekOffset,
    weekStats,
    weekStatsWeeks,
    trainingLoadWeeks,
  })
}
