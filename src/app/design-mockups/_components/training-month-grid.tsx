'use client'

import { SeasonEventChips } from '@/components/plan/season-event-chips'
import {
  TABLE_BODY,
  TABLE_HEADER,
  TABLE_HEADER_CELL,
  TABLE_HEADER_CELL_MUTED,
  TABLE_HEADER_CELL_STRONG,
  TABLE_HEADER_CELL_WEEKEND,
  TABLE_HEADER_VLINE,
  TABLE_SHELL,
} from '@/lib/table-styles'
import { cn } from '@/lib/utils'
import {
  buildMockMonthDays,
  chunkMonthWeeks,
  mockWeekStats,
  workoutsForMonthDate,
  type MonthCalendarDay,
} from './training-mock-data'
import type { MonthLayerKey } from './training-toolbar'
import { WeekWorkoutBlock } from './week-workout-block'

export type { MonthLayerKey }

const DAY_NAMES = [
  { short: 'Mon', full: 'Monday' },
  { short: 'Tue', full: 'Tuesday' },
  { short: 'Wed', full: 'Wednesday' },
  { short: 'Thu', full: 'Thursday' },
  { short: 'Fri', full: 'Friday' },
  { short: 'Sat', full: 'Saturday' },
  { short: 'Sun', full: 'Sunday' },
] as const

function MonthWeekStats({ week }: { week: MonthCalendarDay[] }) {
  const stats = mockWeekStats(week)
  return (
    <div className="flex min-h-[7.5rem] flex-col gap-2 bg-[color-mix(in_oklab,var(--color-muted)_40%,var(--color-card))] p-2">
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
          <span className="text-[10px] font-bold uppercase tracking-wide text-foreground">
            {stats.weekLabel}
          </span>
          <span className="text-[10px] tabular-nums text-muted-foreground">{stats.rangeLabel}</span>
        </div>
        <p className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">
          <span className="font-semibold text-foreground">{stats.completed}</span>
          {' / '}
          {stats.planned} {stats.planned === 1 ? 'workout' : 'workouts'}
        </p>
      </div>

      {stats.sports.length > 0 ? (
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
          {stats.sports.map((s) => (
            <div key={s.name} className="flex min-w-0 items-center gap-1.5">
              <div className="flex w-[3.75rem] shrink-0 items-center gap-1">
                <span className="truncate text-[10px] font-semibold text-foreground">{s.name}</span>
              </div>
              <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-foreground/6">
                <div
                  className="h-full rounded-full transition-[width]"
                  style={{ width: `${s.pct}%`, background: s.color }}
                />
              </div>
              <span className="w-[4.75rem] shrink-0 text-right text-[9px] leading-none text-muted-foreground tabular-nums">
                <span className="font-semibold text-foreground">{s.actualLabel}</span>
                {' / '}
                {s.plannedLabel}
                {s.unit ? ` ${s.unit}` : ''}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground/60">No sessions</p>
      )}
    </div>
  )
}

function MonthDayCell({
  day,
  dayIndex,
  isWeekend,
  monthBoundary,
  showNotes,
  showEvents,
}: {
  day: MonthCalendarDay
  dayIndex: number
  isWeekend: boolean
  monthBoundary: boolean
  showNotes: boolean
  showEvents: boolean
}) {
  const workouts = workoutsForMonthDate(day.dateKey)
  const monthLabel = monthBoundary
    ? new Date(`${day.dateKey}T12:00:00`).toLocaleDateString(undefined, { month: 'long' })
    : null

  return (
    <div
      className={cn(
        'group/day flex min-h-[7.5rem] flex-col gap-1 p-1 transition-colors',
        isWeekend
          ? 'bg-[color-mix(in_oklab,var(--color-muted)_40%,var(--color-card))]'
          : 'bg-card',
        monthBoundary && dayIndex > 0 && 'border-l-[3px] border-l-foreground/35',
        day.isToday && 'ring-2 ring-inset ring-foreground/50',
      )}
    >
      <div className="flex items-start justify-between gap-0.5">
        <div
          className={cn(
            'min-w-0 px-1 text-left text-[11px] font-semibold tabular-nums',
            day.isToday ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          {monthLabel ? (
            <span className="inline-flex items-baseline gap-1">
              <span
                className={cn(
                  day.isToday &&
                    'inline-flex h-5 min-w-5 items-center justify-center rounded-[4px] bg-foreground px-1 text-[11px] font-bold text-background',
                )}
              >
                {day.dayNumber}
              </span>
              <span className="text-[10px] font-semibold tracking-wide text-foreground/70">
                {monthLabel}
              </span>
            </span>
          ) : day.isToday ? (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-[4px] bg-foreground px-1 text-[11px] font-bold text-background">
              {day.dayNumber}
            </span>
          ) : (
            day.dayNumber
          )}
        </div>
        <button
          type="button"
          className="inline-flex h-5 w-5 items-center justify-center rounded text-[12px] text-muted-foreground opacity-0 transition group-hover/day:opacity-100"
          aria-label="Add"
        >
          +
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1">
        {workouts.map((w) => (
          <WeekWorkoutBlock key={w.id} workout={w} size="s" />
        ))}

        {showEvents && day.event ? (
          <SeasonEventChips
            events={[
              {
                id: `ev-${day.dateKey}`,
                title: day.event,
                notes: null,
                startDate: new Date(`${day.dateKey}T12:00:00`),
                endDate: new Date(`${day.dateKey}T12:00:00`),
              },
            ]}
            variant="chip"
            className="gap-0.5"
          />
        ) : null}

        {showNotes && day.note ? (
          <p className="rounded-[var(--radius-workout)] border border-amber-200/70 bg-amber-50 px-1.5 py-1 text-[10px] font-medium leading-snug text-amber-950">
            {day.note}
          </p>
        ) : null}
      </div>
    </div>
  )
}

export function TrainingMonthGrid({
  monthSpan = 1,
  layers = { notes: true, events: true, stats: false },
}: {
  monthSpan?: 1 | 2 | 3
  layers?: Record<MonthLayerKey, boolean>
}) {
  const days = buildMockMonthDays(monthSpan)
  const weeks = chunkMonthWeeks(days)
  const showStats = layers.stats
  const gridCols = showStats
    ? 'grid-cols-[minmax(11rem,14rem)_repeat(7,minmax(0,1fr))]'
    : 'grid-cols-7'

  return (
    <div className={TABLE_SHELL}>
      <div className={cn('grid', gridCols, TABLE_HEADER)}>
        {showStats ? (
          <div
            className={cn(
              'flex items-center px-1.5 py-2 text-left text-[11px] font-semibold',
              TABLE_HEADER_VLINE,
              TABLE_HEADER_CELL_MUTED,
            )}
          >
            Stats
          </div>
        ) : null}
        {DAY_NAMES.map((name, i) => (
          <div
            key={name.full}
            className={cn(
              'flex items-center justify-center px-1 py-2 text-center text-[11px] font-semibold',
              i < 6 && TABLE_HEADER_VLINE,
              i >= 5 && TABLE_HEADER_CELL_WEEKEND,
              i >= 5 ? TABLE_HEADER_CELL : TABLE_HEADER_CELL_STRONG,
            )}
          >
            <span className="hidden sm:inline">{name.full}</span>
            <span className="sm:hidden">{name.short}</span>
          </div>
        ))}
      </div>

      <div className={cn('grid gap-px bg-border', gridCols, TABLE_BODY)}>
        {weeks.map((week, weekIndex) => (
          <div key={week[0]?.dateKey ?? weekIndex} className="contents">
            {showStats ? <MonthWeekStats week={week} /> : null}
            {week.map((day, dayInWeek) => {
              const dayIndex = weekIndex * 7 + dayInWeek
              const prevDay = dayIndex > 0 ? days[dayIndex - 1]! : null
              const monthBoundary =
                !prevDay || prevDay.dateKey.slice(0, 7) !== day.dateKey.slice(0, 7)

              return (
                <MonthDayCell
                  key={day.dateKey}
                  day={day}
                  dayIndex={dayIndex}
                  isWeekend={dayInWeek >= 5}
                  monthBoundary={monthBoundary}
                  showNotes={layers.notes}
                  showEvents={layers.events}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
