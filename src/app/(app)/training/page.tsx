import { redirect } from "next/navigation";
import type { WorkoutType } from "@prisma/client";
import { PageHeader } from "@/components/ui/page-header";
import { PlanMultiWeekTables } from "@/components/plan/plan-multi-week-tables";
import { CalendarMonthView } from "@/components/training/calendar-month-view";
import { TrainingMobileWeekView } from "@/components/training/training-mobile-week-view";
import { TrainingCalendarControls } from "@/components/training/training-calendar-controls";
import { TrainingTableView } from "@/components/training/training-table-view";
import {
  getDayNotesForRange,
  getPlanWorkoutsInRange,
  getRacesForRange,
  getSeasonEventsForRange,
  getWeekDays,
  getWeekExtraPlanSportRows,
  getWeekHiddenPlanSportRows,
  groupDayNotesByDate,
  groupWorkoutsByDate,
} from "@/lib/queries";
import { groupSeasonEventsByDate } from "@/lib/season-events";
import { getSession, getCoachAthletes, resolveAthleteId, isCoachView as userIsCoach } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { toPlanWorkoutDetail, redactPlanWorkoutNotesForViewer } from "@/lib/plan-workout";
import { mergeRacesIntoByDate } from "@/lib/races";
import { buildPlanTableDays } from "@/lib/plan-week";
import { buildTrainingDays } from "@/lib/training-timeline";
import {
  addDateOnlyDays,
  addDateOnlyMonths,
  eachDateOnlyDay,
  endOfMonthDateOnly,
  endOfWeekDateOnly,
  formatDateOnly,
  startOfMonthDateOnly,
  startOfWeekDateOnly,
  todayDateKey,
  todayDateOnly,
  toDateKey,
} from "@/lib/dates";
import { getCoachLibraryTemplates } from "@/lib/workout-library/queries";
import { resolveLibraryTemplateMetricsForAthlete } from "@/lib/workout-library/template-metrics";
import { loadAthletePreferencesForBuilder } from "@/lib/workout-builder/load-athlete-preferences";
import { TrainingPlanShell } from "@/components/training/training-plan-shell";
import { TrainingDefaultViewRedirect } from "@/components/training/training-default-view-redirect";
import { getYrWeatherSummaries } from "@/lib/weather/yr";
import type { WeatherDaySummary } from "@/lib/weather/places";

type TrainingView = "week" | "list" | "calendar";

const MAX_WEEK_SPAN = 16;

type TrainingPageProps = {
  searchParams: Promise<{
    week?: string;
    month?: string;
    view?: string;
    months?: string;
    weeks?: string;
    wlat?: string;
    wlon?: string;
    wname?: string;
  }>;
};

function parseView(raw: string | undefined): TrainingView {
  if (raw === "calendar" || raw === "month") return "calendar";
  // New list = former infinite-scroll table; keep `table` as alias
  if (raw === "list" || raw === "table") return "list";
  return "week";
}

function parseMonthSpan(raw: string | undefined): 1 | 2 | 3 {
  const n = parseInt(raw ?? "1", 10);
  if (n === 2 || n === 3) return n;
  return 1;
}

function parseWeekSpan(raw: string | undefined): number {
  const n = parseInt(raw ?? "1", 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(MAX_WEEK_SPAN, Math.floor(n));
}

function parseWeatherCoord(raw: string | undefined): number | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 10000) / 10000;
}

export default async function TrainingPage({
  searchParams,
}: TrainingPageProps) {
  const session = await getSession();
  if (!session) redirect("/");

  const athleteId = await resolveAthleteId(session);
  if (!athleteId) redirect("/");

  const params = await searchParams;
  // Soft-redirect legacy table bookmarks to list
  if (params.view === "table") {
    redirect("/training?view=list");
  }
  // Soft-redirect legacy month view to calendar
  if (params.view === "month") {
    const qs = new URLSearchParams();
    qs.set("view", "calendar");
    if (params.month) qs.set("month", params.month);
    if (params.months) qs.set("months", params.months);
    redirect(`/training?${qs.toString()}`);
  }

  // No explicit view → client picks List (mobile) or Week (desktop)
  if (params.view == null || params.view === "") {
    return <TrainingDefaultViewRedirect />;
  }

  const weekOffset = parseInt(params.week ?? "0", 10) || 0;
  const monthOffset = parseInt(params.month ?? "0", 10) || 0;
  const view = parseView(params.view);
  const monthSpan = parseMonthSpan(params.months);
  const weekSpan = view === "week" ? parseWeekSpan(params.weeks) : 1;
  const usesMonthGrid = view === "calendar";

  // Always use UTC date-only + Monday week starts (never date-fns on local midnight).
  const todayOnly = todayDateOnly();
  const anchor =
    usesMonthGrid
      ? addDateOnlyMonths(startOfMonthDateOnly(todayOnly), monthOffset)
      : addDateOnlyDays(todayOnly, weekOffset * 7);

  const rangeEndMonth = addDateOnlyMonths(anchor, monthSpan - 1);
  const monthGridStart = startOfWeekDateOnly(startOfMonthDateOnly(anchor));
  const monthGridEnd = endOfWeekDateOnly(endOfMonthDateOnly(rangeEndMonth));
  const weekStart = startOfWeekDateOnly(anchor);
  const weekEnd = endOfWeekDateOnly(
    addDateOnlyDays(anchor, (weekSpan - 1) * 7),
  );

  // List starts at yesterday so recent sessions sit above today; earlier days
  // load when scrolling up. Use date-only helpers so from/to keys match day rows
  // (local midnight + toDateKey shifts -1 day in UTC+ and skips that day on past load).
  const listRangeStart = addDateOnlyDays(todayOnly, -1);
  const listRangeEnd = addDateOnlyDays(todayOnly, 21);
  const listFromKey = toDateKey(listRangeStart);
  const listToKey = toDateKey(listRangeEnd);

  const rangeStart =
    usesMonthGrid
      ? monthGridStart
      : view === "list"
        ? listRangeStart
        : weekStart;
  const rangeEnd =
    usesMonthGrid
      ? monthGridEnd
      : view === "list"
        ? listRangeEnd
        : weekEnd;

  const rawWorkouts = await getPlanWorkoutsInRange(
    athleteId,
    rangeStart,
    rangeEnd,
  );

  const byDateRaw = groupWorkoutsByDate(rawWorkouts);
  const isCoach = userIsCoach(session);
  const noteViewer = isCoach ? 'coach' : 'athlete'
  const byDateWorkouts = new Map(
    [...byDateRaw.entries()].map(([key, list]) => [
      key,
      list.map((w) =>
        redactPlanWorkoutNotesForViewer(toPlanWorkoutDetail(w), noteViewer),
      ),
    ]),
  );
  const races = await getRacesForRange(athleteId, rangeStart, rangeEnd);
  const byDate = mergeRacesIntoByDate(byDateWorkouts, races);

  const dayNotes = await getDayNotesForRange(athleteId, rangeStart, rangeEnd);
  const notesByDate = groupDayNotesByDate(dayNotes, noteViewer);

  const seasonEventsRaw = await getSeasonEventsForRange(
    athleteId,
    rangeStart,
    rangeEnd,
  );
  const eventsByDate = groupSeasonEventsByDate(
    seasonEventsRaw,
    rangeStart,
    rangeEnd,
  );

  const canLogWorkout =
    session.hasAthlete && Boolean(session.athleteId);
  const today = todayDateKey();

  const coachAthletes = isCoach ? await getCoachAthletes(session.userId) : [];
  const selectedAthlete = coachAthletes.find((a) => a.id === athleteId);
  const athletePlanConfig = await prisma.athlete.findUnique({
    where: { id: athleteId },
    select: {
      planSportRows: true,
      weatherLocationName: true,
      weatherLat: true,
      weatherLon: true,
    },
  });

  const overrideLat = parseWeatherCoord(params.wlat);
  const overrideLon = parseWeatherCoord(params.wlon);
  const activeWeatherLocation =
    overrideLat != null && overrideLon != null
      ? {
          name: params.wname?.trim() || "Custom location",
          lat: overrideLat,
          lon: overrideLon,
          isOverride: true,
        }
      : athletePlanConfig?.weatherLat != null && athletePlanConfig.weatherLon != null
        ? {
            name: athletePlanConfig.weatherLocationName?.trim() || "Default location",
            lat: athletePlanConfig.weatherLat,
            lon: athletePlanConfig.weatherLon,
            isOverride: false,
          }
        : null;

  let weatherByDate = new Map<string, WeatherDaySummary>();
  if (activeWeatherLocation) {
    try {
      weatherByDate = await getYrWeatherSummaries({
        lat: activeWeatherLocation.lat,
        lon: activeWeatherLocation.lon,
        dateKeys: eachDateOnlyDay(rangeStart, rangeEnd).map((d) => toDateKey(d)),
      });
    } catch {
      weatherByDate = new Map();
    }
  }

  const weekBlocks = Array.from({ length: weekSpan }, (_, i) => {
    const weekAnchor = addDateOnlyDays(anchor, i * 7);
    const days = getWeekDays(weekAnchor);
    const start = startOfWeekDateOnly(weekAnchor);
    const end = endOfWeekDateOnly(weekAnchor);
    return {
      index: i,
      weekStart: start,
      weekStartKey: toDateKey(start),
      weekLabel: `${formatDateOnly(start, "d MMM")} – ${formatDateOnly(end, "d MMM yyyy")}`,
      trainingDays: buildTrainingDays(days),
      tableDays: buildPlanTableDays(days, byDate, notesByDate, eventsByDate, weatherByDate),
    };
  });

  const weekSportRows = isCoach
    ? await Promise.all(
        weekBlocks.map(async (block) => {
          const [extra, hidden] = await Promise.all([
            getWeekExtraPlanSportRows(athleteId, block.weekStart),
            getWeekHiddenPlanSportRows(athleteId, block.weekStart),
          ]);
          return {
            weekStartKey: block.weekStartKey,
            weekExtraPlanSportRows: extra,
            weekHiddenPlanSportRows: hidden,
          };
        }),
      )
    : weekBlocks.map((block) => ({
        weekStartKey: block.weekStartKey,
        weekExtraPlanSportRows: [] as WorkoutType[],
        weekHiddenPlanSportRows: [] as WorkoutType[],
      }));

  const weekSportByKey = new Map(
    weekSportRows.map((row) => [row.weekStartKey, row]),
  );

  const firstWeek = weekBlocks[0]!;
  const firstWeekSports = weekSportByKey.get(firstWeek.weekStartKey)!;

  const weekSpanQuery = weekSpan > 1 ? `&weeks=${weekSpan}` : "";
  const weekQuery = `week=${weekOffset}${weekSpanQuery}`;
  const monthSpanQuery = monthSpan > 1 ? `&months=${monthSpan}` : "";
  const monthQuery = `month=${monthOffset}${monthSpanQuery}`;
  const prevWeek = weekOffset - 1;
  const nextWeek = weekOffset + 1;
  const prevMonth = monthOffset - 1;
  const nextMonth = monthOffset + 1;

  const weekHref = `/training?view=week&${weekQuery}`;
  const listHref = `/training?view=list`;
  const calendarHref = `/training?view=calendar&${monthQuery}`;

  const prevHref =
    usesMonthGrid
      ? `/training?view=calendar&month=${prevMonth}${monthSpanQuery}`
      : `/training?view=week&week=${prevWeek}${weekSpanQuery}`;
  const nextHref =
    usesMonthGrid
      ? `/training?view=calendar&month=${nextMonth}${monthSpanQuery}`
      : `/training?view=week&week=${nextWeek}${weekSpanQuery}`;

  const addWeekHref =
    weekSpan < MAX_WEEK_SPAN
      ? `/training?view=week&week=${weekOffset}&weeks=${weekSpan + 1}`
      : null;
  const removeWeekHref =
    weekSpan > 1
      ? weekSpan - 1 > 1
        ? `/training?view=week&week=${weekOffset}&weeks=${weekSpan - 1}`
        : `/training?view=week&week=${weekOffset}`
      : null;

  const trainingTitle = isCoach ? "Plan" : "Training";

  const periodLabel =
    usesMonthGrid
      ? monthSpan === 1
        ? formatDateOnly(anchor, "MMMM yyyy")
        : `${formatDateOnly(anchor, "MMMM yyyy")} – ${formatDateOnly(rangeEndMonth, "MMMM yyyy")}`
      : firstWeek.weekLabel;

  const monthBlocks =
    usesMonthGrid
      ? Array.from({ length: monthSpan }, (_, i) => {
          const monthAnchor = addDateOnlyMonths(anchor, i);
          const start = startOfWeekDateOnly(startOfMonthDateOnly(monthAnchor));
          const end = endOfWeekDateOnly(endOfMonthDateOnly(monthAnchor));
          return {
            label: formatDateOnly(monthAnchor, "MMMM yyyy"),
            anchorMonth: monthAnchor,
            days: eachDateOnlyDay(start, end).map((day) => {
              const key = toDateKey(day);
              return {
                dateKey: key,
                dayNumber: day.getUTCDate(),
                inMonth:
                  day.getUTCMonth() === monthAnchor.getUTCMonth() &&
                  day.getUTCFullYear() === monthAnchor.getUTCFullYear(),
                isToday: key === today,
              };
            }),
          };
        })
      : [];

  const pageHeader = (
    <PageHeader
      title={trainingTitle}
      action={
        <TrainingCalendarControls
          view={view}
          weekHref={weekHref}
          listHref={listHref}
          calendarHref={calendarHref}
          canLogWorkout={canLogWorkout}
          showLibraryToggle={isCoach}
          showSportFilter={view === "list"}
        />
      }
    />
  );

  const weekViewBlocks = weekBlocks.map((block) => {
    const sports = weekSportByKey.get(block.weekStartKey)!;
    return {
      weekStartKey: block.weekStartKey,
      weekLabel: block.weekLabel,
      planDays: block.tableDays,
      weekExtraPlanSportRows: sports.weekExtraPlanSportRows,
      weekHiddenPlanSportRows: sports.weekHiddenPlanSportRows,
    };
  });

  const athletePreferences = await loadAthletePreferencesForBuilder(athleteId);
  const swimCssSecPer100m = athletePreferences?.swimCssSecPer100m ?? null;

  const libraryTemplates = isCoach
    ? (await getCoachLibraryTemplates(session.userId)).map((t) => {
        const metrics = resolveLibraryTemplateMetricsForAthlete(
          t,
          athletePreferences,
        );
        return {
          id: t.id,
          title: t.title,
          type: t.type,
          sessionType: t.sessionType,
          distanceKm: metrics.distanceKm,
          durationMin: metrics.durationMin,
          plannedDistanceMeters: t.plannedDistanceMeters,
          distanceApprox: metrics.distanceApprox,
          durationApprox: metrics.durationApprox,
        };
      })
    : [];

  return (
    <TrainingPlanShell isCoach={isCoach} templates={libraryTemplates}>
      {pageHeader}

      {view === "calendar" ? (
        <CalendarMonthView
          rangeLabel={periodLabel}
          months={monthBlocks.map(({ label, days }) => ({ label, days }))}
          monthSpan={monthSpan}
          monthOffset={monthOffset}
          workoutsByDate={byDate}
          notesByDate={notesByDate}
          eventsByDate={eventsByDate}
          isCoach={isCoach}
          canEditDayNotes
          athleteId={athleteId}
          planSportRows={athletePlanConfig?.planSportRows ?? []}
          swimCssSecPer100m={swimCssSecPer100m}
          prevMonthHref={prevHref}
          nextMonthHref={nextHref}
        />
      ) : view === "list" ? (
        <TrainingTableView
          initialDays={buildPlanTableDays(
            eachDateOnlyDay(listRangeStart, listRangeEnd),
            byDate,
            notesByDate,
            undefined,
            weatherByDate,
          ).map((day) => ({
            dateKey: day.dateKey,
            dayLabel: day.dayLabel,
            dateLabel: day.dateLabel,
            isToday: day.isToday,
            workouts: day.workouts,
          }))}
          initialFromKey={listFromKey}
          initialToKey={listToKey}
          isCoach={isCoach}
        />
      ) : (
        <>
          <div className="hidden lg:block">
            <PlanMultiWeekTables
              weeks={weekViewBlocks}
              isCoach={isCoach}
              canEditDayNotes
              athleteId={athleteId}
              athleteName={isCoach ? selectedAthlete?.name : undefined}
              planSportRows={athletePlanConfig?.planSportRows ?? []}
              prevWeekHref={prevHref}
              nextWeekHref={nextHref}
              addWeekHref={addWeekHref}
              removeWeekHref={removeWeekHref}
              swimCssSecPer100m={swimCssSecPer100m}
              weatherLocation={activeWeatherLocation}
            />
          </div>

          <div className="lg:hidden">
            <TrainingMobileWeekView
              days={firstWeek.trainingDays}
              planDays={firstWeek.tableDays}
              isCoach={isCoach}
              canEditDayNotes
              athleteId={athleteId}
              prevWeekHref={prevHref}
              nextWeekHref={nextHref}
              weekLabel={firstWeek.weekLabel}
              athleteName={isCoach ? selectedAthlete?.name : undefined}
              weekStartKey={isCoach ? firstWeek.weekStartKey : undefined}
              planSportRows={athletePlanConfig?.planSportRows ?? []}
              weekExtraPlanSportRows={firstWeekSports.weekExtraPlanSportRows}
              weekHiddenPlanSportRows={firstWeekSports.weekHiddenPlanSportRows}
              weekBlocks={weekViewBlocks}
              addWeekHref={addWeekHref}
              removeWeekHref={removeWeekHref}
              swimCssSecPer100m={swimCssSecPer100m}
              weatherLocation={activeWeatherLocation}
            />
          </div>
        </>
      )}
    </TrainingPlanShell>
  );
}
