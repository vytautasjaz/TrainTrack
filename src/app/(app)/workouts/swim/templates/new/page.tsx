import { redirect } from 'next/navigation'
import { getSession, isCoach} from '@/lib/session'

/** @deprecated Prefer /workouts/templates/builder/new?sport=SWIM — redirects there. */
export default async function NewSwimTemplatePage() {
  const session = await getSession()
  if (!session || !isCoach(session)) redirect('/')

  redirect('/workouts/templates/builder/new?sport=SWIM')
}
