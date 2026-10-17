import { requireProgressAthlete } from '@/lib/progress-access'
import { getPhysiologyDashboard } from '@/lib/coach-engine/physiology/dashboard'
import { PhysiologyDashboard } from '@/components/physiology/physiology-dashboard'
import { StatsPageHeader } from '@/components/progress/stats-page-header'
import { Caption } from '@/components/ui/typography'

export default async function ProgressFitnessPage() {
  const { athleteId } = await requireProgressAthlete()
  const physiology = await getPhysiologyDashboard(athleteId).catch(() => null)

  return (
    <>
      <StatsPageHeader
        title="Fitness."
        description="What your training history suggests works for you — response, capacity, and recovery."
      />
      {physiology ? (
        <PhysiologyDashboard data={physiology} />
      ) : (
        <Caption>
          Fitness profile is unavailable right now. Try again after your next
          training sync.
        </Caption>
      )}
    </>
  )
}
