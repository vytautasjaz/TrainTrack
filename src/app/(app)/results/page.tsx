import { redirect } from 'next/navigation'
import {
  getSession,
  resolveAthleteId,
  isCoachView,
  coachCanAccessAthlete,
} from '@/lib/session'
import { PageHeader } from '@/components/ui/page-header'
import { Caption, SectionTitle } from '@/components/ui/typography'
import { RaceResultsClient } from '@/components/races/race-results-client'
import { PersonalBestsForm } from '@/components/settings/personal-bests-form'
import { getAthleteRaceResults } from '@/app/actions/race-results'
import { getAthletePersonalBests } from '@/app/actions/personal-bests'

export default async function ResultsPage() {
  const session = await getSession()
  if (!session) redirect('/')

  const athleteId = await resolveAthleteId(session)
  if (!athleteId) redirect('/')

  if (isCoachView(session)) {
    const allowed = await coachCanAccessAthlete(session.userId, athleteId)
    if (!allowed) redirect('/dashboard')
  }

  const [results, personalBests] = await Promise.all([
    getAthleteRaceResults(athleteId),
    getAthletePersonalBests(athleteId),
  ])

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeader
        title="Results"
        description="Race results and personal bests — from season reports, race logs, and your own records."
      />

      <section id="personal-bests" className="scroll-mt-24 space-y-4">
        <div>
          <SectionTitle>Personal bests</SectionTitle>
          <Caption>
            Add and remove PBs for run, swim, bike, triathlon, HYROX, gym, or custom. Click a
            distance to see all finished races at that distance.
          </Caption>
        </div>
        <div className="card-elevated space-y-4 p-5">
          <PersonalBestsForm records={personalBests} raceResults={results} />
        </div>
      </section>

      <section id="race-results" className="scroll-mt-24 space-y-4">
        <div>
          <SectionTitle>Race results</SectionTitle>
          <Caption>
            Finished season races and manually logged past results. Filter by sport, distance, and
            year.
          </Caption>
        </div>
        <RaceResultsClient results={results} />
      </section>
    </div>
  )
}
