import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Flag, MessageSquare, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getSession, resolveAthleteId, isCoachView} from '@/lib/session'
import { getAthleteDashboard, getCoachDashboard, countsTowardCompliance, getPendingCoachRequests } from '@/lib/queries'
import { getAthleteInboxUnreadCount, getCoachInboxUnreadCount } from '@/lib/coaching-inbox'
import { daysUntil, formatDistance, percent } from '@/lib/utils'
import { createAthlete } from '@/app/actions/workouts'
import { CoachAthleteCard } from '@/components/coach/coach-athlete-card'
import { CoachPendingRequests } from '@/components/coach/coach-pending-requests'
import { CoachPlanningWarnings } from '@/components/coach/coach-planning-warnings'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { AthleteDashboardWorkouts } from '@/components/dashboard/athlete-dashboard-workouts'
import { AthleteDashboardHeader } from '@/components/dashboard/athlete-dashboard-header'
import { AthleteRaceFollowUp } from '@/components/dashboard/athlete-race-follow-up'
import { AthleteWeekStatsCard } from '@/components/dashboard/athlete-week-stats-card'
import { AthleteRecentActivity } from '@/components/dashboard/athlete-recent-activity'
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

function formatTodayLabel() {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/')

  if (isCoachView(session)) {
    const [
      { athletes, planningLeadDays, planningWarnings },
      pendingCoach,
      inboxUnread,
    ] = await Promise.all([
      getCoachDashboard(session.userId),
      getPendingCoachRequests(session.userId),
      getCoachInboxUnreadCount(session.userId),
    ])
    const inboxTotal = inboxUnread + pendingCoach.requests.length

    return (
      <div className="space-y-6">
        <PageHeader
          title="Athletes"
          description="Roster and planning"
        />

        {pendingCoach.coachingCode ? (
          <CoachPendingRequests
            coachingCode={pendingCoach.coachingCode}
            requests={pendingCoach.requests.map((link) => ({
              id: link.id,
              athlete: link.athlete,
            }))}
          />
        ) : null}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Inbox
            </CardTitle>
            {inboxTotal > 0 ? (
              <span className="rounded-full bg-foreground px-2 py-0.5 text-xs font-semibold text-background">
                {inboxTotal > 9 ? '9+' : inboxTotal}
              </span>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Asks, athlete notes, and race conversations live in Inbox.
            </p>
            <Button asChild variant="secondary" size="sm">
              <Link href="/inbox">Open Inbox</Link>
            </Button>
          </CardContent>
        </Card>

        <CoachPlanningWarnings
          warnings={planningWarnings}
          planningLeadDays={planningLeadDays}
        />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {athletes.map((athlete) => {
            const planned = athlete.workouts.filter(countsTowardCompliance).length
            const completed = athlete.workouts.filter(
              (w) => countsTowardCompliance(w) && w.status === 'COMPLETED',
            ).length
            const compliance = percent(completed, planned)
            return (
              <CoachAthleteCard
                key={athlete.id}
                athlete={{
                  id: athlete.id,
                  name: athlete.name,
                  status: athlete.status,
                  avatarUrl: athlete.avatarUrl,
                  races: athlete.races,
                }}
                compliance={compliance}
                completed={completed}
                planned={planned}
                nextRaceDays={athlete.races[0] ? daysUntil(athlete.races[0].date) : null}
              />
            )
          })}
          {athletes.length === 0 && (
            <Card className="md:col-span-2 lg:col-span-3">
              <CardContent className="flex items-center gap-3 py-8 text-muted-foreground">
                <Users className="h-5 w-5" />
                <p className="text-sm">No athletes yet — add one below.</p>
              </CardContent>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Add athlete</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createAthlete} className="flex gap-2">
              <Input
                name="name"
                placeholder="Athlete name"
                required
                className="flex-1"
              />
              <Button type="submit" variant="secondary" size="sm">
                Create
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
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
    select: { weatherLat: true, weatherLon: true, showWeather: true },
  })
  const todayWorkouts = data.todayWorkouts.map((w) =>
    redactPlanWorkoutNotesForViewer(toPlanWorkoutDetail(w), 'athlete'),
  )
  const upcomingWorkouts = data.upcomingWorkouts.map((w) =>
    redactPlanWorkoutNotesForViewer(toPlanWorkoutDetail(w), 'athlete'),
  )
  let weatherByDate: Record<string, WeatherDaySummary> = {}
  const showWeather = athleteWeather?.showWeather ?? true
  if (
    showWeather &&
    athleteWeather?.weatherLat != null &&
    athleteWeather.weatherLon != null
  ) {
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
        lat: athleteWeather.weatherLat,
        lon: athleteWeather.weatherLon,
        dateKeys: [...new Set(dateKeys.filter(Boolean))],
      })
      weatherByDate = Object.fromEntries(weatherMap.entries())
    } catch (error) {
      console.error('Dashboard weather fetch failed', error)
      weatherByDate = {}
    }
  }

  return (
    <div className="tt-dashboard-page -mx-4 px-4 pb-8 sm:-mx-4 sm:px-4 lg:-mx-8 lg:px-8">
      <div className="tt-dashboard-content">
        <AthleteDashboardHeader
          greeting={formatGreeting()}
          name={formatGreetingName(session.name)}
          dateLabel={formatTodayLabel()}
        />

        {inboxUnread > 0 ? (
          <section className="tt-dashboard-card mb-6 sm:mb-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="title-section">Inbox</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  You have {inboxUnread} unread coach {inboxUnread === 1 ? 'reply' : 'replies'}.
                </p>
              </div>
              <Button asChild variant="secondary" size="sm">
                <Link href="/inbox">Open Inbox</Link>
              </Button>
            </div>
          </section>
        ) : null}

        {data.pendingRaceFollowUps.length > 0 && (
          <div className="mb-6 sm:mb-8">
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
          </div>
        )}

        <div className="tt-dashboard-grid">
          <div className="min-w-0">
            <AthleteDashboardWorkouts
              todayWorkouts={todayWorkouts}
              upcomingWorkouts={upcomingWorkouts}
              weatherByDate={weatherByDate}
              hasWeatherLocation={
                showWeather &&
                athleteWeather?.weatherLat != null &&
                athleteWeather.weatherLon != null
              }
              showWeather={showWeather}
            />
          </div>

          <aside className="tt-dashboard-stack min-w-0 lg:sticky lg:top-4">
            <AthleteWeekStatsCard
              workouts={weekStatsWorkouts}
              anchorWeekStartKey={data.weekStatsAnchorStartKey}
              planSportRows={data.planSportRows}
              swimCssSecPer100m={data.swimCssSecPer100m}
            />

            {data.nextRace ? (
              <section className="tt-dashboard-card relative overflow-hidden">
                <p className="title-eyebrow">Next race</p>
                <p className="mt-2 text-base font-semibold text-[#111111]">
                  {data.nextRace.name}
                </p>
                <p className="tt-dashboard-race-countdown mt-3">
                  {daysUntil(data.nextRace.date)}{' '}
                  <span className="text-lg font-bold tracking-tight text-[#737986]">
                    days to go
                  </span>
                </p>
                <p className="mt-2 text-sm text-[#737986]">
                  {new Date(data.nextRace.date).toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    timeZone: 'UTC',
                  })}
                </p>
                <Flag
                  className="pointer-events-none absolute -bottom-2 -right-2 h-24 w-24 text-[#111111]/[0.04]"
                  aria-hidden
                />
              </section>
            ) : (
              <section className="tt-dashboard-card">
                <p className="title-eyebrow">Next race</p>
                <p className="mt-3 text-2xl font-bold tracking-tight text-[#111111]">—</p>
                <p className="mt-1 text-sm text-[#737986]">None scheduled</p>
              </section>
            )}

            <section className="tt-dashboard-card tt-dashboard-volume-card">
              <p className="title-eyebrow">Monthly volume</p>
              <p className="mt-3 text-3xl font-extrabold tracking-tight text-[#111111] tabular-nums">
                {formatDistance(data.monthDistance)}
              </p>
              <p className="mt-1 text-sm text-[#737986]">
                {data.monthWorkoutsCompleted} workouts done
              </p>
            </section>

            <AthleteRecentActivity
              workouts={data.recentCompletedWorkouts.map((w) =>
                redactPlanWorkoutNotesForViewer(toPlanWorkoutDetail(w), 'athlete'),
              )}
            />
          </aside>
        </div>
      </div>
    </div>
  )
}
