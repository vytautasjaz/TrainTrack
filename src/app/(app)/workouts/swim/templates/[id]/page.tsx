import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'

type EditSwimTemplatePageProps = {
  params: Promise<{ id: string }>
}

/** @deprecated Prefer /workouts/templates/builder/[id] — redirects there. */
export default async function EditSwimTemplatePage({ params }: EditSwimTemplatePageProps) {
  const session = await getSession()
  if (!session || session.role !== 'COACH') redirect('/')

  const { id } = await params
  redirect(`/workouts/templates/builder/${id}`)
}
