'use client'

import {
  TRAINING_PLAN_ATHLETE_LEVELS,
  TRAINING_PLAN_ATHLETE_LEVEL_LABELS,
} from '@/lib/training-plan-athlete-level'
import { FormField } from '@/components/ui/form-field'
import { Select } from '@/components/ui/select'

export type PlanAthleteOption = {
  id: string
  name: string
}

type TrainingPlanAudienceFieldsProps = {
  /** Form field defaults (create / edit). */
  defaultLevel?: string | null
  defaultForAthleteId?: string | null
  athletes: PlanAthleteOption[]
  /** Compact helper under the selects. */
  showHint?: boolean
}

/**
 * Shared level + optional tailored-athlete fields for create / edit plan forms.
 */
export function TrainingPlanAudienceFields({
  defaultLevel = null,
  defaultForAthleteId = null,
  athletes,
  showHint = true,
}: TrainingPlanAudienceFieldsProps) {
  return (
    <div className="space-y-3">
      <FormField label="Athlete level">
        <Select name="level" defaultValue={defaultLevel ?? 'intermediate'}>
          {TRAINING_PLAN_ATHLETE_LEVELS.map((level) => (
            <option key={level} value={level}>
              {TRAINING_PLAN_ATHLETE_LEVEL_LABELS[level]}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Tailor to athlete (optional)">
        <Select
          name="forAthleteId"
          defaultValue={defaultForAthleteId ?? 'none'}
        >
          <option value="none">Level defaults only (reusable plan)</option>
          {athletes.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </FormField>
      {showHint ? (
        <p className="text-[11px] leading-snug text-[var(--tt-ink-faint,#9a9a9a)]">
          Level sets default paces / FTP / CSS for approximate distance and time
          on the canvas. Pick an athlete to use their saved intensities instead.
        </p>
      ) : null}
    </div>
  )
}
