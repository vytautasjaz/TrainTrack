import { redirect } from 'next/navigation'
import { getSession, isCoach} from '@/lib/session'

type EditSwimBuilderPageProps = {
  params: Promise<{ id: string }>
}

/** @deprecated Prefer /workouts/builder/[id] — redirects there. */
export default async function EditSwimBuilderPage({ params }: EditSwimBuilderPageProps) {
  const session = await getSession()
  if (!session || !isCoach(session)) redirect('/')

  const { id } = await params
  redirect(`/workouts/builder/${id}`)
}
