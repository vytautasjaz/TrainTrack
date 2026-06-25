'use client'

import { WorkoutType } from '@prisma/client'
import { AddWorkoutCell } from '@/components/plan/add-workout-cell'
import { WorkoutModalTrigger } from '@/components/plan/workout-modal-trigger'
import { DayNoteSection } from '@/components/plan/day-note-section'
import { RecoveryDaySection } from '@/components/plan/recovery-day-section'
import { RacePlanItem } from '@/components/plan/race-plan-item'
import { WorkoutPlanMeta } from '@/components/plan/workout-plan-meta'
import { StravaSyncedIndicator } from '@/components/plan/strava-synced-indicator'
import { TrainingDayWorkoutList } from '@/components/training/training-day-workout-list'
import { WORKOUT_TYPE_COLORS, WORKOUT_TYPE_LABELS, SPORT_ROW_ORDER } from '@/lib/constants'
import type { PlanDay } from '@/lib/plan-week'
import { resolveCoachPlanSportRows } from '@/lib/plan-sports'
import { dayHasRecovery, getRecoveryWorkout } from '@/lib/recovery-day'
import { dayHasRace, raceDaySectionClass } from '@/lib/race-day'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { PlanDayAddMenu } from '@/components/plan/plan-day-add-menu'
import { cn } from '@/lib/utils'
import { PLAN_WORKOUT_ITEM_CLASS, RACE_PLAN_DOT_CLASS } from '@/lib/workout-display'

const COACH_SPORT_ROWS_FALLBACK = SPORT_ROW_ORDER.filter(
  (t) => t !== WorkoutType.REST && t !== WorkoutType.RECOVERY,
)

export type PlanMobileDayStackProps = {
  days: PlanDay[]
  isCoach: boolean
  canEditDayNotes?: boolean
  coachEditable?: boolean
  athleteId?: string
  planSportRows?: WorkoutType[]
  weekExtraPlanSportRows?: WorkoutType[]
  weekHiddenPlanSportRows?: WorkoutType[]
  dragEnabled?: boolean
  className?: string
  daySectionIdPrefix?: string
  daySectionScrollMarginClass?: string
  headerAddMenu?: boolean
  trainingMode?: boolean
}

function daySectionClass(day: PlanDay, trainingMode?: boolean) {
  return cn(
    trainingMode ? 'card-elevated' : 'rounded-2xl border border-border/70 bg-card shadow-[var(--shadow-card)]',
    !trainingMode && dayHasRace(day.workouts) && raceDaySectionClass(day.isToday),
    !trainingMode &&
      dayHasRecovery(day.workouts) &&
      !dayHasRace(day.workouts) &&
      'border-violet-500/25 bg-violet-500/[0.03]',
    day.isToday &&
      !dayHasRace(day.workouts) &&
      !dayHasRecovery(day.workouts) &&
      (trainingMode ? 'ring-2 ring-brand/20' : 'ring-1 ring-brand/25'),
    day.isToday &&
      dayHasRecovery(day.workouts) &&
      !dayHasRace(day.workouts) &&
      !trainingMode &&
      'ring-1 ring-violet-500/25',
  )
}

function workoutsForSport(day: PlanDay, sport: WorkoutType) {
  return day.workouts.filter((w) => w.type === sport)
}

function planItemDot(workout: PlanWorkoutDetail) {
  if (workout.isRace) return RACE_PLAN_DOT_CLASS
  if (workout.status === 'COMPLETED') return 'bg-green-500'
  if (workout.status === 'SKIPPED') return 'bg-red-400'
  return 'bg-muted-foreground/40'
}

function WorkoutCell({
  workouts,
  isCoach,
}: {
  workouts: PlanWorkoutDetail[]
  isCoach: boolean
}) {
  if (workouts.length === 0) return null

  return (
    <div className="space-y-1.5 landscape:max-lg:space-y-0.5">
      {workouts.map((w) =>
        w.isRace ? (
          <RacePlanItem key={w.id} workout={w} isCoach={isCoach} compact tableCell />
        ) : (
          <WorkoutModalTrigger
            key={w.id}
            workout={w}
            isCoach={isCoach}
            className={cn(
              PLAN_WORKOUT_ITEM_CLASS,
              'group flex w-full items-start gap-1 rounded-lg px-0.5 py-0.5 landscape:max-lg:gap-0.5 lg:gap-1.5 lg:px-1',
            )}
          >
            <span
              className={cn(
                'mt-1 h-1.5 w-1.5 shrink-0 rounded-full landscape:max-lg:mt-0.5',
                planItemDot(w),
              )}
            />
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-0.5">
                <p className="min-w-0 truncate text-xs font-medium leading-snug group-hover:text-brand landscape:max-lg:text-[8px] landscape:max-lg:leading-tight">
                  {w.title}
                </p>
                <StravaSyncedIndicator workout={w} variant="icon" />
              </div>
              <div className="landscape:max-lg:hidden">
                <WorkoutPlanMeta workout={w} />
              </div>
            </div>
          </WorkoutModalTrigger>
        ),
      )}
    </div>
  )
}

export function PlanMobileDayStack({
  days,
  isCoach,
  canEditDayNotes = false,
  coachEditable = false,
  athleteId,
  planSportRows = [],
  weekExtraPlanSportRows = [],
  weekHiddenPlanSportRows = [],
  dragEnabled = false,
  className,
  daySectionIdPrefix,
  daySectionScrollMarginClass,
  headerAddMenu = false,
  trainingMode = false,
}: PlanMobileDayStackProps) {
  const typesInDays = new Set(days.flatMap((d) => d.workouts.map((w) => w.type)))
  const sportRows =
    coachEditable && isCoach
      ? athleteId
        ? resolveCoachPlanSportRows(
            planSportRows,
            weekExtraPlanSportRows,
            typesInDays,
            weekHiddenPlanSportRows,
          )
        : COACH_SPORT_ROWS_FALLBACK
      : SPORT_ROW_ORDER.filter((t) => typesInDays.has(t) && t !== WorkoutType.RECOVERY)

  const hasAnyDayNotes = days.some((d) => d.dayNote)
  const showNoteRow = canEditDayNotes || hasAnyDayNotes
  const showRecoveryRow = isCoach || days.some((d) => dayHasRecovery(d.workouts))

  return (
    <div className={cn('space-y-4', trainingMode && 'space-y-3', className)}>
      {days.map((day) => {
        const trainingWorkouts = day.workouts.filter(
          (w) => w.type !== WorkoutType.REST && w.type !== WorkoutType.RECOVERY && !w.isRace,
        )
        const raceWorkouts = day.workouts.filter((w) => w.isRace)

        return (
        <section
          key={day.dateKey}
          id={
            daySectionIdPrefix && !trainingMode
              ? `${daySectionIdPrefix}-${day.dateKey}`
              : undefined
          }
          className={cn(
            daySectionClass(day, trainingMode),
            daySectionScrollMarginClass ?? (daySectionIdPrefix && !trainingMode && 'scroll-mt-24'),
          )}
        >
          {daySectionIdPrefix && trainingMode && (
            <div
              id={`${daySectionIdPrefix}-${day.dateKey}`}
              className="pointer-events-none h-0 w-full"
              aria-hidden
            />
          )}
          <div
            className={cn(
              'flex items-center justify-between gap-3 px-4 py-3',
              trainingMode ? 'border-b border-border/40' : 'border-b border-border/60',
              !trainingMode && dayHasRace(day.workouts) && 'bg-amber-500/15',
              !trainingMode &&
                dayHasRecovery(day.workouts) &&
                !dayHasRace(day.workouts) &&
                'bg-violet-500/10',
              !trainingMode &&
                day.isToday &&
                !dayHasRace(day.workouts) &&
                !dayHasRecovery(day.workouts) &&
                'bg-brand/[0.04]',
            )}
          >
            <div className="flex min-w-0 items-center gap-3">
              {trainingMode && (
                <div
                  className={cn(
                    'flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl text-center',
                    day.isToday ? 'bg-brand text-brand-foreground' : 'bg-muted/60',
                  )}
                >
                  <span
                    className={cn(
                      'text-[10px] font-semibold uppercase leading-none',
                      day.isToday ? 'opacity-90' : 'text-muted-foreground',
                    )}
                  >
                    {day.dayLabel.slice(0, 3)}
                  </span>
                  <span className="text-lg font-bold leading-none tabular-nums">
                    {day.dateKey.split('-')[2]?.replace(/^0/, '') ?? day.dateLabel}
                  </span>
                </div>
              )}
              <div className="min-w-0">
                <p className={cn('font-semibold', trainingMode ? 'text-base' : 'text-sm')}>
                  {day.dayLabel}
                </p>
                <p className="text-xs text-muted-foreground">{day.dateLabel}</p>
              </div>
            </div>
            {headerAddMenu && (
              <PlanDayAddMenu
                dateKey={day.dateKey}
                isCoach={isCoach}
                canAddNote={canEditDayNotes}
                athleteId={athleteId}
                dayNote={day.dayNote}
                recoveryWorkout={getRecoveryWorkout(day.workouts)}
              />
            )}
          </div>
          {showNoteRow && coachEditable && (
            <div className="border-b border-border/60 px-3 py-2">
              <DayNoteSection
                dateKey={day.dateKey}
                note={day.dayNote}
                canEdit={canEditDayNotes}
                athleteId={athleteId}
                compact
                hideEmptyAdd={headerAddMenu}
              />
            </div>
          )}

          {trainingMode && !coachEditable ? (
            <TrainingDayWorkoutList
              key={`${day.dateKey}-${trainingWorkouts.map((w) => w.id).join(',')}`}
              dateKey={day.dateKey}
              workouts={trainingWorkouts}
              raceWorkouts={raceWorkouts}
              isCoach={isCoach}
              reorderEnabled={isCoach}
              showEmpty={
                trainingWorkouts.length === 0 &&
                raceWorkouts.length === 0 &&
                !dayHasRecovery(day.workouts)
              }
            />
          ) : (
          <div className="divide-y divide-border/60">
            {sportRows.map((sport) => {
              const sportWorkouts = workoutsForSport(day, sport)
              if (!coachEditable && sportWorkouts.length === 0) return null

              return (
                <div key={sport} className="px-3 py-2">
                  <div className="mb-1 px-1">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${WORKOUT_TYPE_COLORS[sport]}`}
                    >
                      {WORKOUT_TYPE_LABELS[sport]}
                    </span>
                  </div>
                  {coachEditable && isCoach ? (
                    <AddWorkoutCell
                      date={day.dateKey}
                      sport={sport}
                      workouts={sportWorkouts}
                      isCoach={isCoach}
                      layout="mobile"
                      dragEnabled={dragEnabled}
                    />
                  ) : (
                    <WorkoutCell workouts={sportWorkouts} isCoach={isCoach} />
                  )}
                </div>
              )
            })}
            {!coachEditable && sportRows.length === 0 && !dayHasRecovery(day.workouts) && (
              <p className="px-3 py-4 text-xs text-muted-foreground">No workouts scheduled.</p>
            )}
          </div>
          )}

          {!coachEditable && dayHasRecovery(day.workouts) && (
            <div className={cn('border-t border-border/40 px-3 py-2', trainingMode && 'mx-0')}>
              <RecoveryDaySection
                dateKey={day.dateKey}
                workout={getRecoveryWorkout(day.workouts)}
                canEdit={false}
                compact
              />
            </div>
          )}
          {coachEditable && showRecoveryRow && (
            <div className="border-t border-border/60 px-3 py-2">
              <RecoveryDaySection
                dateKey={day.dateKey}
                workout={getRecoveryWorkout(day.workouts)}
                canEdit={isCoach}
                compact
                hideEmptyAdd={headerAddMenu}
              />
            </div>
          )}
          {showNoteRow && !coachEditable && (!headerAddMenu || day.dayNote) && (
            <div className={cn('border-t border-border/40 px-3 py-2', trainingMode && 'px-3')}>
              <DayNoteSection
                dateKey={day.dateKey}
                note={day.dayNote}
                canEdit={canEditDayNotes}
                athleteId={athleteId}
                compact
                hideEmptyAdd={headerAddMenu}
              />
            </div>
          )}
        </section>
        )
      })}
    </div>
  )
}
