import type { DayIntent } from '../../types/dayIntent'
import type { Workout } from '../../types/workout'
import { useSwipe } from '../../hooks/useSwipe'
import { formatWeekRange, getWeekLabel } from '../../utils/date'
import { UpcomingWorkouts } from '../Summary/UpcomingWorkouts'
import { DayIntentBanner } from './DayIntentBanner'
import { WeekDayStrip } from './WeekDayStrip'

type WeekPlanViewProps = {
  weekWorkouts: Workout[]
  dayWorkouts: Workout[]
  weekStart: Date
  weekEnd: Date
  weekOffset: number
  selectedDate: Date
  dayIntent?: DayIntent
  loading: boolean
  isCoach: boolean
  isTrainee: boolean
  onSelectDay: (date: Date) => void
  onPrevWeek: () => void
  onNextWeek: () => void
  onEditWorkout: (workout: Workout) => void
  onDeleteWorkout: (workout: Workout) => void
  onLogWorkout: (workout: Workout) => void
  onEditDayIntent: () => void
  onAddDayIntent: () => void
}

export function WeekPlanView({
  weekWorkouts,
  dayWorkouts,
  weekStart,
  weekEnd,
  weekOffset,
  selectedDate,
  dayIntent,
  loading,
  isCoach,
  isTrainee,
  onSelectDay,
  onPrevWeek,
  onNextWeek,
  onEditWorkout,
  onDeleteWorkout,
  onLogWorkout,
  onEditDayIntent,
  onAddDayIntent,
}: WeekPlanViewProps) {
  const swipeHandlers = useSwipe(onNextWeek, onPrevWeek)

  return (
    <section {...swipeHandlers} className="touch-pan-y">
      <div className="mb-4">
        <div className="mb-1 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onPrevWeek}
            className="flex h-9 w-9 shrink-0 items-center justify-center text-brand hover:opacity-70"
            aria-label="Previous week"
          >
            ‹
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className="text-xs font-medium text-gray-500">{getWeekLabel(weekOffset)}</p>
            <h2 className="text-lg font-semibold text-gray-900">{formatWeekRange(weekStart, weekEnd)}</h2>
          </div>
          <button
            type="button"
            onClick={onNextWeek}
            className="flex h-9 w-9 shrink-0 items-center justify-center text-brand hover:opacity-70"
            aria-label="Next week"
          >
            ›
          </button>
        </div>
        <p className="text-center text-xs text-muted">Swipe for other weeks</p>
      </div>

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : (
        <>
          <WeekDayStrip
            weekStart={weekStart}
            weekWorkouts={weekWorkouts}
            selectedDate={selectedDate}
            onSelectDay={onSelectDay}
          />

          {dayIntent && isCoach && <DayIntentBanner intent={dayIntent} readOnly />}
          {dayIntent && isTrainee && (
            <DayIntentBanner intent={dayIntent} onEdit={onEditDayIntent} />
          )}
          {isTrainee && !dayIntent && (
            <button
              type="button"
              onClick={onAddDayIntent}
              className="mb-4 mt-3 w-full border border-dashed border-gray-200 py-3 text-sm text-gray-600 hover:border-brand hover:text-brand"
            >
              Plan this day for your coach
            </button>
          )}

          <UpcomingWorkouts
            workouts={dayWorkouts}
            inline
            loading={loading}
            isCoach={isCoach}
            isTrainee={isTrainee}
            onEditWorkout={onEditWorkout}
            onDeleteWorkout={onDeleteWorkout}
            onLogWorkout={onLogWorkout}
          />
        </>
      )}
    </section>
  )
}
