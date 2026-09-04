/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useEffect, useState } from 'react'
import { Caption, SectionTitle } from '@/components/ui/typography'
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@/components/ui/segmented-control'
import { SettingsPanel } from '@/components/settings/settings-section-chrome'
import {
  TRAINING_DEFAULT_VIEW_OPTIONS,
  readStoredTrainingDefaultView,
  resolveTrainingDefaultView,
  writeStoredTrainingDefaultView,
  type TrainingDefaultView,
  type TrainingDefaultViewRole,
} from '@/lib/training-default-view'
import { cn } from '@/lib/utils'

const DESKTOP_MQ = '(min-width: 1024px)'

type TrainingDefaultViewFormProps = {
  role: TrainingDefaultViewRole
  embedded?: boolean
}

export function TrainingDefaultViewForm({
  role,
  embedded = false,
}: TrainingDefaultViewFormProps) {
  const [view, setView] = useState<TrainingDefaultView>('week')

  useEffect(() => {
    const desktop =
      typeof window !== 'undefined' && window.matchMedia(DESKTOP_MQ).matches
    setView(
      resolveTrainingDefaultView(readStoredTrainingDefaultView(role), desktop),
    )
  }, [role])

  function select(next: TrainingDefaultView) {
    setView(next)
    writeStoredTrainingDefaultView(role, next)
  }

  const body = embedded ? (
    <div className="space-y-2">
      {TRAINING_DEFAULT_VIEW_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => select(opt.id)}
          className={cn(
            'flex w-full flex-col items-start rounded-[8px] border px-3.5 py-3 text-left transition',
            view === opt.id
              ? 'border-[var(--tt-ink,#111)] shadow-[0_0_0_1px_var(--tt-ink,#111)]'
              : 'border-[var(--tt-line,#ebebeb)] hover:border-[var(--tt-line-strong,#d9d9d9)]',
          )}
        >
          <span className="text-[13px] font-semibold text-[var(--tt-ink,#111)]">
            {opt.label}
          </span>
          <span className="mt-0.5 text-[12px] text-[var(--tt-ink-soft,#6b6b6b)]">
            {opt.hint}
          </span>
        </button>
      ))}
    </div>
  ) : (
    <>
      <SegmentedControl aria-label="Default Training view" className="w-full sm:w-auto">
        {TRAINING_DEFAULT_VIEW_OPTIONS.map((opt) => (
          <SegmentedControlItem
            key={opt.id}
            type="button"
            active={view === opt.id}
            onClick={() => select(opt.id)}
            className={cn('flex-1 px-3 sm:flex-none')}
          >
            {opt.label}
          </SegmentedControlItem>
        ))}
      </SegmentedControl>
      <p className="text-xs text-muted-foreground">
        {TRAINING_DEFAULT_VIEW_OPTIONS.find((opt) => opt.id === view)?.hint}
      </p>
    </>
  )

  if (embedded) {
    return (
      <SettingsPanel
        id="training-default-view"
        title="Default Training view"
        description="Opened when you go to Training without a saved layout. You can still switch List, Week, or Month anytime."
      >
        {body}
      </SettingsPanel>
    )
  }

  return (
    <section className="card-elevated space-y-4 p-5">
      <div>
        <SectionTitle variant="ui">Default Training view</SectionTitle>
        <Caption>
          List, Week, or Month when you open Training. You can still switch on the
          page.
        </Caption>
      </div>
      {body}
    </section>
  )
}
