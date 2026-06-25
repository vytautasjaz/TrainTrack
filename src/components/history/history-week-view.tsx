'use client'

import type { WorkoutHistoryItem } from '@/lib/workout-history'
import { HistoryWorkoutCard } from '@/components/history/history-workout-card'
import { cn } from '@/lib/utils'

type HistoryDay = {
  dateKey: string
  dayLabel: string
  dateLabel: string
  isToday: boolean
}

type HistoryWeekViewProps = {
  days: HistoryDay[]
  byDate: Map<string, WorkoutHistoryItem[]>
  isCoach: boolean
}

export function HistoryWeekView({ days, byDate, isCoach }: HistoryWeekViewProps) {
  const hasAny = days.some((day) => (byDate.get(day.dateKey) ?? []).length > 0)

  if (!hasAny) {
    return (
      <p className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
        No completed workouts this week.
      </p>
    )
  }

  return (
    <>
      {/* Portrait mobile: stacked days */}
      <div className="space-y-3 portrait:max-lg:block landscape:max-lg:hidden lg:hidden">
        {days.map((day) => {
          const dayWorkouts = byDate.get(day.dateKey) ?? []
          if (dayWorkouts.length === 0) return null

          return (
            <section
              key={day.dateKey}
              className={cn(
                'rounded-2xl border border-border/70 bg-card shadow-[var(--shadow-card)]',
                day.isToday && 'ring-1 ring-brand/25',
              )}
            >
              <div
                className={cn(
                  'border-b border-border/60 px-4 py-3',
                  day.isToday && 'bg-brand/[0.04]',
                )}
              >
                <p className="text-sm font-semibold">{day.dayLabel}</p>
                <p className="text-xs text-muted-foreground">{day.dateLabel}</p>
              </div>
              <div className="space-y-2 p-3">
                {dayWorkouts.map((workout) => (
                  <HistoryWorkoutCard key={workout.id} workout={workout} isCoach={isCoach} compact />
                ))}
              </div>
            </section>
          )
        })}
      </div>

      {/* Landscape + desktop: full week table */}
      <div className="hidden w-full overflow-hidden rounded-xl border border-border/80 bg-card shadow-[var(--shadow-card)] landscape:max-lg:block lg:block">
        <table className="w-full table-fixed border-collapse text-left">
          <thead>
            <tr className="border-b border-border/80 bg-muted/40">
              {days.map((day) => (
                <th
                  key={day.dateKey}
                  className={cn(
                    'px-0.5 py-1.5 text-center align-top landscape:max-lg:px-px landscape:max-lg:py-1 lg:px-2 lg:py-2',
                    day.isToday ? 'bg-brand/5 text-brand' : 'text-muted-foreground',
                  )}
                >
                  <div className="text-[9px] font-medium landscape:max-lg:leading-tight lg:text-xs">{day.dayLabel}</div>
                  <div className="font-normal tabular-nums landscape:max-lg:text-[8px] lg:text-xs">{day.dateLabel}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {days.map((day) => {
                const dayWorkouts = byDate.get(day.dateKey) ?? []
                return (
                  <td
                    key={day.dateKey}
                    className={cn(
                      'align-top p-0.5 landscape:max-lg:px-px lg:p-2',
                      day.isToday && 'bg-brand/[0.03]',
                    )}
                  >
                    <div className="space-y-1 landscape:max-lg:space-y-0.5 lg:space-y-2">
                      {dayWorkouts.map((workout) => (
                        <HistoryWorkoutCard
                          key={workout.id}
                          workout={workout}
                          isCoach={isCoach}
                          compact
                        />
                      ))}
                    </div>
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </>
  )
}
