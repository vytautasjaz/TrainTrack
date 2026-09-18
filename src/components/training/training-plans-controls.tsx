'use client'

import { useState } from 'react'
import { BookCopy, Save } from 'lucide-react'
import { ToolbarTextToggle } from '@/components/training/plan-sport-filter-bar'
import { SaveTrainingPlanModal } from '@/components/training/save-training-plan-modal'
import { ApplyTrainingPlanModal } from '@/components/training/apply-training-plan-modal'
import { useTrainingLibrary } from '@/components/training/training-library-context'
import type { PlanAthleteOption } from '@/components/training/training-plan-audience-fields'

type TrainingPlansControlsProps = {
  defaultStartWeekKey?: string
  defaultEndWeekKey?: string
  athleteId?: string
  athletes?: PlanAthleteOption[]
}

export function TrainingPlansControls({
  defaultStartWeekKey,
  defaultEndWeekKey,
  athleteId,
  athletes: athletesProp,
}: TrainingPlansControlsProps) {
  const library = useTrainingLibrary()
  const athletes = athletesProp ?? library?.athletes ?? []
  const [saveOpen, setSaveOpen] = useState(false)
  const [applyOpen, setApplyOpen] = useState(false)

  return (
    <>
      <div className="flex items-center gap-0.5">
        <ToolbarTextToggle
          pressed={false}
          onClick={() => setSaveOpen(true)}
          title="Save visible weeks as a multi-week plan"
        >
          <Save className="h-3.5 w-3.5" aria-hidden />
          <span className="hidden sm:inline">Save plan</span>
        </ToolbarTextToggle>
        <ToolbarTextToggle
          pressed={false}
          onClick={() => setApplyOpen(true)}
          title="Apply a library plan from a start week"
        >
          <BookCopy className="h-3.5 w-3.5" aria-hidden />
          <span className="hidden sm:inline">Apply plan</span>
        </ToolbarTextToggle>
      </div>
      <SaveTrainingPlanModal
        open={saveOpen}
        onOpenChange={setSaveOpen}
        defaultStartWeekKey={defaultStartWeekKey}
        defaultEndWeekKey={defaultEndWeekKey}
        athleteId={athleteId}
      />
      <ApplyTrainingPlanModal
        open={applyOpen}
        onOpenChange={setApplyOpen}
        defaultStartWeekKey={defaultStartWeekKey}
        athleteId={athleteId}
        athletes={athletes}
      />
    </>
  )
}
