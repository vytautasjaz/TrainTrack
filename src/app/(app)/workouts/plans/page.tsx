import { redirect } from 'next/navigation'
import {
  getSession,
  isCoachView,
  resolveAthleteId,
  getCoachAthletes,
} from '@/lib/session'
import { TrainingPlansHubClient } from '@/components/training/training-plans-hub-client'
import { startOfWeekDateOnly, toDateKey } from '@/lib/dates'

export default async function TrainingPlansLibraryPage() {
  const session = await getSession()
  if (!session) redirect('/')
  if (!isCoachView(session)) redirect('/training')

  const [athleteId, athletes] = await Promise.all([
    resolveAthleteId(session),
    getCoachAthletes(session.userId),
  ])
  const defaultStartWeekKey = toDateKey(startOfWeekDateOnly(new Date()))

  return (
    <TrainingPlansHubClient
      athleteId={athleteId ?? undefined}
      defaultStartWeekKey={defaultStartWeekKey}
      athletes={athletes.map((a) => ({ id: a.id, name: a.name }))}
    />
  )
}
