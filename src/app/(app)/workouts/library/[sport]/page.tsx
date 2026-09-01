import { notFound, redirect } from 'next/navigation'
import { getSession, isCoachView } from '@/lib/session'
import { parseSportSlug, sportSlug } from '@/lib/workout-library/config'

type SportLibraryPageProps = {
  params: Promise<{ sport: string }>
}

/** Sport library routes redirect into the unified Library browser. */
export default async function SportLibraryPage({ params }: SportLibraryPageProps) {
  const session = await getSession()
  if (!session) redirect('/')
  if (!isCoachView(session)) redirect('/training')

  const { sport: raw } = await params
  const sport = parseSportSlug(raw)
  if (!sport) notFound()

  redirect(`/workouts?sport=${sportSlug(sport)}`)
}
