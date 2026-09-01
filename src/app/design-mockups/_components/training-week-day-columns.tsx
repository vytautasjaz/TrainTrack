import { DayWeatherMini } from './today-weather-strip'
import { TRAINING_DAYS, workoutsForDay } from './training-mock-data'
import {
  PrescriptionWorkoutCard,
  toPrescriptionWorkout,
} from './prescription-workout-card'

/** Portrait week: day columns, swipe horizontally. */
export function TrainingWeekDayColumns() {
  return (
    <div className="-mx-1 overflow-x-auto pb-1">
      <div className="flex w-max gap-2 px-1">
        {TRAINING_DAYS.map((day) => {
          const items = workoutsForDay(day.dayIndex)
          return (
            <div
              key={day.dayIndex}
              className={`flex w-[10.5rem] shrink-0 flex-col overflow-hidden rounded-[var(--tt-radius-sm)] border border-[var(--tt-line)] ${
                day.today
                  ? 'bg-[var(--tt-red-soft)]'
                  : day.dayIndex >= 5
                    ? 'bg-[#f4f4f4]'
                    : 'bg-white'
              }`}
            >
              <div
                className={`border-b border-[var(--tt-line)] px-2.5 py-2 ${
                  day.today
                    ? 'bg-[var(--tt-red)]'
                    : day.dayIndex >= 5
                      ? 'bg-[#ececec]'
                      : 'bg-[var(--tt-sidebar)]'
                }`}
              >
                <p
                  className={`text-[10px] font-bold uppercase tracking-[0.06em] ${
                    day.today ? 'text-white' : 'text-[var(--tt-ink-faint)]'
                  }`}
                >
                  {day.short}
                </p>
                <p
                  className={`text-[15px] font-semibold tabular-nums ${
                    day.today ? 'text-white' : 'text-[var(--tt-ink)]'
                  }`}
                >
                  {day.dateNum}
                </p>
                {day.weather ? (
                  <div className="mt-1">
                    <DayWeatherMini {...day.weather} />
                  </div>
                ) : null}
                {day.race ? (
                  <p className="mt-0.5 truncate text-[9px] font-semibold text-[var(--tt-red)]">
                    {day.race}
                  </p>
                ) : null}
                {day.recovery ? (
                  <p className="mt-0.5 text-[9px] text-[var(--tt-ink-faint)]">Recovery</p>
                ) : null}
              </div>

              <div className="flex min-h-[11rem] flex-1 flex-col gap-1.5 p-1.5">
                {items.length === 0 ? (
                  <p className="px-1 py-3 text-center text-[10px] text-[var(--tt-ink-faint)]">—</p>
                ) : (
                  items.map((w) => (
                    <PrescriptionWorkoutCard
                      key={w.id}
                      workout={toPrescriptionWorkout(w)}
                      size="xs"
                    />
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
