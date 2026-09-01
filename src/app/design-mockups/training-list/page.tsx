'use client'

import { MockAppChrome } from '../_components/mock-app-chrome'
import { TrainingListBody } from '../_components/training-list-body'
import {
  TrainingAddButton,
  TrainingViewSwitch,
  TrainingWeekNav,
} from '../_components/training-toolbar'
import { TRAINING_SELF, TRAINING_WEEK_LABEL } from '../_components/training-mock-data'

export default function TrainingListMockPage() {
  return (
    <MockAppChrome title="Training List · Desktop" status="Review" role="athlete" activeNav="Training">
      <div className="mb-4">
        <p className="tt-mock-overline text-[var(--tt-ink-faint)]">Training</p>
        <h1 className="tt-mock-h1 mt-1 !text-5xl">This week</h1>
        <p className="mt-1 text-[13px] text-[var(--tt-ink-soft)]">
          {TRAINING_SELF} · {TRAINING_WEEK_LABEL} · list agenda
        </p>
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <TrainingViewSwitch
            active="list"
            listHref="/design-mockups/training-list#training-list-today"
            weekHref="/design-mockups/training-week"
          />
          <TrainingWeekNav />
        </div>
        <TrainingAddButton />
      </div>

      <TrainingListBody athleteActions />

      <p className="mt-8 text-center text-[11px] text-[var(--tt-ink-faint)]">
        Athlete list ·{' '}
        <a href="/design-mockups/training-list-mobile" className="text-[var(--tt-ink-soft)]">
          mobile
        </a>
        {' · '}
        <a href="/design-mockups/training-week" className="text-[var(--tt-ink-soft)]">
          week view
        </a>
      </p>
    </MockAppChrome>
  )
}
