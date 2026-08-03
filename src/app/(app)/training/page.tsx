import { redirect } from "next/navigation";
import type { WorkoutType } from "@prisma/client";
import { PageHeader } from "@/components/ui/page-header";
import { PlanMultiWeekTables } from "@/components/plan/plan-multi-week-tables";
import { MonthCalendarView } from "@/components/plan/month-calendar-view";
import { TrainingMobileWeekView } from "@/components/training/training-mobile-week-view";
import { TrainingCalendarControls } from "@/components/training/training-calendar-controls";
import { TrainingTableView } from "@/components/training/training-table-view";
import {
  getDayNotesForRange,
  getPlanWorkoutsInRange,
  getRacesForRange,
  getWeekDays,
  getWeekExtraPlanSportRows,
  getWeekHiddenPlanSportRows,
  groupDayNotesByDate,
  groupWorkoutsByDate,
} from "@/lib/queries";
import { getSession, getCoachAthletes, resolveAthleteId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { toPlanWorkoutDetail } from "@/lib/plan-workout";
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

type TrainingView = "week" | "month" | "list";

const MAX_WEEK_SPAN = 16;

type TrainingPageProps = {
  searchParams: Promise<{
    week?: string;
    month?: string;
    view?: string;
    months?: string;
    weeks?: string;
  }>;
};

function parseView(raw: string | undefined): TrainingView {
  if (raw === "month") return "month";
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

  // No explicit view → client picks List (mobile) or Week (desktop)
  if (params.view == null || params.view === "") {
    return <TrainingDefaultViewRedirect />;
  }

  const weekOffset = parseInt(params.week ?? "0", 10) || 0;
  const monthOffset = parseInt(params.month ?? "0", 10) || 0;
  const view = parseView(params.view);
  const monthSpan = parseMonthSpan(params.months);
  const weekSpan = view === "week" ? parseWeekSpan(params.weeks) : 1;

  // Always use UTC date-only + Monday week starts (never date-fns on local midnight).
  const todayOnly = todayDateOnly();
  const anchor =
    view === "month"
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
    view === "month"
      ? monthGridStart
      : view === "list"
        ? listRangeStart
        : weekStart;
  const rangeEnd =
    view === "month"
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
  const byDateWorkouts = new Map(
    [...byDateRaw.entries()].map(([key, list]) => [
      key,
      list.map(toPlanWorkoutDetail),
    ]),
  );
  const races = await getRacesForRange(athleteId, rangeStart, rangeEnd);
  const byDate = mergeRacesIntoByDate(byDateWorkouts, races);

  const dayNotes = await getDayNotesForRange(athleteId, rangeStart, rangeEnd);
  const notesByDate = groupDayNotesByDate(dayNotes);

  const isCoach = session.role === "COACH";
  const canLogWorkout =
    session.role === "ATHLETE" && Boolean(session.athleteId);
  const today = todayDateKey();

  const coachAthletes = isCoach ? await getCoachAthletes(session.userId) : [];
  const selectedAthlete = coachAthletes.find((a) => a.id === athleteId);
  const athletePlanConfig = isCoach
    ? await prisma.athlete.findUnique({
        where: { id: athleteId },
        select: { planSportRows: true },
      })
    : null;

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
      tableDays: buildPlanTableDays(days, byDate, notesByDate),
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
  const monthHref = `/training?view=month&${monthQuery}`;

  const prevHref =
    view === "month"
      ? `/training?view=month&month=${prevMonth}${monthSpanQuery}`
      : `/training?view=week&week=${prevWeek}${weekSpanQuery}`;
  const nextHref =
    view === "month"
      ? `/training?view=month&month=${nextMonth}${monthSpanQuery}`
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
    view === "month"
      ? monthSpan === 1
        ? formatDateOnly(anchor, "MMMM yyyy")
        : `${formatDateOnly(anchor, "MMM yyyy")} – ${formatDateOnly(rangeEndMonth, "MMM yyyy")}`
      : firstWeek.weekLabel;

  const monthBlocks =
    view === "month"
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
          monthHref={monthHref}
          listHref={listHref}
          canLogWorkout={canLogWorkout}
          showLibraryToggle={isCoach}
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

  const libraryTemplates = isCoach
    ? await (async () => {
        const [templates, preferences] = await Promise.all([
          getCoachLibraryTemplates(session.userId),
          loadAthletePreferencesForBuilder(athleteId),
        ])
        return templates.map((t) => {
          const metrics = resolveLibraryTemplateMetricsForAthlete(t, preferences)
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
          }
        })
      })()
    : [];

  return (
    <TrainingPlanShell isCoach={isCoach} templates={libraryTemplates}>
      {pageHeader}

      {view === "month" ? (
        <MonthCalendarView
          rangeLabel={periodLabel}
          months={monthBlocks}
          monthSpan={monthSpan}
          monthOffset={monthOffset}
          workoutsByDate={byDate}
          notesByDate={notesByDate}
          isCoach={isCoach}
          athleteId={athleteId}
          trainingMode
          prevMonthHref={prevHref}
          nextMonthHref={nextHref}
        />
      ) : view === "list" ? (
        <TrainingTableView
          initialDays={buildPlanTableDays(
            eachDateOnlyDay(listRangeStart, listRangeEnd),
            byDate,
            notesByDate,
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
            />
          </div>
        </>
      )}
    </TrainingPlanShell>
  );
}
