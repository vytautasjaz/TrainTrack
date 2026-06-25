import { redirect } from 'next/navigation'
import { SessionType, WorkoutType } from '@prisma/client'
import { WorkoutBuilder } from '@/components/workout-builder/workout-builder'
import { getSession } from '@/lib/session'
import { todayDateKey } from '@/lib/dates'
import { buildPreset } from '@/lib/workout-builder/presets'
import { defaultBuilderWorkout } from '@/lib/workout-builder/utils'

type NewWorkoutBuilderPageProps = {
  searchParams: Promise<{
    date?: string
    sport?: string
    sessionType?: string
  }>
}

export default async function NewWorkoutBuilderPage({ searchParams }: NewWorkoutBuilderPageProps) {
  const session = await getSession()
  if (!session || session.role !== 'COACH') redirect('/')

  const params = await searchParams
  const sport = (params.sport as WorkoutType) || WorkoutType.RUN
  const sessionType = (params.sessionType as SessionType) || SessionType.CUSTOM
  const scheduledDate = params.date || todayDateKey()

  let initial = defaultBuilderWorkout(sport, sessionType, scheduledDate)

  if (sessionType !== SessionType.CUSTOM) {
    const preset = buildPreset(sessionType)
    initial = {
      ...initial,
      title: preset.title,
      sportType: preset.sportType,
      structure: preset.structure,
    }
  }

  return (
    <WorkoutBuilder
      mode="workout"
      initial={initial}
    />
  )
}
