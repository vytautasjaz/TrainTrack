import { redirect } from 'next/navigation'
import { getSession, resolveAthleteId, isCoachView} from '@/lib/session'
import { todayDateKey } from '@/lib/dates'

type NewSwimBuilderPageProps = {
  searchParams: Promise<{ date?: string }>
}

/** @deprecated Prefer /workouts/builder/new?sport=SWIM — redirects there. */
export default async function NewSwimBuilderPage({ searchParams }: NewSwimBuilderPageProps) {
  const session = await getSession()
  if (!session || !isCoachView(session)) redirect('/')
  await resolveAthleteId(session)

  const params = await searchParams
  const date = params.date || todayDateKey()
  redirect(`/workouts/builder/new?sport=SWIM&date=${encodeURIComponent(date)}`)
}
