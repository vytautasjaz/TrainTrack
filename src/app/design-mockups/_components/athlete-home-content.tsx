import { ChevronRight } from 'lucide-react'
import { SportIcon } from './mock-ui'
import { WeekStatsMock } from './week-stats-mock'
import { NextRacesMock } from './next-races-mock'
import { TrainingLoadMock } from './training-load-mock'
import { TodayWeatherStrip, DayWeatherMini } from './today-weather-strip'
import { MockCalendarDate } from './mock-calendar-date'
import { PrescriptionWorkoutCard } from './prescription-workout-card'
import {
  ATHLETE_HOME_LAST_WEEK,
  ATHLETE_HOME_NEXT_WEEK,
  ATHLETE_HOME_TODAY,
  ATHLETE_HOME_UPCOMING_THIS_WEEK,
  type AthleteHomeUpcomingRow,
} from './athlete-home-mock-data'

function UpcomingRow({ row }: { row: AthleteHomeUpcomingRow }) {
  const done = row.status === 'done'
  const skipped = row.status === 'skipped'
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <MockCalendarDate
        weekday={row.weekday}
        dateNum={row.dateNum}
        month={row.month}
      />
      <div className="flex min-w-0 flex-1 items-center gap-3 pl-1">
        <SportIcon sport={row.sport} />
        <div className="min-w-0 flex-1">
          <p
            className={`tt-mock-h3 !font-semibold !leading-snug ${
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
}

function UpcomingSection({
  title,
  rows,
  linkLabel,
}: {
  title: string
  rows: AthleteHomeUpcomingRow[]
  linkLabel?: string
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <p className="tt-mock-section-title">{title}</p>
        {linkLabel ? (
          <span className="tt-mock-overline !text-[var(--tt-ink-soft)]">{linkLabel}</span>
        ) : null}
      </div>
      <div className="tt-mock-card divide-y divide-[#f0f0f0] overflow-hidden">
        {rows.map((row) => (
          <UpcomingRow key={`${row.weekday}-${row.dateNum}-${row.title}`} row={row} />
        ))}
      </div>
    </section>
  )
}

export function AthleteHomeContent() {
  return (
    <>
      <div className="mb-7">
        <p className="tt-mock-caption !text-[0.8rem] !font-medium uppercase !tracking-[0.04em] !leading-snug">
          Good Morning,{' '}
          <span className="font-semibold !text-[var(--tt-ink)]">Vytautas</span>
        </p>
      </div>

      <div className="tt-mock-grid-home">
        <div className="space-y-7">
          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="tt-mock-section-title">Today</p>
              <TodayWeatherStrip />
            </div>
            <div className="space-y-2.5">
              {ATHLETE_HOME_TODAY.map((w) => (
                <PrescriptionWorkoutCard key={w.id} workout={w} size="l" />
              ))}
            </div>
          </section>

          <UpcomingSection
            title="Last week"
            rows={ATHLETE_HOME_LAST_WEEK}
          />

          <UpcomingSection
            title="Upcoming"
            rows={ATHLETE_HOME_UPCOMING_THIS_WEEK}
            linkLabel="View plan →"
          />

          <UpcomingSection
            title="Next week"
            rows={ATHLETE_HOME_NEXT_WEEK}
          />
        </div>

        <aside>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3" aria-hidden>
            <p className="tt-mock-section-title invisible select-none">Today</p>
            <div className="invisible pointer-events-none">
              <TodayWeatherStrip />
            </div>
          </div>
          <div className="space-y-3 lg:sticky lg:top-4">
            <NextRacesMock />
            <WeekStatsMock />
            <TrainingLoadMock />
          </div>
        </aside>
      </div>
    </>
  )
}
