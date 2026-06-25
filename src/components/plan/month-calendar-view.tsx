'use client'

import { useMemo, useState } from 'react'
import { format, isSameMonth } from 'date-fns'
import { DayNoteSection } from '@/components/plan/day-note-section'
import { PlanDayAddMenu } from '@/components/plan/plan-day-add-menu'
import { MonthDayCell } from '@/components/plan/month-day-cell'
import { WorkoutModalTrigger } from '@/components/plan/workout-modal-trigger'
import { WorkoutPlanMeta } from '@/components/plan/workout-plan-meta'
import { StravaSyncedIndicator } from '@/components/plan/strava-synced-indicator'
import { TrainingWorkoutCard } from '@/components/training/training-workout-card'
import type { DayNoteData } from '@/lib/day-notes'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { WORKOUT_TYPE_COLORS, WORKOUT_TYPE_LABELS } from '@/lib/constants'
import { getRecoveryWorkout } from '@/lib/recovery-day'
import { Badge } from '@/components/ui/badge'
import { todayDateKey } from '@/lib/dates'

type MonthDay = {
  dateKey: string
  dayNumber: number
  inMonth: boolean
  isToday: boolean
}

type MonthCalendarViewProps = {
  monthLabel: string
  days: MonthDay[]
  workoutsByDate: Map<string, PlanWorkoutDetail[]>
  notesByDate: Map<string, DayNoteData>
  isCoach: boolean
  anchorMonth: Date
  athleteId?: string
  trainingMode?: boolean
}

function SelectedDayPanel({
  selectedDateKey,
  selectedLabel,
  selectedWorkouts,
  selectedNote,
  canEditNotes,
  athleteId,
  isCoach,
  trainingMode = false,
}: {
  selectedDateKey: string
  selectedLabel: string
  selectedWorkouts: PlanWorkoutDetail[]
  selectedNote: DayNoteData | null
  canEditNotes: boolean
  athleteId?: string
  isCoach: boolean
  trainingMode?: boolean
}) {
  return (
    <section className="flex min-h-0 w-full flex-col rounded-2xl border border-border/70 bg-card p-4 shadow-[var(--shadow-card)] landscape:max-lg:p-2 lg:min-h-[20rem]">
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 text-sm font-semibold">{selectedLabel}</h3>
        <PlanDayAddMenu
          dateKey={selectedDateKey}
          isCoach={isCoach}
          canAddNote={canEditNotes}
          athleteId={athleteId}
          dayNote={selectedNote}
          recoveryWorkout={getRecoveryWorkout(selectedWorkouts)}
        />
      </div>

      {selectedNote && (
        <div className="mt-3">
          <DayNoteSection
            dateKey={selectedDateKey}
            note={selectedNote}
            canEdit={canEditNotes}
            athleteId={athleteId}
            hideEmptyAdd
          />
        </div>
      )}

      <div className="mt-3 flex-1 space-y-2 overflow-y-auto">
        {selectedWorkouts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No workouts scheduled.</p>
        ) : (
          selectedWorkouts.map((w) =>
            trainingMode ? (
              <TrainingWorkoutCard
                key={w.id}
                workout={w}
                isCoach={isCoach}
                detailed
              />
            ) : (
              <WorkoutModalTrigger
                key={w.id}
                workout={w}
                isCoach={isCoach}
                className="flex w-full items-start justify-between gap-3 rounded-xl bg-muted/40 px-3 py-2.5 text-left text-sm transition hover:bg-muted/70"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="font-medium">{w.title}</p>
                    <StravaSyncedIndicator workout={w} variant="badge" />
                  </div>
                  <WorkoutPlanMeta workout={w} size="md" className="mt-1" />
                </div>
                <Badge className={WORKOUT_TYPE_COLORS[w.type]}>{WORKOUT_TYPE_LABELS[w.type]}</Badge>
              </WorkoutModalTrigger>
            ),
          )
        )}
      </div>
    </section>
  )
}

export function MonthCalendarView({
  monthLabel,
  days,
  workoutsByDate,
  notesByDate,
  isCoach,
  anchorMonth,
  athleteId,
  trainingMode = false,
}: MonthCalendarViewProps) {
  const defaultSelected = useMemo(() => {
    const today = todayDateKey()
    const todayInGrid = days.find((d) => d.dateKey === today && d.inMonth)
    if (todayInGrid) return today
    const firstInMonth = days.find((d) => d.inMonth)
    return firstInMonth?.dateKey ?? today
  }, [days])

  const [selectedDateKey, setSelectedDateKey] = useState(defaultSelected)

  const canEditNotes = true
  const selectedWorkouts = workoutsByDate.get(selectedDateKey) ?? []
  const selectedNote = notesByDate.get(selectedDateKey) ?? null
  const selectedLabel = format(new Date(selectedDateKey + 'T12:00:00'), 'EEEE, d MMMM')
  const showSelectedPanel = isSameMonth(new Date(selectedDateKey + 'T12:00:00'), anchorMonth)

  const panelProps = {
    selectedDateKey,
    selectedLabel,
    selectedWorkouts,
    selectedNote,
    canEditNotes,
    athleteId,
    isCoach,
    trainingMode,
  }

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
            {days.map((day) => (
              <div key={day.dateKey} className="min-w-0">
                <MonthDayCell
                  dateKey={day.dateKey}
                  dayNumber={day.dayNumber}
                  workouts={workoutsByDate.get(day.dateKey) ?? []}
                  dayNote={notesByDate.get(day.dateKey) ?? null}
                  isCoach={isCoach}
                  inMonth={day.inMonth}
                  isToday={day.isToday}
                  isSelected={selectedDateKey === day.dateKey}
                  onSelect={() => setSelectedDateKey(day.dateKey)}
                  compactOnDesktop
                />
              </div>
            ))}
          </div>
        </div>

        {showSelectedPanel && (
          <div className="min-w-0">
            <SelectedDayPanel {...panelProps} />
          </div>
        )}
      </div>
    </div>
  )
}
