import { redirect } from 'next/navigation'
import { WorkoutType } from '@prisma/client'
import { WorkoutEditorPage } from '@/components/workout-editor/workout-editor-page'
import { getSession } from '@/lib/session'
import { todayDateKey } from '@/lib/dates'

type NewTemplateBuilderPageProps = {
  searchParams: Promise<{
    sport?: string
    sessionType?: string
  }>
}

export default async function NewTemplateBuilderPage({ searchParams }: NewTemplateBuilderPageProps) {
  const session = await getSession()
  if (!session || session.role !== 'COACH') redirect('/')

  const params = await searchParams
  const sport = (params.sport as WorkoutType) || WorkoutType.RUN

  return (
    <WorkoutEditorPage
      mode="template"
      sportType={sport}
      date={todayDateKey()}
      fallbackHref="/workouts"
    />
  )
}
