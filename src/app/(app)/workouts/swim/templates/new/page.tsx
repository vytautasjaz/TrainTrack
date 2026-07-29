import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'

/** @deprecated Prefer /workouts/templates/builder/new?sport=SWIM — redirects there. */
export default async function NewSwimTemplatePage() {
  const session = await getSession()
  if (!session || session.role !== 'COACH') redirect('/')

  redirect('/workouts/templates/builder/new?sport=SWIM')
}
