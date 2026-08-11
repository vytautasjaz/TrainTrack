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
import { PlanWorkoutActionsMenu } from "@/components/plan/plan-workout-actions-menu";
import { SeasonEventChips } from "@/components/plan/season-event-chips";
import { WorkoutModalTrigger } from "@/components/plan/workout-modal-trigger";
import { usePlanWeekDnd } from "@/components/plan/plan-week-dnd";
import { WorkoutBlock } from "@/components/workout-block";
import { CalendarWeekStatsCell } from "@/components/training/calendar-week-stats-cell";
import {
  PlanSportFilterBar,
  PlanViewModeControl,
  ToolbarDivider,
  ToolbarTextToggle,
} from "@/components/training/plan-sport-filter-bar";
import { useFilteredWorkoutsByDate } from "@/components/training/use-plan-sport-filter-data";
import { useTrainingLibrary } from "@/components/training/training-library-context";
import type { DayNoteData } from "@/lib/day-notes";
import type { PlanWorkoutDetail } from "@/lib/plan-workout";
import { getRecoveryWorkout } from "@/lib/recovery-day";
import type { SeasonEventData } from "@/lib/season-planner";
import { parseDateOnly } from "@/lib/dates";
import { setCalendarExpanded } from "@/lib/calendar-expand";
import { cn } from "@/lib/utils";
import { collapseTriathlonRaceWorkouts } from "@/lib/triathlon-race-summary";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/components/ui/segmented-control";
import {
  SHOW_EVENTS_STORAGE_KEY,
  SHOW_NOTES_STORAGE_KEY,
  SHOW_STATS_STORAGE_KEY,
  readStoredFlag,
  writeStoredFlag,
} from "@/lib/plan-calendar-layers";
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
  const canDrag = isCoach && !workout.isRace && Boolean(dnd);
  const showActions =
    !workout.isRace && workout.type !== WorkoutType.RECOVERY;

  return (
    <div className="group/card relative w-full min-w-0">
      <WorkoutModalTrigger
        workout={workout}
        isCoach={isCoach}
        className={cn(
          "block w-full min-w-0 cursor-default",
          dragging && "opacity-50",
        )}
        title={canDrag ? `${workout.title} — drag to move` : undefined}
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
        <div className="min-w-0">
          <WorkoutBlock
            workout={workout}
            density="xs"
            actions={
              showActions ? (
                <span className="inline-block w-5" aria-hidden />
              ) : null
            }
          />
        </div>
      </WorkoutModalTrigger>
      {showActions ? (
        <div className="absolute right-0.5 top-0.5 z-10 opacity-70 transition group-hover/card:opacity-100">
          <PlanWorkoutActionsMenu workout={workout} compact />
        </div>
      ) : null}
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
  planSportRows = [],
  swimCssSecPer100m = null,
  prevMonthHref,
  nextMonthHref,
}: CalendarMonthViewProps) {
  const [showNotes, setShowNotes] = useState(() =>
    readStoredFlag(SHOW_NOTES_STORAGE_KEY, true),
  );
  const [showEvents, setShowEvents] = useState(() =>
    readStoredFlag(SHOW_EVENTS_STORAGE_KEY, true),
  );
  const [showStats, setShowStats] = useState(() =>
    readStoredFlag(SHOW_STATS_STORAGE_KEY, false),
  );
  const [expanded, setExpanded] = useState(false);
  const library = useTrainingLibrary();
  const filteredByDate = useFilteredWorkoutsByDate(workoutsByDate);

  function toggleShowNotes() {
    setShowNotes((prev) => {
      const next = !prev;
      writeStoredFlag(SHOW_NOTES_STORAGE_KEY, next);
      return next;
    });
  }

  function toggleShowEvents() {
    setShowEvents((prev) => {
      const next = !prev;
      writeStoredFlag(SHOW_EVENTS_STORAGE_KEY, next);
      return next;
    });
  }

  function toggleShowStats() {
    setShowStats((prev) => {
      const next = !prev;
      writeStoredFlag(SHOW_STATS_STORAGE_KEY, next);
      return next;
    });
  }

  function toggleExpanded() {
    setExpanded((prev) => {
      const next = !prev;
      setCalendarExpanded(next);
      if (next) library?.setOpen(false);
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
    <div className={cn("space-y-4", expanded && "tt-calendar-expanded-root space-y-2")}>
      <div className="flex min-w-0 items-center gap-1 overflow-x-auto pb-0.5">
        {/* Left: date only */}
        <CalendarPeriodNav
          label={rangeLabel}
          prevHref={prevMonthHref}
          nextHref={nextMonthHref}
          prevAriaLabel="Previous month"
          nextAriaLabel="Next month"
          align="start"
          className="mb-0 shrink-0"
        />

        {/* Right: filters + layers + look + layout */}
        <div className="ml-auto flex min-w-0 shrink-0 items-center gap-1">
          <PlanSportFilterBar className="shrink-0" />

          <ToolbarDivider className="mx-1.5" />

          <div className="flex shrink-0 items-center gap-0.5">
            <ToolbarTextToggle
              pressed={showNotes}
              onClick={toggleShowNotes}
              title={showNotes ? "Hide day notes" : "Show day notes"}
            >
              <StickyNote className="h-3 w-3 opacity-60" aria-hidden />
              Notes
            </ToolbarTextToggle>
            <ToolbarTextToggle
              pressed={showEvents}
              onClick={toggleShowEvents}
              title={showEvents ? "Hide season events" : "Show season events"}
            >
              <CalendarDays className="h-3 w-3 opacity-60" aria-hidden />
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
              <ChartColumn className="h-3 w-3 opacity-60" aria-hidden />
              Stats
            </ToolbarTextToggle>
          </div>

          <ToolbarDivider className="mx-1.5" />

          <PlanViewModeControl className="shrink-0" />

          <ToolbarDivider className="mx-1.5" />

          <div className="flex shrink-0 items-center gap-1">
            <SegmentedControl aria-label="Months shown" className="shrink-0">
              {([1, 2, 3] as const).map((n) => (
                <SegmentedControlItem key={n} asChild active={monthSpan === n}>
                  <Link
                    href={spanHrefs[n]}
                    title={`Show ${n} month${n > 1 ? "s" : ""}`}
                    className="px-2.5 sm:px-3"
                  >
                    {n}m
                  </Link>
                </SegmentedControlItem>
              ))}
            </SegmentedControl>
            <button
              type="button"
              onClick={toggleExpanded}
              className={cn(
                "inline-flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground transition hover:text-foreground",
                expanded && "bg-muted text-foreground",
              )}
              aria-pressed={expanded}
              title={expanded ? "Exit expanded view" : "Expand calendar"}
              aria-label={expanded ? "Exit expanded view" : "Expand calendar"}
            >
              {expanded ? (
                <Minimize2 className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" aria-hidden />
              )}
            </button>
          </div>
        </div>
      </div>

      <div className={TABLE_SHELL}>
        <div className={cn("grid", gridCols, TABLE_HEADER)}>
          {showStats ? (
            <div
              className={cn(
                "px-1.5 py-1.5 text-left text-[11px] font-semibold",
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
                "px-1 py-1.5 text-center text-[11px] font-semibold",
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

  return (
    <DayDropSection
      dateKey={day.dateKey}
      enabled={isCoach}
      className={cn(
        "group/day flex min-h-[7.5rem] cursor-default flex-col gap-1 p-1 transition-colors [&_button]:cursor-default",
        isWeekend
          ? "bg-[color-mix(in_oklab,var(--color-muted)_40%,var(--color-card))] hover:bg-[color-mix(in_oklab,var(--color-muted)_58%,var(--color-card))]"
          : "bg-card hover:bg-[color-mix(in_oklab,var(--color-muted)_20%,var(--color-card))]",
        monthBoundary &&
          dayIndex > 0 &&
          "border-l-[3px] border-l-foreground/35",
        day.isToday &&
          "bg-[color-mix(in_oklab,var(--color-muted)_32%,var(--color-card))] ring-2 ring-inset ring-foreground/55 hover:bg-[color-mix(in_oklab,var(--color-muted)_42%,var(--color-card))]",
      )}
    >
      <div className="flex items-start justify-between gap-0.5">
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
                    "inline-flex h-5 min-w-5 items-center justify-center bg-foreground px-1 text-[11px] text-background",
                )}
              >
                {day.dayNumber}
              </span>
              <span className="text-[10px] font-semibold tracking-wide text-foreground/70">
                {monthLabel}
              </span>
            </span>
          ) : day.isToday ? (
            <span className="inline-flex h-5 min-w-5 items-center justify-center bg-foreground px-1 text-[11px] text-background">
              {day.dayNumber}
            </span>
          ) : (
            day.dayNumber
          )}
        </div>
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
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1">
        {showEvents && events.length > 0 ? (
          <SeasonEventChips
            events={events}
            editable={isCoach}
            className="gap-0.5"
          />
        ) : null}
        {filtered.map((workout) => (
          <CalendarWorkoutCard
            key={workout.id}
            workout={workout}
            isCoach={isCoach}
          />
        ))}
        {showNotes && note ? (
          <DayNoteSection
            dateKey={day.dateKey}
            note={note}
            canEdit={canEditDayNotes}
            athleteId={athleteId}
            compact
            hideEmptyAdd
          />
        ) : null}
      </div>
    </DayDropSection>
  );
}
