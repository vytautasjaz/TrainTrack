import { notFound, redirect } from 'next/navigation'
import { WorkoutStatus, WorkoutType } from '@prisma/client'
import { WorkoutEditorPage } from '@/components/workout-editor/workout-editor-page'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { todayDateKey } from '@/lib/dates'
import { parseStructure } from '@/lib/workout-builder/utils'
import { parseSwimStructure } from '@/lib/swim-workout/parse'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'

type EditTemplateBuilderPageProps = {
  params: Promise<{ id: string }>
}

export default async function EditTemplateBuilderPage({ params }: EditTemplateBuilderPageProps) {
  const session = await getSession()
  if (!session || session.role !== 'COACH') redirect('/')

  const { id } = await params
  const template = await prisma.workoutTemplate.findFirst({
    where: { id, coachId: session.userId },
  })
  if (!template) notFound()

  const isSwim = template.type === WorkoutType.SWIM
  const swimStructure = isSwim ? parseSwimStructure(template.swimStructure) : null

  const workout: PlanWorkoutDetail = {
    id: template.id,
    title: template.title,
    dateKey: todayDateKey(),
    type: template.type,
    sessionType: template.sessionType,
    status: WorkoutStatus.PLANNED,
    description: template.description ?? null,
    plannedDistance: isSwim
      ? template.plannedDistanceMeters != null
        ? template.plannedDistanceMeters / 1000
        : null
      : (template.distanceKm ?? null),
    plannedDistanceMeters: template.plannedDistanceMeters ?? null,
    plannedDuration: template.durationMin ?? null,
    swimEnvironment: template.swimEnvironment ?? null,
    coachNotes: template.notes ?? null,
    structure: isSwim ? null : parseStructure(template.structure),
    swimStructure,
    tags: template.tags,
    result: null,
  }

  return (
    <WorkoutEditorPage
      mode="template"
      sportType={template.type}
      date={workout.dateKey}
      workout={workout}
      entityId={template.id}
      fallbackHref="/workouts"
    />
  )
}
