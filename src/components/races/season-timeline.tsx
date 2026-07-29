'use client'

import type { MutableRefObject } from 'react'
import Link from 'next/link'
import { Circle, Star } from 'lucide-react'
import type { SeasonMonth, SeasonRace, SeasonWeekTick } from '@/lib/season-races'
import { raceDistanceLabel, rangeProgress, weeksUntil } from '@/lib/season-races'
import { priorityMarkerSurfaceClass } from '@/components/races/priority-badge'
import { daysUntil, cn } from '@/lib/utils'

type RaceMarkerProps = {
  race: SeasonRace
  leftPercent: number
  showWeekCountdown: boolean
  suppressNavigationRef?: MutableRefObject<boolean>
  className?: string
}

export function RaceMarker({
  race,
  leftPercent,
  showWeekCountdown,
  suppressNavigationRef,
  className,
}: RaceMarkerProps) {
  const dateLabel = race.date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
  const isWatching = race.intent === 'WATCHING'
  const markerSurface = isWatching
    ? 'border border-dashed border-muted-foreground/55 bg-card text-muted-foreground group-hover:border-muted-foreground'
    : cn('border group-hover:brightness-[0.97]', priorityMarkerSurfaceClass(race.priority))
  const days = daysUntil(race.date)
  const weeks = weeksUntil(race.date)
  const countdownLabel =
    days < 0
      ? `${Math.abs(weeks)}w ago`
      : days === 0
        ? 'Today'
        : `${weeks}w · ${days}d`

  return (
    <Link
      href={`/races/${race.id}/edit`}
      title={`${race.name} · ${dateLabel}${isWatching ? ' · Watching' : ''}`}
      draggable={false}
      onClick={(event) => {
        if (suppressNavigationRef?.current) {
          event.preventDefault()
          event.stopPropagation()
        }
      }}
      className={cn(
        'group absolute top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center',
        className,
      )}
      style={{ left: `${leftPercent}%` }}
    >
      <span
        className={cn(
          'flex h-7 w-7 items-center justify-center rounded-full transition',
          'group-hover:scale-110',
          markerSurface,
        )}
      >
        {isWatching ? (
          <Circle className="h-2.5 w-2.5" strokeWidth={2} />
        ) : race.priority === 'A' ? (
          <Star className="h-3.5 w-3.5 fill-current" strokeWidth={1.75} />
        ) : (
          <Circle className="h-2.5 w-2.5 fill-current" strokeWidth={2.5} />
        )}
      </span>
      <span className="pointer-events-none absolute top-[calc(100%+0.5rem)] w-28 text-center">
        <span
          className={cn(
            'block truncate text-[11px] font-semibold',
            isWatching ? 'text-muted-foreground' : 'text-foreground',
          )}
        >
          {race.name}
        </span>
        {showWeekCountdown ? (
          <span className="block truncate text-[10px] font-medium tabular-nums text-foreground/80">
            {countdownLabel}
          </span>
        ) : (
          <span className="block truncate text-[10px] text-muted-foreground">
            {raceDistanceLabel(race.type)}
          </span>
        )}
      </span>
    </Link>
  )
}

type SeasonTimelineProps = {
  months: SeasonMonth[]
  races: SeasonRace[]
  rangeStart: Date
  rangeEnd: Date
  today: Date
  weekTicks?: SeasonWeekTick[]
  showWeekTicks?: boolean
  showWeekCountdown?: boolean
  suppressNavigationRef?: MutableRefObject<boolean>
  className?: string
}

export function SeasonTimeline({
  months,
  races,
  rangeStart,
  rangeEnd,
  today,
  weekTicks = [],
  showWeekTicks = false,
  showWeekCountdown = false,
  suppressNavigationRef,
  className,
}: SeasonTimelineProps) {
  const todayLeft = rangeProgress(today, rangeStart, rangeEnd) * 100
  const showToday = todayLeft > 0 && todayLeft < 100

  return (
    <div className={cn('relative select-none pt-1', className)}>
      <div
        className="grid text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
        style={{ gridTemplateColumns: `repeat(${months.length}, minmax(0, 1fr))` }}
      >
        {months.map((month, index) => {
          const prev = months[index - 1]
          const showYear = !prev || prev.year !== month.year
          return (
            <span key={month.key} className="relative min-h-[2.25rem] truncate px-0.5">
              {month.label}
              {showYear && (
                <span className="mt-0.5 block text-[11px] font-semibold normal-case tracking-tight text-foreground">
                  {month.year}
                </span>
              )}
            </span>
          )
        })}
      </div>

      {showWeekTicks && weekTicks.length > 0 && (
        <div className="relative mt-1 h-3">
          {weekTicks.map((week) => {
            const left = rangeProgress(week.start, rangeStart, rangeEnd) * 100
            if (left <= 0 || left >= 100) return null
            return (
              <span
                key={week.key}
                className="absolute top-0 -translate-x-1/2 text-[9px] tabular-nums text-muted-foreground/80"
                style={{ left: `${left}%` }}
              >
                {week.label}
              </span>
            )
          })}
        </div>
      )}

      <div className={cn('relative h-7', showWeekTicks ? 'mt-1' : 'mt-3')}>
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
        {showWeekTicks &&
          weekTicks.map((week) => {
            const left = rangeProgress(week.start, rangeStart, rangeEnd) * 100
            if (left <= 0 || left >= 100) return null
            return (
              <span
                key={`tick-${week.key}`}
                className="absolute top-1/2 z-[1] h-2.5 w-px -translate-x-1/2 -translate-y-1/2 bg-border"
                style={{ left: `${left}%` }}
                aria-hidden
              />
            )
          })}
        <div className="absolute inset-x-0 top-1/2 h-8 -translate-y-1/2" aria-hidden />
        {showToday && (
          <div
            className="pointer-events-none absolute top-1/2 z-[5] h-10 w-px -translate-x-1/2 -translate-y-1/2 bg-foreground/45"
            style={{ left: `${todayLeft}%` }}
            title="Today"
            aria-hidden
          >
            <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
              Today
            </span>
          </div>
        )}
        {races.map((race) => (
          <RaceMarker
            key={race.id}
            race={race}
            leftPercent={rangeProgress(race.date, rangeStart, rangeEnd) * 100}
            showWeekCountdown={showWeekCountdown}
            suppressNavigationRef={suppressNavigationRef}
          />
        ))}
      </div>

      <div className={cn(showWeekCountdown ? 'h-14' : 'h-12')} aria-hidden />
    </div>
  )
}
