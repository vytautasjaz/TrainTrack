import { redirect } from 'next/navigation'
import { getSession, resolveAthleteId } from '@/lib/session'
import { getProgressStats } from '@/lib/queries'
import { PageHeader } from '@/components/ui/page-header'
import { ProgressStatsView } from '@/components/progress/progress-stats-view'

export default async function ProgressPage() {
  const session = await getSession()
  if (!session) redirect('/')

  const athleteId = await resolveAthleteId(session)
  if (!athleteId) redirect('/')

  const stats = await getProgressStats(athleteId)

  return (
    <div className="space-y-6">
      <PageHeader title="Stats" description="Volume, completion, and trends by sport" />
      <ProgressStatsView stats={stats} />
    </div>
  )
}
