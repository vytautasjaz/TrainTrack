import type { CSSProperties } from 'react'
import type { CalendarWorkoutDot } from '../../types/workout'
import type { DayIntent } from '../../types/dayIntent'
import { formatDateLocal, isSameDay } from '../../utils/date'
import { getDayIntentDotStyle } from '../../utils/dayIntentDisplay'
import { getCalendarDotStyle, getDayCircleStyle, getDayDisplayStatus } from '../../utils/workoutDisplay'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

type MonthCalendarProps = {
  year: number
  month: number
  selectedDate: Date
  workoutsByDate: Map<string, CalendarWorkoutDot[]>
  intentsByDate?: Map<string, DayIntent>
  showDayIntents?: boolean
  onSelectDate: (date: Date) => void
  onPrevMonth: () => void
  onNextMonth: () => void
}

function getMonthGrid(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1)
  const startOffset = firstDay.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: (Date | null)[] = Array.from({ length: startOffset }, () => null)
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(year, month, day))
  }
  while (cells.length % 7 !== 0) {
    cells.push(null)
  }
  return cells
}

export function MonthCalendar({
  year,
  month,
  selectedDate,
  workoutsByDate,
  intentsByDate,
  showDayIntents = false,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
}: MonthCalendarProps) {
  const today = new Date()
  const cells = getMonthGrid(year, month)
  const monthLabel = new Date(year, month, 1)
    .toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    .toUpperCase()

  return (
    <section>
      <div className="mb-5 flex items-center justify-between">
        <button
          type="button"
          onClick={onPrevMonth}
          className="flex h-9 w-9 items-center justify-center text-brand hover:opacity-70"
          aria-label="Previous month"
        >
          ‹
        </button>
        <h2 className="text-sm font-bold tracking-wider text-brand">{monthLabel}</h2>
        <button
          type="button"
          onClick={onNextMonth}
          className="flex h-9 w-9 items-center justify-center text-brand hover:opacity-70"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7">
        {WEEKDAYS.map((day, i) => (
          <div key={`${day}-${i}`} className="py-2 text-center text-xs font-semibold text-muted">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-2">
        {cells.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} className="h-11" />
          }

          const dateStr = formatDateLocal(date)
          const isSelected = isSameDay(date, selectedDate)
          const isToday = isSameDay(date, today)
          const workoutDots = workoutsByDate.get(dateStr) ?? []
          const hasWorkouts = workoutDots.length > 0
          const dayIntent = intentsByDate?.get(dateStr)

          let dayClass =
            'relative mx-auto flex h-11 w-11 flex-col items-center justify-center rounded-full text-sm font-medium '
          let dayStyle: CSSProperties | undefined

          if (isSelected) {
            dayClass += 'bg-brand text-white'
          } else if (hasWorkouts) {
            const dayStatus = getDayDisplayStatus(workoutDots)
            dayStyle = getDayCircleStyle(dayStatus)
          } else if (isToday) {
            dayClass += 'font-semibold text-brand underline decoration-2 underline-offset-4'
          } else {
            dayClass += 'text-gray-700 hover:text-brand'
          }

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => onSelectDate(date)}
              className="relative flex h-11 items-center justify-center"
            >
              <span className={dayClass} style={dayStyle}>
                {date.getDate()}
                {hasWorkouts && workoutDots.length > 1 && (
                  <span className="absolute -bottom-1 flex gap-0.5">
                    {workoutDots.map((workout) => (
                      <span
                        key={workout.id}
                        style={getCalendarDotStyle(workout)}
                        className="h-1.5 w-1.5 rounded-full ring-1 ring-white"
                      />
                    ))}
                  </span>
                )}
              </span>
              {showDayIntents && dayIntent && (
                <span
                  className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full"
                  style={getDayIntentDotStyle(dayIntent.status)}
                  aria-hidden="true"
                />
              )}
            </button>
          )
        })}
      </div>
    </section>
  )
}
