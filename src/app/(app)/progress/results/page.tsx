import { requireProgressAthlete } from '@/lib/progress-access'
import { getAthleteRaceResults } from '@/app/actions/race-results'
import {
  getAthletePersonalBestHistory,
  getAthletePersonalBests,
} from '@/app/actions/personal-bests'
import { StatsPageHeader } from '@/components/progress/stats-page-header'
import { PersonalBestsForm } from '@/components/settings/personal-bests-form'
import { RaceResultsClient } from '@/components/races/race-results-client'

export default async function ProgressResultsPage() {
  const { athleteId } = await requireProgressAthlete()
  const [results, personalBests, history] = await Promise.all([
    getAthleteRaceResults(athleteId),
    getAthletePersonalBests(athleteId),
    getAthletePersonalBestHistory(athleteId),
  ])

  return (
    <>
      <StatsPageHeader
        title="Results."
        description="Race finishes and personal bests."
      />

      <div className="grid gap-[var(--tt-space-section)] lg:grid-cols-[minmax(0,1fr)_minmax(17rem,22rem)] lg:items-start">
        <section
          id="race-results"
          className="min-w-0 scroll-mt-24 space-y-[var(--tt-space-snug)]"
        >
          <h2 className="tt-stats-section-title text-[15px] font-bold tracking-tight">
            Race results
          </h2>
          <RaceResultsClient results={results} />
        </section>

        <section id="personal-bests" className="min-w-0 scroll-mt-24">
          <PersonalBestsForm
            records={personalBests}
            raceResults={results}
            history={history}
          />
        </section>
      </div>
    </>
  )
}
