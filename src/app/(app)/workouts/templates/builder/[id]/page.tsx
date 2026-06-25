import { notFound, redirect } from 'next/navigation'
import { WorkoutBuilder } from '@/components/workout-builder/workout-builder'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { parseStructure } from '@/lib/workout-builder/utils'
import type { BuilderWorkout } from '@/lib/workout-builder/types'

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

  const initial: BuilderWorkout = {
    title: template.title,
    sportType: template.type,
    sessionType: template.sessionType,
    tags: template.tags,
    estimatedDuration: template.durationMin ?? undefined,
    structure: parseStructure(template.structure),
  }

  if (template.notes && !initial.structure.coachNotes) {
    initial.structure.coachNotes = template.notes
  }

  return (
    <WorkoutBuilder
      mode="template"
      initial={initial}
      entityId={template.id}
      fallbackHref="/workouts"
    />
  )
}
