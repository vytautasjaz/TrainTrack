'use client'

import { Flag } from 'lucide-react'
import { WorkoutModalTrigger } from '@/components/plan/workout-modal-trigger'
import type { DayNoteData } from '@/lib/day-notes'
import { DAY_NOTE_COLORS } from '@/lib/day-notes'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { WORKOUT_TYPE_LABELS } from '@/lib/constants'
import {
  WORKOUT_TYPE_DOT_CLASS,
  WORKOUT_TYPE_ICONS,
  RACE_PLAN_DOT_CLASS,
} from '@/lib/workout-display'
import { StravaSyncedIndicator } from '@/components/plan/strava-synced-indicator'
import { dayHasRecovery, recoveryDayMonthClass } from '@/lib/recovery-day'
import { dayHasRace, raceDayMonthClass } from '@/lib/race-day'
import { cn } from '@/lib/utils'

type MonthDayCellProps = {
  dateKey: string
  dayNumber: number
  workouts: PlanWorkoutDetail[]
  dayNote?: DayNoteData | null
  isCoach: boolean
  inMonth: boolean
  isToday: boolean
  isSelected: boolean
  onSelect: () => void
  compactOnDesktop?: boolean
}

export function MonthDayCell({
  dateKey: _dateKey,
  dayNumber,
  workouts,
  dayNote,
  isCoach,
  inMonth,
  isToday,
  isSelected,
  onSelect,
  compactOnDesktop = false,
}: MonthDayCellProps) {
  const isRecovery = dayHasRecovery(workouts)
  const isRaceDay = dayHasRace(workouts)

  return (
    <div
      role="button"
      tabIndex={inMonth ? 0 : undefined}
      onClick={inMonth ? onSelect : undefined}
      onKeyDown={
        inMonth
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelect()
              }
            }
          : undefined
      }
      className={cn(
        'relative flex h-full w-full min-w-0 flex-col rounded-lg border text-left transition',
        'min-h-[3.75rem] overflow-hidden p-1.5',
        compactOnDesktop && 'lg:flex lg:h-full lg:min-h-[4.25rem] lg:flex-col lg:gap-0.5 lg:rounded-md lg:p-1 lg:pb-0.5',
        inMonth
          ? 'cursor-pointer border-border/60 bg-card hover:border-brand/40'
          : 'border-transparent bg-muted/30 text-muted-foreground',
        isRaceDay && inMonth && raceDayMonthClass(),
        isRecovery && inMonth && !isRaceDay && recoveryDayMonthClass(),
        isToday && inMonth && !isRecovery && !isRaceDay && 'border-brand/50 ring-1 ring-inset ring-brand/40',
        isToday && inMonth && isRaceDay && 'border-amber-500/60 ring-1 ring-inset ring-amber-500/45',
        isToday && inMonth && isRecovery && !isRaceDay && 'border-violet-500/50 ring-1 ring-inset ring-violet-500/40',
        isSelected && inMonth && !isRecovery && !isRaceDay && 'border-brand bg-brand/[0.04] ring-1 ring-inset ring-brand/30',
        isSelected && inMonth && isRaceDay && 'border-amber-500 bg-amber-500/[0.1] ring-1 ring-inset ring-amber-500/35',
        isSelected && inMonth && isRecovery && !isRaceDay && 'border-violet-500 bg-violet-500/[0.08] ring-1 ring-inset ring-violet-500/30',
      )}
    >
      {dayNote && inMonth && compactOnDesktop && (
        <span
          className="absolute left-0.5 top-0.5 z-10 hidden h-1.5 w-1.5 rounded-full ring-1 ring-card lg:block"
          style={{ backgroundColor: DAY_NOTE_COLORS[dayNote.status].dot }}
          title="Day note"
        />
      )}

      <div
        className={cn(
          'flex shrink-0 items-center gap-0.5',
          compactOnDesktop && 'lg:justify-center lg:gap-0 lg:pt-0.5',
        )}
      >
        <span
          className={cn(
            'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] leading-none',
            compactOnDesktop && 'lg:h-5 lg:w-5 lg:text-[10px]',
            isToday && inMonth && 'bg-primary font-semibold text-primary-foreground',
          )}
        >
          {dayNumber}
        </span>
        {dayNote && inMonth && (
          <span
            className={cn('h-1.5 w-1.5 shrink-0 rounded-full', compactOnDesktop && 'lg:hidden')}
            style={{ backgroundColor: DAY_NOTE_COLORS[dayNote.status].dot }}
            title="Day note"
          />
        )}
      </div>

      {/* Mobile / tablet: workout indicators in cell */}
      {workouts.length > 0 && inMonth && (
        <div className={cn('mt-0.5 min-w-0 flex-1', compactOnDesktop && 'lg:hidden')}>
          <div className="flex flex-wrap gap-0.5 md:hidden">
            {workouts.slice(0, 5).map((w) => (
              <WorkoutModalTrigger
                key={w.id}
                workout={w}
                isCoach={isCoach}
                className="relative rounded-full"
              >
                <span
                  className={cn(
                    'block h-2 w-2 rounded-full',
                    w.isRace ? RACE_PLAN_DOT_CLASS : WORKOUT_TYPE_DOT_CLASS[w.type],
                  )}
                  aria-label={`${WORKOUT_TYPE_LABELS[w.type]}: ${w.title}`}
                />
                <StravaSyncedIndicator workout={w} variant="dot" />
              </WorkoutModalTrigger>
            ))}
            {workouts.length > 5 && (
              <span className="text-[8px] leading-none text-muted-foreground">+{workouts.length - 5}</span>
            )}
          </div>

          <div className="hidden flex-wrap gap-0.5 md:flex">
            {workouts.slice(0, 4).map((w) => {
              if (w.isRace) {
                return (
                  <WorkoutModalTrigger
                    key={w.id}
                    workout={w}
                    isCoach={isCoach}
                    className="relative rounded-md p-0.5 text-amber-600 transition hover:bg-amber-500/15"
                    aria-label={w.title}
                  >
                    <Flag className="h-3 w-3 fill-amber-500/25" />
                  </WorkoutModalTrigger>
                )
              }
              const Icon = WORKOUT_TYPE_ICONS[w.type]
              return (
                <WorkoutModalTrigger
                  key={w.id}
                  workout={w}
                  isCoach={isCoach}
                  className={cn(
                    'relative rounded-md p-0.5 text-muted-foreground transition hover:bg-muted/50 hover:text-brand',
                    w.status === 'COMPLETED' && 'text-green-600',
                    w.status === 'SKIPPED' && 'text-red-400',
                  )}
                  aria-label={w.title}
                >
                  <Icon className="h-3 w-3" />
                  <StravaSyncedIndicator workout={w} variant="dot" />
                </WorkoutModalTrigger>
              )
            })}
            {workouts.length > 4 && (
              <span className="self-center text-[9px] text-muted-foreground">+{workouts.length - 4}</span>
            )}
          </div>
        </div>
      )}

      {/* Desktop: sport icons in cell */}
      {compactOnDesktop && inMonth && (
        <div
          className={cn(
            'hidden lg:flex lg:flex-1 lg:items-center lg:justify-center lg:px-0.5',
            workouts.length === 0 && 'min-h-0',
            workouts.length > 0 && workouts.length <= 2 && 'min-h-5',
            workouts.length > 2 && 'min-h-[2.625rem]',
          )}
        >
          {workouts.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-0.5">
              {workouts.slice(0, 4).map((w) => {
                if (w.isRace) {
                  return (
                    <WorkoutModalTrigger
                      key={w.id}
                      workout={w}
                      isCoach={isCoach}
                      className="relative flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-amber-500/15 text-amber-600 transition hover:bg-amber-500/25"
                      aria-label={`Race: ${w.title}`}
                    >
                      <Flag className="h-2.5 w-2.5 fill-amber-500/25" strokeWidth={2} />
                    </WorkoutModalTrigger>
                  )
                }
                const Icon = WORKOUT_TYPE_ICONS[w.type]
                return (
                  <WorkoutModalTrigger
                    key={w.id}
                    workout={w}
                    isCoach={isCoach}
                    className={cn(
                      'relative flex h-5 w-5 shrink-0 items-center justify-center rounded-sm transition',
                      'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-brand',
                      w.status === 'COMPLETED' && 'bg-green-500/15 text-green-600',
                      w.status === 'SKIPPED' && 'bg-red-500/15 text-red-400',
                    )}
                    aria-label={`${WORKOUT_TYPE_LABELS[w.type]}: ${w.title}`}
                  >
                    <Icon className="h-2.5 w-2.5" strokeWidth={2} />
                    <StravaSyncedIndicator workout={w} variant="dot" />
                  </WorkoutModalTrigger>
                )
              })}
              {workouts.length > 4 && (
                <span className="text-[7px] font-medium leading-none text-muted-foreground">
                  +{workouts.length - 4}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
