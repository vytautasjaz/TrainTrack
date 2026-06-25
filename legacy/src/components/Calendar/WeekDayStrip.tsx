import { useMemo } from 'react'
import type { Workout } from '../../types/workout'
import { getWorkoutTypeLabel } from '../../types/workout'
import { WorkoutTypeIcon } from '../Icons/WorkoutTypeIcon'
import {
  formatDateLocal,
  getWeekDayDates,
  getWeekdayShortLabel,
  isSameDay,
} from '../../utils/date'
import {
  getExecutionStatusTheme,
  getWorkoutDisplayStatus,
  resolveWorkoutType,
} from '../../utils/workoutDisplay'

type WeekDayStripProps = {
  weekStart: Date
  weekWorkouts: Workout[]
  selectedDate: Date
  onSelectDay: (date: Date) => void
}

export function WeekDayStrip({
  weekStart,
  weekWorkouts,
  selectedDate,
  onSelectDay,
}: WeekDayStripProps) {
  const today = new Date()
  const days = getWeekDayDates(weekStart)
  const selectedDateStr = formatDateLocal(selectedDate)

  const workoutsByDate = useMemo(() => {
    const map = new Map<string, Workout[]>()
    for (const workout of weekWorkouts) {
      const existing = map.get(workout.date) ?? []
      map.set(workout.date, [...existing, workout])
    }
    return map
  }, [weekWorkouts])

  return (
    <div className="grid grid-cols-7 gap-0.5 border-b border-gray-100 pb-3">
      {days.map((day) => {
        const dateStr = formatDateLocal(day)
        const workouts = workoutsByDate.get(dateStr) ?? []
        const isToday = isSameDay(day, today)
        const isSelected = dateStr === selectedDateStr

        return (
          <button
            key={dateStr}
            type="button"
            onClick={() => onSelectDay(day)}
            aria-label={day.toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
            aria-pressed={isSelected}
            className="flex min-w-0 flex-col items-center gap-1 rounded-lg py-1 hover:bg-gray-50"
          >
            <span className="text-[10px] font-medium uppercase text-muted">
              {getWeekdayShortLabel(day)}
            </span>
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                isSelected
                  ? 'bg-brand font-semibold text-white'
                  : isToday
                    ? 'font-semibold text-brand ring-1 ring-brand'
                    : 'text-gray-700'
              }`}
            >
              {day.getDate()}
            </span>
            <div className="flex min-h-5 flex-wrap items-center justify-center gap-0.5">
              {workouts.length === 0 ? (
                <span className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                workouts.map((workout) => {
                  const type = resolveWorkoutType(workout.type)
                  const status = getWorkoutDisplayStatus(workout)
                  const color = getExecutionStatusTheme(status).border

                  return (
                    <span key={workout.id} title={getWorkoutTypeLabel(type)}>
                      <WorkoutTypeIcon type={type} className="h-3.5 w-3.5" style={{ color }} />
                    </span>
                  )
                })
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
