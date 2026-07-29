'use client'

import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { SwimWorkoutDetailsFields } from '@/components/swim-workout/swim-workout-details-fields'
import { createDefaultSwimStructure } from '@/lib/swim-workout/defaults'
import { workoutDistanceMeters } from '@/lib/swim-workout/calculations'
import type { SwimWorkoutForm } from '@/lib/swim-workout/types'

type SwimWorkoutFormFieldsProps = {
  form: SwimWorkoutForm
  onChange: (patch: Partial<SwimWorkoutForm>) => void
  /** When true, only env + structure (shared card editor owns title/metrics). */
  detailsOnly?: boolean
}

export function SwimWorkoutFormFields({
  form,
  onChange,
  detailsOnly = false,
}: SwimWorkoutFormFieldsProps) {
  const structure = form.swimStructure ?? createDefaultSwimStructure()
  const builderDistance = workoutDistanceMeters(structure)

  if (detailsOnly) {
    return (
      <SwimWorkoutDetailsFields
        form={{ ...form, swimStructure: structure, builderEnabled: true }}
        onChange={onChange}
      />
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <FormField label="Distance (m)" className="min-w-[7rem] flex-1">
          <Input
            type="number"
            min={0}
            value={builderDistance > 0 ? builderDistance : (form.plannedDistanceMeters ?? '')}
            readOnly={builderDistance > 0}
            onChange={(e) =>
              onChange({
                plannedDistanceMeters: e.target.value ? parseInt(e.target.value, 10) : null,
              })
            }
            placeholder="—"
          />
        </FormField>
        <FormField label="Duration (min)" className="min-w-[7rem] flex-1">
          <Input
            type="number"
            min={0}
            value={form.plannedDuration ?? ''}
            onChange={(e) =>
              onChange({
                plannedDuration: e.target.value ? parseInt(e.target.value, 10) : null,
              })
            }
            placeholder="—"
          />
        </FormField>
      </div>

      <FormField label="Description">
        <Textarea
          value={form.description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={3}
          placeholder="Workout notes for the athlete"
        />
      </FormField>

      <SwimWorkoutDetailsFields
        form={{ ...form, swimStructure: structure, builderEnabled: true }}
        onChange={onChange}
      />
    </div>
  )
}
