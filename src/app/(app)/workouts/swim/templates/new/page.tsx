import { redirect } from 'next/navigation'
import { getSession, isCoachView} from '@/lib/session'

/** @deprecated Prefer /workouts/templates/builder/new?sport=SWIM — redirects there. */
export default async function NewSwimTemplatePage() {
  const session = await getSession()
  if (!session || !isCoachView(session)) redirect('/')

  redirect('/workouts/templates/builder/new?sport=SWIM')
}
