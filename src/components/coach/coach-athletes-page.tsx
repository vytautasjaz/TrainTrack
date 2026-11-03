import { CoachAthletesRoster } from '@/components/coach/coach-athletes-roster'
import type { getCoachRosterPageData } from '@/lib/queries'

type CoachRosterPageData = Awaited<ReturnType<typeof getCoachRosterPageData>>

export function CoachAthletesPageContent({ coachHome }: { coachHome: CoachRosterPageData }) {
  const { rosterRows, pendingCoach } = coachHome
  const activeCount = rosterRows.filter((a) => a.status === 'ACTIVE').length

  return (
    <div className="tt-dashboard-page -mx-4 px-4 pb-8 sm:-mx-4 sm:px-4 lg:-mx-8 lg:px-8">
      <div className="tt-dashboard-content">
        <header className="mb-6">
          <p className="title-eyebrow text-[#a0a6b3]">Coach</p>
          <h1 className="title-display mt-1">
            Athletes<span className="tt-title-dot">.</span>
          </h1>
          <p className="page-header-description mt-1">
            {activeCount} active · expand for chat, feedback &amp; plan
          </p>
        </header>

        <CoachAthletesRoster
          athletes={rosterRows}
          coachingCode={pendingCoach.coachingCode}
        />
      </div>
    </div>
  )
}
