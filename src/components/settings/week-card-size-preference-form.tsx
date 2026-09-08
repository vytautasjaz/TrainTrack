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
  WEEK_CARD_SIZE_HINT,
  WEEK_CARD_SIZE_LABEL,
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

  const body = embedded ? (
    <div className="space-y-2">
      {WEEK_CARD_SIZES.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => select(id)}
          className={cn(
            'flex w-full flex-col items-start rounded-[8px] border px-3.5 py-3 text-left transition',
            size === id
              ? 'border-[var(--tt-ink,#111)] shadow-[0_0_0_1px_var(--tt-ink,#111)]'
              : 'border-[var(--tt-line,#ebebeb)] hover:border-[var(--tt-line-strong,#d9d9d9)]',
          )}
        >
          <span className="text-[13px] font-semibold text-[var(--tt-ink,#111)]">
            {WEEK_CARD_SIZE_LABEL[id]}
          </span>
          <span className="mt-0.5 text-[12px] text-[var(--tt-ink-soft,#6b6b6b)]">
            {WEEK_CARD_SIZE_HINT[id]}
          </span>
        </button>
      ))}
    </div>
  ) : (
    <>
      <SegmentedControl aria-label="Default week card size" className="w-full sm:w-auto">
        {WEEK_CARD_SIZES.map((id) => (
          <SegmentedControlItem
            key={id}
            type="button"
            active={size === id}
            onClick={() => select(id)}
            className={cn('flex-1 px-3 sm:flex-none')}
          >
            {id.toUpperCase()}
          </SegmentedControlItem>
        ))}
      </SegmentedControl>
      <p className="text-xs text-muted-foreground">{WEEK_CARD_SIZE_HINT[size]}</p>
    </>
  )

  if (embedded) {
    return (
      <SettingsPanel
        id="week-card-size"
        title="Week card size"
        description="How much detail workout cards show in Week view. L includes description and structure graph. You can still change S/M/L on the Week toolbar."
      >
        {body}
      </SettingsPanel>
    )
  }

  return (
    <section className="card-elevated space-y-4 p-5">
      <div>
        <SectionTitle variant="ui">Week card size</SectionTitle>
        <Caption>
          Default density for Week view cards. Large shows description and the
          structure graph.
        </Caption>
      </div>
      {body}
    </section>
  )
}
