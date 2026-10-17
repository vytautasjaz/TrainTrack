import { requireProgressAthlete } from '@/lib/progress-access'
import { getAthleteRaceResults } from '@/app/actions/race-results'
import { getAthletePersonalBests } from '@/app/actions/personal-bests'
import { StatsPageHeader } from '@/components/progress/stats-page-header'
import { PersonalBestsForm } from '@/components/settings/personal-bests-form'

export default async function ProgressPersonalBestsPage() {
  const { athleteId } = await requireProgressAthlete()
  const [results, personalBests] = await Promise.all([
    getAthleteRaceResults(athleteId),
    getAthletePersonalBests(athleteId),
  ])

  return (
    <>
      <StatsPageHeader
        title="Personal bests."
        description="Your fastest times by distance — click a row to see race history."
      />
      <div className="max-w-xl rounded-[var(--radius-xl)] border border-[var(--tt-line)] bg-white p-4">
        <PersonalBestsForm records={personalBests} raceResults={results} />
      </div>
    </>
  )
}
