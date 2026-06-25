'use client'

import { useMemo, useState } from 'react'
import { format, isSameMonth } from 'date-fns'
import type { WorkoutHistoryItem } from '@/lib/workout-history'
import { isStravaSynced } from '@/lib/plan-workout'
import { toPlanWorkoutDetailFromHistory } from '@/lib/workout-history'
import { HistoryWorkoutCard } from '@/components/history/history-workout-card'
import { WorkoutModalTrigger } from '@/components/plan/workout-modal-trigger'
import { StravaSyncedIndicator } from '@/components/plan/strava-synced-indicator'
import { WORKOUT_TYPE_ICONS, WORKOUT_TYPE_DOT_CLASS } from '@/lib/workout-display'
import { WORKOUT_TYPE_LABELS } from '@/lib/constants'
import { todayDateKey } from '@/lib/dates'
import { cn } from '@/lib/utils'

type MonthDay = {
  dateKey: string
  dayNumber: number
  inMonth: boolean
  isToday: boolean
}

type HistoryMonthViewProps = {
  monthLabel: string
  days: MonthDay[]
  byDate: Map<string, WorkoutHistoryItem[]>
  isCoach: boolean
  anchorMonth: Date
}

export function HistoryMonthView({
  monthLabel,
  days,
  byDate,
  isCoach,
  anchorMonth,
}: HistoryMonthViewProps) {
  const defaultSelected = useMemo(() => {
    const today = todayDateKey()
    const todayInGrid = days.find((d) => d.dateKey === today && d.inMonth)
    if (todayInGrid) return today
    const firstWithWorkout = days.find(
      (d) => d.inMonth && (byDate.get(d.dateKey) ?? []).length > 0,
    )
    if (firstWithWorkout) return firstWithWorkout.dateKey
    const firstInMonth = days.find((d) => d.inMonth)
    return firstInMonth?.dateKey ?? today
  }, [days, byDate])

  const [selectedDateKey, setSelectedDateKey] = useState(defaultSelected)
  const selectedWorkouts = byDate.get(selectedDateKey) ?? []
  const selectedLabel = format(new Date(selectedDateKey + 'T12:00:00'), 'EEEE, d MMMM')
  const showSelectedPanel = isSameMonth(new Date(selectedDateKey + 'T12:00:00'), anchorMonth)

  return (
    <div className="card-elevated p-4 landscape:max-lg:p-2">
      <h2 className="mb-4 text-sm font-semibold landscape:max-lg:mb-1 landscape:max-lg:text-xs">{monthLabel}</h2>

      <div className="flex flex-col gap-4 portrait:max-lg:flex-col landscape:max-lg:grid landscape:max-lg:grid-cols-2 landscape:max-lg:items-start landscape:max-lg:gap-2 lg:grid lg:grid-cols-2 lg:gap-6">
        <div className="w-full min-w-0">
          <div className="grid grid-cols-7 gap-px text-center text-[8px] font-medium uppercase text-muted-foreground landscape:max-lg:gap-0.5 lg:gap-1 lg:text-[10px]">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((full, i) => (
              <div key={full} className="py-0.5">
                <span className="hidden landscape:max-lg:inline lg:hidden">
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}
                </span>
                <span className="hidden portrait:max-lg:inline lg:inline">{full}</span>
              </div>
            ))}
          </div>

          <div className="mt-0.5 grid grid-cols-7 gap-px landscape:max-lg:gap-0.5 lg:mt-1 lg:gap-1">
            {days.map((day) => {
              const workouts = byDate.get(day.dateKey) ?? []
              return (
                <div
                  key={day.dateKey}
                  role="button"
                  tabIndex={day.inMonth ? 0 : undefined}
                  onClick={() => day.inMonth && setSelectedDateKey(day.dateKey)}
                  onKeyDown={
                    day.inMonth
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setSelectedDateKey(day.dateKey)
                          }
                        }
                      : undefined
                  }
                  className={cn(
                    'relative flex min-h-[3.75rem] w-full min-w-0 flex-col rounded-lg border p-1.5 text-left transition landscape:max-lg:min-h-[2.75rem] landscape:max-lg:p-1 lg:min-h-[4.25rem]',
                    day.inMonth
                      ? 'cursor-pointer border-border/60 bg-card hover:border-brand/40'
                      : 'border-transparent bg-muted/30 text-muted-foreground',
                    day.isToday && day.inMonth && 'border-brand/50 ring-1 ring-inset ring-brand/40',
                    selectedDateKey === day.dateKey &&
                      day.inMonth &&
                      'border-brand bg-brand/[0.04] ring-1 ring-inset ring-brand/30',
                  )}
                >
                  <span
                    className={cn(
                      'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px]',
                      day.isToday && day.inMonth && 'bg-primary font-semibold text-primary-foreground',
                    )}
                  >
                    {day.dayNumber}
                  </span>

                  {workouts.length > 0 && day.inMonth && (
                    <div className="mt-0.5 hidden flex-wrap justify-center gap-0.5 landscape:max-lg:flex lg:mt-1 lg:flex">
                      {workouts.slice(0, 4).map((w) => {
                        const Icon = WORKOUT_TYPE_ICONS[w.type]
                        const planDetail = toPlanWorkoutDetailFromHistory(w)
                        return (
                          <WorkoutModalTrigger
                            key={w.id}
                            workout={planDetail}
                            isCoach={isCoach}
                            className="relative rounded-sm p-0.5"
                            aria-label={w.title}
                          >
                            <Icon className="h-2.5 w-2.5 text-green-600" strokeWidth={2} />
                            {isStravaSynced(planDetail) && (
                              <StravaSyncedIndicator workout={planDetail} variant="dot" />
                            )}
                          </WorkoutModalTrigger>
                        )
                      })}
                      {workouts.length > 4 && (
                        <span className="text-[7px] text-muted-foreground">+{workouts.length - 4}</span>
                      )}
                    </div>
                  )}

                  {/* Mobile dots */}
                  {workouts.length > 0 && day.inMonth && (
                    <div className="mt-0.5 flex justify-center gap-0.5 portrait:max-lg:flex landscape:max-lg:hidden">
                      {workouts.slice(0, 3).map((w) => (
                        <span
                          key={w.id}
                          className={cn('h-1.5 w-1.5 rounded-full', WORKOUT_TYPE_DOT_CLASS[w.type])}
                          title={WORKOUT_TYPE_LABELS[w.type]}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {showSelectedPanel && (
          <div className="min-w-0 overflow-hidden">
            <section className="flex min-h-0 w-full min-w-0 flex-col rounded-2xl border border-border/70 bg-card p-4 shadow-[var(--shadow-card)] landscape:max-lg:p-2 lg:min-h-[20rem]">
            <h3 className="text-sm font-semibold landscape:max-lg:text-xs">{selectedLabel}</h3>
            <div className="mt-2 flex-1 space-y-1.5 overflow-y-auto landscape:max-lg:mt-1 lg:mt-3 lg:space-y-2">
              {selectedWorkouts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No completed workouts.</p>
              ) : (
                selectedWorkouts.map((workout) => (
                  <HistoryWorkoutCard
                    key={workout.id}
                    workout={workout}
                    isCoach={isCoach}
                    compact
                    className="landscape:max-lg:px-2 landscape:max-lg:py-1.5"
                  />
                ))
              )}
            </div>
          </section>
          </div>
        )}
      </div>
    </div>
  )
}
