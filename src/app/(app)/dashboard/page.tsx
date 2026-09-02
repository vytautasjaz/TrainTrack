import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession, resolveAthleteId, isCoachView} from '@/lib/session'
import { getAthleteDashboard, getCoachHomeData } from '@/lib/queries'
import { getAthleteInboxUnreadCount } from '@/lib/coaching-inbox'
import { CoachHomePageContent } from '@/components/coach/coach-home-page'
import { Button } from '@/components/ui/button'
import { AthleteDashboardWorkouts } from '@/components/dashboard/athlete-dashboard-workouts'
import { AthleteActivityFeed } from '@/components/dashboard/athlete-activity-feed'
import { AthleteDashboardHeader } from '@/components/dashboard/athlete-dashboard-header'
import { AthleteRaceFollowUp } from '@/components/dashboard/athlete-race-follow-up'
import { AthleteWeekStatsCard } from '@/components/dashboard/athlete-week-stats-card'
import { AthleteNextRacesCard } from '@/components/dashboard/athlete-next-races-card'
import { AthleteTrainingLoadCard } from '@/components/dashboard/athlete-training-load-card'
import { toPlanWorkoutDetail, redactPlanWorkoutNotesForViewer } from '@/lib/plan-workout'
import { prisma } from '@/lib/prisma'
import { addDateOnlyDays, todayDateKey, todayDateOnly, toDateKey } from '@/lib/dates'
import { getYrWeatherSummaries } from '@/lib/weather/yr'
import type { WeatherDaySummary } from '@/lib/weather/places'

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
  const inboxUnread = await getAthleteInboxUnreadCount(athleteId)
  const weekStatsWorkouts = data.weekStatsWindowWorkouts.map((w) =>
    redactPlanWorkoutNotesForViewer(toPlanWorkoutDetail(w), 'athlete'),
  )
  const athleteWeather = await prisma.athlete.findUnique({
    where: { id: athleteId },
    select: {
      weatherLat: true,
      weatherLon: true,
      weatherLocationName: true,
      showWeather: true,
    },
  })
  const todayWorkouts = data.todayWorkouts.map((w) =>
    redactPlanWorkoutNotesForViewer(toPlanWorkoutDetail(w), 'athlete'),
  )
  const upcomingWorkouts = data.upcomingWorkouts.map((w) =>
    redactPlanWorkoutNotesForViewer(toPlanWorkoutDetail(w), 'athlete'),
  )
  const activityFeedWorkouts = data.recentCompletedWorkouts.map((w) =>
    redactPlanWorkoutNotesForViewer(toPlanWorkoutDetail(w), 'athlete'),
  )
  let weatherByDate: Record<string, WeatherDaySummary> = {}
  const showWeather = athleteWeather?.showWeather ?? true
  const hasWeatherCoords =
    athleteWeather?.weatherLat != null && athleteWeather.weatherLon != null
  if (showWeather && hasWeatherCoords) {
    const rollingKeys = Array.from({ length: 8 }, (_, i) =>
      toDateKey(addDateOnlyDays(todayDateOnly(), i)),
    )
    const dateKeys = [
      todayDateKey(),
      ...rollingKeys,
      ...todayWorkouts.map((w) => w.dateKey),
      ...upcomingWorkouts.map((w) => w.dateKey),
    ]
    try {
      const weatherMap = await getYrWeatherSummaries({
        lat: athleteWeather.weatherLat!,
        lon: athleteWeather.weatherLon!,
        dateKeys: [...new Set(dateKeys.filter(Boolean))],
      })
      weatherByDate = Object.fromEntries(weatherMap.entries())
    } catch (error) {
      console.error('Dashboard weather fetch failed', error)
      weatherByDate = {}
    }
  }

  const todayWeather = weatherByDate[todayDateKey()] ?? null

  return (
    <div className="tt-dashboard-page tt-athlete-home-page -mx-4 px-4 pb-6 sm:-mx-4 sm:px-4 sm:pb-8 lg:-mx-8 lg:px-8">
      <div className="tt-dashboard-content tt-athlete-home-content">
        <AthleteDashboardHeader
          greeting={formatGreeting()}
          name={formatGreetingName(session.name)}
          showWeather={showWeather}
          todayWeather={todayWeather}
          weatherLocationName={athleteWeather?.weatherLocationName ?? null}
          hasWeatherCoords={hasWeatherCoords}
        />

        <div className="tt-home-mobile-sheet space-y-4 md:contents md:space-y-0">
          {inboxUnread > 0 ? (
            <section className="tt-home-mobile-card mb-0 px-4 md:mb-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-[family-name:var(--font-display)] text-[1.15rem] font-normal uppercase leading-none tracking-tight text-[var(--tt-ink,#111)] sm:text-[0.6875rem] sm:font-medium sm:tracking-[0.08em]">
                    Inbox
                  </p>
                  <p className="mt-1 text-[13px] text-[var(--tt-ink-soft,#6b6b6b)]">
                    You have {inboxUnread} unread coach{' '}
                    {inboxUnread === 1 ? 'reply' : 'replies'}.
                  </p>
                </div>
                <Button asChild variant="secondary" size="sm">
                  <Link href="/inbox">Open Inbox</Link>
                </Button>
              </div>
            </section>
          ) : null}

          <div className="tt-dashboard-grid">
            <div className="min-w-0 space-y-4 md:space-y-7">
              {data.pendingRaceFollowUps.length > 0 ? (
                <AthleteRaceFollowUp
                  races={data.pendingRaceFollowUps.map((race) => ({
                    id: race.id,
                    name: race.name,
                    date: race.date,
                    location: race.location,
                    type: race.type,
                    goal: race.goal,
                    stravaActivityUrl: race.stravaActivityUrl,
                    stravaActivityName: race.stravaActivityName,
                    legs: 'legs' in race ? race.legs : [],
                  }))}
                />
              ) : null}

              <AthleteDashboardWorkouts
                todayWorkouts={todayWorkouts}
                upcomingWorkouts={upcomingWorkouts}
                weatherByDate={weatherByDate}
                showWeather={showWeather}
              />

              <AthleteActivityFeed workouts={activityFeedWorkouts} />
            </div>

            <aside className="min-w-0">
              {/* Match Today section title row so races top border lines up with first workout card */}
              <div className="mb-3 hidden lg:block" aria-hidden>
                <p className="invisible select-none text-[0.6875rem] font-medium uppercase leading-none tracking-[0.08em]">
                  Today
                </p>
              </div>
              <div className="space-y-3 md:space-y-3">
                <AthleteNextRacesCard
                  races={(data.nextRaces ?? []).map((race) => ({
                    id: race.id,
                    name: race.name,
                    date: race.date,
                    location: race.location,
                  }))}
                />
                <AthleteWeekStatsCard
                  workouts={weekStatsWorkouts}
                  anchorWeekStartKey={data.weekStatsAnchorStartKey}
                  planSportRows={data.planSportRows}
                  swimCssSecPer100m={data.swimCssSecPer100m}
                />
                <AthleteTrainingLoadCard
                  workouts={weekStatsWorkouts}
                  anchorWeekStartKey={data.weekStatsAnchorStartKey}
                />
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  )
}
