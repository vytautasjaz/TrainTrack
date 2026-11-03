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
        description="How your training volume moves over weeks, months, and years — planned vs completed from your calendar and synced sessions. Filter by sport and range to see load building, plateaus, or year-over-year change. Distances use your unit preference; strength and other non-distance sports fall back to duration."
      />
      <StatsTrendsSection stats={stats} />
    </>
  )
}
