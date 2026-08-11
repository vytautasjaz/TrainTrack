import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import {
  getSession,
  resolveAthleteId,
  isCoachView,
  coachCanAccessAthlete,
} from '@/lib/session'
import { PageHeader } from '@/components/ui/page-header'
import { RacesPageClient } from '@/components/races/season-planner/races-page-client'
import {
  splitPlannedWatching,
  type SeasonRace,
} from '@/lib/season-races'
import type { SeasonPhaseBlockData } from '@/lib/season-planner'

export default async function SeasonPlanPage() {
  const session = await getSession()
  if (!session) redirect('/')

  const athleteId = await resolveAthleteId(session)
  if (!athleteId) redirect('/')

  if (isCoachView(session)) {
    const allowed = await coachCanAccessAthlete(session.userId, athleteId)
    if (!allowed) redirect('/dashboard')
  }

  const [races, phaseBlocksRaw, seasonEventsRaw, athlete] = await Promise.all([
    prisma.race.findMany({
      where: { athleteId, resultsLogOnly: false },
      orderBy: { date: 'asc' },
      select: {
        id: true,
        name: true,
        date: true,
        location: true,
        type: true,
        sport: true,
        courseType: true,
        triathlonDistance: true,
        customDistanceKm: true,
        priority: true,
        intent: true,
        goal: true,
        url: true,
        preparationWeeks: true,
        outcome: true,
        resultTime: true,
        resultNotes: true,
        stravaActivityUrl: true,
        stravaActivityName: true,
        legs: { orderBy: { sortOrder: 'asc' } },
      },
    }),
    prisma.seasonPhaseBlock.findMany({
      where: { athleteId },
      orderBy: { startDate: 'asc' },
      select: {
        id: true,
        sport: true,
        phase: true,
        label: true,
        startDate: true,
        endDate: true,
      },
    }),
    prisma.seasonEvent.findMany({
      where: { athleteId },
      orderBy: { startDate: 'asc' },
      select: {
        id: true,
        title: true,
        notes: true,
        startDate: true,
        endDate: true,
      },
    }),
    prisma.athlete.findUnique({
      where: { id: athleteId },
      select: { name: true },
    }),
  ])

  const seasonRaces = races as SeasonRace[]
  const phaseBlocks = phaseBlocksRaw as SeasonPhaseBlockData[]
  const seasonEvents = seasonEventsRaw
  const { planned, watching } = splitPlannedWatching(seasonRaces)
  const watchingSorted = [...watching].sort((a, b) => a.date.getTime() - b.date.getTime())
  const coachView = isCoachView(session)

  return (
    <div className="space-y-8">
      <PageHeader
        title="Season plan"
        description={
          coachView && athlete?.name
            ? `Season plan for ${athlete.name}`
            : 'Plan your season. Set your goals. Stay focused.'
        }
      />

      <RacesPageClient
        allPlanned={planned}
        watching={watchingSorted}
        phaseBlocks={phaseBlocks}
        seasonEvents={seasonEvents}
        athleteId={athleteId}
      />
    </div>
  )
}
