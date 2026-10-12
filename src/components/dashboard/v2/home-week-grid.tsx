'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Calendar, StickyNote } from 'lucide-react'
import { DayNoteModal } from '@/components/plan/day-note-modal'
import { SeasonEventDetailSheet } from '@/components/plan/season-event-detail-sheet'
import { PlanDayAddMenu } from '@/components/plan/plan-day-add-menu'
import { ListDayWeatherMini } from '@/components/weather/list-day-weather'
import { WeatherDayHoursTrigger } from '@/components/weather/weather-day-hours-panel'
import { SameDayWorkoutStack } from '@/components/plan/same-day-workout-stack'
import { useDayDropTarget } from '@/components/plan/use-day-drop-target'
import { HomeWeekMobile } from '@/components/dashboard/v2/home-week-mobile'
import {
  HomeWeekRestCard,
  HomeWeekSessionCard,
} from '@/components/dashboard/v2/home-week-session-card'
import {
  DAY_NOTE_UNAVAILABLE_LABEL,
  dayNoteHasVisibleContent,
  getDayNoteKindText,
  isDayNoteUnavailable,
  type DayNoteData,
  type DayNoteKind,
} from '@/lib/day-notes'
import type { PlanDay } from '@/lib/plan-week'
import {
  formatSeasonEventLabel,
  type SeasonEventData,
} from '@/lib/season-planner'
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
  const events = day.seasonEvents ?? []
  const hasDayNote = dayNoteHasVisibleContent(day.dayNote)
  const hasWeather = dayHasWeatherData(day.weather)
  const hasMeta = events.length > 0 || hasDayNote
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

        {hasMeta ? (
          <div className="mt-auto space-y-0.5 px-0.5 pt-1.5">
            {events.map((event) => (
              <DayMetaEventLine key={event.id} event={event} />
            ))}
            {hasDayNote && day.dayNote ? (
              <DayMetaNoteLines
                dateKey={day.dateKey}
                note={day.dayNote}
                onNoteChange={onNoteChange}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function dayMetaLineClass() {
  return cn(
    'flex w-full min-w-0 items-start gap-1 text-left',
    'text-[11px] leading-snug text-[var(--tt-v2-light-ink-faint)]',
    'transition hover:text-[var(--tt-v2-light-ink-soft)]',
  )
}

function DayMetaEventLine({ event }: { event: SeasonEventData }) {
  const [open, setOpen] = useState(false)
  const fromCoach = event.createdByRole === 'COACH'
  return (
    <>
      <button
        type="button"
        className={dayMetaLineClass()}
        onClick={() => setOpen(true)}
        title={formatSeasonEventLabel(event)}
      >
        <Calendar
          className={cn(
            'mt-0.5 h-2.5 w-2.5 shrink-0',
            fromCoach
              ? 'fill-[#d5dae0] text-[#9aa3ad]'
              : 'opacity-70',
          )}
          strokeWidth={fromCoach ? 1.75 : 2}
          aria-hidden
        />
        <span className="min-w-0 truncate">
          {formatSeasonEventLabel(event)}
        </span>
      </button>
      <SeasonEventDetailSheet
        event={event}
        open={open}
        onOpenChange={setOpen}
        editable
        isCoach={false}
      />
    </>
  )
}

function DayMetaNoteLines({
  dateKey,
  note,
  onNoteChange,
}: {
  dateKey: string
  note: DayNoteData
  onNoteChange?: (dateKey: string, note: DayNoteData | null) => void
}) {
  const athleteText = getDayNoteKindText(note, 'athlete')
  const coachText = getDayNoteKindText(note, 'coach')
  const unavailable = isDayNoteUnavailable(note.status)
  const rows: Array<{
    key: string
    kind: DayNoteKind
    text: string
    readOnly: boolean
    unavailable?: boolean
  }> = []
  if (unavailable) {
    rows.push({
      key: 'athlete-unavailable',
      kind: 'athlete',
      text: DAY_NOTE_UNAVAILABLE_LABEL,
      readOnly: false,
      unavailable: true,
    })
  }
  if (athleteText) {
    rows.push({
      key: 'athlete',
      kind: 'athlete',
      text: athleteText,
      readOnly: false,
    })
  }
  if (coachText) {
    rows.push({
      key: 'coach',
      kind: 'coach',
      text: coachText,
      readOnly: true,
    })
  }

  return (
    <div className="flex w-full flex-col gap-0.5">
      {rows.map((row) => (
        <DayMetaNoteLine
          key={row.key}
          dateKey={dateKey}
          note={note}
          kind={row.kind}
          text={row.text}
          readOnly={row.readOnly}
          unavailable={row.unavailable}
          onNoteChange={onNoteChange}
        />
      ))}
    </div>
  )
}

function DayMetaNoteLine({
  dateKey,
  note,
  kind,
  text,
  readOnly,
  unavailable = false,
  onNoteChange,
}: {
  dateKey: string
  note: DayNoteData
  kind: DayNoteKind
  text: string
  readOnly: boolean
  unavailable?: boolean
  onNoteChange?: (dateKey: string, note: DayNoteData | null) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        className={cn(
          dayMetaLineClass(),
          unavailable && 'text-brand hover:text-brand/80',
        )}
        onClick={() => setOpen(true)}
        title={text}
      >
        <StickyNote
          className={cn(
            'mt-0.5 h-2.5 w-2.5 shrink-0',
            unavailable
              ? 'text-brand opacity-90'
              : kind === 'coach'
                ? 'fill-[#d5dae0] text-[#9aa3ad]'
                : 'opacity-70',
          )}
          strokeWidth={kind === 'coach' && !unavailable ? 1.75 : 2}
          aria-hidden
        />
        <span
          className={cn(
            'min-w-0 whitespace-pre-wrap break-words text-left',
            unavailable && 'font-medium italic',
          )}
        >
          {text}
        </span>
      </button>
      <DayNoteModal
        dateKey={dateKey}
        note={note}
        noteKind={kind}
        readOnly={readOnly}
        open={open}
        onOpenChange={setOpen}
        onNoteChange={onNoteChange}
      />
    </>
  )
}
