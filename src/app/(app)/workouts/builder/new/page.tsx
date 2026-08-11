import { redirect } from 'next/navigation'
import { WorkoutType } from '@prisma/client'
import { WorkoutEditorPage } from '@/components/workout-editor/workout-editor-page'
import { getSession, isCoachView} from '@/lib/session'
import { todayDateKey } from '@/lib/dates'

type NewWorkoutBuilderPageProps = {
  searchParams: Promise<{
    date?: string
    sport?: string
    sessionType?: string
  }>
}

export default async function NewWorkoutBuilderPage({ searchParams }: NewWorkoutBuilderPageProps) {
  const session = await getSession()
  if (!session || !isCoachView(session)) redirect('/')

  const params = await searchParams
  const sport = (params.sport as WorkoutType) || WorkoutType.RUN
  const scheduledDate = params.date || todayDateKey()

  return (
    <WorkoutEditorPage
      mode="workout"
      sportType={sport}
      date={scheduledDate}
      fallbackHref="/training"
    />
  )
}
