/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useEffect, useState } from 'react'
import { Caption, SectionTitle } from '@/components/ui/typography'
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@/components/ui/segmented-control'
import {
  PLAN_COLOR_MODE_OPTIONS,
  defaultPlanColorMode,
  readStoredPlanColorMode,
  writeStoredPlanColorMode,
  type PlanColorMode,
} from '@/lib/plan-sport-filter'
import { cn } from '@/lib/utils'

export function PlanViewModePreferenceForm() {
  const [mode, setMode] = useState<PlanColorMode>(defaultPlanColorMode)

  useEffect(() => {
    setMode(readStoredPlanColorMode())
  }, [])

  function select(next: PlanColorMode) {
    setMode(next)
    writeStoredPlanColorMode(next)
  }

  return (
    <section className="card-elevated space-y-4 p-5">
      <div>
        <SectionTitle variant="ui">Default view mode</SectionTitle>
        <Caption>
          How workout cards are colored on Training. You can still switch this on the calendar.
        </Caption>
      </div>
      <SegmentedControl aria-label="Default view mode" className="w-full sm:w-auto">
        {PLAN_COLOR_MODE_OPTIONS.map((opt) => (
          <SegmentedControlItem
            key={opt.id}
            type="button"
            active={mode === opt.id}
            onClick={() => select(opt.id)}
            className={cn('flex-1 px-3 sm:flex-none')}
          >
            {opt.label}
          </SegmentedControlItem>
        ))}
      </SegmentedControl>
      <p className="text-xs text-muted-foreground">
        {PLAN_COLOR_MODE_OPTIONS.find((opt) => opt.id === mode)?.hint}
      </p>
    </section>
  )
}
