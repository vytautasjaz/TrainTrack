"use client";

import { WorkoutType } from "@prisma/client";
import { AddWorkoutCell } from "@/components/plan/add-workout-cell";
import { PlanWorkoutCell } from "@/components/plan/plan-workout-row";
import { DayNoteSection } from "@/components/plan/day-note-section";
import { RecoveryDaySection } from "@/components/plan/recovery-day-section";
import { TrainingDayWorkoutList } from "@/components/training/training-day-workout-list";
import {
  WORKOUT_TYPE_COLORS,
  WORKOUT_TYPE_LABELS,
  SPORT_ROW_ORDER,
} from "@/lib/constants";
import type { PlanDay } from "@/lib/plan-week";
import { resolveCoachPlanSportRows } from "@/lib/plan-sports";
import { dayHasRecovery, getRecoveryWorkout } from "@/lib/recovery-day";
import { dayHasRace, getDayRacePriority, raceDaySectionClass } from "@/lib/race-day";
import { PlanDayAddMenu } from "@/components/plan/plan-day-add-menu";
import { DayDropSection } from "@/components/plan/day-drop-section";
import { cn } from "@/lib/utils";
import {
  WORKOUT_DAY_CARD_CLASS,
} from "@/lib/workout-display";
import { filterPlanSportRows } from "@/lib/plan-sport-filter";
import { useFilteredPlanDays } from "@/components/training/use-plan-sport-filter-data";
import { useOptionalPlanSportFilter } from "@/components/training/plan-sport-filter-context";

const COACH_SPORT_ROWS_FALLBACK = SPORT_ROW_ORDER.filter(
  (t) => t !== WorkoutType.REST && t !== WorkoutType.RECOVERY,
);

export type PlanMobileDayStackProps = {
  days: PlanDay[];
  isCoach: boolean;
  canEditDayNotes?: boolean;
  coachEditable?: boolean;
  athleteId?: string;
  planSportRows?: WorkoutType[];
  weekExtraPlanSportRows?: WorkoutType[];
  weekHiddenPlanSportRows?: WorkoutType[];
  dragEnabled?: boolean;
  className?: string;
  daySectionIdPrefix?: string;
  daySectionScrollMarginClass?: string;
  headerAddMenu?: boolean;
  trainingMode?: boolean;
};

function daySectionClass(
  day: PlanDay,
  trainingMode?: boolean,
  hasWorkoutContent = true,
) {
  const racePriority = getDayRacePriority(day.workouts)
  return cn(
    trainingMode && !hasWorkoutContent ? null : WORKOUT_DAY_CARD_CLASS,
    !trainingMode &&
      racePriority &&
      raceDaySectionClass(racePriority, day.isToday),
    !trainingMode &&
      dayHasRecovery(day.workouts) &&
      !racePriority &&
      "border-violet-500/25 bg-violet-500/[0.03]",
    day.isToday &&
      !racePriority &&
      !dayHasRecovery(day.workouts) &&
      (!trainingMode || hasWorkoutContent) &&
      (trainingMode ? "ring-2 ring-foreground/15" : "ring-1 ring-foreground/20"),
    day.isToday &&
      dayHasRecovery(day.workouts) &&
      !racePriority &&
      !trainingMode &&
      "ring-1 ring-violet-500/25",
  );
}

function workoutsForSport(day: PlanDay, sport: WorkoutType) {
  return day.workouts.filter((w) => w.type === sport);
}

export function PlanMobileDayStack({
  days: daysProp,
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
  const days = useFilteredPlanDays(daysProp);
  const sportFilter = useOptionalPlanSportFilter();
  const typesInDays = new Set(
    days.flatMap((d) => d.workouts.map((w) => w.type)),
  );
  const resolvedSportRows =
    coachEditable && isCoach
      ? athleteId
        ? resolveCoachPlanSportRows(
            planSportRows,
            weekExtraPlanSportRows,
            typesInDays,
            weekHiddenPlanSportRows,
          )
        : COACH_SPORT_ROWS_FALLBACK
      : SPORT_ROW_ORDER.filter(
          (t) => typesInDays.has(t) && t !== WorkoutType.RECOVERY,
        );
  const sportRows = sportFilter
    ? filterPlanSportRows(resolvedSportRows, sportFilter.visibleSportSet)
    : resolvedSportRows;

  const hasAnyDayNotes = days.some((d) => d.dayNote);
  const showNoteRow = hasAnyDayNotes;
  const showRecoveryRow = days.some((d) => dayHasRecovery(d.workouts));

  return (
    <div className={cn("space-y-4", trainingMode && "space-y-3", className)}>
      {days.map((day) => {
        const trainingWorkouts = day.workouts.filter(
          (w) =>
            w.type !== WorkoutType.REST &&
            w.type !== WorkoutType.RECOVERY &&
            !w.isRace,
        );
        const raceWorkouts = day.workouts.filter((w) => w.isRace);
        const hasListWorkouts =
          trainingWorkouts.length > 0 || raceWorkouts.length > 0;
        const hasWorkoutContent =
          hasListWorkouts || dayHasRecovery(day.workouts);

        const dayDropEnabled = isCoach && (trainingMode || dragEnabled);

        return (
          <div key={day.dateKey}>
            {trainingMode && day.isToday && (
              <div
                className="mb-3 flex items-center gap-3 pt-1"
                role="separator"
                aria-label="Today"
              >
                <div className="h-px flex-1 bg-foreground/20" />
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Today
                </span>
                <div className="h-px flex-1 bg-foreground/20" />
              </div>
            )}
          <DayDropSection
            dateKey={day.dateKey}
            enabled={dayDropEnabled}
            id={
              daySectionIdPrefix
                ? `${daySectionIdPrefix}-${day.dateKey}`
                : undefined
            }
            className={cn(
              daySectionClass(day, trainingMode, hasWorkoutContent),
              trainingMode && !hasWorkoutContent && "opacity-80",
              daySectionScrollMarginClass ??
                (daySectionIdPrefix && "scroll-mt-24"),
            )}
          >
            <div
              className={cn(
                "flex items-center justify-between gap-3 px-4",
                trainingMode &&
                  hasWorkoutContent &&
                  "border-b border-border/40 py-3",
                trainingMode && !hasWorkoutContent && "py-2",
                !trainingMode && "border-b border-border/60 py-3",
                !trainingMode &&
                  dayHasRecovery(day.workouts) &&
                  !dayHasRace(day.workouts) &&
                  "bg-violet-500/10",
                !trainingMode &&
                  day.isToday &&
                  !dayHasRace(day.workouts) &&
                  !dayHasRecovery(day.workouts) &&
                  "bg-muted/70",
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                {trainingMode && (
                  <div
                    className={cn(
                      "flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-[6px] text-center",
                      day.isToday
                        ? hasWorkoutContent
                          ? "bg-foreground text-background"
                          : "bg-muted text-foreground"
                        : hasWorkoutContent
                          ? "bg-muted/60"
                          : "bg-transparent text-muted-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "text-[10px] font-semibold uppercase leading-none",
                        day.isToday ? "opacity-90" : "text-muted-foreground",
                      )}
                    >
                      {day.dayLabel.slice(0, 3)}
                    </span>
                    <span className="text-lg font-bold leading-none tabular-nums">
                      {day.dateKey.split("-")[2]?.replace(/^0/, "") ??
                        day.dateLabel}
                    </span>
                  </div>
                )}
                <div className="min-w-0">
                  <p
                    className={cn(
                      "font-semibold",
                      trainingMode &&
                        !hasWorkoutContent &&
                        "text-sm text-muted-foreground",
                      trainingMode && hasWorkoutContent && "text-base",
                      !trainingMode && "text-sm",
                    )}
                  >
                    {day.dayLabel}
                  </p>
                  <p
                    className={cn(
                      "text-xs text-muted-foreground",
                      trainingMode &&
                        !hasWorkoutContent &&
                        "text-muted-foreground/70",
                    )}
                  >
                    {day.dateLabel}
                  </p>
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
              <div
                className={cn(
                  "border-b border-border/60 px-3 py-2",
                  day.dayNote && "bg-yellow-100 dark:bg-yellow-500/20",
                )}
              >
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
              hasListWorkouts && (
                <TrainingDayWorkoutList
                  key={`${day.dateKey}-${trainingWorkouts.map((w) => w.id).join(",")}`}
                  dateKey={day.dateKey}
                  workouts={trainingWorkouts}
                  raceWorkouts={raceWorkouts}
                  isCoach={isCoach}
                  reorderEnabled={isCoach}
                />
              )
            ) : (
              <div className="divide-y divide-border/60">
                {sportRows.map((sport) => {
                  const sportWorkouts = workoutsForSport(day, sport);
                  if (!coachEditable && sportWorkouts.length === 0) return null;

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
                        <PlanWorkoutCell
                          workouts={sportWorkouts}
                          isCoach={isCoach}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {!coachEditable && dayHasRecovery(day.workouts) && (
              <div
                className={cn(
                  "border-t border-border/40 px-3 py-2",
                  trainingMode && "mx-0",
                )}
              >
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
            {showNoteRow &&
              !coachEditable &&
              (!headerAddMenu || day.dayNote) && (
                <div
                  className={cn(
                    "border-t border-border/40 px-3 py-2",
                    trainingMode && "px-3",
                    day.dayNote && "bg-yellow-100 dark:bg-yellow-500/20",
                  )}
                >
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
          </DayDropSection>
          </div>
        );
      })}
    </div>
  );
}
