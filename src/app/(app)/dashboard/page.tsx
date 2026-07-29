import { redirect } from 'next/navigation'
import { Flag, Footprints, Route, Timer, TrendingUp, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getSession, resolveAthleteId } from '@/lib/session'
import { getAthleteDashboard, getCoachDashboard } from '@/lib/queries'
import { toDateKey } from '@/lib/dates'
import { daysUntil, formatDistance, formatDuration, percent } from '@/lib/utils'
import { createAthlete } from '@/app/actions/workouts'
import { CoachAthleteCard } from '@/components/coach/coach-athlete-card'
import { CoachFeedbackList, type CoachFeedbackItem } from '@/components/coach/coach-feedback-list'
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

  if (session.role === 'COACH') {
    const { athletes, recentFeedback, planningLeadDays, planningWarnings } =
      await getCoachDashboard(session.userId)
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

    return (
      <div className="space-y-6">
        <PageHeader
          title="Athletes"
          description="Roster and feedback"
        />

        <CoachPlanningWarnings
          warnings={planningWarnings}
          planningLeadDays={planningLeadDays}
        />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {athletes.map((athlete) => {
            const planned = athlete.workouts.filter((w) => w.type !== 'REST').length
            const completed = athlete.workouts.filter((w) => w.status === 'COMPLETED').length
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
      <PageHeader
        title={session.name}
        description={formatTodayLabel()}
      />

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
          <h2 className="text-lg font-semibold leading-tight tracking-tight">This week</h2>

          <div className="card-elevated overflow-hidden p-5">
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
                sublabel={
                  <span className="mt-1 text-xs font-medium text-muted-foreground">
                    {data.weekCompleted} / {data.weekPlanned} workouts
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
          </div>

          <div className="grid gap-3">
            <StatCard
              label="Monthly volume"
              value={formatDistance(data.monthDistance)}
              hint={`${data.monthWorkoutsCompleted} workouts done`}
              icon={TrendingUp}
              layout="row"
              variant="flat"
            />
            {data.nextRace ? (
              <StatCard
                label="Next race"
                value={`${daysUntil(data.nextRace.date)}d`}
                hint={data.nextRace.name}
                icon={Flag}
                layout="row"
                variant="flat"
              />
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
          </div>
        </aside>
      </div>
    </div>
  )
}
