import { redirect } from 'next/navigation'
import { getSession, isCoachView } from '@/lib/session'
import { getCoachHomeData } from '@/lib/queries'
import { CoachAthletesPageContent } from '@/components/coach/coach-athletes-page'

export default async function AthletesPage() {
  const session = await getSession()
  if (!session) redirect('/')

  if (!isCoachView(session)) redirect('/dashboard')

  const coachHome = await getCoachHomeData(session.userId)

  return <CoachAthletesPageContent coachHome={coachHome} />
}
