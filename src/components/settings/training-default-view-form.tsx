/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useEffect, useState } from 'react'
import { SectionTitle } from '@/components/ui/typography'
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

  const body = (
    <SegmentedControl aria-label="Default Training view" className="w-full">
      {TRAINING_DEFAULT_VIEW_OPTIONS.map((opt) => (
        <SegmentedControlItem
          key={opt.id}
          type="button"
          active={view === opt.id}
          onClick={() => select(opt.id)}
          className={cn('flex-1')}
        >
          {opt.label}
        </SegmentedControlItem>
      ))}
    </SegmentedControl>
  )

  if (embedded) {
    return (
      <SettingsPanel id="training-default-view" title="Default Training view">
        {body}
      </SettingsPanel>
    )
  }

  return (
    <section className="space-y-3">
      <SectionTitle variant="ui">Default Training view</SectionTitle>
      {body}
    </section>
  )
}
