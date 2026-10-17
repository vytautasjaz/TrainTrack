import { requireProgressAthlete } from '@/lib/progress-access'
import { getProgressStats } from '@/lib/queries'
import { StatsPageHeader } from '@/components/progress/stats-page-header'
import { StatsTrendsSection } from '@/components/progress/stats-trends-section'

export default async function ProgressTrendsPage() {
  const { athleteId } = await requireProgressAthlete()
  const stats = await getProgressStats(athleteId)

  return (
    <>
      <StatsPageHeader
        title="Trends."
        description="Weekly, monthly, and yearly training volume."
      />
      <StatsTrendsSection stats={stats} />
    </>
  )
}
