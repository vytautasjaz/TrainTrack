import { notFound, redirect } from 'next/navigation'
import { WorkoutBuilder } from '@/components/workout-builder/workout-builder'
import { prisma } from '@/lib/prisma'
import { getSession, resolveAthleteId } from '@/lib/session'
import { parseStructure } from '@/lib/workout-builder/utils'
import type { BuilderWorkout } from '@/lib/workout-builder/types'

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
  })
  if (!workout) notFound()

  const initial: BuilderWorkout = {
    title: workout.title,
    sportType: workout.type,
    sessionType: workout.sessionType,
    scheduledDate: workout.date.toISOString().slice(0, 10),
    tags: workout.tags,
    estimatedDuration: workout.plannedDuration ?? undefined,
    structure: parseStructure(workout.structure),
  }

  if (workout.coachNotes && !initial.structure.coachNotes) {
    initial.structure.coachNotes = workout.coachNotes
  }

  return (
    <WorkoutBuilder
      mode="workout"
      initial={initial}
      entityId={workout.id}
      fallbackHref={`/workouts/${workout.id}`}
    />
  )
}
