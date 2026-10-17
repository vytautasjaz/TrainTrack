'use client'

import { format } from 'date-fns'
import { PlanDayAddMenu } from '@/components/plan/plan-day-add-menu'
import { DayMetaBlock } from '@/components/plan/day-meta-lines'
import { ListDayWeatherMini } from '@/components/weather/list-day-weather'
import { WeatherDayHoursTrigger } from '@/components/weather/weather-day-hours-trigger'
import { SameDayWorkoutStack } from '@/components/plan/same-day-workout-stack'
import { useDayDropTarget } from '@/components/plan/use-day-drop-target'
import { HomeWeekMobile } from '@/components/dashboard/v2/home-week-mobile'
import {
  HomeWeekRestCard,
  HomeWeekSessionCard,
} from '@/components/dashboard/v2/home-week-session-card'
import type { DayNoteData } from '@/lib/day-notes'
import type { PlanDay } from '@/lib/plan-week'
import { cn } from '@/lib/utils'
import { isRestLike } from '@/components/dashboard/v2/home-week-utils'
import {
  formatWeatherPrecip,
  type WeatherDaySummary,
} from '@/lib/weather/places'

function dayHasWeatherData(weather?: WeatherDaySummary | null) {
  return Boolean(
    weather?.slots.some(
      (slot) => slot.temperatureC != null || Boolean(formatWeatherPrecip(slot)),
    ),
  )
}

export function HomeWeekGrid({
  days,
  weekLabel,
  weatherLocationName = null,
  surface = 'all',
  onNoteChange,
}: {
  days: PlanDay[]
  /** Optional range label above the 7-day grid (used for expanded weeks). */
  weekLabel?: string
  weatherLocationName?: string | null
  /** `desktop` / `mobile` for carousel slides that already split by breakpoint. */
  surface?: 'all' | 'desktop' | 'mobile'
  onNoteChange?: (dateKey: string, note: DayNoteData | null) => void
}) {
  const showMobile = surface === 'all' || surface === 'mobile'
  const showDesktop = surface === 'all' || surface === 'desktop'

  return (
    <div className="pb-1">
      {weekLabel ? (
        <p className="tt-v2-eyebrow mb-2 text-[var(--tt-v2-light-ink-faint)] md:px-[calc(var(--tt-v2-grid-size)*0.25)]">
          {weekLabel}
        </p>
      ) : null}

      {/* Mobile — Today as cards, upcoming as stacked list (same v2 card chrome) */}
      {showMobile ? (
        <div className={surface === 'mobile' ? undefined : 'md:hidden'}>
          <HomeWeekMobile
            days={days}
            listOnly={Boolean(weekLabel)}
            weatherLocationName={weatherLocationName}
          />
        </div>
      ) : null}

      {/* Desktop — 7-day week board */}
      {showDesktop ? (
        <div
          className={
            surface === 'desktop'
              ? /* visible: Mon/Sun today frame extends into side-gap */
                'overflow-x-visible'
              : 'hidden overflow-x-visible md:block'
          }
        >
          <div className="tt-v2-week-days">
            {days.map((day) => (
              <HomeWeekDayColumn
                key={day.dateKey}
                day={day}
                weatherLocationName={weatherLocationName}
                onNoteChange={onNoteChange}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function HomeWeekDayColumn({
  day,
  weatherLocationName = null,
  onNoteChange,
}: {
  day: PlanDay
  weatherLocationName?: string | null
  onNoteChange?: (dateKey: string, note: DayNoteData | null) => void
}) {
  const labelDate = new Date(
    Number(day.dateKey.slice(0, 4)),
    Number(day.dateKey.slice(5, 7)) - 1,
    Number(day.dateKey.slice(8, 10)),
  )
  const sessions = day.workouts.filter((w) => !w.isRescheduleGhost)
  const hasWeather = dayHasWeatherData(day.weather)
  const { dropHighlightClass, dropProps } = useDayDropTarget({
    dateKey: day.dateKey,
  })

  return (
    <div
      className={cn(
        'tt-v2-day-column group/day flex w-full flex-col',
        dropHighlightClass,
      )}
      data-today={day.isToday ? 'true' : undefined}
      data-plan-day-section={day.dateKey}
      {...dropProps}
    >
      <div className="mb-1.5 flex items-center justify-between gap-1 px-0.5">
        <div className="flex min-w-0 items-baseline gap-1.5">
          <p
            className="tt-v2-day-label text-[12px] font-semibold uppercase tracking-[0.04em]"
            data-today={day.isToday ? 'true' : undefined}
          >
            {format(labelDate, 'EEE')}
          </p>
          <p className="text-[12px] tabular-nums text-[var(--tt-v2-light-ink-faint)]">
            {format(labelDate, 'd')}
          </p>
        </div>
        <div className="tt-v2-day-add shrink-0">
          <PlanDayAddMenu
            dateKey={day.dateKey}
            isCoach={false}
            canAddNote
            dayNote={day.dayNote}
            revealOnHover
            menuPlacement="bottom"
            onNoteChange={onNoteChange}
          />
        </div>
      </div>

      {hasWeather && day.weather ? (
        <WeatherDayHoursTrigger
          weather={day.weather}
          locationName={weatherLocationName}
          className="mb-1.5 px-0.5"
        >
          <ListDayWeatherMini weather={day.weather} layout="row" />
        </WeatherDayHoursTrigger>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col gap-1.5">
        {sessions.length > 0 ? (
          <SameDayWorkoutStack
            dateKey={day.dateKey}
            workouts={sessions}
            enabled
            className="flex flex-col gap-1.5"
            renderItem={(workout, meta) =>
              isRestLike(workout) ? (
                <HomeWeekRestCard
                  note={
                    workout.coachNotes?.trim() ||
                    workout.description?.trim() ||
                    workout.title ||
                    'Recovery, mobility and good sleep.'
                  }
                />
              ) : (
                <HomeWeekSessionCard
                  workout={workout}
                  stackDragging={meta.isDragging}
                />
              )
            }
          />
        ) : null}

        <DayMetaBlock
          dateKey={day.dateKey}
          events={day.seasonEvents}
          note={day.dayNote}
          onNoteChange={onNoteChange}
        />
      </div>
    </div>
  )
}
