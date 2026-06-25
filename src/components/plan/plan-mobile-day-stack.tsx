'use client'

import { WorkoutType } from '@prisma/client'
import { AddWorkoutCell } from '@/components/plan/add-workout-cell'
import { WorkoutModalTrigger } from '@/components/plan/workout-modal-trigger'
import { DayNoteSection } from '@/components/plan/day-note-section'
import { RecoveryDaySection } from '@/components/plan/recovery-day-section'
import { RacePlanItem } from '@/components/plan/race-plan-item'
import { WorkoutPlanMeta } from '@/components/plan/workout-plan-meta'
import { StravaSyncedIndicator } from '@/components/plan/strava-synced-indicator'
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
}

function daySectionClass(day: PlanDay) {
  return cn(
    'rounded-2xl border border-border/70 bg-card shadow-[var(--shadow-card)]',
    dayHasRace(day.workouts) && raceDaySectionClass(day.isToday),
    dayHasRecovery(day.workouts) &&
      !dayHasRace(day.workouts) &&
      'border-violet-500/25 bg-violet-500/[0.03]',
    day.isToday &&
      !dayHasRace(day.workouts) &&
      !dayHasRecovery(day.workouts) &&
      'ring-1 ring-brand/25',
    day.isToday &&
      dayHasRecovery(day.workouts) &&
      !dayHasRace(day.workouts) &&
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
    <div className={cn('space-y-3', className)}>
      {days.map((day) => (
        <section
          key={day.dateKey}
          id={daySectionIdPrefix ? `${daySectionIdPrefix}-${day.dateKey}` : undefined}
          className={cn(
            daySectionClass(day),
            daySectionScrollMarginClass ?? (daySectionIdPrefix && 'scroll-mt-24'),
          )}
        >
          <div
            className={cn(
              'flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3',
              dayHasRace(day.workouts) && 'bg-amber-500/15',
              dayHasRecovery(day.workouts) && !dayHasRace(day.workouts) && 'bg-violet-500/10',
              day.isToday &&
                !dayHasRace(day.workouts) &&
                !dayHasRecovery(day.workouts) &&
                'bg-brand/[0.04]',
            )}
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold">{day.dayLabel}</p>
              <p className="text-xs text-muted-foreground">{day.dateLabel}</p>
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
          {!coachEditable && dayHasRecovery(day.workouts) && (
            <div className="border-t border-border/60 px-3 py-2">
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
            <div className="border-t border-border/60 px-3 py-2">
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
      ))}
    </div>
  )
}
