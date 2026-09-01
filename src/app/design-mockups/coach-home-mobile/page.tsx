import { CalendarDays, Flag, Menu, MessageSquare, Users } from 'lucide-react'
import Link from 'next/link'
import { TrainTrackLogo } from '@/components/brand/traintrack-logo'
import { CoachAthletesMobileList } from '../_components/coach-athletes-mobile'
import { CoachAttentionStack } from '../_components/coach-attention-stack'
import {
  COACH_MOCK_ATHLETES,
} from '../_components/coach-athletes-mock-data'
import { MockBanner } from '../_components/mock-ui'

export default function CoachHomeMobileMockPage() {
  const athletes = COACH_MOCK_ATHLETES
  const activeCount = athletes.filter((a) => a.status === 'Active').length
  const attentionCount = athletes.filter((a) => a.attention > 0).length
  const inboxBadge = athletes.reduce(
    (n, a) => n + a.activity.filter((m) => m.unread).length,
    0,
  )

  return (
    <div className="tt-mock min-h-dvh pb-8">
      <MockBanner title="Coach Home · Mobile" status="Review" />
      <div className="px-4 py-6">
        <div className="tt-mock-mobile-frame">
          <div className="flex items-center justify-between border-b border-[var(--tt-line)] px-4 py-3">
            <TrainTrackLogo
              markClassName="h-7 w-7"
              wordmarkClassName="!text-[0.85rem]"
            />
            <div className="flex items-center gap-2.5">
              <Link
                href="/design-mockups/athlete-home-mobile"
                className="rounded-md bg-[var(--tt-sidebar)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--tt-ink-soft)]"
              >
                Athlete
              </Link>
              <span className="rounded-md bg-[var(--tt-red)]/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--tt-red)]">
                Coach
              </span>
              <span className="relative">
                <MessageSquare className="h-4 w-4 text-[var(--tt-ink-soft)]" strokeWidth={1.75} />
                {inboxBadge > 0 ? (
                  <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[var(--tt-red)]" />
                ) : null}
              </span>
              <Menu className="h-5 w-5 text-[var(--tt-ink-soft)]" />
            </div>
          </div>

          <div className="px-4 py-5 pb-6">
            <p className="text-[0.8rem] font-medium uppercase tracking-[0.04em] leading-snug text-[var(--tt-ink-soft)]">
              Coach home
            </p>
            <h1 className="mt-1 text-[1.65rem] font-bold tracking-tight text-[var(--tt-ink)]">
              Athletes
            </h1>
            <p className="mt-1 text-[12px] text-[var(--tt-ink-soft)]">
              {activeCount} active · {attentionCount} need attention
            </p>

            <div className="mt-4">
              <CoachAttentionStack compact />
            </div>

            <div className="mb-2 mt-5">
              <p className="tt-mock-section-title">Roster</p>
            </div>
            <CoachAthletesMobileList athletes={athletes} />

            <p className="mt-3 text-center text-[9px] text-[var(--tt-ink-faint)]">
              Coaching code lives in Settings ·{' '}
              <Link href="/design-mockups/coach-home" className="text-[var(--tt-ink-soft)]">
                desktop
              </Link>
            </p>
          </div>

          <nav className="tt-mock-bottom-nav">
            {[
              { label: 'Athletes', Icon: Users, active: true },
              { label: 'Training', Icon: CalendarDays, active: false },
              { label: 'Inbox', Icon: MessageSquare, active: false },
              { label: 'Season', Icon: Flag, active: false },
              { label: 'More', Icon: Menu, active: false },
            ].map(({ label, Icon, active }) => (
              <a key={label} href="#mock" data-active={active}>
                <Icon className="h-4 w-4" strokeWidth={1.75} />
                {label}
              </a>
            ))}
          </nav>
        </div>

        <p className="mx-auto mt-4 max-w-[390px] text-[11px] leading-relaxed text-[var(--tt-ink-faint)]">
          Mobile Coach Home · expandable attention stack + roster. Same chat model as desktop.
        </p>
      </div>
    </div>
  )
}
