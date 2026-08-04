import { redirect } from 'next/navigation'
import { Flag, Footprints, Route, Timer, TrendingUp, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getSession, resolveAthleteId, isCoach} from '@/lib/session'
import { getAthleteDashboard, getCoachDashboard, countsTowardCompliance, getPendingCoachRequests } from '@/lib/queries'
import { toDateKey } from '@/lib/dates'
import { daysUntil, formatDistance, formatDuration, percent } from '@/lib/utils'
import { createAthlete } from '@/app/actions/workouts'
import { CoachAthleteCard } from '@/components/coach/coach-athlete-card'
import { CoachPendingRequests } from '@/components/coach/coach-pending-requests'
import { CoachFeedbackList, type CoachFeedbackItem } from '@/components/coach/coach-feedback-list'
import {
  CoachRaceReportsList,
  type CoachRaceReportItem,
} from '@/components/coach/coach-race-reports-list'
import { CoachPlanningWarnings } from '@/components/coach/coach-planning-warnings'
import {
  AthleteCoachReplyList,
  type AthleteCoachReplyItem,
} from '@/components/athlete/athlete-coach-reply-list'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { MetricChip } from '@/components/ui/metric-chip'
import { ProgressRing } from '@/components/ui/progress-ring'
import { StatCard } from '@/components/ui/stat-card'
import { PageHeader } from '@/components/ui/page-header'
import { AthleteDashboardWorkouts } from '@/components/dashboard/athlete-dashboard-workouts'
import { AthleteRaceFollowUp } from '@/components/dashboard/athlete-race-follow-up'
import { toPlanWorkoutDetail } from '@/lib/plan-workout'

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

  if (isCoach(session)) {
    const [
      { athletes, recentFeedback, recentRaceReports, planningLeadDays, planningWarnings },
      pendingCoach,
    ] = await Promise.all([
      getCoachDashboard(session.userId),
      getPendingCoachRequests(session.userId),
    ])
    const feedbackItems: CoachFeedbackItem[] = recentFeedback.map((r) => ({
      id: r.id,
      athleteNotes: r.athleteNotes!.trim(),
      completedAt: r.completedAt.toISOString(),
      workout: {
        id: r.workout.id,
        title: r.workout.title,
        date: toDateKey(r.workout.date),
        type: r.workout.type,
        plannedDistance: r.workout.plannedDistance,
        plannedDuration: r.workout.plannedDuration,
        athlete: { name: r.workout.athlete.name },
      },
    }))
    const raceReportItems: CoachRaceReportItem[] = recentRaceReports.map((r) => ({
      id: r.id,
      name: r.name,
      date: r.date.toISOString(),
      type: r.type,
      outcome: r.outcome!,
      resultTime: r.resultTime,
      resultNotes: r.resultNotes,
      resultLoggedAt: r.resultLoggedAt?.toISOString() ?? null,
      stravaActivityUrl: r.stravaActivityUrl,
      stravaActivityName: r.stravaActivityName,
      legs: r.legs,
      athlete: { id: r.athlete.id, name: r.athlete.name },
    }))

    return (
      <div className="space-y-6">
        <PageHeader
          title="Athletes"
          description="Roster and feedback"
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
            <CardTitle>Race reports</CardTitle>
          </CardHeader>
          <CardContent>
            <CoachRaceReportsList reports={raceReportItems} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Athlete feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <CoachFeedbackList feedback={feedbackItems} />
          </CardContent>
        </Card>

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
  const coachReplyItems: AthleteCoachReplyItem[] = data.unreadCoachReplies.map((r) => ({
    id: r.id,
    coachReply: r.coachReply!.trim(),
    coachRepliedAt: (r.coachRepliedAt ?? r.updatedAt).toISOString(),
    athleteNotes: r.athleteNotes?.trim() ?? null,
    workout: {
      id: r.workout.id,
      title: r.workout.title,
      date: toDateKey(r.workout.date),
      type: r.workout.type,
      plannedDistance: r.workout.plannedDistance,
      plannedDuration: r.workout.plannedDuration,
    },
  }))
  const weekPct = percent(data.weekCompleted, data.weekPlanned)

  return (
    <div className="space-y-6">
      <header className="space-y-1 pt-2 lg:pt-4">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-[34px]">
          {formatGreeting()}, {formatGreetingName(session.name)}.
        </h1>
        <p className="text-sm text-muted-foreground">{formatTodayLabel()}</p>
      </header>

      {coachReplyItems.length > 0 && (
        <section className="card-elevated p-5 sm:p-6">
          <h2 className="mb-4 text-lg font-semibold leading-tight tracking-tight">Coach replies</h2>
          <AthleteCoachReplyList replies={coachReplyItems} />
        </section>
      )}

      {data.pendingRaceFollowUps.length > 0 && (
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
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.9fr)] lg:items-start lg:gap-8">
        <div className="min-w-0">
          <AthleteDashboardWorkouts
            todayWorkouts={data.todayWorkouts.map(toPlanWorkoutDetail)}
            upcomingWorkouts={data.upcomingWorkouts.map(toPlanWorkoutDetail)}
          />
        </div>

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-4">
          <section className="card-elevated overflow-hidden p-5">
            <div className="mb-4 flex items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold leading-tight tracking-tight">This week</h2>
              <p className="text-xs font-medium text-muted-foreground">
                {data.weekCompleted} of {data.weekPlanned} workouts
              </p>
            </div>
            <div className="flex flex-col items-center gap-5">
              <ProgressRing
                value={data.weekCompleted}
                max={Math.max(data.weekPlanned, 1)}
                size={140}
                stroke={10}
                tone="light"
                label={
                  <span className="text-2xl font-bold tabular-nums text-foreground">
                    {weekPct}%
                  </span>
                }
              />
              <div className="flex w-full justify-around gap-2 border-t border-border/50 pt-5">
                <MetricChip
                  icon={Route}
                  value={formatDistance(data.weekDistance)}
                  label="Distance"
                />
                <MetricChip
                  icon={Timer}
                  value={formatDuration(data.weekDuration)}
                  label="Duration"
                />
                <MetricChip
                  icon={Footprints}
                  value={String(data.weekCompleted)}
                  label="Completed"
                />
              </div>
            </div>
          </section>

          {data.nextRace ? (
            <section className="card-elevated space-y-2 p-5">
              <p className="text-label">Next race</p>
              <p className="text-base font-semibold text-foreground">{data.nextRace.name}</p>
              <p className="text-3xl font-bold tracking-tight text-foreground">
                {daysUntil(data.nextRace.date)} days to go
              </p>
              <p className="text-sm text-muted-foreground">
                {new Date(data.nextRace.date).toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  timeZone: 'UTC',
                })}
              </p>
            </section>
          ) : (
            <StatCard
              label="Next race"
              value="—"
              hint="None scheduled"
              icon={Flag}
              layout="row"
              variant="flat"
            />
          )}

          <StatCard
            label="Monthly volume"
            value={formatDistance(data.monthDistance)}
            hint={`${data.monthWorkoutsCompleted} workouts done`}
            icon={TrendingUp}
            layout="row"
            variant="flat"
          />
        </aside>
      </div>
    </div>
  )
}
