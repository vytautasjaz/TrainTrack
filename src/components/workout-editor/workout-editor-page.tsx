'use client'

import { useRouter } from 'next/navigation'
import { SharedWorkoutEditor } from '@/components/workout-editor/shared-workout-editor'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import type { WorkoutType } from '@prisma/client'
import type { WorkoutEditorMode } from '@/lib/workout-editor/types'

type WorkoutEditorPageProps = {
  mode: Exclude<WorkoutEditorMode, 'plan'>
  sportType: WorkoutType
  date: string
  workout?: PlanWorkoutDetail | null
  entityId?: string
  fallbackHref?: string
}

export function WorkoutEditorPage({
  mode,
  sportType,
  date,
  workout = null,
  entityId,
  fallbackHref = '/workouts',
}: WorkoutEditorPageProps) {
  const router = useRouter()

  return (
    <div className="mx-auto max-w-2xl overflow-hidden rounded-[6px] border border-border bg-card shadow-none">
      <SharedWorkoutEditor
        mode={mode}
        sportType={sportType}
        date={date}
        workout={workout}
        entityId={entityId}
        embedded
        onCancel={() => router.push(fallbackHref)}
        onSaved={() => router.push(fallbackHref)}
      />
    </div>
  )
}
