"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { CalendarDays } from "lucide-react";
import { CalendarPeriodNav } from "@/components/plan/calendar-period-nav";
import { DayNoteSection } from "@/components/plan/day-note-section";
import { PlanDayAddMenu } from "@/components/plan/plan-day-add-menu";
import { MonthDayCell } from "@/components/plan/month-day-cell";
import { DayDropSection } from "@/components/plan/day-drop-section";
import { WorkoutModalTrigger } from "@/components/plan/workout-modal-trigger";
import { WorkoutPlanMeta } from "@/components/plan/workout-plan-meta";
import { StravaSyncedIndicator } from "@/components/plan/strava-synced-indicator";
import { TrainingWorkoutCard } from "@/components/training/training-workout-card";
import { WorkoutStructureChart } from "@/components/workout-builder/workout-structure-chart";
import { hasStructureContent } from "@/lib/workout-builder/utils";
import type { DayNoteData } from "@/lib/day-notes";
import type { PlanWorkoutDetail } from "@/lib/plan-workout";
import { WORKOUT_TYPE_COLORS, WORKOUT_TYPE_LABELS } from "@/lib/constants";
import { getRecoveryWorkout } from "@/lib/recovery-day";
import { Badge } from "@/components/ui/badge";
import { todayDateKey } from "@/lib/dates";
import { WORKOUT_DAY_CARD_CLASS } from "@/lib/workout-display";
import { cn } from "@/lib/utils";
import { useFilteredWorkoutsByDate } from "@/components/training/use-plan-sport-filter-data";

const DAY_PANEL_STORAGE_KEY = "tt-month-day-panel-open";
const MONTH_SPAN_STORAGE_KEY = "tt-month-span";

type MonthDay = {
  dateKey: string;
  dayNumber: number;
  inMonth: boolean;
  isToday: boolean;
};

type MonthBlock = {
  label: string;
  anchorMonth: Date;
  days: MonthDay[];
};

type MonthCalendarViewProps = {
  rangeLabel: string;
  months: MonthBlock[];
  monthSpan: 1 | 2 | 3;
  monthOffset: number;
  workoutsByDate: Map<string, PlanWorkoutDetail[]>;
  notesByDate: Map<string, DayNoteData>;
  isCoach: boolean;
  athleteId?: string;
  trainingMode?: boolean;
  prevMonthHref?: string;
  nextMonthHref?: string;
};

function SelectedDayPanel({
  selectedDateKey,
  selectedLabel,
  selectedWorkouts,
  selectedNote,
  canEditNotes,
  athleteId,
  isCoach,
  trainingMode = false,
}: {
  selectedDateKey: string;
  selectedLabel: string;
  selectedWorkouts: PlanWorkoutDetail[];
  selectedNote: DayNoteData | null;
  canEditNotes: boolean;
  athleteId?: string;
  isCoach: boolean;
  trainingMode?: boolean;
}) {
  return (
    <DayDropSection
      dateKey={selectedDateKey}
      enabled={isCoach}
      className={cn(
        "flex min-h-0 w-full flex-col p-4 landscape:max-lg:p-3 lg:min-h-[20rem]",
        WORKOUT_DAY_CARD_CLASS,
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b border-border/40 pb-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            Selected day
          </p>
          <h3 className="min-w-0 text-base font-semibold">{selectedLabel}</h3>
        </div>
        <PlanDayAddMenu
          dateKey={selectedDateKey}
          isCoach={isCoach}
          canAddNote={canEditNotes}
          athleteId={athleteId}
          dayNote={selectedNote}
          recoveryWorkout={getRecoveryWorkout(selectedWorkouts)}
        />
      </div>

      {selectedNote && (
        <div className="mt-3">
          <DayNoteSection
            dateKey={selectedDateKey}
            note={selectedNote}
            canEdit={canEditNotes}
            athleteId={athleteId}
            hideEmptyAdd
          />
        </div>
      )}

      <div className="mt-4 flex-1 space-y-2 overflow-y-auto">
        {selectedWorkouts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No workouts scheduled.
          </p>
        ) : (
          selectedWorkouts.map((w) =>
            trainingMode ? (
              <TrainingWorkoutCard
                key={w.id}
                workout={w}
                isCoach={isCoach}
                detailed
              />
            ) : (
              <WorkoutModalTrigger
                key={w.id}
                workout={w}
                isCoach={isCoach}
                className="flex w-full items-start justify-between gap-3 rounded-[6px] bg-muted/40 px-3 py-2.5 text-left text-sm transition hover:bg-muted/70"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="font-medium">{w.title}</p>
                    <StravaSyncedIndicator workout={w} variant="wordmark" size="sm" />
                  </div>
                  {w.structure && hasStructureContent(w.structure) && (
                    <WorkoutStructureChart
                      structure={w.structure}
                      size="sm"
                      showCaption
                      className="mt-2"
                    />
                  )}
                  <WorkoutPlanMeta workout={w} size="md" className="mt-1" />
                </div>
                <Badge className={WORKOUT_TYPE_COLORS[w.type]}>
                  {WORKOUT_TYPE_LABELS[w.type]}
                </Badge>
              </WorkoutModalTrigger>
            ),
          )
        )}
      </div>
    </DayDropSection>
  );
}

function MonthGrid({
  days,
  workoutsByDate,
  notesByDate,
  isCoach,
  selectedDateKey,
  onSelect,
  desktopWorkoutDisplay,
}: {
  days: MonthDay[];
  workoutsByDate: Map<string, PlanWorkoutDetail[]>;
  notesByDate: Map<string, DayNoteData>;
  isCoach: boolean;
  selectedDateKey: string;
  onSelect: (dateKey: string) => void;
  desktopWorkoutDisplay: "micro" | "icons";
}) {
  return (
    <>
      <div className="grid grid-cols-7 gap-px text-center text-[8px] font-medium uppercase text-muted-foreground landscape:max-lg:gap-0.5 lg:gap-1 lg:text-[10px]">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((full, i) => (
          <div key={full} className="py-0.5">
            <span className="hidden landscape:max-lg:inline lg:hidden">
              {["M", "T", "W", "T", "F", "S", "S"][i]}
            </span>
            <span className="hidden portrait:max-lg:inline lg:inline">
              {full}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-0.5 grid grid-cols-7 gap-px landscape:max-lg:gap-0.5 lg:mt-1 lg:gap-1">
        {days.map((day) => (
          <div key={day.dateKey} className="min-w-0">
            <MonthDayCell
              dateKey={day.dateKey}
              dayNumber={day.dayNumber}
              workouts={workoutsByDate.get(day.dateKey) ?? []}
              dayNote={notesByDate.get(day.dateKey) ?? null}
              isCoach={isCoach}
              inMonth={day.inMonth}
              isToday={day.isToday}
              isSelected={selectedDateKey === day.dateKey}
              onSelect={() => onSelect(day.dateKey)}
              compactOnDesktop
              desktopWorkoutDisplay={desktopWorkoutDisplay}
              dropEnabled={isCoach}
            />
          </div>
        ))}
      </div>
    </>
  );
}

export function MonthCalendarView({
  rangeLabel,
  months,
  monthSpan,
  monthOffset,
  workoutsByDate,
  notesByDate,
  isCoach,
  athleteId,
  trainingMode = false,
  prevMonthHref,
  nextMonthHref,
}: MonthCalendarViewProps) {
  const filteredWorkoutsByDate = useFilteredWorkoutsByDate(workoutsByDate);
  const allDays = useMemo(() => months.flatMap((m) => m.days), [months]);

  const defaultSelected = useMemo(() => {
    const today = todayDateKey();
    const todayInGrid = allDays.find((d) => d.dateKey === today && d.inMonth);
    if (todayInGrid) return today;
    const firstInMonth = allDays.find((d) => d.inMonth);
    return firstInMonth?.dateKey ?? today;
  }, [allDays]);

  const visibleInMonthKeys = useMemo(
    () => new Set(allDays.filter((d) => d.inMonth).map((d) => d.dateKey)),
    [allDays],
  );

  const [selectedDateKey, setSelectedDateKey] = useState(defaultSelected);
  const [dayPanelOpen, setDayPanelOpen] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(DAY_PANEL_STORAGE_KEY);
      if (stored === "0") setDayPanelOpen(false);
      if (stored === "1") setDayPanelOpen(true);
    } catch {
      /* keep default */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(MONTH_SPAN_STORAGE_KEY, String(monthSpan));
    } catch {
      /* ignore */
    }
  }, [monthSpan]);

  // Keep selection inside the visible month window after span/offset changes.
  useEffect(() => {
    if (!visibleInMonthKeys.has(selectedDateKey)) {
      setSelectedDateKey(defaultSelected);
    }
  }, [defaultSelected, selectedDateKey, visibleInMonthKeys]);

  function setDayPanel(next: boolean) {
    if (next && !visibleInMonthKeys.has(selectedDateKey)) {
      setSelectedDateKey(defaultSelected);
    }
    setDayPanelOpen(next);
    try {
      localStorage.setItem(DAY_PANEL_STORAGE_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }

  const canEditNotes = true;
  const selectedWorkouts = filteredWorkoutsByDate.get(selectedDateKey) ?? [];
  const selectedNote = notesByDate.get(selectedDateKey) ?? null;
  const selectedLabel = format(
    new Date(selectedDateKey + "T12:00:00"),
    "EEEE, d MMMM",
  );
  const showSelectedPanel = dayPanelOpen;

  const panelProps = {
    selectedDateKey,
    selectedLabel,
    selectedWorkouts,
    selectedNote,
    canEditNotes,
    athleteId,
    isCoach,
    trainingMode,
  };

  const spanHrefs = {
    1: `/training?view=month&month=${monthOffset}`,
    2: `/training?view=month&month=${monthOffset}&months=2`,
    3: `/training?view=month&month=${monthOffset}&months=3`,
  } as const;

  return (
    <div className="card-elevated p-4 landscape:max-lg:p-2">
      <div
        className={cn(
          "flex flex-col gap-4",
          showSelectedPanel &&
            "portrait:max-lg:flex-col landscape:max-lg:grid landscape:max-lg:grid-cols-2 landscape:max-lg:items-start landscape:max-lg:gap-2 lg:grid lg:grid-cols-2 lg:gap-6",
        )}
      >
        <div className="w-full min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 landscape:max-lg:mb-1">
            <CalendarPeriodNav
              label={rangeLabel}
              prevHref={prevMonthHref}
              nextHref={nextMonthHref}
              prevAriaLabel="Previous month"
              nextAriaLabel="Next month"
              className="mb-0"
            />
            <div className="flex flex-wrap items-center gap-1.5">
              <div
                className="inline-flex items-center rounded-[6px] border border-border bg-card p-0.5"
                role="group"
                aria-label="Months shown"
              >
                {([1, 2, 3] as const).map((n) => (
                  <Link
                    key={n}
                    href={spanHrefs[n]}
                    className={cn(
                      "rounded-[5px] px-2 py-1 text-xs font-medium transition",
                      monthSpan === n
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    aria-current={monthSpan === n ? "true" : undefined}
                    title={`Show ${n} month${n > 1 ? "s" : ""}`}
                  >
                    {n}m
                  </Link>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setDayPanel(!dayPanelOpen)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-[6px] border px-2.5 py-1.5 text-xs font-medium transition",
                  dayPanelOpen
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
                aria-pressed={dayPanelOpen}
                title={
                  dayPanelOpen
                    ? "Hide day detail — show larger workout cards in the grid"
                    : "Show day detail — calendar cells use sport icons only"
                }
              >
                <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                Day detail
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {months.map((block) => (
              <div key={block.label} className="min-w-0">
                {months.length > 1 ? (
                  <h3 className="mb-2 text-sm font-semibold text-foreground">
                    {block.label}
                  </h3>
                ) : null}
                <MonthGrid
                  days={block.days}
                  workoutsByDate={filteredWorkoutsByDate}
                  notesByDate={notesByDate}
                  isCoach={isCoach}
                  selectedDateKey={selectedDateKey}
                  onSelect={setSelectedDateKey}
                  desktopWorkoutDisplay={dayPanelOpen ? "icons" : "micro"}
                />
              </div>
            ))}
          </div>
        </div>

        {showSelectedPanel && (
          <div className="min-w-0 lg:sticky lg:top-2 lg:self-start">
            <SelectedDayPanel {...panelProps} />
          </div>
        )}
      </div>
    </div>
  );
}
