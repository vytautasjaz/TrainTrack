import { CalendarDays, Flag, Home, Menu, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { TrainTrackLogo } from '@/components/brand/traintrack-logo'
import { MockBanner } from '../_components/mock-ui'
import { MockNotificationsBell } from '../_components/mock-notifications-bell'
import { TrainingListBody } from '../_components/training-list-body'
import { TrainingViewSwitch, TrainingWeekNav } from '../_components/training-toolbar'
import { TRAINING_WEEK_LABEL } from '../_components/training-mock-data'

export default function TrainingListMobileMockPage() {
  return (
    <div className="tt-mock min-h-dvh pb-8">
      <MockBanner title="Training List · Mobile" status="Review" />
      <div className="px-4 py-6">
        <div className="tt-mock-mobile-frame">
          <div className="flex items-center justify-between border-b border-[var(--tt-line)] px-4 py-3">
            <TrainTrackLogo markClassName="h-7 w-7" wordmarkClassName="!text-[0.85rem]" />
            <div className="flex items-center gap-2.5">
              <MockNotificationsBell />
              <Menu className="h-5 w-5 text-[var(--tt-ink-soft)]" />
            </div>
          </div>

          <div className="px-4 py-5 pb-6">
            <p className="text-[0.8rem] font-medium uppercase tracking-[0.04em] text-[var(--tt-ink-soft)]">
              Training
            </p>
            <h1 className="mt-1 text-[1.65rem] font-bold tracking-tight text-[var(--tt-ink)]">
              This week
            </h1>
            <p className="mt-1 text-[12px] text-[var(--tt-ink-soft)]">{TRAINING_WEEK_LABEL}</p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <TrainingViewSwitch
                active="list"
                listHref="/design-mockups/training-list-mobile#training-list-today"
                weekHref="/design-mockups/training-week-mobile"
              />
              <TrainingWeekNav compact />
            </div>

            <div className="mt-5">
              <TrainingListBody athleteActions compact />
            </div>
          </div>

          <nav className="tt-mock-bottom-nav">
            {[
              { label: 'Home', Icon: Home, href: '/design-mockups/athlete-home-mobile' },
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

        <p className="mx-auto mt-4 max-w-[390px] text-[11px] leading-relaxed text-[var(--tt-ink-faint)]">
          Mobile athlete list · today marked · done/skip on today&apos;s planned ·{' '}
          <Link href="/design-mockups/training-list" className="text-[var(--tt-ink-soft)]">
            desktop
          </Link>
        </p>
      </div>
    </div>
  )
}
