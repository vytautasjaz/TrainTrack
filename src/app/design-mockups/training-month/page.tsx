'use client'

import { useState } from 'react'
import { PlanSportFilterProvider } from '@/components/training/plan-sport-filter-context'
import { MockAppChrome } from '../_components/mock-app-chrome'
import { TrainingMonthGrid } from '../_components/training-month-grid'
import {
  TrainingMonthTableToolbar,
  TrainingViewSwitch,
  type MonthLayerKey,
} from '../_components/training-toolbar'
import { TRAINING_ATHLETE, TRAINING_MONTH_LABEL } from '../_components/training-mock-data'
import { cn } from '@/lib/utils'

export default function TrainingMonthMockPage() {
  const [layers, setLayers] = useState<Record<MonthLayerKey, boolean>>({
    notes: true,
    events: true,
    stats: false,
  })
  const [monthSpan, setMonthSpan] = useState<1 | 2 | 3>(1)
  const [expanded, setExpanded] = useState(false)

  return (
    <MockAppChrome title="Training Month · Desktop" status="Review" role="coach" activeNav="Training">
      <div
        className={cn(
          'mb-4 flex flex-wrap items-start justify-between gap-3',
          expanded && 'mb-2',
        )}
      >
        <div>
          <p className="tt-mock-overline text-[var(--tt-ink-faint)]">Training · Coach</p>
          <h1 className={cn('tt-mock-h1 mt-1', expanded ? '!text-3xl' : '!text-5xl')}>
            Month plan
          </h1>
          <p className="mt-1 text-[13px] text-[var(--tt-ink-soft)]">
            {TRAINING_ATHLETE} · {TRAINING_MONTH_LABEL}
          </p>
        </div>
        <div className="flex flex-nowrap items-center gap-2">
          <TrainingViewSwitch
            active="month"
            listHref="/design-mockups/training-list#training-list-today"
            weekHref="/design-mockups/training-week"
            monthHref="/design-mockups/training-month"
          />
        </div>
      </div>

      <PlanSportFilterProvider>
        <TrainingMonthTableToolbar
          layers={layers}
          onLayerChange={(key, next) => setLayers((prev) => ({ ...prev, [key]: next }))}
          monthSpan={monthSpan}
          onMonthSpanChange={setMonthSpan}
          expanded={expanded}
          onExpandedChange={setExpanded}
        />

        <div className={cn('min-w-0 overflow-x-auto', expanded && 'tt-calendar-expanded-root')}>
          <TrainingMonthGrid monthSpan={monthSpan} layers={layers} />
        </div>
      </PlanSportFilterProvider>

      <p className="mt-6 text-[11px] text-[var(--tt-ink-faint)]">
        Close to production month · Layers Notes / Events / Stats · Layout 1m–3m ·{' '}
        <a href="/design-mockups/training-week" className="text-[var(--tt-ink-soft)]">
          week
        </a>
      </p>
    </MockAppChrome>
  )
}
