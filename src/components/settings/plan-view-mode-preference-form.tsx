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
import { SettingsPanel } from '@/components/settings/settings-section-chrome'
import { cn } from '@/lib/utils'

export function PlanViewModePreferenceForm({ embedded = false }: { embedded?: boolean }) {
  const [mode, setMode] = useState<PlanColorMode>(defaultPlanColorMode)

  useEffect(() => {
    setMode(readStoredPlanColorMode())
  }, [])

  function select(next: PlanColorMode) {
    setMode(next)
    writeStoredPlanColorMode(next)
  }

  const body = embedded ? (
    <div className="space-y-2">
      {PLAN_COLOR_MODE_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => select(opt.id)}
          className={cn(
            'flex w-full flex-col items-start rounded-[8px] border px-3.5 py-3 text-left transition',
            mode === opt.id
              ? 'border-[var(--tt-ink,#111)] shadow-[0_0_0_1px_var(--tt-ink,#111)]'
              : 'border-[var(--tt-line,#ebebeb)] hover:border-[var(--tt-line-strong,#d9d9d9)]',
          )}
        >
          <span className="text-[13px] font-semibold text-[var(--tt-ink,#111)]">{opt.label}</span>
          <span className="mt-0.5 text-[12px] text-[var(--tt-ink-soft,#6b6b6b)]">{opt.hint}</span>
        </button>
      ))}
    </div>
  ) : (
    <>
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
    </>
  )

  if (embedded) {
    return (
      <SettingsPanel
        id="plan"
        title="Plan display"
        description="How workout cards color themselves on week and list views."
      >
        {body}
      </SettingsPanel>
    )
  }

  return (
    <section className="card-elevated space-y-4 p-5">
      <div>
        <SectionTitle variant="ui">Default view mode</SectionTitle>
        <Caption>
          How workout cards are colored on Training. You can still switch this on the calendar.
        </Caption>
      </div>
      {body}
    </section>
  )
}
