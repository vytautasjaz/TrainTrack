'use client'

import { SwimWorkoutBuilder } from '@/components/swim-workout/swim-workout-builder'
import { createDefaultSwimStructure } from '@/lib/swim-workout/defaults'
import { workoutDistanceMetersDraft } from '@/lib/swim-workout/calculations'
import type { SwimSection, SwimWorkoutForm } from '@/lib/swim-workout/types'
import { cn } from '@/lib/utils'

type SwimWorkoutDetailsFieldsProps = {
  form: Pick<SwimWorkoutForm, 'swimStructure' | 'builderEnabled'>
  onChange: (patch: Partial<SwimWorkoutForm>) => void
  className?: string
}

/** Structured swim section/set builder for the shared card editor. */
export function SwimWorkoutDetailsFields({
  form,
  onChange,
  className,
}: SwimWorkoutDetailsFieldsProps) {
  const structure = form.swimStructure ?? createDefaultSwimStructure()
  const sections = structure.sections

  function updateSections(next: SwimSection[]) {
    const nextStructure = { version: 1 as const, sections: next }
    const computed = workoutDistanceMetersDraft(nextStructure)
    onChange({
      builderEnabled: true,
      swimStructure: nextStructure,
      plannedDistanceMeters: computed > 0 ? computed : null,
    })
  }

  return (
    <div className={cn(className)}>
      <SwimWorkoutBuilder sections={sections} onChange={updateSections} />
    </div>
  )
}
