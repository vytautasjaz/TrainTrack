import { redirect } from 'next/navigation'
import { Flag, Route, Timer, TrendingUp, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getSession, resolveAthleteId } from '@/lib/session'
import { getAthleteDashboard, getCoachDashboard } from '@/lib/queries'
import { toDateKey } from '@/lib/dates'
import { daysUntil, formatDistance, formatDuration, percent } from '@/lib/utils'
import { createAthlete } from '@/app/actions/workouts'
import { CoachAthleteCard } from '@/components/coach/coach-athlete-card'
import { CoachFeedbackList, type CoachFeedbackItem } from '@/components/coach/coach-feedback-list'
import {
  AthleteCoachReplyList,
  type AthleteCoachReplyItem,
} from '@/components/athlete/athlete-coach-reply-list'
import { Button } from '@/components/ui/button'
import { ProgressRing } from '@/components/ui/progress-ring'
import { StatCard } from '@/components/ui/stat-card'
import { PageHeader } from '@/components/ui/page-header'
import { AthleteDashboardWorkouts } from '@/components/dashboard/athlete-dashboard-workouts'
import { toPlanWorkoutDetail } from '@/lib/plan-workout'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/')

  if (session.role === 'COACH') {
    const { athletes, recentFeedback } = await getCoachDashboard(session.userId)
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
          title="Coach dashboard"
          description="Athletes overview and recent feedback"
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
              <input
                name="name"
                placeholder="Athlete name"
                required
                className="input-field flex-1"
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
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="flex flex-col gap-6">
      <div className="order-3 overflow-hidden rounded-3xl bg-hero p-6 text-hero-foreground shadow-[var(--shadow-float)] md:order-1 md:p-8">
        <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
          <div className="text-center md:text-left">
            <p className="text-sm font-medium opacity-80">{greeting}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">{session.name}</h1>
            <p className="mt-2 text-sm opacity-70">
              {data.weekCompleted} of {data.weekPlanned} workouts done this week
            </p>
          </div>
          <ProgressRing
            value={data.weekCompleted}
            max={Math.max(data.weekPlanned, 1)}
            size={140}
            stroke={9}
            label={
              <span className="text-3xl font-bold tabular-nums">{weekPct}%</span>
            }
            sublabel={
              <span className="mt-0.5 text-xs opacity-70">weekly goal</span>
            }
          />
        </div>
      </div>

      <div className="order-4 grid gap-3 sm:grid-cols-2 md:order-2 lg:grid-cols-4">
        <StatCard
          label="Distance"
          value={formatDistance(data.weekDistance)}
          hint="This week"
          icon={Route}
        />
        <StatCard
          label="Duration"
          value={formatDuration(data.weekDuration)}
          hint="This week"
          icon={Timer}
        />
        <StatCard
          label="Monthly"
          value={formatDistance(data.monthDistance)}
          hint={`${data.monthWorkoutsCompleted} completed`}
          icon={TrendingUp}
        />
        {data.nextRace ? (
          <StatCard
            label="Next race"
            value={`${daysUntil(data.nextRace.date)}d`}
            hint={data.nextRace.name}
            icon={Flag}
            variant="brand"
          />
        ) : (
          <StatCard label="Next race" value="—" hint="None scheduled" icon={Flag} />
        )}
      </div>

      {coachReplyItems.length > 0 && (
        <Card className="order-0 md:order-2">
          <CardHeader>
            <CardTitle>Coach replies</CardTitle>
          </CardHeader>
          <CardContent>
            <AthleteCoachReplyList replies={coachReplyItems} />
          </CardContent>
        </Card>
      )}

      <AthleteDashboardWorkouts
        todayWorkouts={data.todayWorkouts.map(toPlanWorkoutDetail)}
        upcomingWorkouts={data.upcomingWorkouts.map(toPlanWorkoutDetail)}
      />
    </div>
  )
}
