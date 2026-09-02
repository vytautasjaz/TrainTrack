import { CoachHomeClient } from '@/components/coach/coach-home-client'
import type { getCoachHomeData } from '@/lib/queries'

type CoachHomeData = Awaited<ReturnType<typeof getCoachHomeData>>

export function CoachHomePageContent({
  coachHome,
  greeting,
  coachName,
}: {
  coachHome: CoachHomeData
  greeting: string
  coachName: string
}) {
  const {
    attentionItems,
    coachingRequests,
    planningCoverageRows,
    needsPlanCount,
    planningLeadDays,
    activityTableRows,
    athleteOptions,
    rosterRows,
    pendingCoach,
  } = coachHome

  const totalAthletes = rosterRows.length

  return (
    <div className="tt-dashboard-page tt-coach-home-page tt-home-page -mx-4 px-4 pb-6 sm:-mx-4 sm:px-4 sm:pb-8 lg:-mx-8 lg:px-8">
      <div className="tt-dashboard-content tt-coach-home-content">
        <CoachHomeClient
          greeting={greeting}
          coachName={coachName}
          attentionItems={attentionItems}
          coachingRequests={coachingRequests}
          planningCoverageRows={planningCoverageRows}
          needsPlanCount={needsPlanCount}
          planningLeadDays={planningLeadDays}
          activityRows={activityTableRows}
          athleteOptions={athleteOptions}
          totalAthletes={totalAthletes}
          coachingCode={pendingCoach.coachingCode}
        />
      </div>
    </div>
  )
}
