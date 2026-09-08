"use client";

import {
  cloneElement,
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { Maximize2, Minimize2 } from "lucide-react";
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
} from "@/components/plan/week-card-size-context";
import { usePlanWeekDnd } from "@/components/plan/plan-week-dnd";
import { useOptimisticWorkoutStatus } from "@/components/plan/athlete-workout-quick-actions";
import {
  WorkoutCardCornerOverlay,
  workoutCardCornerSpacerClass,
} from "@/components/plan/workout-card-corner-overlay";
import { CalendarWeekStatsCell } from "@/components/training/calendar-week-stats-cell";
import { TrainingMonthToolbar } from "@/components/training/training-month-toolbar";
import { TrainingListFrame } from "@/components/training/training-list-frame";
import { TrainingListAddMenu } from "@/components/training/training-list-add-menu";
import { useFilteredWorkoutsByDate } from "@/components/training/use-plan-sport-filter-data";
import { AthleteAvatar } from "@/components/athlete/athlete-avatar";
import {
  PageHeader,
  PageHeaderActions,
} from "@/components/ui/page-header";
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

/** Mobile + desktop chrome both mount — clone so the same element isn’t reused twice. */
function keyedNode(node: ReactNode, key: string): ReactNode {
  if (!isValidElement(node)) return node;
  return cloneElement(node as ReactElement, { key });
}

const DAY_NAMES = [
  { short: "Mon", full: "Monday" },
  { short: "Tue", full: "Tuesday" },
  { short: "Wed", full: "Wednesday" },
  { short: "Thu", full: "Thursday" },
  { short: "Fri", full: "Friday" },
  { short: "Sat", full: "Saturday" },
  { short: "Sun", full: "Sunday" },
] as const;

/** Force side-scroll on narrow phones; stats col stays sticky.
 * Class strings must be static so Tailwind JIT emits them. */
const STATS_GRID_COLS =
  "grid-cols-[minmax(11rem,14rem)_repeat(7,minmax(6.5rem,1fr))]";
const DAYS_GRID_COLS = "grid-cols-[repeat(7,minmax(6.5rem,1fr))]";

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
  /** Desktop period nav label (defaults to rangeLabel). */
  desktopRangeLabel?: string;
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
  stickyTitle?: ReactNode;
  viewControls?: ReactNode;
  canLogWorkout?: boolean;
  canAddNote?: boolean;
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
  desktopRangeLabel = rangeLabel,
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
  stickyTitle,
  viewControls,
  canLogWorkout = false,
  canAddNote = false,
}: CalendarMonthViewProps) {
  const [showNotes, setShowNotes] = useStoredFlag(SHOW_NOTES_STORAGE_KEY, true);
  const [showEvents, setShowEvents] = useStoredFlag(
    SHOW_EVENTS_STORAGE_KEY,
    true,
  );
  const [showStats, setShowStats] = useStoredFlag(SHOW_STATS_STORAGE_KEY, false);
  const [expanded, setExpanded] = useState(false);
  const [mobilePhone, setMobilePhone] = useState(false);
  const [portraitPhone, setPortraitPhone] = useState(false);
  const landscapeAutoExpandRef = useRef(false);
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
    const next = !expanded
    if (!next) landscapeAutoExpandRef.current = false
    setExpanded(next)
    setCalendarExpanded(next)
  }

  useEffect(() => {
    const mobileMq = window.matchMedia("(max-width: 1023px)");
    const portraitMq = window.matchMedia(
      "(max-width: 1023px) and (orientation: portrait)",
    );
    function sync() {
      setMobilePhone(mobileMq.matches);
      setPortraitPhone(portraitMq.matches);
    }
    sync();
    mobileMq.addEventListener("change", sync);
    portraitMq.addEventListener("change", sync);
    return () => {
      mobileMq.removeEventListener("change", sync);
      portraitMq.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia(
      "(max-width: 1023px) and (orientation: landscape)",
    );

    function syncLandscapeExpand() {
      if (mq.matches) {
        setExpanded((prev) => {
          if (!prev) landscapeAutoExpandRef.current = true;
          return true;
        });
        setCalendarExpanded(true);
        return;
      }
      if (landscapeAutoExpandRef.current) {
        landscapeAutoExpandRef.current = false;
        setExpanded(false);
        setCalendarExpanded(false);
      }
    }

    syncLandscapeExpand();
    mq.addEventListener("change", syncLandscapeExpand);
    return () => {
      mq.removeEventListener("change", syncLandscapeExpand);
      landscapeAutoExpandRef.current = false;
      setCalendarExpanded(false);
    };
  }, []);

  useEffect(() => {
    return () => {
      setCalendarExpanded(false);
    };
  }, []);

  useEffect(() => {
    if (!expanded) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        landscapeAutoExpandRef.current = false;
        setExpanded(false);
        setCalendarExpanded(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [expanded]);

  const useMobileExpandStage = expanded && mobilePhone;

  useEffect(() => {
    if (!useMobileExpandStage) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const orientation = window.screen?.orientation as
      | (ScreenOrientation & {
          lock?: (orientation: string) => Promise<void>
        })
      | undefined
    let cancelled = false
    let didLock = false
    if (
      orientation &&
      typeof orientation.lock === 'function' &&
      window.matchMedia('(orientation: portrait)').matches
    ) {
      void orientation
        .lock('portrait')
        .then(() => {
          if (cancelled) {
            try {
              orientation.unlock()
            } catch {
              /* ignore */
            }
            return
          }
          didLock = true
        })
        .catch(() => {
          /* ignore */
        })
    }

    return () => {
      cancelled = true
      document.body.style.overflow = previousOverflow
      if (didLock && orientation) {
        try {
          orientation.unlock()
        } catch {
          /* ignore */
        }
      }
    }
  }, [useMobileExpandStage]);

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

  const gridCols = showStats ? STATS_GRID_COLS : DAYS_GRID_COLS;

  const monthAddMenu = (
    <TrainingListAddMenu
      isCoach={isCoach}
      athleteId={athleteId}
      canAddNote={canAddNote}
      canLogWorkout={canLogWorkout}
    />
  );

  const monthToolbarProps = {
    showNotes,
    onToggleNotes: toggleShowNotes,
    showEvents,
    onToggleEvents: toggleShowEvents,
    showStats,
    onToggleStats: toggleShowStats,
    monthSpan,
    spanHrefs,
  };

  const expandToggleBtn = !expanded ? (
    <button
      type="button"
      onClick={toggleExpanded}
      className="tt-inbox-mobile-icon-btn"
      aria-label="Expand month plan"
      title="Expand month plan"
    >
      <Maximize2 className="h-4 w-4" strokeWidth={2} aria-hidden />
    </button>
  ) : null;

  const stickyHeader = (
    <PageHeader className="tt-inbox-page-header tt-training-list-page-header mb-0 pt-0 lg:mb-0 lg:pt-0">
      <div className="flex w-full min-w-0 flex-col gap-2.5 lg:gap-2">
        {/* Mobile: title + Add / Filter / Expand */}
        <div className="flex w-full min-w-0 items-center justify-between gap-3 lg:hidden">
          <div className="min-w-0">{keyedNode(stickyTitle, "month-title-mobile")}</div>
          <div className="tt-inbox-mobile-header-actions">
            {monthAddMenu}
            <TrainingMonthToolbar mobileOnly {...monthToolbarProps} />
            {expandToggleBtn}
          </div>
        </div>

        {/* Desktop: same shell as List — title+period left, views+filters right */}
        <div className="hidden w-full min-w-0 items-end justify-between gap-3 lg:flex">
          <div className="min-w-0">
            {keyedNode(stickyTitle, "month-title-desktop")}
            <CalendarPeriodNav
              label={desktopRangeLabel}
              prevHref={prevMonthHref}
              nextHref={nextMonthHref}
              prevAriaLabel="Previous month"
              nextAriaLabel="Next month"
              align="start"
              size="subtitle"
              className="mb-0 mt-1 min-w-0"
            />
          </div>
          <PageHeaderActions className="flex-col items-end gap-2 pt-0 sm:gap-2.5">
            <div className="flex w-full min-w-0 flex-col items-end gap-2">
              <div className="flex min-w-0 items-center">
                {keyedNode(viewControls, "month-views-desktop")}
              </div>
              <TrainingMonthToolbar desktopOnly {...monthToolbarProps} />
            </div>
          </PageHeaderActions>
        </div>

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

        <div className="flex w-full min-w-0 items-center justify-between gap-2 lg:hidden">
          <CalendarPeriodNav
            label={rangeLabel}
            prevHref={prevMonthHref}
            nextHref={nextMonthHref}
            prevAriaLabel="Previous month"
            nextAriaLabel="Next month"
            align="start"
            className="mb-0 -ml-1.5 shrink-0"
          />
          <div className="shrink-0">{keyedNode(viewControls, "month-views-mobile")}</div>
        </div>
      </div>
    </PageHeader>
  );

  const monthGrid = (
    <div className="tt-month-view-root flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="tt-month-grid-bleed @container flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-hidden rounded-[0.5rem]">
        <div
          className="tt-month-grid-scroll min-h-0 min-w-0 w-full max-w-full flex-1 overscroll-contain"
          data-month-stats={showStats ? "1" : "0"}
        >
          <div className="tt-month-grid-scroll-inner">
            <div className={TABLE_SHELL}>
              <div className={cn("tt-month-grid-days-header grid", gridCols, TABLE_HEADER)}>
                {showStats ? (
                  <div
                    className={cn(
                      "tt-month-stats-col flex items-center px-1.5 py-2 text-left text-[11px] font-semibold",
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
        </div>
      </div>
    </div>
  );

  return (
    <WeekCardSizeProvider storageKey={MONTH_CARD_SIZE_STORAGE_KEY}>
      {expanded ? (
        <button
          type="button"
          onClick={toggleExpanded}
          className="tt-week-expanded-collapse-btn"
          aria-label="Collapse month plan"
          title="Collapse month plan"
        >
          <Minimize2 className="h-4 w-4" strokeWidth={2} aria-hidden />
        </button>
      ) : null}

      {useMobileExpandStage ? (
        <div
          className="tt-week-expand-rotate-root"
          data-expand-orientation={portraitPhone ? "portrait" : "landscape"}
          role="dialog"
          aria-label="Month plan landscape"
        >
          <div
            className="tt-week-expand-rotate-inner tt-calendar-expanded-root"
            data-expand-orientation={portraitPhone ? "portrait" : "landscape"}
          >
            {monthGrid}
          </div>
        </div>
      ) : (
        <TrainingListFrame
          /* Month pans X+Y inside the grid; frame only clips to the viewport. */
          scrollBody={false}
          className={cn(expanded && "tt-calendar-expanded-root")}
          header={stickyHeader}
        >
          {monthGrid}
        </TrainingListFrame>
      )}
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
          className="tt-month-stats-col"
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
