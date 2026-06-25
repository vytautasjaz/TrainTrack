import { notFound, redirect } from 'next/navigation'
import { Flag, Route, Timer, TrendingUp } from 'lucide-react'
import { getSession } from '@/lib/session'
import {
  getAthleteDashboard,
  getAthleteForCoach,
  getProgressStats,
} from '@/lib/queries'
import { pickAthletePreferences } from '@/lib/athlete-preferences'
import {
  athleteStatusBadgeClass,
  athleteStatusLabel,
} from '@/lib/athlete-status'
import { PageHeader } from '@/components/ui/page-header'
import { Badge } from '@/components/ui/badge'
import { BackButton } from '@/components/ui/back-button'
import { StatCard } from '@/components/ui/stat-card'
import { CoachAthleteProfileActions } from '@/components/coach/coach-athlete-profile-actions'
import { AthleteRacesSection } from '@/components/coach/athlete-races-section'
import { ProgressStatsView } from '@/components/progress/progress-stats-view'
import { daysUntil, formatDistance, formatDuration, percent, cn } from '@/lib/utils'

type AthleteProfilePageProps = {
  params: Promise<{ id: string }>
}

export default async function AthleteProfilePage({ params }: AthleteProfilePageProps) {
  const session = await getSession()
  if (!session) redirect('/')
  if (session.role !== 'COACH') redirect('/dashboard')

  const { id } = await params
  const athlete = await getAthleteForCoach(session.userId, id)
  if (!athlete) notFound()

  const [dashboard, progress] = await Promise.all([
    getAthleteDashboard(athlete.id),
    getProgressStats(athlete.id),
  ])

  const weekPct = percent(dashboard.weekCompleted, dashboard.weekPlanned)
  const preferences = pickAthletePreferences(athlete)

  return (
    <div className="space-y-6">
      <PageHeader
        title={athlete.name}
        description="Athlete profile, stats, and races"
        action={
          <CoachAthleteProfileActions
            athlete={{
              id: athlete.id,
              name: athlete.name,
              status: athlete.status,
              preferences,
              planSportRows: athlete.planSportRows,
            }}
          />
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge className={cn(athleteStatusBadgeClass(athlete.status))}>
          {athleteStatusLabel(athlete.status)}
        </Badge>
        <BackButton />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="This week"
          value={`${weekPct}%`}
          hint={`${dashboard.weekCompleted} / ${dashboard.weekPlanned} workouts`}
          icon={TrendingUp}
          variant="brand"
        />
        <StatCard
          label="Distance"
          value={formatDistance(dashboard.weekDistance)}
          hint="This week"
          icon={Route}
        />
        <StatCard
          label="Duration"
          value={formatDuration(dashboard.weekDuration)}
          hint="This week"
          icon={Timer}
        />
        {dashboard.nextRace ? (
          <StatCard
            label="Next race"
            value={`${daysUntil(dashboard.nextRace.date)}d`}
            hint={dashboard.nextRace.name}
            icon={Flag}
            variant="brand"
          />
        ) : (
          <StatCard label="Next race" value="—" hint="None scheduled" icon={Flag} />
        )}
      </div>

      <ProgressStatsView stats={progress} />

      <AthleteRacesSection athleteId={athlete.id} races={athlete.races} />
    </div>
  )
}
