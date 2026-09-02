import { redirect } from 'next/navigation'
import { getSession, resolveAthleteId, isCoachView, coachCanAccessAthlete } from '@/lib/session'
import { getProgressStats } from '@/lib/queries'
import { getAthleteRaceResults } from '@/app/actions/race-results'
import { getAthletePersonalBests } from '@/app/actions/personal-bests'
import { PageHeader } from '@/components/ui/page-header'
import { Caption, SectionTitle } from '@/components/ui/typography'
import { StatsTrendsSection } from '@/components/progress/stats-trends-section'
import { PersonalBestsForm } from '@/components/settings/personal-bests-form'
import { RaceResultsClient } from '@/components/races/race-results-client'

export default async function ProgressPage() {
  const session = await getSession()
  if (!session) redirect('/')

  const athleteId = await resolveAthleteId(session)
  if (!athleteId) redirect('/')

  if (isCoachView(session)) {
    const allowed = await coachCanAccessAthlete(session.userId, athleteId)
    if (!allowed) redirect('/dashboard')
  }

  const [stats, results, personalBests] = await Promise.all([
    getProgressStats(athleteId),
    getAthleteRaceResults(athleteId),
    getAthletePersonalBests(athleteId),
  ])

  return (
    <div className="w-full min-w-0 max-w-[90rem] space-y-10">
      <PageHeader
        title="Stats."
        description="Training trends, personal bests, and race results — one place to review progress."
      />

      <div className="grid gap-8 lg:grid-cols-3 lg:items-start lg:gap-6 xl:gap-8">
        <StatsTrendsSection stats={stats} className="lg:col-span-2" />

        <section id="personal-bests" className="scroll-mt-24 space-y-3 lg:col-span-1">
          <div>
            <SectionTitle>Personal bests</SectionTitle>
            <Caption className="mt-1">
              Your fastest times by distance — click a row to see race history.
            </Caption>
          </div>
          <div className="max-h-[26rem] overflow-y-auto rounded-[8px] border border-[var(--tt-line)] bg-white p-4">
            <PersonalBestsForm records={personalBests} raceResults={results} />
          </div>
        </section>
      </div>

      <section id="race-results" className="scroll-mt-24 space-y-4">
        <div>
          <SectionTitle>Race results</SectionTitle>
          <Caption className="mt-1">
            Finished season races and manually logged past results.
          </Caption>
        </div>
        <RaceResultsClient results={results} />
      </section>
    </div>
  )
}
