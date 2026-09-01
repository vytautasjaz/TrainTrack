import { CoachHomeClient } from '@/components/coach/coach-home-client'
import type { getCoachHomeData } from '@/lib/queries'

type CoachHomeData = Awaited<ReturnType<typeof getCoachHomeData>>

export function CoachHomePageContent({ coachHome }: { coachHome: CoachHomeData }) {
  const {
    attentionItems,
    coachingRequests,
    planningCoverageRows,
    needsPlanCount,
    planningLeadDays,
    activityTableRows,
    athleteOptions,
    rosterRows,
  } = coachHome

  const totalAthletes = rosterRows.length

  return (
    <div className="tt-dashboard-page -mx-4 px-4 pb-8 sm:-mx-4 sm:px-4 lg:-mx-8 lg:px-8">
      <div className="tt-dashboard-content">
        <CoachHomeClient
          attentionItems={attentionItems}
          coachingRequests={coachingRequests}
          planningCoverageRows={planningCoverageRows}
          needsPlanCount={needsPlanCount}
          planningLeadDays={planningLeadDays}
          activityRows={activityTableRows}
          athleteOptions={athleteOptions}
          totalAthletes={totalAthletes}
        />
      </div>
    </div>
  )
}
