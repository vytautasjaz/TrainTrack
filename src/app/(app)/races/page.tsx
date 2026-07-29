import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getSession, resolveAthleteId } from '@/lib/session'
import { PageHeader } from '@/components/ui/page-header'
import { AddRaceButton, WatchRaceButton } from '@/components/races/add-race-modal'
import { SeasonOverview } from '@/components/races/season-overview'
import { UpcomingRaceTable } from '@/components/races/upcoming-race-table'
import { WatchingRaceTable } from '@/components/races/watching-race-table'
import { PastRaceTable } from '@/components/races/past-race-table'
import {
  splitPlannedWatching,
  splitUpcomingPast,
  type SeasonRace,
} from '@/lib/season-races'

export default async function RacesPage() {
  const session = await getSession()
  if (!session) redirect('/')

  const athleteId = await resolveAthleteId(session)
  if (!athleteId) redirect('/')

  const races = (await prisma.race.findMany({
    where: { athleteId },
    orderBy: { date: 'asc' },
    select: {
      id: true,
      name: true,
      date: true,
      location: true,
      type: true,
      priority: true,
      intent: true,
      goal: true,
      url: true,
      outcome: true,
      resultTime: true,
      resultNotes: true,
    },
  })) as SeasonRace[]

  const { planned, watching } = splitPlannedWatching(races)
  const { upcoming, past } = splitUpcomingPast(planned)
  const watchingSorted = [...watching].sort((a, b) => a.date.getTime() - b.date.getTime())

  return (
    <div className="space-y-8">
      <PageHeader
        title="Races"
        description="Plan your season. Set your goals. Race with purpose."
        action={
          <>
            <WatchRaceButton />
            <AddRaceButton variant="secondary" />
          </>
        }
      />

      <SeasonOverview races={races} upcoming={upcoming} />

      <UpcomingRaceTable races={upcoming} />

      <WatchingRaceTable races={watchingSorted} />

      <PastRaceTable races={past} />
    </div>
  )
}
