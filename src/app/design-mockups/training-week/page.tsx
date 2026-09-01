'use client'

import { useState } from 'react'
import { PlanSportFilterProvider } from '@/components/training/plan-sport-filter-context'
import { MockAppChrome } from '../_components/mock-app-chrome'
import { TrainingLibraryPanel } from '../_components/training-library-panel'
import { TrainingWeekGrid } from '../_components/training-week-grid'
import {
  TrainingLibraryToggle,
  TrainingViewSwitch,
  TrainingWeekTableToolbar,
  type WeekCardSize,
  type WeekLayerKey,
} from '../_components/training-toolbar'
import { TRAINING_ATHLETE, TRAINING_WEEK_LABEL } from '../_components/training-mock-data'

export default function TrainingWeekMockPage() {
  const [libraryOpen, setLibraryOpen] = useState(true)
  const [cardSize, setCardSize] = useState<WeekCardSize>('m')
  const [layers, setLayers] = useState<Record<WeekLayerKey, boolean>>({
    weather: true,
    notesEvents: true,
  })

  return (
    <MockAppChrome title="Training Week · Desktop" status="Review" role="coach" activeNav="Training">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="tt-mock-overline text-[var(--tt-ink-faint)]">Training · Coach</p>
          <h1 className="tt-mock-h1 mt-1 !text-5xl">Week plan</h1>
          <p className="mt-1 text-[13px] text-[var(--tt-ink-soft)]">
            {TRAINING_ATHLETE} · {TRAINING_WEEK_LABEL}
          </p>
        </div>
        <div className="flex flex-nowrap items-center gap-2">
          <TrainingViewSwitch
            active="week"
            listHref="/design-mockups/training-list#training-list-today"
            weekHref="/design-mockups/training-week"
          />
          <TrainingLibraryToggle open={libraryOpen} onToggle={() => setLibraryOpen((v) => !v)} />
        </div>
      </div>

      <PlanSportFilterProvider>
        <TrainingWeekTableToolbar
          layers={layers}
          onLayerChange={(key, next) => setLayers((prev) => ({ ...prev, [key]: next }))}
          cardSize={cardSize}
          onCardSizeChange={setCardSize}
        />

        <div className={`tt-mock-training-split ${libraryOpen ? 'tt-mock-training-split-open' : ''}`}>
          <div className="min-w-0 overflow-x-auto">
            <TrainingWeekGrid cardSize={cardSize} layers={layers} />
          </div>
          {libraryOpen ? (
            <div className="tt-mock-library-drawer">
              <TrainingLibraryPanel onClose={() => setLibraryOpen(false)} />
            </div>
          ) : null}
        </div>
      </PlanSportFilterProvider>

      <p className="mt-6 text-[11px] text-[var(--tt-ink-faint)]">
        Filters match production week toolbar · Cards S–L mock density ·{' '}
        <a href="/design-mockups/training-week-mobile" className="text-[var(--tt-ink-soft)]">
          mobile
        </a>
      </p>
    </MockAppChrome>
  )
}
