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
  WEEK_CARD_SIZE_STORAGE_KEY,
  WEEK_CARD_SIZES,
  defaultWeekCardSize,
  readStoredWeekCardSize,
  writeStoredWeekCardSize,
  type WeekCardSize,
} from '@/lib/week-card-size'
import { cn } from '@/lib/utils'

type WeekCardSizePreferenceFormProps = {
  embedded?: boolean
}

export function WeekCardSizePreferenceForm({
  embedded = false,
}: WeekCardSizePreferenceFormProps) {
  const [size, setSize] = useState<WeekCardSize>(defaultWeekCardSize)

  useEffect(() => {
    setSize(readStoredWeekCardSize(WEEK_CARD_SIZE_STORAGE_KEY))
  }, [])

  function select(next: WeekCardSize) {
    setSize(next)
    writeStoredWeekCardSize(next, WEEK_CARD_SIZE_STORAGE_KEY)
  }

  const body = (
    <SegmentedControl aria-label="Default week card size" className="w-full">
      {WEEK_CARD_SIZES.map((id) => (
        <SegmentedControlItem
          key={id}
          type="button"
          active={size === id}
          onClick={() => select(id)}
          className={cn('flex-1')}
        >
          {id.toUpperCase()}
        </SegmentedControlItem>
      ))}
    </SegmentedControl>
  )

  if (embedded) {
    return (
      <SettingsPanel id="week-card-size" title="Week card size">
        {body}
      </SettingsPanel>
    )
  }

  return (
    <section className="space-y-3">
      <SectionTitle variant="ui">Week card size</SectionTitle>
      {body}
    </section>
  )
}
