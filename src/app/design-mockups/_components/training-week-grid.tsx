'use client'

import { Clock } from 'lucide-react'
import { WeatherGlyph } from '@/components/weather/weather-glyph'
import { SeasonEventChips } from '@/components/plan/season-event-chips'
import {
  TRAINING_DAYS,
  TRAINING_SPORT_ROWS,
  TRAINING_WEEK_VOLUME_ACTUAL,
  TRAINING_WEEK_VOLUME_PLANNED,
  workoutsForSportDay,
} from './training-mock-data'
import type { WeekCardSize } from './training-toolbar'
import { WeekSportLabel, WeekWorkoutBlock } from './week-workout-block'

/**
 * Production week weather cell: Morning / Day / Evening labels,
 * glyph, temp + precip under.
 */
function WeatherCell({
  morning,
  day,
  evening,
  morningGlyph = 'partly-cloudy-day',
  dayGlyph = 'partly-cloudy-day',
  eveningGlyph = 'partly-cloudy-night',
  morningPrecip,
  dayPrecip,
  eveningPrecip,
}: {
  morning: string
  day: string
  evening: string
  morningGlyph?: string
  dayGlyph?: string
  eveningGlyph?: string
  morningPrecip?: string
  dayPrecip?: string
  eveningPrecip?: string
}) {
  const slots = [
    { label: 'Morning', temp: morning, glyph: morningGlyph, precip: morningPrecip },
    { label: 'Day', temp: day, glyph: dayGlyph, precip: dayPrecip },
    { label: 'Evening', temp: evening, glyph: eveningGlyph, precip: eveningPrecip },
  ] as const

  return (
    <div className="grid grid-cols-3 items-stretch">
      {slots.map((slot) => (
        <div
          key={slot.label}
          className="flex min-h-[4.7rem] flex-col items-center justify-between px-0.5 py-0.5 text-[10px]"
          title={`${slot.label} ${slot.temp}${slot.precip ? ` ${slot.precip}` : ''}`}
        >
          <span className="text-[9px] uppercase tracking-wide text-muted-foreground/80">
            {slot.label}
          </span>
          <span className="flex items-center justify-center">
            <WeatherGlyph
              glyph={slot.glyph}
              detail={`${slot.label} ${slot.temp}${slot.precip ? ` ${slot.precip}` : ''}`}
              className="h-9 w-9"
            />
          </span>
          <span className="text-center text-[10px] leading-none text-foreground/80 tabular-nums">
            {slot.temp}
            <br />
            <span className="text-[9px] text-muted-foreground">{slot.precip || '\u00A0'}</span>
          </span>
        </div>
      ))}
    </div>
  )
}

function LayerLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="tt-mock-week-cell tt-mock-week-layer tt-mock-week-layer-label !min-h-0 px-3 py-2 text-left align-top text-[10px] font-medium text-muted-foreground">
      {children}
    </div>
  )
}

function LayerCell({
  today,
  weekend,
  children,
  className = '',
}: {
  today?: boolean
  weekend?: boolean
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`tt-mock-week-cell tt-mock-week-layer !min-h-0 p-1.5 ${className}`}
      data-today={today}
      data-weekend={weekend || undefined}
    >
      {children}
    </div>
  )
}

/** Coach day-note — owner slightly stronger than body (matches event subheader). */
function NoteChip({ text }: { text: string }) {
  return (
    <p className="min-w-0 whitespace-pre-wrap break-words text-xs font-normal leading-snug text-amber-950/80">
      <span className="font-medium text-amber-950">Coach · </span>
      <span className="font-normal">{text}</span>
    </p>
  )
}

export function TrainingWeekGrid({
  dense = false,
  cardSize = 'm',
  layers = { weather: true, notesEvents: true },
}: {
  dense?: boolean
  cardSize?: WeekCardSize
  layers?: { weather: boolean; notesEvents: boolean }
}) {
  return (
    <div
      className={`tt-mock-week tt-mock-week-rich ${dense ? 'tt-mock-week-dense' : ''}`}
      data-card-size={cardSize}
    >
      <div className="tt-mock-week-cell tt-mock-week-corner flex items-center px-3 py-2">
        <p className="text-[10px] font-medium text-[#8a8a8a]">Sport</p>
      </div>
      {TRAINING_DAYS.map((d) => (
        <div
          key={d.dayIndex}
          className="tt-mock-week-cell tt-mock-week-dayhead flex flex-col items-center justify-center px-1 py-2 text-center"
          data-today={d.today}
          data-weekend={d.dayIndex >= 5 || undefined}
        >
          <p
            className={`text-[11px] leading-tight ${
              d.today ? 'font-semibold text-white' : 'font-medium text-white/80'
            }`}
          >
            {dense ? d.short : d.weekday}
          </p>
          <p
            className={`mt-0.5 text-[11px] tabular-nums ${
              d.today ? 'font-medium text-white/90' : 'text-white/45'
            }`}
          >
            {d.dateNum} Aug
          </p>
        </div>
      ))}

      {layers.weather ? (
        <>
          <LayerLabel>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span>Weather</span>
              <span className="truncate font-normal leading-tight text-muted-foreground/80">
                Moletai
              </span>
            </div>
          </LayerLabel>
          {TRAINING_DAYS.map((d) => (
            <LayerCell
              key={`wx-${d.dayIndex}`}
              today={d.today}
              weekend={d.dayIndex >= 5}
            >
              {d.weather ? <WeatherCell {...d.weather} /> : null}
            </LayerCell>
          ))}
        </>
      ) : null}

      {TRAINING_SPORT_ROWS.map((sport) => (
        <div key={sport.id} className="contents">
          <div className="tt-mock-week-cell tt-mock-week-label !bg-transparent !p-0">
            <WeekSportLabel
              name={sport.name}
              color={sport.color}
              sport={sport.id}
              weekDistancePlanned={sport.weekDistancePlanned}
              weekDistanceActual={sport.weekDistanceActual}
              weekDurationPlanned={sport.weekDurationPlanned}
              weekDurationActual={sport.weekDurationActual}
            />
          </div>
          {TRAINING_DAYS.map((d) => {
            const cells = workoutsForSportDay(sport.id, d.dayIndex)
            return (
              <div
                key={`${sport.id}-${d.dayIndex}`}
                className="tt-mock-week-cell"
                data-today={d.today}
                data-weekend={d.dayIndex >= 5 || undefined}
              >
                {cells.length === 0 ? (
                  <button
                    type="button"
                    className="flex h-full min-h-[3.25rem] w-full items-center justify-center text-[13px] text-[var(--tt-ink-faint)] opacity-0 transition hover:opacity-100"
                    aria-label={`Add ${sport.name} on ${d.short}`}
                  >
                    +
                  </button>
                ) : (
                  <div className="space-y-1">
                    {cells.map((w) => (
                      <WeekWorkoutBlock key={w.id} workout={w} size={cardSize} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}

      {layers.notesEvents ? (
        <>
          <LayerLabel>Notes · Events</LayerLabel>
          {TRAINING_DAYS.map((d) => {
            const showEvent = Boolean(d.event)
            const showNote = Boolean(d.note)
            const filled = showEvent || showNote
            return (
              <LayerCell
                key={`note-ev-${d.dayIndex}`}
                today={d.today}
                weekend={d.dayIndex >= 5}
                className={
                  filled
                    ? '!bg-amber-50 !px-2 !py-2 dark:!bg-amber-500/15'
                    : '!p-1'
                }
              >
                {filled ? (
                  <div className="flex flex-col">
                    {showEvent ? (
                      <SeasonEventChips
                        events={[
                          {
                            id: `mock-ev-${d.dayIndex}`,
                            title: d.event!,
                            notes: null,
                            startDate: new Date(2026, 7, d.dateNum),
                            endDate: new Date(2026, 7, d.dateNum),
                          },
                        ]}
                        variant="cell"
                      />
                    ) : null}
                    {showNote ? (
                      <div
                        className={
                          showEvent
                            ? 'mt-2 border-t border-amber-950/12 pt-2 dark:border-amber-100/15'
                            : undefined
                        }
                      >
                        <NoteChip text={d.note!} />
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </LayerCell>
            )
          })}
        </>
      ) : null}

      <div className="tt-mock-week-cell tt-mock-week-label !min-h-0 px-2 py-2.5">
        <p className="tt-mock-caption !text-[10px] !font-medium">Weekly volume</p>
        <div className="mt-1.5 flex min-w-0 items-center gap-1 text-[9px] leading-none text-muted-foreground tabular-nums">
          <Clock className="h-2.5 w-2.5 shrink-0 opacity-60" strokeWidth={2.25} />
          <span
            className="min-w-0 truncate whitespace-nowrap"
            title={`${TRAINING_WEEK_VOLUME_ACTUAL} / ${TRAINING_WEEK_VOLUME_PLANNED}`}
          >
            <span className="font-semibold text-foreground">{TRAINING_WEEK_VOLUME_ACTUAL}</span>
            <span className="opacity-50"> / </span>
            <span>{TRAINING_WEEK_VOLUME_PLANNED}</span>
          </span>
        </div>
      </div>
      {TRAINING_DAYS.map((d) => (
        <div
          key={`vol-${d.dayIndex}`}
          className="tt-mock-week-cell !min-h-0 py-2"
          data-today={d.today}
          data-weekend={d.dayIndex >= 5 || undefined}
        >
          <button
            type="button"
            className="flex h-7 w-full items-center justify-center text-[14px] text-[var(--tt-ink-faint)] opacity-40 transition hover:opacity-100"
            aria-label={`Add on ${d.short}`}
          >
            +
          </button>
        </div>
      ))}
    </div>
  )
}
