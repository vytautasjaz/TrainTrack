import { redirect } from 'next/navigation'
import { getSession, isCoachView } from '@/lib/session'
import { getCoachRosterPageData } from '@/lib/queries'
import { CoachAthletesPageContent } from '@/components/coach/coach-athletes-page'

export default async function AthletesPage() {
  const session = await getSession()
  if (!session) redirect('/')

  if (!isCoachView(session)) redirect('/dashboard')

  const coachRoster = await getCoachRosterPageData(session.userId)

  return <CoachAthletesPageContent coachHome={coachRoster} />
}
