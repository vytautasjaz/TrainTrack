import { CoachAthletesRoster } from '@/components/coach/coach-athletes-roster'
import type { getCoachHomeData } from '@/lib/queries'

type CoachHomeData = Awaited<ReturnType<typeof getCoachHomeData>>

export function CoachAthletesPageContent({ coachHome }: { coachHome: CoachHomeData }) {
  const { rosterRows, pendingCoach } = coachHome
  const activeCount = rosterRows.filter((a) => a.status === 'ACTIVE').length

  return (
    <div className="tt-dashboard-page -mx-4 px-4 pb-8 sm:-mx-4 sm:px-4 lg:-mx-8 lg:px-8">
      <div className="tt-dashboard-content">
        <header className="mb-6">
          <p className="text-[0.8rem] font-medium uppercase tracking-[0.04em] text-[var(--tt-ink-soft)]">
            Coach
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-[2rem] font-normal uppercase leading-none tracking-tight text-[var(--tt-ink)]">
            Athletes
          </h1>
          <p className="mt-1 text-sm text-[var(--tt-ink-soft)]">
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
