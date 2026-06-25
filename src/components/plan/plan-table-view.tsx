'use client'

import { WorkoutType } from '@prisma/client'
import { AddWorkoutCell } from '@/components/plan/add-workout-cell'
import { PlanMobileDayStack } from '@/components/plan/plan-mobile-day-stack'
import { WorkoutModalTrigger } from '@/components/plan/workout-modal-trigger'
import { PlanWeekDndProvider } from '@/components/plan/plan-week-dnd'
import { WORKOUT_TYPE_COLORS, WORKOUT_TYPE_LABELS, SPORT_ROW_ORDER } from '@/lib/constants'
import type { PlanDay } from '@/lib/plan-week'
import {
  availableExtraPlanSports,
  canRemovePlanSportRow,
  resolveCoachPlanSportRows,
} from '@/lib/plan-sports'
import { AddPlanSportRowButton } from '@/components/coach/add-plan-sport-row-button'
import { RemovePlanSportRowButton } from '@/components/coach/remove-plan-sport-row-button'
import { SportWeekTotalsLabel } from '@/components/plan/sport-week-totals-label'
import { sumSportWeekTotals } from '@/lib/plan-week-totals'
import { EditDefaultPlanSportsButton } from '@/components/coach/edit-default-plan-sports-button'
import { dayHasRecovery, getRecoveryWorkout, recoveryDayCellClass, recoveryDayHeaderClass } from '@/lib/recovery-day'
import { dayHasRace, raceDayCellClass, raceDayHeaderClass } from '@/lib/race-day'
import { cn } from '@/lib/utils'
import { DayNoteSection } from '@/components/plan/day-note-section'
import { RecoveryDaySection } from '@/components/plan/recovery-day-section'
import { RacePlanItem } from '@/components/plan/race-plan-item'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { WorkoutPlanMeta } from '@/components/plan/workout-plan-meta'
import { StravaSyncedIndicator } from '@/components/plan/strava-synced-indicator'
import {
  PLAN_TABLE_CELL_HOVER_CLASS,
  PLAN_WORKOUT_ITEM_CLASS,
  RACE_PLAN_DOT_CLASS,
} from '@/lib/workout-display'

type PlanTableViewProps = {
  days: PlanDay[]
  isCoach: boolean
  canEditDayNotes?: boolean
  athleteId?: string
  athleteName?: string
  weekStartKey?: string
  planSportRows?: WorkoutType[]
  weekExtraPlanSportRows?: WorkoutType[]
  weekHiddenPlanSportRows?: WorkoutType[]
}

const COACH_SPORT_ROWS_FALLBACK = SPORT_ROW_ORDER.filter(
  (t) => t !== WorkoutType.REST && t !== WorkoutType.RECOVERY,
)

function dayHeaderClass(day: PlanDay) {
  if (dayHasRace(day.workouts)) return raceDayHeaderClass(day.isToday)
  if (dayHasRecovery(day.workouts)) return recoveryDayHeaderClass(day.isToday)
  return day.isToday ? 'bg-brand/5 text-brand' : 'text-muted-foreground'
}

function dayColumnClass(day: PlanDay) {
  if (dayHasRace(day.workouts)) return raceDayCellClass(day.isToday)
  if (dayHasRecovery(day.workouts)) return recoveryDayCellClass(day.isToday)
  return day.isToday ? 'bg-brand/[0.03]' : ''
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
            <span className={cn('mt-1 h-1.5 w-1.5 shrink-0 rounded-full landscape:max-lg:mt-0.5', planItemDot(w))} />
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

function NoteTableRow({
  days,
  canEditDayNotes,
  athleteId,
}: {
  days: PlanDay[]
  canEditDayNotes: boolean
  athleteId?: string
}) {
  return (
    <tr className="border-b border-border/60 bg-muted/10">
      <th className="border-r border-border/80 bg-muted/20 px-1 py-1 text-left align-top text-[8px] font-medium text-muted-foreground landscape:max-lg:px-0.5 lg:px-3 lg:py-2 lg:text-[10px]">
        Note
      </th>
      {days.map((day) => (
        <td
          key={day.dateKey}
          className={cn('p-0.5 align-top landscape:max-lg:px-px lg:p-1.5', dayColumnClass(day))}
        >
          <DayNoteSection
            dateKey={day.dateKey}
            note={day.dayNote}
            canEdit={canEditDayNotes}
            athleteId={athleteId}
            compact
          />
        </td>
      ))}
    </tr>
  )
}

function RecoveryTableRow({ days, isCoach }: { days: PlanDay[]; isCoach: boolean }) {
  return (
    <tr className="border-b border-border/60 bg-muted/10 last:border-0">
      <th className="border-r border-border/80 bg-muted/20 px-1 py-1 text-left align-top text-[8px] font-medium text-muted-foreground landscape:max-lg:px-0.5 lg:px-3 lg:py-2 lg:text-[10px]">
        Recovery
      </th>
      {days.map((day) => (
        <td
          key={day.dateKey}
          className={cn('p-0.5 align-top landscape:max-lg:px-px lg:p-1.5', dayColumnClass(day))}
        >
          <RecoveryDaySection
            dateKey={day.dateKey}
            workout={getRecoveryWorkout(day.workouts)}
            canEdit={isCoach}
            compact
          />
        </td>
      ))}
    </tr>
  )
}

function SportTableRows({
  days,
  sportRows,
  typesInWeek,
  isCoach,
  dragEnabled,
  athleteId,
  weekStartKey,
}: {
  days: PlanDay[]
  sportRows: WorkoutType[]
  typesInWeek: Set<WorkoutType>
  isCoach: boolean
  dragEnabled: boolean
  athleteId?: string
  weekStartKey?: string
}) {
  return (
    <>
      {sportRows.map((sport) => {
        const totals = sumSportWeekTotals(days, sport)

        return (
        <tr key={sport} className="border-b border-border/60">
          <th className="border-r border-border/80 bg-muted/20 p-0 text-left align-top">
            <div
              className={cn(
                'flex w-full items-center justify-between gap-1 px-1.5 py-1 landscape:max-lg:px-1 landscape:max-lg:py-0.5 lg:px-2 lg:py-1.5',
                WORKOUT_TYPE_COLORS[sport],
              )}
            >
              <span className="min-w-0 flex-1 text-[8px] font-semibold leading-none lg:text-[10px]">
                {WORKOUT_TYPE_LABELS[sport]}
              </span>
              {isCoach &&
                athleteId &&
                weekStartKey &&
                canRemovePlanSportRow(sport, typesInWeek) && (
                  <RemovePlanSportRowButton
                    athleteId={athleteId}
                    weekStartKey={weekStartKey}
                    sport={sport}
                    className="hidden shrink-0 lg:inline-flex"
                  />
                )}
            </div>
            <div className="px-1.5 py-1 landscape:max-lg:px-1 lg:px-2 lg:py-1.5">
              <SportWeekTotalsLabel sport={sport} totals={totals} />
            </div>
          </th>
          {days.map((day) => {
            const sportWorkouts = workoutsForSport(day, sport)
            return (
              <td
                key={day.dateKey}
                className={cn(
                  'p-0.5 align-top landscape:max-lg:px-px lg:p-1',
                  PLAN_TABLE_CELL_HOVER_CLASS,
                  dayColumnClass(day),
                )}
              >
                {isCoach ? (
                  <AddWorkoutCell
                    date={day.dateKey}
                    sport={sport}
                    workouts={sportWorkouts}
                    isCoach={isCoach}
                    layout="table"
                    dragEnabled={dragEnabled}
                  />
                ) : (
                  <div className="min-h-0 px-0.5 py-0.5 landscape:max-lg:min-h-0 lg:min-h-[5rem] lg:px-2 lg:py-2">
                    <WorkoutCell workouts={sportWorkouts} isCoach={isCoach} />
                  </div>
                )}
              </td>
            )
          })}
        </tr>
        )
      })}
    </>
  )
}

function PlanTableViewInner({
  days,
  isCoach,
  canEditDayNotes = false,
  athleteId,
  athleteName,
  weekStartKey,
  planSportRows = [],
  weekExtraPlanSportRows = [],
  weekHiddenPlanSportRows = [],
}: PlanTableViewProps) {
  const typesInWeek = new Set(days.flatMap((d) => d.workouts.map((w) => w.type)))
  const sportRows = isCoach
    ? athleteId
      ? resolveCoachPlanSportRows(
          planSportRows,
          weekExtraPlanSportRows,
          typesInWeek,
          weekHiddenPlanSportRows,
        )
      : COACH_SPORT_ROWS_FALLBACK
    : SPORT_ROW_ORDER.filter((t) => typesInWeek.has(t) && t !== WorkoutType.RECOVERY)
  const addableSports =
    isCoach && athleteId && weekStartKey
      ? availableExtraPlanSports(
          planSportRows,
          weekExtraPlanSportRows,
          typesInWeek,
          weekHiddenPlanSportRows,
        )
      : []
  const dragEnabled = isCoach

  const hasAnyDayNotes = days.some((d) => d.dayNote)
  const showNoteRow = canEditDayNotes || hasAnyDayNotes
  const showRecoveryRow = isCoach || days.some((d) => dayHasRecovery(d.workouts))
  const showEmptyWorkoutsRow = !isCoach && sportRows.length === 0 && !showRecoveryRow

  return (
    <>
      {isCoach && (
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="hidden text-xs text-muted-foreground landscape:max-lg:block lg:block">
            Drag a workout by the handle to move it to another day.
          </p>
          {athleteId && athleteName && weekStartKey && (
            <div className="flex flex-wrap items-center gap-1">
              <EditDefaultPlanSportsButton
                athleteId={athleteId}
                athleteName={athleteName}
                planSportRows={planSportRows}
              />
              <AddPlanSportRowButton
                athleteId={athleteId}
                weekStartKey={weekStartKey}
                availableSports={addableSports}
              />
            </div>
          )}
        </div>
      )}

      {/* Portrait mobile: stacked days */}
      <div className="portrait:max-lg:block landscape:max-lg:hidden lg:hidden">
        <PlanMobileDayStack
          days={days}
          isCoach={isCoach}
          canEditDayNotes={canEditDayNotes}
          coachEditable={isCoach}
          athleteId={athleteId}
          planSportRows={planSportRows}
          weekExtraPlanSportRows={weekExtraPlanSportRows}
          weekHiddenPlanSportRows={weekHiddenPlanSportRows}
          dragEnabled={dragEnabled}
        />
      </div>

      {/* Landscape + desktop: full week table */}
      <div className="hidden w-full overflow-hidden rounded-xl border border-border/80 bg-card shadow-[var(--shadow-card)] landscape:max-lg:block lg:block">
        <table className="w-full table-fixed border-collapse text-left landscape:max-lg:text-[9px] lg:text-sm">
          <colgroup>
            <col className="w-[11%]" />
            <col span={7} />
          </colgroup>
          <thead>
            <tr className="border-b border-border/80 bg-muted/40">
              <th className="border-r border-border/80 bg-muted/40 px-1 py-1.5 text-[9px] font-medium text-muted-foreground landscape:max-lg:px-0.5 lg:px-3 lg:py-2 lg:text-xs">
                Sport
              </th>
              {days.map((day) => (
                <th
                  key={day.dateKey}
                  className={cn(
                    'px-0.5 py-1.5 text-center align-top landscape:max-lg:px-px lg:px-1 lg:py-2',
                    dayHeaderClass(day),
                  )}
                >
                  <div className="text-[9px] font-medium landscape:max-lg:leading-tight lg:text-xs">{day.dayLabel}</div>
                  <div className="font-normal tabular-nums landscape:max-lg:text-[8px] lg:text-xs">{day.dateLabel}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {showNoteRow && (
              <NoteTableRow
                days={days}
                canEditDayNotes={canEditDayNotes}
                athleteId={athleteId}
              />
            )}
            <SportTableRows
              days={days}
              sportRows={sportRows}
              typesInWeek={typesInWeek}
              isCoach={isCoach}
              dragEnabled={dragEnabled}
              athleteId={athleteId}
              weekStartKey={weekStartKey}
            />
            {showEmptyWorkoutsRow && (
              <tr className="border-b border-border/60">
                <th className="border-r border-border/80 bg-muted/20 px-1 py-1 text-left align-top landscape:max-lg:px-0.5 lg:px-3 lg:py-2" />
                <td
                  colSpan={days.length}
                  className="px-3 py-8 text-center text-sm text-muted-foreground"
                >
                  No workouts scheduled this week.
                </td>
              </tr>
            )}
            {showRecoveryRow && <RecoveryTableRow days={days} isCoach={isCoach} />}
          </tbody>
        </table>
      </div>
    </>
  )
}

export function PlanTableView(props: PlanTableViewProps) {
  if (props.isCoach) {
    return (
      <PlanWeekDndProvider>
        <PlanTableViewInner {...props} />
      </PlanWeekDndProvider>
    )
  }
  return <PlanTableViewInner {...props} />
}
