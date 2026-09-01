"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WorkoutType } from "@prisma/client";
import { AddWorkoutCell } from "@/components/plan/add-workout-cell";
import { DayDropTd } from "@/components/plan/day-drop-td";
import { PlanMobileDayStack } from "@/components/plan/plan-mobile-day-stack";
import { SeasonEventChips } from "@/components/plan/season-event-chips";
import { PlanWeekDndProvider, PlanWeekDndErrorBanner } from "@/components/plan/plan-week-dnd";
import { PlanWeekDayStrip } from "@/components/plan/week-day-strip";
import {
  WORKOUT_TYPE_COLORS,
  WORKOUT_TYPE_LABELS,
  SPORT_ROW_ORDER,
} from "@/lib/constants";
import type { PlanDay } from "@/lib/plan-week";
import {
  canRemovePlanSportRow,
  resolveCoachPlanSportRows,
} from "@/lib/plan-sports";
import { RemovePlanSportRowButton } from "@/components/coach/remove-plan-sport-row-button";
import { SportWeekTotalsLabel } from "@/components/plan/sport-week-totals-label";
import { sumSportWeekTotals, sumWeekDurationMinutes } from "@/lib/plan-week-totals";
import {
  dayHasRecovery,
  getRecoveryWorkout,
  recoveryDayCellClass,
} from "@/lib/recovery-day";
import { getDayRacePriority, raceDayCellClass } from "@/lib/race-day";
import { CalendarPeriodNav } from "@/components/plan/calendar-period-nav";
import { cn, formatDuration } from "@/lib/utils";
import {
  formatWeatherPrecip,
  type WeatherPlace,
} from "@/lib/weather/places";
import { todayDateKey } from "@/lib/dates";
import {
  WeekWeatherLocationControl,
  type WeekWeatherLocation,
} from "@/components/weather/week-weather-location-control";
import { WeatherGlyph } from "@/components/weather/weather-glyph";
import {
  TABLE_CELL_TODAY,
  TABLE_CELL_WEEKEND,
  TABLE_FRAME,
  TABLE_HEADER,
  TABLE_HEADER_CELL_TODAY,
  TABLE_HEADER_CELL_WEEKEND,
  TABLE_HEADER_VLINE,
} from "@/lib/table-styles";
import { DayNoteSection } from "@/components/plan/day-note-section";
import { NotesEventsCellAdd } from "@/components/plan/notes-events-cell-add";
import { dayNoteHasVisibleContent } from "@/lib/day-notes";
import { RecoveryDaySection } from "@/components/plan/recovery-day-section";
import { PlanDayAddMenu } from "@/components/plan/plan-day-add-menu";
import {
  PLAN_TABLE_CELL_HOVER_CLASS,
  WORKOUT_TYPE_CELL_TINT,
  WORKOUT_TYPE_DOT_CLASS,
  WORKOUT_TYPE_ICONS,
} from "@/lib/workout-display";
import { Clock } from "lucide-react";
import { filterPlanSportRows } from "@/lib/plan-sport-filter";
import { useFilteredPlanDays } from "@/components/training/use-plan-sport-filter-data";
import { useOptionalPlanSportFilter } from "@/components/training/plan-sport-filter-context";
import { useOptionalWeekCardSize } from "@/components/plan/week-card-size-context";

const PORTRAIT_DAY_SECTION_ID = "plan-week-day";

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
  /** Athlete CSS (sec/100m) — estimates swim duration in week volume when missing. */
  swimCssSecPer100m?: number | null;
  /** Hide weekly volume + add-day footer rows (e.g. combined multi-week table). */
  hideFooterRows?: boolean;
  /** Show Notes row / day notes (toolbar layer). Default true. */
  showNotes?: boolean;
  /** Show Events row / day events (toolbar layer). Default true. */
  showEvents?: boolean;
  /** Show Weather row / day weather (toolbar layer). Default true. */
  showWeather?: boolean;
  weatherLocation?: WeekWeatherLocation | null;
  onWeatherLocationSelect?: (place: WeatherPlace) => void;
  onWeatherLocationReset?: () => void;
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

/** Week table horizontal rules */
/** Match mock week grid: `--tt-line` (#ebebeb) hairlines */
const PLAN_TABLE_LINE = "border-[var(--tt-line,#ebebeb)]";
const PLAN_TABLE_LINE_STRONG = "border-[var(--tt-line,#ebebeb)]";
/** Soft vertical guidelines between day columns (not on the last day — frame is the outer edge). */
const PLAN_TABLE_VLINE = "border-r border-[var(--tt-line,#ebebeb)]";

function dayColVline(days: PlanDay[], dateKey: string) {
  return dateKey !== days[days.length - 1]?.dateKey
    ? PLAN_TABLE_VLINE
    : undefined;
}

function isWeekendDay(day: PlanDay): boolean {
  const [y, m, d] = day.dateKey.split("-").map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  return dow === 0 || dow === 6;
}

function dayHeaderClass(day: PlanDay) {
  // Today wins (brand red day head) — redesign week chrome.
  if (day.isToday) {
    return TABLE_HEADER_CELL_TODAY;
  }
  if (dayHasRecovery(day.workouts)) {
    return "bg-violet-500/25 text-violet-100";
  }
  if (isWeekendDay(day)) {
    return TABLE_HEADER_CELL_WEEKEND;
  }
  return "text-sidebar-foreground/75";
}

function dayColumnClass(day: PlanDay) {
  // Today wash is the day identity (no side rail). Race/recovery still tint when not today.
  if (day.isToday) return TABLE_CELL_TODAY;
  const racePriority = getDayRacePriority(day.workouts);
  if (racePriority) return raceDayCellClass(racePriority, false);
  if (dayHasRecovery(day.workouts)) return recoveryDayCellClass(false);
  if (isWeekendDay(day)) return TABLE_CELL_WEEKEND;
  return "";
}

function workoutsForSport(day: PlanDay, sport: WorkoutType) {
  return day.workouts.filter((w) => w.type === sport);
}

function DayHeaderRow({
  days,
  as = "th",
  emphasizeTop = false,
  /** When true, this row owns TABLE_HEADER (tbody embedded weeks). Thead parents own it instead. */
  embedded = false,
}: {
  days: PlanDay[];
  as?: "th" | "td";
  emphasizeTop?: boolean;
  embedded?: boolean;
}) {
  const Cell = as;
  const lastDayKey = days[days.length - 1]?.dateKey;
  return (
    <tr
      className={cn(
        embedded && TABLE_HEADER,
        emphasizeTop && "border-t-2 border-t-white/20",
      )}
    >
      <Cell
        className={cn(
          TABLE_HEADER_VLINE,
          "px-1 py-1.5 text-left text-[10px] font-medium text-white/55 landscape:max-lg:px-0.5 lg:px-3 lg:py-2",
        )}
      >
        Sport
      </Cell>
      {days.map((day) => (
        <Cell
          key={day.dateKey}
          className={cn(
            "px-0.5 py-1.5 text-center align-middle landscape:max-lg:px-px lg:px-1 lg:py-2",
            day.dateKey !== lastDayKey && TABLE_HEADER_VLINE,
            dayHeaderClass(day),
          )}
        >
          <div
            className={cn(
              "text-[9px] leading-tight landscape:max-lg:leading-tight lg:text-[11px]",
              day.isToday
                ? "font-semibold text-white"
                : "font-medium text-white/80",
            )}
          >
            <span className="@min-[920px]:hidden">{day.dayLabel.slice(0, 3)}</span>
            <span className="hidden @min-[920px]:inline">{day.dayLabel}</span>
          </div>
          <div
            className={cn(
              "mt-0.5 tabular-nums landscape:max-lg:text-[8px] lg:text-[11px]",
              day.isToday
                ? "font-medium text-white/90"
                : "font-normal text-white/45",
            )}
          >
            {day.dateLabel}
          </div>
        </Cell>
      ))}
    </tr>
  );
}

const WEEK_LAYER_CELL_FILL =
  'bg-amber-50 dark:bg-amber-500/15'

function NotesEventsTableRow({
  days,
  showNotes,
  showEvents,
  canEditDayNotes,
  athleteId,
  isCoach,
}: {
  days: PlanDay[]
  showNotes: boolean
  showEvents: boolean
  canEditDayNotes: boolean
  athleteId?: string
  isCoach: boolean
}) {
  const label =
    showNotes && showEvents
      ? 'Notes · Events'
      : showEvents
        ? 'Events'
        : 'Notes'

  return (
    <tr className={cn('border-b bg-muted/10', PLAN_TABLE_LINE)}>
      <th
        className={cn(
          'bg-muted/20 px-1 py-1 text-left align-top text-[8px] font-medium text-muted-foreground landscape:max-lg:px-0.5 lg:px-3 lg:py-2 lg:text-[10px]',
          PLAN_TABLE_VLINE,
        )}
      >
        {label}
      </th>
      {days.map((day) => {
        const events = showEvents ? (day.seasonEvents ?? []) : []
        const hasNotes =
          showNotes && dayNoteHasVisibleContent(day.dayNote)
        const hasEvents = events.length > 0
        const empty = !hasNotes && !hasEvents
        const canAddNote = showNotes && canEditDayNotes
        const canAddEvent = showEvents && isCoach

        return (
          <td
            key={day.dateKey}
            className={cn(
              'align-top landscape:max-lg:px-px',
              dayColVline(days, day.dateKey),
              empty
                ? cn('relative h-px p-0', dayColumnClass(day))
                : cn('px-2 py-2 lg:px-2.5 lg:py-2.5', WEEK_LAYER_CELL_FILL),
            )}
          >
            {empty ? (
              <NotesEventsCellAdd
                dateKey={day.dateKey}
                canAddNote={canAddNote}
                canAddEvent={canAddEvent}
                noteKind={isCoach ? 'coach' : 'athlete'}
                dayNote={day.dayNote}
                athleteId={athleteId}
              />
            ) : (
              <div className="flex w-full flex-col">
                {hasEvents ? (
                  <SeasonEventChips
                    events={events}
                    variant="cell"
                    editable={isCoach}
                    dateKey={day.dateKey}
                  />
                ) : null}
                {hasNotes ? (
                  <div
                    className={cn(
                      hasEvents &&
                        'mt-2 border-t border-amber-950/12 pt-2 dark:border-amber-100/15',
                    )}
                  >
                    <DayNoteSection
                      dateKey={day.dateKey}
                      note={day.dayNote}
                      canEdit={canEditDayNotes}
                      noteKind={isCoach ? 'coach' : 'athlete'}
                      athleteId={athleteId}
                      compact
                      showFullText
                      variant="cell"
                      hideEmptyAdd
                    />
                  </div>
                ) : null}
              </div>
            )}
          </td>
        )
      })}
    </tr>
  )
}

function WeatherTableRow({
  days,
  weatherLocation,
  onWeatherLocationSelect,
  onWeatherLocationReset,
}: {
  days: PlanDay[];
  weatherLocation?: WeekWeatherLocation | null;
  onWeatherLocationSelect?: (place: WeatherPlace) => void;
  onWeatherLocationReset?: () => void;
}) {
  const todayKey = todayDateKey();
  return (
    <tr className={cn("border-b bg-muted/10", PLAN_TABLE_LINE)}>
      <th
        className={cn(
          "bg-muted/20 px-1 py-1 text-left align-top text-[8px] font-medium text-muted-foreground landscape:max-lg:px-0.5 lg:px-3 lg:py-2 lg:text-[10px]",
          PLAN_TABLE_VLINE,
        )}
      >
        <div className="flex min-w-0 flex-col gap-0.5">
          <span>Weather</span>
          {onWeatherLocationSelect ? (
            <WeekWeatherLocationControl
              location={weatherLocation}
              onSelect={onWeatherLocationSelect}
              onReset={onWeatherLocationReset}
              className="text-[8px] lg:text-[10px]"
            />
          ) : weatherLocation?.name ? (
            <span
              className="truncate font-normal leading-tight text-muted-foreground/80"
              title={weatherLocation.name}
            >
              {weatherLocation.name.split(",")[0]?.trim() || weatherLocation.name}
            </span>
          ) : null}
        </div>
      </th>
      {days.map((day) => (
        <td
          key={day.dateKey}
          className={cn(
            "p-1 align-top landscape:max-lg:px-px lg:p-1.5",
            dayColVline(days, day.dateKey),
            dayColumnClass(day),
          )}
        >
          {!day.weather ? (
            day.dateKey < todayKey ? null : <p className="text-[10px] text-muted-foreground/45">—</p>
          ) : (
            <div className="grid grid-cols-3 items-stretch">
              {day.weather.slots.map((slot) => {
                const precip = formatWeatherPrecip(slot);
                return (
                  <div
                    key={`${day.dateKey}-${slot.label}`}
                    className="flex min-h-[4.7rem] flex-col items-center justify-between px-0.5 py-0.5 text-[10px]"
                  >
                    <span className="text-[9px] uppercase tracking-wide text-muted-foreground/80">
                      {slot.label}
                    </span>
                    <span className="flex items-center justify-center">
                      <WeatherGlyph
                        glyph={slot.emoji}
                        detail={`${slot.label} ${slot.temperatureC != null ? `${slot.temperatureC}°` : '—'}${precip ? ` ${precip}` : ''}`}
                        className="h-9 w-9"
                      />
                    </span>
                    <span className="text-center tabular-nums text-[10px] text-foreground/80 leading-none">
                      {slot.temperatureC != null ? `${slot.temperatureC}°` : '—'}
                      <br />
                      <span className="text-[9px] text-muted-foreground">{precip || '\u00A0'}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
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
    <tr className={cn("border-b bg-muted/10", PLAN_TABLE_LINE)}>
      <th
        className={cn(
          "bg-muted/20 px-1 py-1 text-left align-top text-[8px] font-medium text-muted-foreground landscape:max-lg:px-0.5 lg:px-3 lg:py-2 lg:text-[10px]",
          PLAN_TABLE_VLINE,
        )}
      >
        Recovery
      </th>
      {days.map((day) => (
        <td
          key={day.dateKey}
          className={cn(
            "p-0.5 align-top landscape:max-lg:px-px lg:p-1.5",
            dayColVline(days, day.dateKey),
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
  swimCssSecPer100m,
}: {
  days: PlanDay[];
  isCoach: boolean;
  canEditDayNotes: boolean;
  athleteId?: string;
  swimCssSecPer100m?: number | null;
}) {
  const { planned: totalMin, actual: actualMin } = sumWeekDurationMinutes(days, {
    swimCssSecPer100m,
  });
  const showDayAdd = isCoach || canEditDayNotes;

  return (
    <tr className={cn("border-t", PLAN_TABLE_LINE_STRONG)}>
      <th
        className={cn(
          "bg-muted/20 p-0 text-left align-top",
          PLAN_TABLE_VLINE,
        )}
      >
        <div className="flex w-full items-center px-1.5 py-1 landscape:max-lg:px-1 landscape:max-lg:py-0.5 lg:px-2 lg:py-1.5">
          <span className="min-w-0 flex-1 text-[8px] font-semibold leading-none text-muted-foreground lg:text-[10px]">
            Weekly volume
          </span>
        </div>
        {totalMin > 0 && (
          <div className="px-1.5 py-1 landscape:max-lg:px-1 lg:px-2 lg:py-1.5">
            <div className="flex flex-col gap-0.5 font-normal text-muted-foreground lg:gap-1">
              <div className="flex items-center gap-1 text-[9px] leading-none tabular-nums lg:text-[10px]">
                <Clock className="h-2.5 w-2.5 shrink-0 opacity-60" strokeWidth={2.25} />
                {actualMin > 0 ? (
                  <>
                    <span className="font-semibold text-foreground">{formatDuration(actualMin)}</span>
                    <span className="opacity-50">/</span>
                    <span className="font-normal">{formatDuration(totalMin)}</span>
                  </>
                ) : (
                  <span className="font-normal">{formatDuration(totalMin)}</span>
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
            dayColVline(days, day.dateKey),
            showDayAdd && "relative h-px min-h-[2.25rem] align-top lg:min-h-[2.75rem]",
            dayColumnClass(day),
          )}
        >
          {showDayAdd ? (
            <PlanDayAddMenu
              dateKey={day.dateKey}
              isCoach={isCoach}
              canAddNote={canEditDayNotes}
              athleteId={athleteId}
              dayNote={day.dayNote}
              recoveryWorkout={getRecoveryWorkout(day.workouts)}
              menuPlacement="top"
              hitArea="cell"
              variant="subtle"
            />
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
  swimCssSecPer100m,
}: {
  days: PlanDay[];
  sportRows: WorkoutType[];
  typesInWeek: Set<WorkoutType>;
  isCoach: boolean;
  dragEnabled: boolean;
  athleteId?: string;
  weekStartKey?: string;
  swimCssSecPer100m?: number | null;
}) {
  return (
    <>
      {sportRows.map((sport) => {
        const totals = sumSportWeekTotals(days, sport, { swimCssSecPer100m });

        const SportIcon = WORKOUT_TYPE_ICONS[sport];
        const sportIconColor = WORKOUT_TYPE_COLORS[sport].replace(/bg-\S+\s*/g, "").trim();

        return (
          <tr key={sport} className={cn("border-b", PLAN_TABLE_LINE)} data-row="sport">
            <th
              className={cn(
                "relative p-0 text-left align-top",
                PLAN_TABLE_VLINE,
                WORKOUT_TYPE_CELL_TINT[sport],
              )}
            >
              <div
                className={cn("absolute inset-y-0 left-0 w-[3px]", WORKOUT_TYPE_DOT_CLASS[sport])}
                aria-hidden
              />
              <div className="flex min-w-0 flex-col gap-1 py-1.5 pl-[calc(0.375rem+3px)] pr-1.5 landscape:max-lg:py-1 landscape:max-lg:pl-[calc(0.25rem+3px)] landscape:max-lg:pr-1 lg:gap-1.5 lg:py-2 lg:pl-[calc(0.5rem+3px)] lg:pr-2">
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={cn(
                        "inline-flex min-w-0 items-center gap-1",
                        sportIconColor,
                      )}
                      title={WORKOUT_TYPE_LABELS[sport]}
                    >
                      <SportIcon
                        className="h-3.5 w-3.5 shrink-0"
                        strokeWidth={2.25}
                        aria-hidden
                      />
                      <span className="truncate text-[8px] font-semibold leading-none lg:text-[10px]">
                        {WORKOUT_TYPE_LABELS[sport]}
                      </span>
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
                  <SportWeekTotalsLabel sport={sport} totals={totals} />
              </div>
            </th>
            {days.map((day) => {
              const sportWorkouts = workoutsForSport(day, sport);
              const emptyCoachCell = isCoach && sportWorkouts.length === 0;
              return (
                <DayDropTd
                  key={day.dateKey}
                  dateKey={day.dateKey}
                  sport={sport}
                  enabled={dragEnabled}
                  className={cn(
                    "tt-week-sport-cell relative p-0.5 align-top landscape:max-lg:px-px lg:p-1.5",
                    dayColVline(days, day.dateKey),
                    emptyCoachCell && "h-px",
                    PLAN_TABLE_CELL_HOVER_CLASS,
                    dayColumnClass(day),
                  )}
                >
                  <AddWorkoutCell
                    date={day.dateKey}
                    sport={sport}
                    workouts={sportWorkouts}
                    isCoach={isCoach}
                    layout="table"
                    dragEnabled={dragEnabled}
                  />
                </DayDropTd>
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
  weekStartKey,
  planSportRows = [],
  weekExtraPlanSportRows = [],
  weekHiddenPlanSportRows = [],
  weekLabel,
  prevWeekHref,
  nextWeekHref,
  swimCssSecPer100m = null,
  hideFooterRows = false,
  showNotes = true,
  showEvents = true,
  showWeather = true,
  weatherLocation = null,
  onWeatherLocationSelect,
  onWeatherLocationReset,
  tableFragment = false,
}: PlanTableViewProps) {
  const days = useFilteredPlanDays(daysProp);
  const sportFilter = useOptionalPlanSportFilter();
  const weekCardSize = useOptionalWeekCardSize()?.cardSize;
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
  const dragEnabled = true;

  const hasAnyDayNotes = days.some((d) => dayNoteHasVisibleContent(d.dayNote));
  const hasAnyEvents = days.some((d) => (d.seasonEvents?.length ?? 0) > 0);
  const showNotesInLayer =
    showNotes && (hasAnyDayNotes || (canEditDayNotes && isCoach));
  const showEventsInLayer = showEvents && (hasAnyEvents || isCoach);
  const showNotesEventsRow = showNotesInLayer || showEventsInLayer;
  const showWeatherRow = showWeather;
  const showRecoveryRow = days.some((d) => dayHasRecovery(d.workouts));
  const showEmptyWorkoutsRow =
    !isCoach && sportRows.length === 0 && !showRecoveryRow;

  const daySectionPrefix = `${PORTRAIT_DAY_SECTION_ID}-${weekStartKey ?? "week"}`;
  const todayKey = days.find((d) => d.isToday)?.dateKey ?? days[0]?.dateKey ?? null;
  const [activeDateKey, setActiveDateKey] = useState<string | null>(todayKey);
  const [stripStickyTop, setStripStickyTop] = useState(52);
  const didScrollToToday = useRef(false);
  const portraitRootRef = useRef<HTMLDivElement>(null);
  const dayStripRef = useRef<HTMLDivElement>(null);

  const scrollToDay = useCallback(
    (dateKey: string, behavior: ScrollBehavior = "smooth") => {
      setActiveDateKey(dateKey);

      const root = portraitRootRef.current;
      const target =
        root?.querySelector<HTMLElement>(
          `[data-plan-day-section="${dateKey}"]`,
        ) ??
        document.getElementById(`${daySectionPrefix}-${dateKey}`);
      if (!target) return false;

      // Prefer window scroll with sticky chrome + day-strip offset — scrollIntoView
      // often lands under sticky headers on mobile Safari.
      const chrome = document.querySelector<HTMLElement>(
        "[data-app-sticky-chrome]",
      );
      const offset =
        (chrome?.getBoundingClientRect().height ?? 0) +
        (dayStripRef.current?.getBoundingClientRect().height ?? 0) +
        8;
      const top =
        window.scrollY + target.getBoundingClientRect().top - offset;
      window.scrollTo({ top: Math.max(0, top), behavior });
      return true;
    },
    [daySectionPrefix],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setActiveDateKey(todayKey);
    }, 0);
    didScrollToToday.current = false;
    return () => window.clearTimeout(timeoutId);
  }, [todayKey, weekStartKey]);

  useEffect(() => {
    const updateStripTop = () => {
      const chrome = document.querySelector<HTMLElement>("[data-app-sticky-chrome]");
      setStripStickyTop(Math.ceil(chrome?.getBoundingClientRect().height ?? 52));
    };
    updateStripTop();
    window.addEventListener("resize", updateStripTop);
    const chrome = document.querySelector("[data-app-sticky-chrome]");
    const observer = chrome ? new ResizeObserver(updateStripTop) : null;
    if (chrome && observer) observer.observe(chrome);
    return () => {
      window.removeEventListener("resize", updateStripTop);
      observer?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!todayKey || didScrollToToday.current) return;
    const run = () => {
      if (
        typeof window !== "undefined" &&
        window.matchMedia("(orientation: landscape)").matches
      ) {
        return;
      }
      if (scrollToDay(todayKey, "auto")) {
        didScrollToToday.current = true;
      }
    };
    requestAnimationFrame(() => requestAnimationFrame(run));
  }, [todayKey, days, scrollToDay]);

  const bodyRows = (
    <>
      {tableFragment === "tbody-row" && (
        <DayHeaderRow days={days} as="th" emphasizeTop embedded />
      )}
      {showWeatherRow && (
        <WeatherTableRow
          days={days}
          weatherLocation={weatherLocation}
          onWeatherLocationSelect={onWeatherLocationSelect}
          onWeatherLocationReset={onWeatherLocationReset}
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
        swimCssSecPer100m={swimCssSecPer100m}
      />
      {showEmptyWorkoutsRow && (
        <tr className={cn("border-b", PLAN_TABLE_LINE)}>
          <th
            className={cn(
              "bg-muted/20 px-1 py-1 text-left align-top landscape:max-lg:px-0.5 lg:px-3 lg:py-2",
              PLAN_TABLE_VLINE,
            )}
          />
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
      {showNotesEventsRow && (
        <NotesEventsTableRow
          days={days}
          showNotes={showNotesInLayer}
          showEvents={showEventsInLayer}
          canEditDayNotes={canEditDayNotes}
          athleteId={athleteId}
          isCoach={isCoach}
        />
      )}
      {!hideFooterRows && (
        <VolumeTableRow
          days={days}
          isCoach={isCoach}
          canEditDayNotes={canEditDayNotes}
          athleteId={athleteId}
          swimCssSecPer100m={swimCssSecPer100m}
        />
      )}
    </>
  );

  if (tableFragment) {
    return (
      <>
        {tableFragment === "thead" && (
          <thead className={TABLE_HEADER}>
            <DayHeaderRow days={days} as="th" />
          </thead>
        )}
        <tbody>{bodyRows}</tbody>
      </>
    );
  }

  return (
    <>
      {/* Portrait mobile: day picker + stacked day cards */}
      <div
        ref={portraitRootRef}
        className="portrait:max-lg:block landscape:max-lg:hidden lg:hidden"
      >
        <div
          ref={dayStripRef}
          data-week-day-strip
          className="sticky z-20 -mx-4 mb-3 border-b border-border/50 bg-background/95 px-4 pb-2 pt-1 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80"
          style={{ top: stripStickyTop }}
        >
          <PlanWeekDayStrip
            days={days}
            activeDateKey={activeDateKey}
            onDaySelect={(dateKey) => {
              requestAnimationFrame(() => scrollToDay(dateKey, "smooth"));
            }}
            prevWeekHref={prevWeekHref}
            nextWeekHref={nextWeekHref}
          />
        </div>
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
          daySectionIdPrefix={daySectionPrefix}
          daySectionScrollMarginClass="scroll-mt-[7.5rem]"
          showNotes={showNotes}
          showEvents={showEvents}
          showWeather={showWeather}
          weatherLocation={weatherLocation}
          onWeatherLocationSelect={onWeatherLocationSelect}
          onWeatherLocationReset={onWeatherLocationReset}
        />
      </div>

      {/* Landscape + desktop: full week table */}
      <div className="hidden w-full landscape:max-lg:block lg:block">
        {weekLabel && (prevWeekHref || nextWeekHref) ? (
          <div className="mb-2">
            <CalendarPeriodNav
              label={weekLabel}
              prevHref={prevWeekHref}
              nextHref={nextWeekHref}
              prevAriaLabel="Previous week"
              nextAriaLabel="Next week"
              align="start"
              className="mb-0"
            />
          </div>
        ) : null}
        <div className="@container overflow-hidden rounded-[0.5rem]">
          <div className="overflow-x-auto">
          <table
            className={cn(
              TABLE_FRAME,
              "w-full table-fixed text-left landscape:max-lg:text-[9px] lg:text-sm",
            )}
            data-card-size={weekCardSize ?? 'm'}
          >
            <colgroup>
              <col className="w-[11%]" />
              <col span={7} />
            </colgroup>
            <thead className={TABLE_HEADER}>
              <DayHeaderRow days={days} as="th" />
            </thead>
            <tbody>{bodyRows}</tbody>
          </table>
          </div>
        </div>
      </div>
    </>
  );
}

export function PlanTableView({
  skipDndProvider = false,
  ...props
}: PlanTableViewProps) {
  if (!skipDndProvider) {
    return (
      <PlanWeekDndProvider mode={props.isCoach ? 'coach' : 'athlete'}>
        <PlanWeekDndErrorBanner className="mb-4" />
        <PlanTableViewInner {...props} />
      </PlanWeekDndProvider>
    );
  }
  return <PlanTableViewInner {...props} />;
}
