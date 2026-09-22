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
  defaultPlanCompletionLayer,
  readStoredPlanColorMode,
  readStoredPlanCompletionLayer,
  writeStoredPlanColorMode,
  writeStoredPlanCompletionLayer,
  type PlanColorMode,
} from '@/lib/plan-sport-filter'
import { SettingsPanel } from '@/components/settings/settings-section-chrome'
import { cn } from '@/lib/utils'

export function PlanViewModePreferenceForm({ embedded = false }: { embedded?: boolean }) {
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

  const colorBody = embedded ? (
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
      <SegmentedControl aria-label="Default card color" className="w-full sm:w-auto">
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

  const completionBody = (
    <button
      type="button"
      role="switch"
      aria-checked={completionLayer}
      onClick={() => toggleCompletion(!completionLayer)}
      className={cn(
        'flex w-full items-start justify-between gap-3 rounded-[8px] border px-3.5 py-3 text-left transition',
        completionLayer
          ? 'border-[var(--tt-ink,#111)] shadow-[0_0_0_1px_var(--tt-ink,#111)]'
          : 'border-[var(--tt-line,#ebebeb)] hover:border-[var(--tt-line-strong,#d9d9d9)]',
      )}
    >
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold text-[var(--tt-ink,#111)]">
          Completion layer
        </span>
        <span className="mt-0.5 block text-[12px] text-[var(--tt-ink-soft,#6b6b6b)]">
          Green done and muted skipped on top of Color or Plain
        </span>
      </span>
      <span
        className={cn(
          'mt-0.5 shrink-0 text-[11px] font-semibold uppercase tracking-wide',
          completionLayer ? 'text-[var(--tt-ink,#111)]' : 'text-[var(--tt-ink-faint,#9a9a9a)]',
        )}
      >
        {completionLayer ? 'On' : 'Off'}
      </span>
    </button>
  )

  if (embedded) {
    return (
      <SettingsPanel
        id="plan"
        title="Plan display"
        description="Card color and completion status on week and list views."
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--tt-ink-faint,#9a9a9a)]">
              Color
            </p>
            {colorBody}
          </div>
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--tt-ink-faint,#9a9a9a)]">
              Layer
            </p>
            {completionBody}
          </div>
        </div>
      </SettingsPanel>
    )
  }

  return (
    <section className="card-elevated space-y-4 p-5">
      <div>
        <SectionTitle variant="ui">Default view mode</SectionTitle>
        <Caption>
          Card color and completion layer on Training. You can still switch these on the calendar.
        </Caption>
      </div>
      <div className="space-y-3">
        {colorBody}
        {completionBody}
      </div>
    </section>
  )
}
