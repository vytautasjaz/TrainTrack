import { redirect } from 'next/navigation'
import { getSession, resolveAthleteId, isCoachView } from '@/lib/session'
import { getAthleteDashboard, getCoachHomeData } from '@/lib/queries'
import { CoachHomePageContent } from '@/components/coach/coach-home-page'
import { AthleteHomeV2 } from '@/components/dashboard/v2/athlete-home-v2'
import { SessionLoadThresholdsProvider } from '@/components/plan/session-load-thresholds-context'
import {
  toPlanWorkoutDetail,
  redactPlanWorkoutNotesForViewer,
} from '@/lib/plan-workout'

function formatGreetingName(name: string) {
  const first = name.trim().split(/\s+/)[0] ?? name
  return first
}

function formatGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/')

  if (isCoachView(session)) {
    const coachHome = await getCoachHomeData(session.userId)
    return (
      <CoachHomePageContent
        coachHome={coachHome}
        greeting={formatGreeting()}
        coachName={formatGreetingName(session.name)}
      />
    )
  }

  const athleteId = await resolveAthleteId(session)
  if (!athleteId) redirect('/')

  const data = await getAthleteDashboard(athleteId)
  const weekStatsWorkouts = data.weekStatsWindowWorkouts.map((w) =>
    redactPlanWorkoutNotesForViewer(toPlanWorkoutDetail(w), 'athlete'),
  )
  const weekPlanWorkouts = data.weekPlanWorkouts.map((w) =>
    redactPlanWorkoutNotesForViewer(toPlanWorkoutDetail(w), 'athlete'),
  )

  return (
    <div className="tt-dashboard-page -mx-4 px-4 pb-4 sm:-mx-4 sm:px-4 lg:-mx-8 lg:px-8 lg:pb-6">
      <SessionLoadThresholdsProvider value={data.trainingLoadThresholds}>
        <AthleteHomeV2
          weekPlanWorkouts={weekPlanWorkouts}
          weekStatsWorkouts={weekStatsWorkouts}
          weekStatsAnchorStartKey={data.weekStatsAnchorStartKey}
          weekStatsWindowStartKey={data.weekStatsWindowStartKey}
          weekStatsWindowEndKey={data.weekStatsWindowEndKey}
          dayNotes={data.dayNotes}
          seasonEvents={data.seasonEvents}
          weatherByDate={data.weatherByDate}
          showWeather={data.showWeather}
          weatherLocationName={data.weatherLocationName}
          nextRaces={(data.nextRaces ?? []).map((race) => ({
            id: race.id,
            name: race.name,
            date: race.date,
            location: race.location,
            goal: 'goal' in race ? (race.goal as string | null) : null,
            type: 'type' in race ? (race.type as string | null) : null,
          }))}
          thresholds={data.trainingLoadThresholds}
          planSportRows={data.planSportRows}
          swimCssSecPer100m={data.swimCssSecPer100m}
          pendingRaceFollowUps={data.pendingRaceFollowUps.map((race) => ({
            id: race.id,
            name: race.name,
            date: race.date,
            location: race.location ?? null,
            type: race.type,
            goal: race.goal ?? null,
            stravaActivityUrl: race.stravaActivityUrl,
            stravaActivityName: race.stravaActivityName,
            legs: 'legs' in race ? race.legs : [],
          }))}
        />
      </SessionLoadThresholdsProvider>
    </div>
  )
}
