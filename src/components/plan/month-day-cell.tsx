'use client'

import { MonthWorkoutChip } from '@/components/plan/month-workout-chip'
import { useDayDropTarget } from '@/components/plan/use-day-drop-target'
import type { DayNoteData } from '@/lib/day-notes'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { dayHasRecovery, recoveryDayMonthClass } from '@/lib/recovery-day'
import {
  getDayRacePriority,
  raceDayMonthClass,
  RACE_PRIORITY_MONTH_SELECTED,
  RACE_PRIORITY_MONTH_TODAY,
  RACE_PRIORITY_MONTH_TODAY_TEXT,
} from '@/lib/race-day'
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
  /** Desktop cell content: micro cards (roomy) or sport icons (with day panel). */
  desktopWorkoutDisplay?: 'micro' | 'icons'
  /** Accept library / plan workout drops (coach desktop). */
  dropEnabled?: boolean
}

export function MonthDayCell({
  dateKey,
  dayNumber,
  workouts,
  dayNote,
  isCoach,
  inMonth,
  isToday,
  isSelected,
  onSelect,
  compactOnDesktop = false,
  desktopWorkoutDisplay = 'micro',
  dropEnabled = false,
}: MonthDayCellProps) {
  const isRecovery = dayHasRecovery(workouts)
  const racePriority = getDayRacePriority(workouts)
  const isRaceDay = racePriority != null
  const { dropHighlightClass, dropProps, isDragging } = useDayDropTarget({
    dateKey,
    enabled: dropEnabled && inMonth,
  })
  const desktopIcons = desktopWorkoutDisplay === 'icons'

  return (
    <div
      role="button"
      tabIndex={inMonth ? 0 : undefined}
      onClick={inMonth && !isDragging ? onSelect : undefined}
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
      {...dropProps}
      className={cn(
        'relative flex h-full w-full min-w-0 flex-col rounded-lg border text-left transition',
        'min-h-[3.75rem] overflow-hidden p-1.5',
        compactOnDesktop &&
          'lg:flex lg:h-full lg:flex-col lg:gap-0.5 lg:rounded-md lg:p-1 lg:pb-0.5',
        compactOnDesktop && desktopIcons && 'lg:min-h-[4.25rem]',
        compactOnDesktop && !desktopIcons && 'lg:min-h-[5.5rem]',
        inMonth
          ? 'cursor-pointer border-border/60 bg-card hover:border-brand/40'
          : 'border-transparent bg-muted/30 text-muted-foreground',
        isRaceDay && inMonth && raceDayMonthClass(racePriority),
        isRecovery && inMonth && !isRaceDay && recoveryDayMonthClass(),
        isToday &&
          inMonth &&
          !isRecovery &&
          !isRaceDay &&
          'border-border bg-muted/70',
        isToday && inMonth && isRaceDay && RACE_PRIORITY_MONTH_TODAY[racePriority],
        isToday &&
          inMonth &&
          isRecovery &&
          !isRaceDay &&
          'border-violet-500/60 bg-violet-500/18',
        isSelected &&
          inMonth &&
          !isToday &&
          !isRecovery &&
          !isRaceDay &&
          'border-brand bg-brand/[0.06]',
        isSelected &&
          inMonth &&
          !isToday &&
          isRaceDay &&
          RACE_PRIORITY_MONTH_SELECTED[racePriority],
        isSelected &&
          inMonth &&
          !isToday &&
          isRecovery &&
          !isRaceDay &&
          'border-violet-500 bg-violet-500/10',
        dropHighlightClass,
      )}
    >
      <div
        className={cn(
          'flex shrink-0 items-center gap-0.5',
          compactOnDesktop && 'lg:justify-center lg:gap-0 lg:pt-0.5',
        )}
      >
        <span
          className={cn(
            'text-[11px] font-semibold leading-none tabular-nums',
            compactOnDesktop && 'lg:text-xs',
            isToday && inMonth && !isRecovery && !isRaceDay && 'text-foreground',
            isToday &&
              inMonth &&
              isRaceDay &&
              RACE_PRIORITY_MONTH_TODAY_TEXT[racePriority],
            isToday && inMonth && isRecovery && !isRaceDay && 'text-violet-800 dark:text-violet-100',
            isSelected && inMonth && !isToday && 'text-brand',
          )}
        >
          {dayNumber}
        </span>
      </div>

      {/* Mobile / tablet: workout indicators in cell */}
      {workouts.length > 0 && inMonth && (
        <div className={cn('mt-0.5 min-w-0 flex-1', compactOnDesktop && 'lg:hidden')}>
          <div className="flex flex-wrap gap-0.5 md:hidden">
            {workouts.slice(0, 5).map((w) => (
              <MonthWorkoutChip key={w.id} workout={w} isCoach={isCoach} variant="dot" />
            ))}
            {workouts.length > 5 && (
              <span className="text-[8px] leading-none text-muted-foreground">
                +{workouts.length - 5}
              </span>
            )}
          </div>

          <div className="hidden flex-wrap gap-0.5 md:flex">
            {workouts.slice(0, 4).map((w) => (
              <MonthWorkoutChip key={w.id} workout={w} isCoach={isCoach} variant="icon" />
            ))}
            {workouts.length > 4 && (
              <span className="self-center text-[9px] text-muted-foreground">
                +{workouts.length - 4}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Desktop: micro cards or sport icons */}
      {compactOnDesktop && inMonth && (
        <div
          className={cn(
            'hidden lg:flex lg:min-w-0 lg:flex-1 lg:px-0.5',
            desktopIcons
              ? 'lg:items-center lg:justify-center'
              : 'lg:flex-col lg:justify-start lg:gap-0.5',
            workouts.length === 0 && 'min-h-0',
          )}
        >
          {workouts.length > 0 && desktopIcons ? (
            <div className="flex flex-wrap items-center justify-center gap-0.5">
              {workouts.slice(0, 4).map((w) => (
                <MonthWorkoutChip key={w.id} workout={w} isCoach={isCoach} variant="tile" />
              ))}
              {workouts.length > 4 && (
                <span className="text-[7px] font-medium leading-none text-muted-foreground">
                  +{workouts.length - 4}
                </span>
              )}
            </div>
          ) : null}
          {workouts.length > 0 && !desktopIcons ? (
            <div className="flex min-w-0 flex-col gap-1">
              {workouts.slice(0, 3).map((w) => (
                <MonthWorkoutChip key={w.id} workout={w} isCoach={isCoach} variant="micro" />
              ))}
              {workouts.length > 3 && (
                <span className="text-[7px] font-medium leading-none text-muted-foreground">
                  +{workouts.length - 3}
                </span>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
