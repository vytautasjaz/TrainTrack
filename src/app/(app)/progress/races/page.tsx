import { requireProgressAthlete } from '@/lib/progress-access'
import { getAthleteRaceResults } from '@/app/actions/race-results'
import { StatsPageHeader } from '@/components/progress/stats-page-header'
import { RaceResultsClient } from '@/components/races/race-results-client'

export default async function ProgressRacesPage() {
  const { athleteId } = await requireProgressAthlete()
  const results = await getAthleteRaceResults(athleteId)

  return (
    <>
      <StatsPageHeader
        title="Race results."
        description="Finished season races and manually logged past results."
      />
      <RaceResultsClient results={results} />
    </>
  )
}
