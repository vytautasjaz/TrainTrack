import {
  CalendarDays,
  ChevronRight,
  Flag,
  Home,
  Menu,
  MessageSquare,
} from 'lucide-react'
import { TrainTrackLogo } from '@/components/brand/traintrack-logo'
import { MockBanner, SportIcon } from '../_components/mock-ui'
import { MockNotificationsBell } from '../_components/mock-notifications-bell'
import { WeekStatsMock } from '../_components/week-stats-mock'
import { NextRacesMock } from '../_components/next-races-mock'
import { TrainingLoadMock } from '../_components/training-load-mock'
import { TodayWeatherStrip, DayWeatherMini } from '../_components/today-weather-strip'
import { MockCalendarDate } from '../_components/mock-calendar-date'
import { PrescriptionWorkoutCard } from '../_components/prescription-workout-card'
import {
  ATHLETE_HOME_LAST_WEEK,
  ATHLETE_HOME_NEXT_WEEK,
  ATHLETE_HOME_TODAY,
  ATHLETE_HOME_UPCOMING_THIS_WEEK,
  type AthleteHomeUpcomingRow,
} from '../_components/athlete-home-mock-data'

function MobileUpcomingBlock({
  title,
  rows,
}: {
  title: string
  rows: AthleteHomeUpcomingRow[]
}) {
  return (
    <>
      <p className="tt-mock-section-title mt-5 mb-2">{title}</p>
      <div className="tt-mock-card divide-y divide-[var(--tt-line)]">
        {rows.map((row) => {
          const done = row.status === 'done'
          const skipped = row.status === 'skipped'
          return (
            <div
              key={`${row.weekday}-${row.dateNum}-${row.title}`}
              className="flex items-center gap-2.5 px-3 py-2.5"
            >
              <MockCalendarDate
                weekday={row.weekday}
                dateNum={row.dateNum}
                month={row.month}
                compact
              />
              <div className="flex min-w-0 flex-1 items-center gap-2 pl-0.5">
                <SportIcon sport={row.sport} />
                <div className="min-w-0 flex-1">
                  <p
                    className={`tt-mock-h3 !text-[0.875rem] !font-semibold !leading-snug ${
                      done
                        ? '!text-[var(--tt-good)]'
                        : skipped
                          ? '!text-[var(--tt-ink-faint)] line-through'
                          : ''
                    }`}
                  >
                    {row.title}
                  </p>
                  <p
                    className={`tt-mock-caption mt-0.5 ${
                      done
                        ? '!text-[var(--tt-good)]/80'
                        : skipped
                          ? '!text-[var(--tt-ink-faint)]'
                          : ''
                    }`}
                  >
                    {row.prescription}
                    {skipped ? ' · Skipped' : done ? ' · Done' : ''}
                  </p>
                </div>
              </div>
              <DayWeatherMini {...row.weather} />
              <ChevronRight className="h-4 w-4 shrink-0 text-[var(--tt-ink-faint)]" />
            </div>
          )
        })}
      </div>
    </>
  )
}

export default function AthleteHomeMobileMockPage() {
  return (
    <div className="tt-mock min-h-dvh pb-8">
      <MockBanner title="Athlete Home · Mobile" status="Review" />
      <div className="px-4 py-6">
        <div className="tt-mock-mobile-frame">
          <div className="flex items-center justify-between border-b border-[var(--tt-line)] px-4 py-3">
            <TrainTrackLogo
              markClassName="h-7 w-7"
              wordmarkClassName="!text-[0.85rem]"
            />
            <div className="flex items-center gap-2">
              <MockNotificationsBell />
              <Menu className="h-5 w-5 text-[var(--tt-ink-soft)]" />
            </div>
          </div>

          <div className="px-4 py-5">
            <p className="tt-mock-caption !text-[0.8rem] !font-medium uppercase !tracking-[0.04em] !leading-snug">
              Good Morning,{' '}
              <span className="font-semibold !text-[var(--tt-ink)]">Vytautas</span>
            </p>

            <div className="mt-5 mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="tt-mock-section-title">Today</p>
              <TodayWeatherStrip compact />
            </div>
            <div className="space-y-2">
              {ATHLETE_HOME_TODAY.map((w) => (
                <PrescriptionWorkoutCard key={w.id} workout={w} size="m" />
              ))}
            </div>

            <MobileUpcomingBlock title="Last week" rows={ATHLETE_HOME_LAST_WEEK} />
            <MobileUpcomingBlock
              title="Upcoming"
              rows={ATHLETE_HOME_UPCOMING_THIS_WEEK}
            />
            <p className="tt-mock-overline mt-2 inline-block !text-[var(--tt-ink-soft)]">
              View plan →
            </p>
            <MobileUpcomingBlock title="Next week" rows={ATHLETE_HOME_NEXT_WEEK} />

            <div className="mt-5">
              <NextRacesMock compact />
            </div>

            <div className="mt-3">
              <WeekStatsMock compact />
            </div>

            <div className="mt-3">
              <TrainingLoadMock compact />
            </div>
          </div>

          <nav className="tt-mock-bottom-nav">
            {[
              { label: 'Home', Icon: Home, active: true },
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
          Mobile Home mock · richer last / next week + 5 races for review.
        </p>
      </div>
    </div>
  )
}
