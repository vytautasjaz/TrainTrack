import type { Workout } from '../../types/workout'
import { getWorkoutTypeLabel } from '../../types/workout'
import { WorkoutTypeIcon } from '../Icons/WorkoutTypeIcon'
import { formatShortDate } from '../../utils/date'
import {
  formatExecutionSummary,
  formatWorkoutSummary,
  getExecutionStatusTheme,
  getWorkoutDisplayStatus,
  resolveWorkoutType,
} from '../../utils/workoutDisplay'
import { WorkoutStatusBadge } from '../Workout/WorkoutStatusBadge'

type UpcomingWorkoutsProps = {
  workouts: Workout[]
  title?: string
  inline?: boolean
  showDates?: boolean
  loading: boolean
  isCoach: boolean
  isTrainee: boolean
  onEditWorkout: (workout: Workout) => void
  onDeleteWorkout: (workout: Workout) => void
  onLogWorkout: (workout: Workout) => void
}

export function UpcomingWorkouts({
  workouts,
  title,
  inline = false,
  showDates = false,
  loading,
  isCoach,
  isTrainee,
  onEditWorkout,
  onDeleteWorkout,
  onLogWorkout,
}: UpcomingWorkoutsProps) {
  return (
    <section className={inline ? 'mb-4' : 'mt-8 border-t border-gray-100 pt-6'}>
      {title && <h2 className="mb-4 text-xs font-medium text-gray-500">{title}</h2>}

      {loading ? (
        <p className="text-sm text-muted">Loading workouts…</p>
      ) : workouts.length === 0 ? (
        <p className={`text-sm text-gray-500 ${inline ? 'py-2' : 'py-6 text-center'}`}>
          {isCoach
            ? 'No workouts for this day. Tap + to assign one.'
            : 'No workouts assigned for this day.'}
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {workouts.map((workout) => {
            const summary = formatWorkoutSummary(workout)
            const executionSummary = formatExecutionSummary(workout)
            const type = resolveWorkoutType(workout.type)
            const status = getWorkoutDisplayStatus(workout)
            const statusTheme = getExecutionStatusTheme(status)

            return (
              <li
                key={workout.id}
                className="flex gap-3 border-l-2 py-3 pl-3"
                style={{ borderColor: statusTheme.border }}
              >
                <WorkoutTypeIcon
                  type={type}
                  className="mt-0.5 h-5 w-5 shrink-0"
                  style={{ color: statusTheme.border }}
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      {showDates && (
                        <p className="text-xs text-muted">{formatShortDate(workout.date)}</p>
                      )}
                      <h3 className="truncate font-medium text-gray-900">{workout.title}</h3>
                      <p className="text-xs text-muted">{getWorkoutTypeLabel(type)}</p>
                      <WorkoutStatusBadge workout={workout} />
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      {isCoach && (
                        <>
                          <button
                            type="button"
                            onClick={() => onEditWorkout(workout)}
                            aria-label="Edit workout"
                            className="p-1.5 text-muted hover:text-brand"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                              <path d="m2.695 14.763-1.262 3.154a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.885L17.5 5.501a2.121 2.121 0 0 0-3-3L3.58 13.42a4 4 0 0 0-.885 1.343Z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteWorkout(workout)}
                            aria-label="Delete workout"
                            className="p-1.5 text-muted hover:text-red-500"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                              <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </>
                      )}
                      {isTrainee && (
                        <button
                          type="button"
                          onClick={() => onLogWorkout(workout)}
                          className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-medium text-brand hover:border-brand"
                        >
                          {status === 'planned' ? 'Log workout' : 'Update log'}
                        </button>
                      )}
                    </div>
                  </div>
                  {summary && <p className="mt-1 text-sm text-gray-500">Plan: {summary}</p>}
                  {executionSummary && (
                    <p className="mt-1 text-sm text-gray-600">{executionSummary}</p>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
