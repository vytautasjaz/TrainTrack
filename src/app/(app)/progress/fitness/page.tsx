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
        description="A personal coaching profile of how your capacity, efficiency, intensity, durability, and recovery look right now — built from your TrainTrack plan history and synced sessions (including Strava HR when available). It is not a lab test, medical grade, or world ranking. Most scores are 0–100 from recent weeks of volume and consistency, session mix (easy, threshold, VO₂, long), paces where we have them, and readiness/load signals; training-response scores reflect how you historically adapt to different stimuli. 100 is the ceiling of this model for that area, not “elite.” Tap any metric for bands and what to do next."
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
