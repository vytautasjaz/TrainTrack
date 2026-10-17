'use client'

import { useEffect, useState } from 'react'
import { SectionTitle } from '@/components/ui/typography'
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@/components/ui/segmented-control'
import {
  PLAN_COLOR_MODE_OPTIONS,
  defaultPlanColorMode,
  defaultPlanCompletionLayer,
  readStoredPlanColorMode,
  readStoredPlanCompletionLayer,
  writeStoredPlanColorMode,
  writeStoredPlanCompletionLayer,
  type PlanColorMode,
} from '@/lib/plan-sport-filter'
import { SettingsPanel } from '@/components/settings/settings-section-chrome'
import { cn } from '@/lib/utils'

export function PlanViewModePreferenceForm({
  embedded = false,
}: {
  embedded?: boolean
}) {
  const [mode, setMode] = useState<PlanColorMode>(defaultPlanColorMode)
  const [completionLayer, setCompletionLayer] = useState(defaultPlanCompletionLayer)

  useEffect(() => {
    setMode(readStoredPlanColorMode())
    setCompletionLayer(readStoredPlanCompletionLayer())
  }, [])

  function select(next: PlanColorMode) {
    setMode(next)
    writeStoredPlanColorMode(next)
  }

  function toggleCompletion(next: boolean) {
    setCompletionLayer(next)
    writeStoredPlanCompletionLayer(next)
  }

  const colorControl = (
    <SegmentedControl aria-label="Card color" className="w-full">
      {PLAN_COLOR_MODE_OPTIONS.map((opt) => (
        <SegmentedControlItem
          key={opt.id}
          type="button"
          active={mode === opt.id}
          onClick={() => select(opt.id)}
          className={cn('flex-1')}
        >
          {opt.label}
        </SegmentedControlItem>
      ))}
    </SegmentedControl>
  )

  const completionControl = (
    <label className="tt-integration-check">
      <input
        type="checkbox"
        className="h-4 w-4 accent-[var(--tt-ink,#111)]"
        checked={completionLayer}
        onChange={(e) => toggleCompletion(e.target.checked)}
      />
      <span>Show completion layer</span>
    </label>
  )

  if (embedded) {
    return (
      <>
        <SettingsPanel id="plan-color" title="Card color">
          {colorControl}
        </SettingsPanel>
        <SettingsPanel id="plan-completion" title="Completion">
          {completionControl}
        </SettingsPanel>
      </>
    )
  }

  return (
    <section className="space-y-5">
      <div className="space-y-2">
        <SectionTitle variant="ui">Card color</SectionTitle>
        {colorControl}
      </div>
      <div className="space-y-2">
        <SectionTitle variant="ui">Completion</SectionTitle>
        {completionControl}
      </div>
    </section>
  )
}
