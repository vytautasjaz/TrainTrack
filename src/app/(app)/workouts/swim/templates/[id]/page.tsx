import { redirect } from 'next/navigation'
import { getSession, isCoachView} from '@/lib/session'

type EditSwimTemplatePageProps = {
  params: Promise<{ id: string }>
}

/** @deprecated Prefer /workouts/templates/builder/[id] — redirects there. */
export default async function EditSwimTemplatePage({ params }: EditSwimTemplatePageProps) {
  const session = await getSession()
  if (!session || !isCoachView(session)) redirect('/')

  const { id } = await params
  redirect(`/workouts/templates/builder/${id}`)
}
