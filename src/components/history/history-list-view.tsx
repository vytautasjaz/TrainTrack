'use client'

import { format } from 'date-fns'
import type { WorkoutHistoryItem } from '@/lib/workout-history'
import { HistoryWorkoutCard } from '@/components/history/history-workout-card'
import { cn } from '@/lib/utils'

type HistoryDay = {
  date: Date
  dateKey: string
  dayLabel: string
  dateLabel: string
  isToday: boolean
}

type HistoryListViewProps = {
  days: HistoryDay[]
  byDate: Map<string, WorkoutHistoryItem[]>
  isCoach: boolean
}

export function HistoryListView({ days, byDate, isCoach }: HistoryListViewProps) {
  const hasAny = days.some((day) => (byDate.get(day.dateKey) ?? []).length > 0)

  if (!hasAny) {
    return (
      <p className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
        No completed workouts in this period.
      </p>
    )
  }

  return (
    <>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {days.map((day) => {
          const dayWorkouts = byDate.get(day.dateKey) ?? []
          return (
            <div
              key={day.dateKey}
              className={cn(
                'flex min-w-[3.25rem] shrink-0 flex-col items-center rounded-2xl px-2 py-2 transition',
                day.isToday
                  ? 'bg-brand text-brand-foreground shadow-sm'
                  : 'bg-card shadow-[var(--shadow-card)]',
              )}
            >
              <p
                className={cn(
                  'text-[10px] font-semibold uppercase',
                  day.isToday ? 'opacity-90' : 'text-muted-foreground',
                )}
              >
                {format(day.date, 'EEE')}
              </p>
              <p className="mt-0.5 text-lg font-bold tabular-nums">{format(day.date, 'd')}</p>
              <div className="mt-1 flex min-h-3 justify-center gap-0.5">
                {dayWorkouts.slice(0, 3).map((w) => (
                  <span
                    key={w.id}
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      day.isToday ? 'bg-white/80' : 'bg-green-500',
                    )}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="space-y-4">
        {[...days].reverse().map((day) => {
          const dayWorkouts = byDate.get(day.dateKey) ?? []
          if (dayWorkouts.length === 0) return null

          return (
            <section key={day.dateKey}>
              <h2 className="mb-2 text-xs font-medium text-muted-foreground">
                {format(day.date, 'EEEE, MMM d')}
              </h2>
              <div className="space-y-2">
                {dayWorkouts.map((workout) => (
                  <HistoryWorkoutCard key={workout.id} workout={workout} isCoach={isCoach} />
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </>
  )
}
