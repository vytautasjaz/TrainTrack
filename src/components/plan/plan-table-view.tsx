"use client";

import { WorkoutType } from "@prisma/client";
import { AddWorkoutCell } from "@/components/plan/add-workout-cell";
import { PlanMobileDayStack } from "@/components/plan/plan-mobile-day-stack";
import { PlanWorkoutCell } from "@/components/plan/plan-workout-row";
import { PlanWeekDndProvider } from "@/components/plan/plan-week-dnd";
import {
  WORKOUT_TYPE_COLORS,
  WORKOUT_TYPE_LABELS,
  SPORT_ROW_ORDER,
} from "@/lib/constants";
import type { PlanDay } from "@/lib/plan-week";
import {
  availableExtraPlanSports,
  canRemovePlanSportRow,
  resolveCoachPlanSportRows,
} from "@/lib/plan-sports";
import { AddPlanSportRowButton } from "@/components/coach/add-plan-sport-row-button";
import { RemovePlanSportRowButton } from "@/components/coach/remove-plan-sport-row-button";
import { SportWeekTotalsLabel } from "@/components/plan/sport-week-totals-label";
import { sumSportWeekTotals, sumWeekDurationMinutes } from "@/lib/plan-week-totals";
import { EditDefaultPlanSportsButton } from "@/components/coach/edit-default-plan-sports-button";
import {
  dayHasRecovery,
  getRecoveryWorkout,
  recoveryDayCellClass,
  recoveryDayHeaderClass,
} from "@/lib/recovery-day";
import {
  dayHasRace,
  raceDayCellClass,
  raceDayHeaderClass,
} from "@/lib/race-day";
import { CalendarPeriodNav } from "@/components/plan/calendar-period-nav";
import { cn, formatDuration } from "@/lib/utils";
import { DayNoteSection } from "@/components/plan/day-note-section";
import { RecoveryDaySection } from "@/components/plan/recovery-day-section";
import { PlanDayAddMenu } from "@/components/plan/plan-day-add-menu";
import {
  PLAN_TABLE_CELL_HOVER_CLASS,
} from "@/lib/workout-display";
import { Clock } from "lucide-react";
import { filterPlanSportRows } from "@/lib/plan-sport-filter";
import { useFilteredPlanDays } from "@/components/training/use-plan-sport-filter-data";
import { useOptionalPlanSportFilter } from "@/components/training/plan-sport-filter-context";

type PlanTableViewProps = {
  days: PlanDay[];
  isCoach: boolean;
  canEditDayNotes?: boolean;
  athleteId?: string;
  athleteName?: string;
  weekStartKey?: string;
  planSportRows?: WorkoutType[];
  weekExtraPlanSportRows?: WorkoutType[];
  weekHiddenPlanSportRows?: WorkoutType[];
  weekLabel?: string;
  prevWeekHref?: string;
  nextWeekHref?: string;
  /** Hide weekly volume + add-day footer rows (e.g. combined multi-week table). */
  hideFooterRows?: boolean;
  /**
   * Render only table section contents for embedding in a shared multi-week table.
   * `thead` = first week day header; `tbody-row` = day header as first body row.
   */
  tableFragment?: false | "thead" | "tbody-row";
  /** Skip nested DnD provider when parent already provides one. */
  skipDndProvider?: boolean;
};

const COACH_SPORT_ROWS_FALLBACK = SPORT_ROW_ORDER.filter(
  (t) => t !== WorkoutType.REST && t !== WorkoutType.RECOVERY,
);

function dayHeaderClass(day: PlanDay) {
  if (dayHasRace(day.workouts)) return raceDayHeaderClass(day.isToday);
  if (dayHasRecovery(day.workouts)) return recoveryDayHeaderClass(day.isToday);
  return day.isToday ? "bg-muted text-foreground" : "text-muted-foreground";
}

function dayColumnClass(day: PlanDay) {
  if (dayHasRace(day.workouts)) return raceDayCellClass(day.isToday);
  if (dayHasRecovery(day.workouts)) return recoveryDayCellClass(day.isToday);
  return day.isToday ? "bg-muted/60" : "";
}

function workoutsForSport(day: PlanDay, sport: WorkoutType) {
  return day.workouts.filter((w) => w.type === sport);
}

function DayHeaderRow({
  days,
  as = "th",
  emphasizeTop = false,
}: {
  days: PlanDay[];
  as?: "th" | "td";
  emphasizeTop?: boolean;
}) {
  const Cell = as;
  return (
    <tr
      className={cn(
        "border-b border-border/80 bg-muted/40",
        emphasizeTop && "border-t-2 border-t-border",
      )}
    >
      <Cell className="border-r border-border/80 bg-muted/40 px-1 py-1.5 text-left text-[9px] font-medium text-muted-foreground landscape:max-lg:px-0.5 lg:px-3 lg:py-2 lg:text-xs">
        Sport
      </Cell>
      {days.map((day) => (
        <Cell
          key={day.dateKey}
          className={cn(
            "px-0.5 py-1.5 text-center align-top landscape:max-lg:px-px lg:px-1 lg:py-2",
            dayHeaderClass(day),
          )}
        >
          <div className="text-[9px] font-medium landscape:max-lg:leading-tight lg:text-xs">
            {day.dayLabel}
          </div>
          <div className="font-normal tabular-nums landscape:max-lg:text-[8px] lg:text-xs">
            {day.dateLabel}
          </div>
        </Cell>
      ))}
    </tr>
  );
}

function NoteTableRow({
  days,
  canEditDayNotes,
  athleteId,
}: {
  days: PlanDay[];
  canEditDayNotes: boolean;
  athleteId?: string;
}) {
  return (
    <tr className="border-b border-border/60 bg-muted/10">
      <th className="border-r border-border/80 bg-muted/20 px-1 py-1 text-left align-top text-[8px] font-medium text-muted-foreground landscape:max-lg:px-0.5 lg:px-3 lg:py-2 lg:text-[10px]">
        Note
      </th>
      {days.map((day) => (
        <td
          key={day.dateKey}
          className={cn(
            "p-0.5 align-top landscape:max-lg:px-px lg:p-1.5",
            dayColumnClass(day),
          )}
        >
          <DayNoteSection
            dateKey={day.dateKey}
            note={day.dayNote}
            canEdit={canEditDayNotes}
            athleteId={athleteId}
            compact
            showFullText
            hideEmptyAdd
          />
        </td>
      ))}
    </tr>
  );
}

function RecoveryTableRow({
  days,
  isCoach,
}: {
  days: PlanDay[];
  isCoach: boolean;
}) {
  return (
    <tr className="border-b border-border/60 bg-muted/10">
      <th className="border-r border-border/80 bg-muted/20 px-1 py-1 text-left align-top text-[8px] font-medium text-muted-foreground landscape:max-lg:px-0.5 lg:px-3 lg:py-2 lg:text-[10px]">
        Recovery
      </th>
      {days.map((day) => (
        <td
          key={day.dateKey}
          className={cn(
            "p-0.5 align-top landscape:max-lg:px-px lg:p-1.5",
            dayColumnClass(day),
          )}
        >
          <RecoveryDaySection
            dateKey={day.dateKey}
            workout={getRecoveryWorkout(day.workouts)}
            canEdit={isCoach}
            compact
            hideEmptyAdd
          />
        </td>
      ))}
    </tr>
  );
}

function VolumeTableRow({
  days,
  isCoach,
  canEditDayNotes,
  athleteId,
}: {
  days: PlanDay[];
  isCoach: boolean;
  canEditDayNotes: boolean;
  athleteId?: string;
}) {
  const { planned: totalMin, actual: actualMin } = sumWeekDurationMinutes(days);
  const showDayAdd = isCoach || canEditDayNotes;

  return (
    <tr className="border-t border-border/80">
      <th className="border-r border-border/80 bg-muted/20 p-0 text-left align-top">
        <div className="flex w-full items-center px-1.5 py-1 landscape:max-lg:px-1 landscape:max-lg:py-0.5 lg:px-2 lg:py-1.5">
          <span className="min-w-0 flex-1 text-[8px] font-semibold leading-none text-muted-foreground lg:text-[10px]">
            Weekly volume
          </span>
        </div>
        {totalMin > 0 && (
          <div className="px-1.5 py-1 landscape:max-lg:px-1 lg:px-2 lg:py-1.5">
            <div className="flex flex-col gap-0.5 text-muted-foreground lg:gap-1">
              <div className="flex items-center gap-1 text-[9px] leading-none tabular-nums lg:text-[10px]">
                <Clock className="h-2.5 w-2.5 shrink-0 opacity-60" strokeWidth={2.25} />
                {actualMin > 0 ? (
                  <>
                    <span className="font-semibold text-foreground">{formatDuration(actualMin)}</span>
                    <span className="opacity-50">/</span>
                    <span>{formatDuration(totalMin)}</span>
                  </>
                ) : (
                  <span>{formatDuration(totalMin)}</span>
                )}
              </div>
            </div>
          </div>
        )}
      </th>
      {days.map((day) => (
        <td
          key={day.dateKey}
          className={cn(
            "p-0.5 landscape:max-lg:px-px lg:p-1",
            showDayAdd && "h-px align-top",
            dayColumnClass(day),
          )}
        >
          {showDayAdd ? (
            <div className="flex h-full min-h-[2.25rem] items-center justify-center lg:min-h-[2.75rem]">
              <PlanDayAddMenu
                dateKey={day.dateKey}
                isCoach={isCoach}
                canAddNote={canEditDayNotes}
                athleteId={athleteId}
                dayNote={day.dayNote}
                recoveryWorkout={getRecoveryWorkout(day.workouts)}
                menuPlacement="top"
                variant="subtle"
              />
            </div>
          ) : null}
        </td>
      ))}
    </tr>
  );
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
  days: PlanDay[];
  sportRows: WorkoutType[];
  typesInWeek: Set<WorkoutType>;
  isCoach: boolean;
  dragEnabled: boolean;
  athleteId?: string;
  weekStartKey?: string;
}) {
  return (
    <>
      {sportRows.map((sport) => {
        const totals = sumSportWeekTotals(days, sport);

        return (
          <tr key={sport} className="border-b border-border/60">
            <th className="border-r border-border/80 bg-muted/20 p-0 text-left align-top">
              <div
                className={cn(
                  "flex w-full items-center justify-between gap-1 px-1.5 py-1 landscape:max-lg:px-1 landscape:max-lg:py-0.5 lg:px-2 lg:py-1.5",
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
              const sportWorkouts = workoutsForSport(day, sport);
              const emptyCoachCell = isCoach && sportWorkouts.length === 0;
              return (
                <td
                  key={day.dateKey}
                  className={cn(
                    "p-0.5 align-top landscape:max-lg:px-px lg:p-1",
                    emptyCoachCell && "h-px",
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
                      <PlanWorkoutCell workouts={sportWorkouts} isCoach={isCoach} />
                    </div>
                  )}
                </td>
              );
            })}
          </tr>
        );
      })}
    </>
  );
}

function PlanTableViewInner({
  days: daysProp,
  isCoach,
  canEditDayNotes = false,
  athleteId,
  athleteName,
  weekStartKey,
  planSportRows = [],
  weekExtraPlanSportRows = [],
  weekHiddenPlanSportRows = [],
  weekLabel,
  prevWeekHref,
  nextWeekHref,
  hideFooterRows = false,
  tableFragment = false,
}: PlanTableViewProps) {
  const days = useFilteredPlanDays(daysProp);
  const sportFilter = useOptionalPlanSportFilter();
  const typesInWeek = new Set(
    days.flatMap((d) => d.workouts.map((w) => w.type)),
  );
  const resolvedSportRows = isCoach
    ? athleteId
      ? resolveCoachPlanSportRows(
          planSportRows,
          weekExtraPlanSportRows,
          typesInWeek,
          weekHiddenPlanSportRows,
        )
      : COACH_SPORT_ROWS_FALLBACK
    : SPORT_ROW_ORDER.filter(
        (t) => typesInWeek.has(t) && t !== WorkoutType.RECOVERY,
      );
  const sportRows = sportFilter
    ? filterPlanSportRows(resolvedSportRows, sportFilter.visibleSportSet)
    : resolvedSportRows;
  const addableSports =
    isCoach && athleteId && weekStartKey
      ? availableExtraPlanSports(
          planSportRows,
          weekExtraPlanSportRows,
          typesInWeek,
          weekHiddenPlanSportRows,
        )
      : [];
  const dragEnabled = isCoach;

  const hasAnyDayNotes = days.some((d) => d.dayNote);
  const showNoteRow = hasAnyDayNotes;
  const showRecoveryRow = days.some((d) => dayHasRecovery(d.workouts));
  const showEmptyWorkoutsRow =
    !isCoach && sportRows.length === 0 && !showRecoveryRow;

  const bodyRows = (
    <>
      {tableFragment === "tbody-row" && (
        <DayHeaderRow days={days} as="th" emphasizeTop />
      )}
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
      {showRecoveryRow && (
        <RecoveryTableRow days={days} isCoach={isCoach} />
      )}
      {!hideFooterRows && (
        <VolumeTableRow
          days={days}
          isCoach={isCoach}
          canEditDayNotes={canEditDayNotes}
          athleteId={athleteId}
        />
      )}
    </>
  );

  if (tableFragment) {
    return (
      <>
        {tableFragment === "thead" && (
          <thead>
            <DayHeaderRow days={days} as="th" />
          </thead>
        )}
        <tbody>{bodyRows}</tbody>
      </>
    );
  }

  return (
    <>
      {/* Portrait mobile: stacked days */}
      <div className="portrait:max-lg:block landscape:max-lg:hidden lg:hidden">
        {isCoach && athleteId && athleteName && weekStartKey && (
          <div className="mb-2 flex flex-wrap items-center justify-end gap-1">
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
          trainingMode={!isCoach}
          headerAddMenu={isCoach || canEditDayNotes}
        />
      </div>

      {/* Landscape + desktop: full week table */}
      <div className="hidden w-full landscape:max-lg:block lg:block">
        {(weekLabel ||
          (isCoach && athleteId && athleteName && weekStartKey)) && (
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            {weekLabel ? (
              <CalendarPeriodNav
                label={weekLabel}
                prevHref={prevWeekHref}
                nextHref={nextWeekHref}
                prevAriaLabel="Previous week"
                nextAriaLabel="Next week"
                align="start"
                className="mb-0"
              />
            ) : (
              <span />
            )}
            {isCoach && athleteId && athleteName && weekStartKey && (
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
        <div className="overflow-x-auto rounded-[6px] border border-border bg-card shadow-none">
          <table className="w-full table-fixed border-collapse text-left landscape:max-lg:text-[9px] lg:text-sm">
            <colgroup>
              <col className="w-[11%]" />
              <col span={7} />
            </colgroup>
            <thead>
              <DayHeaderRow days={days} as="th" />
            </thead>
            <tbody>{bodyRows}</tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export function PlanTableView({
  skipDndProvider = false,
  ...props
}: PlanTableViewProps) {
  if (props.isCoach && !skipDndProvider) {
    return (
      <PlanWeekDndProvider>
        <PlanTableViewInner {...props} />
      </PlanWeekDndProvider>
    );
  }
  return <PlanTableViewInner {...props} />;
}
