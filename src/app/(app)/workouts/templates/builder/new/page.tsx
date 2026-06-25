import { redirect } from 'next/navigation'
import { SessionType, WorkoutType } from '@prisma/client'
import { WorkoutBuilder } from '@/components/workout-builder/workout-builder'
import { getSession } from '@/lib/session'
import { buildPreset } from '@/lib/workout-builder/presets'
import { defaultBuilderWorkout } from '@/lib/workout-builder/utils'

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
  const sessionType = (params.sessionType as SessionType) || SessionType.CUSTOM

  let initial = defaultBuilderWorkout(sport, sessionType)

  if (sessionType !== SessionType.CUSTOM) {
    const preset = buildPreset(sessionType)
    initial = {
      ...initial,
      title: preset.title,
      sportType: preset.sportType,
      structure: preset.structure,
    }
  }

  return <WorkoutBuilder mode="template" initial={initial} fallbackHref="/workouts" />
}
