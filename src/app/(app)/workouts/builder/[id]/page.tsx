import { notFound, redirect } from 'next/navigation'
import { WorkoutEditorPage } from '@/components/workout-editor/workout-editor-page'
import { prisma } from '@/lib/prisma'
import { getSession, resolveAthleteId } from '@/lib/session'
import { toPlanWorkoutDetail } from '@/lib/plan-workout'

type EditWorkoutBuilderPageProps = {
  params: Promise<{ id: string }>
}

export default async function EditWorkoutBuilderPage({ params }: EditWorkoutBuilderPageProps) {
  const session = await getSession()
  if (!session || session.role !== 'COACH') redirect('/')

  const athleteId = await resolveAthleteId(session)
  if (!athleteId) redirect('/training')

  const { id } = await params
  const workout = await prisma.workout.findFirst({
    where: { id, athleteId },
    include: { result: true },
  })
  if (!workout) notFound()

  const detail = toPlanWorkoutDetail(workout)

  return (
    <WorkoutEditorPage
      mode="workout"
      sportType={detail.type}
      date={detail.dateKey}
      workout={detail}
      entityId={workout.id}
      fallbackHref={`/workouts/${workout.id}`}
    />
  )
}
