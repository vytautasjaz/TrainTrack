'use client'

import { useState, type ReactNode } from 'react'
import { CalendarDays, Flag, Menu, MessageSquare, Users } from 'lucide-react'
import Link from 'next/link'
import { TrainTrackLogo } from '@/components/brand/traintrack-logo'
import { MockBanner } from '../_components/mock-ui'
import { TrainingLibraryPanel } from '../_components/training-library-panel'
import { TrainingWeekDayColumns } from '../_components/training-week-day-columns'
import { TrainingWeekGrid } from '../_components/training-week-grid'
import {
  TrainingLibraryToggle,
  TrainingViewSwitch,
  TrainingWeekNav,
} from '../_components/training-toolbar'
import { TRAINING_ATHLETE, TRAINING_WEEK_LABEL } from '../_components/training-mock-data'

function MobileChrome({
  children,
  frameClassName,
  libraryOpen,
  onLibraryToggle,
}: {
  children: ReactNode
  frameClassName?: string
  libraryOpen: boolean
  onLibraryToggle: () => void
}) {
  return (
    <div className={`tt-mock-mobile-frame mx-auto ${frameClassName ?? ''}`}>
      <div className="flex items-center justify-between border-b border-[var(--tt-line)] px-4 py-3">
        <TrainTrackLogo markClassName="h-7 w-7" wordmarkClassName="!text-[0.85rem]" />
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-[var(--tt-red)]/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--tt-red)]">
            Coach
          </span>
          <Menu className="h-5 w-5 text-[var(--tt-ink-soft)]" />
        </div>
      </div>

      <div className="px-3 py-4 pb-5">
        <p className="text-[0.75rem] font-medium uppercase tracking-[0.04em] text-[var(--tt-ink-soft)]">
          {TRAINING_ATHLETE}
        </p>
        <h1 className="mt-0.5 text-[1.45rem] font-bold tracking-tight text-[var(--tt-ink)]">
          Week plan
        </h1>
        <p className="mt-0.5 text-[11px] text-[var(--tt-ink-soft)]">{TRAINING_WEEK_LABEL}</p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <TrainingViewSwitch
            active="week"
            listHref="/design-mockups/training-list-mobile#training-list-today"
            weekHref="/design-mockups/training-week-mobile"
          />
          <TrainingWeekNav compact />
          <TrainingLibraryToggle open={libraryOpen} onToggle={onLibraryToggle} />
        </div>

        <div className="mt-4">{children}</div>
      </div>

      {libraryOpen ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/25 p-0 sm:items-center">
          <div className="absolute inset-0" onClick={onLibraryToggle} aria-hidden />
          <div className="relative z-10 flex max-h-[70vh] w-full max-w-[640px] flex-col overflow-hidden rounded-t-[14px] bg-white shadow-xl sm:rounded-[12px]">
            <TrainingLibraryPanel compact onClose={onLibraryToggle} />
          </div>
        </div>
      ) : null}

      <nav className="tt-mock-bottom-nav">
        {[
          { label: 'Athletes', Icon: Users, href: '/design-mockups/coach-home-mobile' },
          { label: 'Training', Icon: CalendarDays, href: '#', active: true },
          { label: 'Inbox', Icon: MessageSquare, href: '/design-mockups/inbox' },
          { label: 'Season', Icon: Flag, href: '#' },
          { label: 'More', Icon: Menu, href: '#' },
        ].map(({ label, Icon, href, active }) => (
          <Link key={label} href={href} data-active={active || undefined}>
            <Icon className="h-4 w-4" strokeWidth={1.75} />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  )
}

export default function TrainingWeekMobileMockPage() {
  const [libraryLandscape, setLibraryLandscape] = useState(false)
  const [libraryPortrait, setLibraryPortrait] = useState(false)

  return (
    <div className="tt-mock min-h-dvh pb-10">
      <MockBanner title="Training Week · Mobile" status="Review" />
      <div className="space-y-10 px-3 py-6">
        <section>
          <div className="mx-auto mb-3 max-w-[720px]">
            <p className="tt-mock-overline text-[var(--tt-red)]">Option A · Landscape</p>
            <p className="mt-1 text-[13px] text-[var(--tt-ink-soft)]">
              Phone rotated · classic sports × days matrix fits without sideways scroll
            </p>
          </div>
          <MobileChrome
            frameClassName="tt-mock-mobile-frame-landscape"
            libraryOpen={libraryLandscape}
            onLibraryToggle={() => setLibraryLandscape((v) => !v)}
          >
            <TrainingWeekGrid dense />
          </MobileChrome>
        </section>

        <section>
          <div className="mx-auto mb-3 max-w-[390px]">
            <p className="tt-mock-overline text-[var(--tt-red)]">Option B · Portrait · horizontal</p>
            <p className="mt-1 text-[13px] text-[var(--tt-ink-soft)]">
              Day columns · swipe horizontally across Mon–Sun (better for one-handed use)
            </p>
          </div>
          <MobileChrome
            frameClassName="tt-mock-mobile-frame-wide"
            libraryOpen={libraryPortrait}
            onLibraryToggle={() => setLibraryPortrait((v) => !v)}
          >
            <TrainingWeekDayColumns />
          </MobileChrome>
        </section>

        <p className="mx-auto max-w-[520px] text-center text-[11px] leading-relaxed text-[var(--tt-ink-faint)]">
          Pick one orientation pattern for coach mobile week · library sheet on both ·{' '}
          <Link href="/design-mockups/training-week" className="text-[var(--tt-ink-soft)]">
            desktop week
          </Link>
        </p>
      </div>
    </div>
  )
}
