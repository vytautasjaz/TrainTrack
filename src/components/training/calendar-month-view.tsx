"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChartColumn,
  Maximize2,
  Minimize2,
  StickyNote,
} from "lucide-react";
import { WorkoutType } from "@prisma/client";
import { CalendarPeriodNav } from "@/components/plan/calendar-period-nav";
import { DayDropSection } from "@/components/plan/day-drop-section";
import { DayNoteSection } from "@/components/plan/day-note-section";
import { PlanDayAddMenu } from "@/components/plan/plan-day-add-menu";
import {
  CoachRescheduleReviewActions,
  needsCoachRescheduleReview,
} from "@/components/plan/coach-reschedule-review-actions";
import { PlanWorkoutActionsMenu } from "@/components/plan/plan-workout-actions-menu";
import { SeasonEventChips } from "@/components/plan/season-event-chips";
import { WorkoutModalTrigger } from "@/components/plan/workout-modal-trigger";
import { WeekPlanWorkoutCard } from "@/components/plan/week-plan-workout-card";
import {
  WeekCardSizeProvider,
  useWeekCardSize,
} from "@/components/plan/week-card-size-context";
import { WeekCardSizeSwitch } from "@/components/plan/week-card-size-switch";
import { usePlanWeekDnd } from "@/components/plan/plan-week-dnd";
import { useOptimisticWorkoutStatus } from "@/components/plan/athlete-workout-quick-actions";
import {
  WorkoutCardCornerOverlay,
  workoutCardCornerSpacerClass,
} from "@/components/plan/workout-card-corner-overlay";
import { CalendarWeekStatsCell } from "@/components/training/calendar-week-stats-cell";
import {
  PlanSportFilterBar,
  PlanViewModeControl,
  ToolbarDivider,
  ToolbarFilterGroup,
  ToolbarTextToggle,
} from "@/components/training/plan-sport-filter-bar";
import { useFilteredWorkoutsByDate } from "@/components/training/use-plan-sport-filter-data";
import { useTrainingLibrary } from "@/components/training/training-library-context";
import { TrainingLibraryToolbarToggle } from "@/components/training/training-library-toolbar-toggle";
import { FeedbackLayerToggle } from "@/components/training/feedback-layer-toggle";
import { AthleteAvatar } from "@/components/athlete/athlete-avatar";
import type { DayNoteData } from "@/lib/day-notes";
import { dayNoteHasVisibleContent } from "@/lib/day-notes";
import type { PlanWorkoutDetail } from "@/lib/plan-workout";
import {
  athleteHasQuickLogActions,
  canDragPlanWorkout,
} from "@/lib/plan-workout";
import { getRecoveryWorkout } from "@/lib/recovery-day";
import type { SeasonEventData } from "@/lib/season-planner";
import { parseDateOnly } from "@/lib/dates";
import { setCalendarExpanded } from "@/lib/calendar-expand";
import { MONTH_CARD_SIZE_STORAGE_KEY } from "@/lib/week-card-size";
import { cn } from "@/lib/utils";
import { collapseTriathlonRaceWorkouts } from "@/lib/triathlon-race-summary";
import {
  SHOW_EVENTS_STORAGE_KEY,
  SHOW_NOTES_STORAGE_KEY,
  SHOW_STATS_STORAGE_KEY,
} from "@/lib/plan-calendar-layers";
import { useStoredFlag } from "@/hooks/use-stored-flag";
import {
  TABLE_BODY,
  TABLE_HEADER,
  TABLE_HEADER_CELL,
  TABLE_HEADER_CELL_MUTED,
  TABLE_HEADER_CELL_STRONG,
  TABLE_HEADER_CELL_WEEKEND,
  TABLE_HEADER_VLINE,
  TABLE_SHELL,
} from "@/lib/table-styles";

const DAY_NAMES = [
  { short: "Mon", full: "Monday" },
  { short: "Tue", full: "Tuesday" },
  { short: "Wed", full: "Wednesday" },
  { short: "Thu", full: "Thursday" },
  { short: "Fri", full: "Friday" },
  { short: "Sat", full: "Saturday" },
  { short: "Sun", full: "Sunday" },
] as const;

const STATS_GRID_COLS =
  "grid-cols-[minmax(11rem,14rem)_repeat(7,minmax(0,1fr))]";

function MonthCardSizeToolbarControl() {
  const { cardSize, setCardSize } = useWeekCardSize();
  return <WeekCardSizeSwitch value={cardSize} onChange={setCardSize} />;
}

type CalendarDay = {
  dateKey: string;
  dayNumber: number;
  inMonth: boolean;
  isToday: boolean;
};

type CalendarMonthBlock = {
  label: string;
  days: CalendarDay[];
};

type CalendarMonthViewProps = {
  rangeLabel: string;
  months: CalendarMonthBlock[];
  monthSpan: 1 | 2 | 3;
  monthOffset: number;
  workoutsByDate: Map<string, PlanWorkoutDetail[]>;
  notesByDate?: Map<string, DayNoteData>;
  eventsByDate?: Map<string, SeasonEventData[]>;
  isCoach: boolean;
  canEditDayNotes?: boolean;
  athleteId?: string;
  athleteName?: string;
  athleteAvatarUrl?: string | null;
  planSportRows?: WorkoutType[];
  swimCssSecPer100m?: number | null;
  prevMonthHref?: string;
  nextMonthHref?: string;
};

function CalendarWorkoutCard({
  workout,
  isCoach,
}: {
  workout: PlanWorkoutDetail;
  isCoach: boolean;
}) {
  const dnd = usePlanWeekDnd();
  const [dragging, setDragging] = useState(false);
  const { status, setOptimisticStatus } = useOptimisticWorkoutStatus(workout);
  const canDrag = Boolean(dnd) && canDragPlanWorkout(workout, status);
  const showQuickActions = athleteHasQuickLogActions(workout, isCoach);
  const showCoachMenu =
    isCoach && !workout.isRace && workout.type !== WorkoutType.RECOVERY;
  const showReview = isCoach && needsCoachRescheduleReview(workout);

  return (
    <div className="group/card relative w-full min-w-0">
      <WorkoutModalTrigger
        workout={workout}
        isCoach={isCoach}
        nestedInteractive={showReview}
        className={cn(
          "block w-full min-w-0 cursor-default",
          dragging && "opacity-50",
        )}
        title={
          canDrag
            ? isCoach
              ? `${workout.title} — drag to move`
              : `${workout.title} — drag to reschedule`
            : undefined
        }
        draggable={canDrag}
        onDragStart={(e) => {
          if (!dnd || !canDrag) return;
          setDragging(true);
          dnd.setDragWorkout({
            id: workout.id,
            sport: workout.type,
            dateKey: workout.dateKey,
          });
          e.dataTransfer.effectAllowed = "copyMove";
          e.dataTransfer.setData("text/plain", workout.id);
        }}
        onDragEnd={() => {
          setDragging(false);
          dnd?.setDragWorkout(null);
        }}
      >
        <WeekPlanWorkoutCard
          workout={workout}
          status={status}
          isCoach={isCoach}
          hideCompletedBadge={showQuickActions}
          actions={
            showQuickActions || showCoachMenu ? (
              <span
                className={workoutCardCornerSpacerClass(workout, {
                  showQuickActions,
                  showCoachMenu,
                })}
                aria-hidden
              />
            ) : null
          }
          footer={
            showReview ? (
              <CoachRescheduleReviewActions
                workout={workout}
                isCoach={isCoach}
              />
            ) : null
          }
        />
      </WorkoutModalTrigger>
      <WorkoutCardCornerOverlay
        workout={workout}
        isCoach={isCoach}
        showQuickActions={showQuickActions}
        status={status}
        onStatusChange={setOptimisticStatus}
        className="right-0.5 top-0.5"
        leading={
          showCoachMenu ? (
            <PlanWorkoutActionsMenu workout={workout} compact />
          ) : undefined
        }
      />
    </div>
  );
}

export function CalendarMonthView({
  rangeLabel,
  months,
  monthSpan,
  monthOffset,
  workoutsByDate,
  notesByDate,
  eventsByDate,
  isCoach,
  canEditDayNotes = false,
  athleteId,
  athleteName,
  athleteAvatarUrl,
  planSportRows = [],
  swimCssSecPer100m = null,
  prevMonthHref,
  nextMonthHref,
}: CalendarMonthViewProps) {
  const [showNotes, setShowNotes] = useStoredFlag(SHOW_NOTES_STORAGE_KEY, true);
  const [showEvents, setShowEvents] = useStoredFlag(
    SHOW_EVENTS_STORAGE_KEY,
    true,
  );
  const [showStats, setShowStats] = useStoredFlag(SHOW_STATS_STORAGE_KEY, false);
  const [expanded, setExpanded] = useState(false);
  const library = useTrainingLibrary();
  const filteredByDate = useFilteredWorkoutsByDate(workoutsByDate);

  function toggleShowNotes() {
    setShowNotes((prev) => !prev);
  }

  function toggleShowEvents() {
    setShowEvents((prev) => !prev);
  }

  function toggleShowStats() {
    setShowStats((prev) => !prev);
  }

  function toggleExpanded() {
    setExpanded((prev) => {
      const next = !prev;
      setCalendarExpanded(next);
      return next;
    });
  }

  useEffect(() => {
    return () => {
      setCalendarExpanded(false);
    };
  }, []);

  useEffect(() => {
    if (!expanded) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setExpanded(false);
        setCalendarExpanded(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [expanded]);

  const spanHrefs = {
    1: `/training?view=calendar&month=${monthOffset}`,
    2: `/training?view=calendar&month=${monthOffset}&months=2`,
    3: `/training?view=calendar&month=${monthOffset}&months=3`,
  } as const;

  function dayWorkouts(dateKey: string): PlanWorkoutDetail[] {
    return collapseTriathlonRaceWorkouts(filteredByDate.get(dateKey) ?? []);
  }

  function dayNote(dateKey: string): DayNoteData | null {
    return notesByDate?.get(dateKey) ?? null;
  }

  function dayEvents(dateKey: string): SeasonEventData[] {
    return eventsByDate?.get(dateKey) ?? [];
  }

  /** One continuous grid for 1m/2m/3m — no overlapping week duplicates. */
  const days = useMemo(() => {
    const seen = new Set<string>();
    const merged: CalendarDay[] = [];
    for (const month of months) {
      for (const day of month.days) {
        if (seen.has(day.dateKey)) continue;
        seen.add(day.dateKey);
        merged.push(day);
      }
    }
    return merged;
  }, [months]);

  const weeks = useMemo(() => {
    const chunks: CalendarDay[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      chunks.push(days.slice(i, i + 7));
    }
    return chunks;
  }, [days]);

  const gridCols = showStats ? STATS_GRID_COLS : "grid-cols-7";

  return (
    <WeekCardSizeProvider storageKey={MONTH_CARD_SIZE_STORAGE_KEY}>
    <div className={cn("space-y-4", expanded && "tt-calendar-expanded-root space-y-2")}>
      <div className="mb-2 flex min-w-0 items-end gap-1 overflow-x-auto pb-0.5">
        <div className="mb-0.5 flex min-w-0 shrink-0 items-end gap-3">
          {expanded && isCoach && athleteName ? (
            <div className="flex min-w-0 items-center gap-2.5">
              <AthleteAvatar
                name={athleteName}
                avatarUrl={athleteAvatarUrl}
                size="sm"
              />
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--tt-ink-faint,#9a9a9a)]">
                  Planning for
                </p>
                <p className="truncate text-sm font-semibold leading-tight text-[var(--tt-ink,#111)]">
                  {athleteName}
                </p>
              </div>
            </div>
          ) : null}
          <CalendarPeriodNav
            label={rangeLabel}
            prevHref={prevMonthHref}
            nextHref={nextMonthHref}
            prevAriaLabel="Previous month"
            nextAriaLabel="Next month"
            align="start"
            className="mb-0 shrink-0"
          />
        </div>

        <div className="ml-auto flex min-w-0 shrink-0 items-end gap-2">
          <ToolbarFilterGroup
            label="Filter"
            hint="Show or hide sports and workout statuses"
          >
            <PlanSportFilterBar className="shrink-0" />
          </ToolbarFilterGroup>

          <ToolbarDivider className="mb-1.5 mx-0.5" />

          <ToolbarFilterGroup
            label="Layers"
            hint="Toggle Notes, Events, Stats, and Feedback on cards"
          >
            <div className="flex shrink-0 items-center gap-0.5">
              <ToolbarTextToggle
                pressed={showNotes}
                onClick={toggleShowNotes}
                title={showNotes ? "Hide day notes" : "Show day notes"}
              >
                <StickyNote className="h-3 w-3" aria-hidden />
                Notes
              </ToolbarTextToggle>
              <ToolbarTextToggle
                pressed={showEvents}
                onClick={toggleShowEvents}
                title={showEvents ? "Hide season events" : "Show season events"}
              >
                <CalendarDays className="h-3 w-3" aria-hidden />
                Events
              </ToolbarTextToggle>
              <ToolbarTextToggle
                pressed={showStats}
                onClick={toggleShowStats}
                title={
                  showStats
                    ? "Hide weekly sport stats"
                    : "Show weekly sport stats"
                }
              >
                <ChartColumn className="h-3 w-3" aria-hidden />
                Stats
              </ToolbarTextToggle>
              <FeedbackLayerToggle />
            </div>
          </ToolbarFilterGroup>

          <ToolbarDivider className="mb-1.5 mx-0.5" />

          <ToolbarFilterGroup label="View" hint="How workout cards are colored">
            <PlanViewModeControl className="shrink-0" />
          </ToolbarFilterGroup>

          <ToolbarDivider className="mb-1.5 mx-0.5" />

          <ToolbarFilterGroup
            label="Cards"
            hint="Workout card density on the month grid"
          >
            <MonthCardSizeToolbarControl />
          </ToolbarFilterGroup>

          <ToolbarDivider className="mb-1.5 mx-0.5" />

          <ToolbarFilterGroup
            label="Layout"
            hint="Months shown and expanded calendar"
          >
            <div className="flex items-center gap-0.5" role="group" aria-label="Months shown">
              {([1, 2, 3] as const).map((n) => (
                <Link
                  key={n}
                  href={spanHrefs[n]}
                  title={`Show ${n} month${n > 1 ? "s" : ""}`}
                  aria-current={monthSpan === n ? "page" : undefined}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-0.5 rounded-[4px] px-1.5 py-1 text-xs transition",
                    monthSpan === n
                      ? "font-semibold text-foreground"
                      : "font-medium text-muted-foreground/40 hover:text-muted-foreground/70",
                  )}
                >
                  {n}m
                </Link>
              ))}
              <ToolbarTextToggle
                pressed={expanded}
                onClick={toggleExpanded}
                title={expanded ? "Exit expanded view" : "Expand calendar"}
                className="font-semibold text-foreground hover:text-foreground [&_svg]:opacity-100"
              >
                {expanded ? (
                  <Minimize2 className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" aria-hidden />
                )}
              </ToolbarTextToggle>
            </div>
          </ToolbarFilterGroup>

          {library ? (
            <>
              <ToolbarDivider className="mb-1.5 mx-0.5" />
              <ToolbarFilterGroup
                label="Library"
                hint="Open or close the workout library panel"
              >
                <TrainingLibraryToolbarToggle />
              </ToolbarFilterGroup>
            </>
          ) : null}
        </div>
      </div>

      <div className={TABLE_SHELL}>
        <div className={cn("grid", gridCols, TABLE_HEADER)}>
          {showStats ? (
            <div
              className={cn(
                "flex items-center px-1.5 py-2 text-left text-[11px] font-semibold",
                TABLE_HEADER_VLINE,
                TABLE_HEADER_CELL_MUTED,
              )}
            >
              Stats
            </div>
          ) : null}
          {DAY_NAMES.map((name, i) => (
            <div
              key={name.full}
              className={cn(
                "flex items-center justify-center px-1 py-2 text-center text-[11px] font-semibold",
                i < 6 && TABLE_HEADER_VLINE,
                i >= 5 && TABLE_HEADER_CELL_WEEKEND,
                i >= 5 ? TABLE_HEADER_CELL : TABLE_HEADER_CELL_STRONG,
              )}
            >
              <span className="hidden sm:inline">{name.full}</span>
              <span className="sm:hidden">{name.short}</span>
            </div>
          ))}
        </div>

        <div className={cn("grid gap-px bg-border", gridCols, TABLE_BODY)}>
          {weeks.map((week, weekIndex) => (
            <CalendarWeekRow
              key={week[0]?.dateKey ?? weekIndex}
              week={week}
              weekIndex={weekIndex}
              allDays={days}
              showStats={showStats}
              showNotes={showNotes}
              showEvents={showEvents}
              isCoach={isCoach}
              canEditDayNotes={canEditDayNotes}
              athleteId={athleteId}
              planSportRows={planSportRows}
              swimCssSecPer100m={swimCssSecPer100m}
              workoutsByDate={workoutsByDate}
              dayWorkouts={dayWorkouts}
              dayNote={dayNote}
              dayEvents={dayEvents}
            />
          ))}
        </div>
      </div>
    </div>
    </WeekCardSizeProvider>
  );
}

function CalendarWeekRow({
  week,
  weekIndex,
  allDays,
  showStats,
  showNotes,
  showEvents,
  isCoach,
  canEditDayNotes,
  athleteId,
  planSportRows,
  swimCssSecPer100m,
  workoutsByDate,
  dayWorkouts,
  dayNote,
  dayEvents,
}: {
  week: CalendarDay[];
  weekIndex: number;
  allDays: CalendarDay[];
  showStats: boolean;
  showNotes: boolean;
  showEvents: boolean;
  isCoach: boolean;
  canEditDayNotes: boolean;
  athleteId?: string;
  planSportRows: WorkoutType[];
  swimCssSecPer100m: number | null;
  workoutsByDate: Map<string, PlanWorkoutDetail[]>;
  dayWorkouts: (dateKey: string) => PlanWorkoutDetail[];
  dayNote: (dateKey: string) => DayNoteData | null;
  dayEvents: (dateKey: string) => SeasonEventData[];
}) {
  return (
    <>
      {showStats ? (
        <CalendarWeekStatsCell
          weekDays={week}
          workoutsByDate={workoutsByDate}
          planSportRows={planSportRows}
          swimCssSecPer100m={swimCssSecPer100m}
        />
      ) : null}
      {week.map((day, dayInWeek) => {
        const dayIndex = weekIndex * 7 + dayInWeek;
        const prevDay = dayIndex > 0 ? allDays[dayIndex - 1]! : null;
        const monthBoundary =
          !prevDay ||
          prevDay.dateKey.slice(0, 7) !== day.dateKey.slice(0, 7);

        return (
          <CalendarDayCell
            key={day.dateKey}
            day={day}
            dayIndex={dayIndex}
            isWeekend={dayInWeek >= 5}
            monthBoundary={monthBoundary}
            filtered={dayWorkouts(day.dateKey)}
            note={dayNote(day.dateKey)}
            events={dayEvents(day.dateKey)}
            showNotes={showNotes}
            showEvents={showEvents}
            isCoach={isCoach}
            canEditDayNotes={canEditDayNotes}
            athleteId={athleteId}
            workoutsByDate={workoutsByDate}
          />
        );
      })}
    </>
  );
}

function CalendarDayCell({
  day,
  dayIndex,
  isWeekend,
  monthBoundary,
  filtered,
  note,
  events,
  showNotes,
  showEvents,
  isCoach,
  canEditDayNotes,
  athleteId,
  workoutsByDate,
}: {
  day: CalendarDay;
  dayIndex: number;
  isWeekend: boolean;
  monthBoundary: boolean;
  filtered: PlanWorkoutDetail[];
  note: DayNoteData | null;
  events: SeasonEventData[];
  showNotes: boolean;
  showEvents: boolean;
  isCoach: boolean;
  canEditDayNotes: boolean;
  athleteId?: string;
  workoutsByDate: Map<string, PlanWorkoutDetail[]>;
}) {
  const monthLabel = monthBoundary
    ? parseDateOnly(day.dateKey).toLocaleDateString(undefined, {
        month: "long",
      })
    : null;

  const hasContent =
    filtered.length > 0 ||
    (showEvents && events.length > 0) ||
    (showNotes && dayNoteHasVisibleContent(note));

  const addMenu = (
    <PlanDayAddMenu
      dateKey={day.dateKey}
      isCoach={isCoach}
      canAddNote={canEditDayNotes}
      athleteId={athleteId}
      dayNote={note}
      recoveryWorkout={getRecoveryWorkout(
        workoutsByDate.get(day.dateKey) ?? [],
      )}
      revealOnHover
    />
  );

  const emptyAddMenu = (
    <PlanDayAddMenu
      dateKey={day.dateKey}
      isCoach={isCoach}
      canAddNote={canEditDayNotes}
      athleteId={athleteId}
      dayNote={note}
      recoveryWorkout={getRecoveryWorkout(
        workoutsByDate.get(day.dateKey) ?? [],
      )}
      hitArea="cell"
    />
  );

  const dateHead = (
    <div
      className={cn(
        "min-w-0 px-1 text-left text-[11px] font-semibold tabular-nums",
        day.isToday ? "text-foreground" : "text-muted-foreground",
      )}
    >
      {monthLabel ? (
        <span className="inline-flex items-baseline gap-1">
          <span
            className={cn(
              day.isToday &&
                "inline-flex h-5 min-w-5 items-center justify-center rounded-[4px] bg-foreground px-1 text-[11px] font-bold text-background",
            )}
          >
            {day.dayNumber}
          </span>
          <span className="text-[10px] font-semibold tracking-wide text-foreground/70">
            {monthLabel}
          </span>
        </span>
      ) : day.isToday ? (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-[4px] bg-foreground px-1 text-[11px] font-bold text-background">
          {day.dayNumber}
        </span>
      ) : (
        day.dayNumber
      )}
    </div>
  );

  return (
    <DayDropSection
      dateKey={day.dateKey}
      enabled
      className={cn(
        "group/day relative flex min-h-[7.5rem] cursor-default flex-col gap-1 p-1 transition-colors [&_button]:cursor-pointer",
        isWeekend
          ? "bg-[var(--tt-weekend)] hover:bg-[color-mix(in_srgb,var(--color-muted,#f5f5f5)_74%,var(--color-card,#fff))]"
          : "bg-card hover:bg-[color-mix(in_srgb,var(--color-muted,#f5f5f5)_36%,var(--color-card,#fff))]",
        monthBoundary &&
          dayIndex > 0 &&
          "border-l-[3px] border-l-foreground/35",
        day.isToday && "ring-2 ring-inset ring-foreground/50",
      )}
    >
      {hasContent ? (
        <>
          <div className="relative z-10 flex items-start justify-between gap-0.5">
            {dateHead}
            {addMenu}
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-1">
            {filtered.map((workout) => (
              <CalendarWorkoutCard
                key={workout.id}
                workout={workout}
                isCoach={isCoach}
              />
            ))}
            {showEvents && events.length > 0 ? (
              <SeasonEventChips
                events={events}
                variant="chip"
                editable={isCoach}
                dateKey={day.dateKey}
                className="gap-0.5"
              />
            ) : null}
            {showNotes && dayNoteHasVisibleContent(note) ? (
              <DayNoteSection
                dateKey={day.dateKey}
                note={note}
                canEdit={canEditDayNotes}
                noteKind={isCoach ? "coach" : "athlete"}
                athleteId={athleteId}
                compact
                hideEmptyAdd
              />
            ) : null}
          </div>
        </>
      ) : (
        <>
          <div className="pointer-events-none relative z-10 flex items-start justify-between gap-0.5">
            {dateHead}
          </div>
          {emptyAddMenu}
        </>
      )}
    </DayDropSection>
  );
}
