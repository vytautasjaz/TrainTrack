"use client";

import { useLayoutEffect, useRef } from "react";
import { WorkoutType } from "@prisma/client";
import { AddWorkoutCell } from "@/components/plan/add-workout-cell";
import { DayDropTd } from "@/components/plan/day-drop-td";
import { DayMetaBlock } from "@/components/plan/day-meta-lines";
import { PlanWeekDndProvider, PlanWeekDndErrorBanner } from "@/components/plan/plan-week-dnd";
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
import { WeatherDayHoursTrigger } from "@/components/weather/weather-day-hours-trigger";
import {
  TABLE_CELL_TODAY,
  TABLE_CELL_WEEKEND,
  TABLE_FRAME,
  TABLE_HEADER,
  TABLE_HEADER_CELL_TODAY,
  TABLE_HEADER_CELL_WEEKEND,
  TABLE_HEADER_VLINE,
} from "@/lib/table-styles";
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
import { useOptionalWeekPortraitZoom } from "@/components/plan/week-portrait-zoom-context";
import { WeekMatrixScrollSlider } from "@/components/plan/week-matrix-scroll-slider";
import { WeekPortraitStats } from "@/components/plan/week-portrait-stats";
import { defaultWeekPortraitZoom } from "@/lib/week-portrait-zoom";

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
  // Light board day head — today shares the full-column accent wash.
  if (day.isToday) {
    return TABLE_HEADER_CELL_TODAY;
  }
  if (dayHasRecovery(day.workouts)) {
    return "bg-[color-mix(in_srgb,var(--color-sport-strength)_10%,transparent)]";
  }
  if (isWeekendDay(day)) {
    return TABLE_HEADER_CELL_WEEKEND;
  }
  return "";
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
  isCoach = false,
  canEditDayNotes = false,
  athleteId,
}: {
  days: PlanDay[];
  as?: "th" | "td";
  emphasizeTop?: boolean;
  embedded?: boolean;
  isCoach?: boolean;
  canEditDayNotes?: boolean;
  athleteId?: string;
}) {
  const Cell = as;
  const lastDayKey = days[days.length - 1]?.dateKey;
  const showDayAdd = isCoach || canEditDayNotes;
  return (
    <tr
      className={cn(
        embedded && TABLE_HEADER,
        emphasizeTop && "tt-week-plan-week-sep",
      )}
    >
      <Cell
        className={cn(
          TABLE_HEADER_VLINE,
          "tt-week-header-sport-label px-1 py-2 text-left text-[10px] font-medium landscape:max-lg:px-0.5 lg:px-3 lg:py-2.5",
        )}
      >
        Sport
      </Cell>
      {days.map((day, dayCol) => (
        <Cell
          key={day.dateKey}
          data-week-day-col={day.dateKey}
          data-day-col={dayCol}
          data-week-day-today={day.isToday ? "1" : undefined}
          className={cn(
            "tt-week-day-col relative px-0.5 py-2 text-center align-middle landscape:max-lg:px-px lg:px-1 lg:py-2.5",
            day.dateKey !== lastDayKey && TABLE_HEADER_VLINE,
            dayHeaderClass(day),
          )}
        >
          <div className="tt-week-dayhead-weekday text-[11px] font-semibold leading-tight tracking-[0.04em] lg:text-xs">
            {day.dayLabel}
          </div>
          <div className="tt-week-dayhead-date mt-1 text-[9px] font-normal leading-none tabular-nums tracking-tight lg:mt-0.5 lg:text-[10px]">
            {day.dateKey.slice(5)}
          </div>
          {showDayAdd ? (
            <PlanDayAddMenu
              dateKey={day.dateKey}
              isCoach={isCoach}
              canAddNote={canEditDayNotes}
              athleteId={athleteId}
              dayNote={day.dayNote}
              recoveryWorkout={getRecoveryWorkout(day.workouts)}
              menuPlacement="bottom"
              className="tt-week-dayhead-add"
            />
          ) : null}
        </Cell>
      ))}
    </tr>
  );
}

function NotesEventsTableRow({
  days,
  showNotes,
  showEvents,
  canEditDayNotes,
  isCoach,
  swimCssSecPer100m,
}: {
  days: PlanDay[]
  showNotes: boolean
  showEvents: boolean
  canEditDayNotes: boolean
  isCoach: boolean
  swimCssSecPer100m?: number | null
}) {
  const { planned: totalMin, actual: actualMin } = sumWeekDurationMinutes(days, {
    swimCssSecPer100m,
  })

  return (
    <tr className={cn('border-b bg-muted/10', PLAN_TABLE_LINE)}>
      <th
        className={cn(
          'bg-muted/20 px-1.5 py-1.5 text-left align-top landscape:max-lg:px-1 lg:px-2 lg:py-2',
          PLAN_TABLE_VLINE,
        )}
      >
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[8px] font-semibold uppercase tracking-[0.04em] text-muted-foreground lg:text-[10px]">
            Weekly volume
          </span>
          {totalMin > 0 ? (
            <div className="flex items-center gap-1 text-[9px] leading-none tabular-nums text-muted-foreground lg:text-[10px]">
              <Clock
                className="h-2.5 w-2.5 shrink-0 opacity-60"
                strokeWidth={2.25}
                aria-hidden
              />
              {actualMin > 0 ? (
                <>
                  <span className="font-semibold text-foreground">
                    {formatDuration(actualMin)}
                  </span>
                  <span className="opacity-50">/</span>
                  <span>{formatDuration(totalMin)}</span>
                </>
              ) : (
                <span>{formatDuration(totalMin)}</span>
              )}
            </div>
          ) : (
            <span className="text-[9px] text-muted-foreground/50 lg:text-[10px]">
              —
            </span>
          )}
        </div>
      </th>
      {days.map((day, dayCol) => {
        const events = showEvents ? (day.seasonEvents ?? []) : []
        const hasNotes =
          showNotes && dayNoteHasVisibleContent(day.dayNote)
        const hasEvents = events.length > 0
        const empty = !hasNotes && !hasEvents

        return (
          <td
            key={day.dateKey}
            data-day-col={dayCol}
            className={cn(
              'tt-week-day-col relative align-top landscape:max-lg:px-px',
              dayColVline(days, day.dateKey),
              empty
                ? cn('min-h-[1.5rem] p-0', dayColumnClass(day))
                : cn('px-1.5 py-1.5 lg:px-2 lg:py-2', dayColumnClass(day)),
            )}
          >
            {!empty ? (
              <DayMetaBlock
                dateKey={day.dateKey}
                events={events}
                note={day.dayNote}
                showEvents={showEvents}
                showNotes={showNotes}
                isCoach={isCoach}
                canEditNotes={canEditDayNotes}
                className="mt-0 pt-0"
              />
            ) : null}
          </td>
        )
      })}
    </tr>
  )
}

function WeatherTableRow({
  days,
  open,
  weatherLocation,
  onWeatherLocationSelect,
  onWeatherLocationReset,
}: {
  days: PlanDay[];
  open: boolean;
  weatherLocation?: WeekWeatherLocation | null;
  onWeatherLocationSelect?: (place: WeatherPlace) => void;
  onWeatherLocationReset?: () => void;
}) {
  const todayKey = todayDateKey();
  return (
    <tr
      className={cn("tt-week-weather-row border-b bg-muted/10", PLAN_TABLE_LINE)}
      data-weather-open={open ? "true" : "false"}
      aria-hidden={!open}
      {...(!open ? ({ inert: "" } as Record<string, string>) : {})}
    >
      <th
        className={cn(
          "bg-muted/20 px-1 py-1 text-left align-top text-[8px] font-medium text-muted-foreground landscape:max-lg:px-0.5 lg:px-3 lg:py-2 lg:text-[10px]",
          PLAN_TABLE_VLINE,
        )}
      >
        <div className="tt-week-weather-row-clip">
          <div className="tt-week-weather-row-inner">
            <div className="flex min-w-0 flex-col gap-0.5 py-0.5">
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
                  {weatherLocation.name.split(",")[0]?.trim() ||
                    weatherLocation.name}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </th>
      {days.map((day, dayCol) => (
        <td
          key={day.dateKey}
          data-day-col={dayCol}
          className={cn(
            "tt-week-day-col p-1 align-top landscape:max-lg:px-px lg:p-1.5",
            dayColVline(days, day.dateKey),
            dayColumnClass(day),
          )}
        >
          <div className="tt-week-weather-row-clip">
            <div className="tt-week-weather-row-inner">
              {!day.weather ? (
                day.dateKey < todayKey ? null : (
                  <p className="py-2 text-[10px] text-muted-foreground/45">—</p>
                )
              ) : (
                <WeatherDayHoursTrigger
                  weather={day.weather}
                  locationName={weatherLocation?.name}
                  onLocationSelect={onWeatherLocationSelect}
                  className="block w-full"
                >
                  <div className="grid grid-cols-3 items-stretch">
                    {day.weather.slots.map((slot) => {
                      const precip = formatWeatherPrecip(slot);
                      return (
                        <div
                          key={`${day.dateKey}-${slot.label}`}
                          className="tt-week-weather-slot flex min-h-[4.7rem] flex-col items-center justify-between px-0.5 py-0.5 text-[10px]"
                        >
                          <span className="tt-week-weather-slot-label text-[9px] uppercase tracking-wide text-muted-foreground/80">
                            {slot.label}
                          </span>
                          <span className="flex items-center justify-center">
                            <WeatherGlyph
                              glyph={slot.emoji}
                              detail={`${slot.label} ${slot.temperatureC != null ? `${slot.temperatureC}°` : "—"}${precip ? ` ${precip}` : ""}`}
                              className="h-9 w-9"
                            />
                          </span>
                          <span className="text-center tabular-nums text-[10px] leading-none text-foreground/80">
                            {slot.temperatureC != null
                              ? `${slot.temperatureC}°`
                              : "—"}
                            <br />
                            <span className="text-[9px] text-muted-foreground">
                              {precip || "\u00A0"}
                            </span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </WeatherDayHoursTrigger>
              )}
            </div>
          </div>
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
      {days.map((day, dayCol) => (
        <td
          key={day.dateKey}
          data-day-col={dayCol}
          className={cn(
            "tt-week-day-col p-0.5 align-top landscape:max-lg:px-px lg:p-1.5",
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
              data-sport={sport}
              className={cn(
                "tt-week-sport-label-cell relative p-0 text-left align-top",
                PLAN_TABLE_VLINE,
                WORKOUT_TYPE_CELL_TINT[sport],
              )}
            >
              <div
                className={cn(
                  "tt-week-sport-rail absolute inset-y-0 left-0 w-[3px]",
                  WORKOUT_TYPE_DOT_CLASS[sport],
                )}
                aria-hidden
              />
              <div className="tt-week-sport-label-inner flex min-w-0 flex-col gap-1 py-1.5 pl-[calc(0.375rem+3px)] pr-1.5 landscape:max-lg:py-1 landscape:max-lg:pl-[calc(0.25rem+3px)] landscape:max-lg:pr-1 lg:gap-1.5 lg:py-2 lg:pl-[calc(0.5rem+3px)] lg:pr-2">
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
                      <span className="tt-week-sport-label-text truncate text-[8px] font-semibold leading-none lg:text-[10px]">
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
                  <SportWeekTotalsLabel
                    sport={sport}
                    totals={totals}
                    className="tt-week-sport-totals"
                  />
              </div>
            </th>
            {days.map((day, dayCol) => {
              const sportWorkouts = workoutsForSport(day, sport);
              const emptyCoachCell = isCoach && sportWorkouts.length === 0;
              return (
                <DayDropTd
                  key={day.dateKey}
                  dateKey={day.dateKey}
                  sport={sport}
                  enabled={dragEnabled}
                  data-day-col={dayCol}
                  className={cn(
                    "tt-week-day-col tt-week-sport-cell relative p-0.5 align-top landscape:max-lg:px-px lg:p-1.5",
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
  const showWeatherRow = showWeather;
  const showRecoveryRow = days.some((d) => dayHasRecovery(d.workouts));
  const showEmptyWorkoutsRow =
    !isCoach && sportRows.length === 0 && !showRecoveryRow;

  const portraitZoom =
    useOptionalWeekPortraitZoom()?.zoom ?? defaultWeekPortraitZoom();
  const matrixBleedRef = useRef<HTMLDivElement>(null);
  const matrixScrollRef = useRef<HTMLDivElement>(null);
  const didScrollToTodayCol = useRef(false);

  useLayoutEffect(() => {
    didScrollToTodayCol.current = false;
  }, [weekStartKey, portraitZoom]);

  /**
   * Portrait isolation: bleed is in normal flow with an explicit height;
   * the scroller is position:absolute inside it so the wide table cannot
   * expand document width/height (Safari fixed-nav / white-void bug).
   */
  useLayoutEffect(() => {
    const bleed = matrixBleedRef.current;
    const scroll = matrixScrollRef.current;
    if (!bleed || !scroll || typeof window === "undefined") return;

    function syncBleedHeight() {
      if (
        !window.matchMedia("(max-width: 1023px) and (orientation: portrait)")
          .matches
      ) {
        bleed!.style.height = "";
        return;
      }
      const table = scroll!.querySelector<HTMLElement>(".tt-week-matrix-table");
      const h = Math.ceil(table?.offsetHeight ?? 0);
      bleed!.style.height = h > 0 ? `${h}px` : "";
    }

    syncBleedHeight();
    const ro = new ResizeObserver(syncBleedHeight);
    ro.observe(scroll);
    const table = scroll.querySelector(".tt-week-matrix-table");
    if (table) ro.observe(table);
    window.addEventListener("resize", syncBleedHeight);
    window.addEventListener("orientationchange", syncBleedHeight);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", syncBleedHeight);
      window.removeEventListener("orientationchange", syncBleedHeight);
      bleed.style.height = "";
    };
  }, [days, weekStartKey, portraitZoom, weekCardSize, tableFragment]);

  useLayoutEffect(() => {
    if (didScrollToTodayCol.current) return;
    const root = matrixScrollRef.current;
    if (!root) return;
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(max-width: 1023px) and (orientation: portrait)").matches) {
      return;
    }
    const todayCol = root.querySelector<HTMLElement>(
      '[data-week-day-today="1"]',
    );
    if (!todayCol) return;

    const labelCol = root.querySelector<HTMLElement>(
      ".tt-week-matrix-table thead tr > :first-child",
    );
    const labelW = labelCol?.getBoundingClientRect().width ?? 0;
    const rootRect = root.getBoundingClientRect();
    const colRect = todayCol.getBoundingClientRect();
    const nextLeft =
      root.scrollLeft + (colRect.left - rootRect.left) - labelW - 4;
    root.scrollLeft = Math.max(0, nextLeft);
    didScrollToTodayCol.current = true;
  }, [days, weekStartKey, portraitZoom, tableFragment]);

  const bodyRows = (
    <>
      {tableFragment === "tbody-row" && (
        <DayHeaderRow
          days={days}
          as="th"
          emphasizeTop
          embedded
          isCoach={isCoach}
          canEditDayNotes={canEditDayNotes}
          athleteId={athleteId}
        />
      )}
      <WeatherTableRow
        days={days}
        open={showWeatherRow}
        weatherLocation={weatherLocation}
        onWeatherLocationSelect={onWeatherLocationSelect}
        onWeatherLocationReset={onWeatherLocationReset}
      />
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
      <NotesEventsTableRow
        days={days}
        showNotes={showNotesInLayer}
        showEvents={showEventsInLayer}
        canEditDayNotes={canEditDayNotes}
        isCoach={isCoach}
        swimCssSecPer100m={swimCssSecPer100m}
      />
    </>
  );

  if (tableFragment) {
    return (
      <>
        {tableFragment === "thead" && (
          <thead className={TABLE_HEADER}>
            <DayHeaderRow
              days={days}
              as="th"
              isCoach={isCoach}
              canEditDayNotes={canEditDayNotes}
              athleteId={athleteId}
            />
          </thead>
        )}
        <tbody>{bodyRows}</tbody>
      </>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-full">
      {weekLabel && (prevWeekHref || nextWeekHref) ? (
        <div className="tt-week-view-chrome mb-2">
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
      <div
        ref={matrixBleedRef}
        className="tt-week-plan-board tt-week-matrix-bleed @container min-w-0 max-w-full"
      >
        <div
          ref={matrixScrollRef}
          className="tt-week-matrix-scroll min-w-0 w-full max-w-full overflow-x-auto overflow-y-hidden overscroll-x-contain"
          data-week-portrait-zoom={portraitZoom}
        >
          <div className="tt-week-matrix-scroll-inner">
            <table
              className={cn(
                TABLE_FRAME,
                "tt-week-matrix-table w-full table-fixed text-left landscape:max-lg:text-[9px] lg:text-sm",
              )}
              data-card-size={weekCardSize ?? "m"}
            >
              <colgroup>
                <col className="tt-week-label-col w-[11%]" />
                {days.map((day) => (
                  <col key={day.dateKey} className="tt-week-day-col" />
                ))}
              </colgroup>
              <thead className={TABLE_HEADER}>
                <DayHeaderRow
                  days={days}
                  as="th"
                  isCoach={isCoach}
                  canEditDayNotes={canEditDayNotes}
                  athleteId={athleteId}
                />
              </thead>
              <tbody>{bodyRows}</tbody>
            </table>
          </div>
        </div>
      </div>
      <div className="tt-week-view-chrome mt-2 flex min-w-0 flex-col gap-5">
        <WeekMatrixScrollSlider scrollRef={matrixScrollRef} days={days} />
        <WeekPortraitStats
          days={days}
          sportRows={sportRows}
          swimCssSecPer100m={swimCssSecPer100m}
        />
      </div>
    </div>
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
