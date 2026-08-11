"use client";

import { format, getISOWeek } from "date-fns";
import {
  sumSportWeekTotals,
  type WeekTotalsOptions,
} from "@/lib/plan-week-totals";
import { WORKOUT_TYPE_LABELS } from "@/lib/constants";
import { parseDateOnly } from "@/lib/dates";
import type { PlanWorkoutDetail } from "@/lib/plan-workout";
import {
  WORKOUT_TYPE_DOT_CLASS,
  WORKOUT_TYPE_ICONS,
} from "@/lib/workout-display";
import {
  WEEK_STATS_SPORT_ICON_COLOR,
  countWeekWorkouts,
  weekSportMetric,
  weekSportProgressPercent,
  weekSportsWithPlannedWork,
} from "@/lib/week-sport-stats";
import { cn } from "@/lib/utils";
import type { WorkoutType } from "@prisma/client";

type CalendarWeekStatsCellProps = {
  weekDays: { dateKey: string }[];
  workoutsByDate: Map<string, PlanWorkoutDetail[]>;
  planSportRows?: WorkoutType[];
  swimCssSecPer100m?: number | null;
  className?: string;
};

export function CalendarWeekStatsCell({
  weekDays,
  workoutsByDate,
  planSportRows = [],
  swimCssSecPer100m = null,
  className,
}: CalendarWeekStatsCellProps) {
  const options: WeekTotalsOptions = { swimCssSecPer100m };
  const planDays = weekDays.map((day) => ({
    workouts: workoutsByDate.get(day.dateKey) ?? [],
  }));
  const allWorkouts = planDays.flatMap((d) => d.workouts);
  const sports = weekSportsWithPlannedWork(planDays, planSportRows, options);
  const weekCounts = countWeekWorkouts(allWorkouts);

  const start = parseDateOnly(weekDays[0]!.dateKey);
  const end = parseDateOnly(weekDays[weekDays.length - 1]!.dateKey);
  const weekNum = getISOWeek(start);
  const rangeLabel =
    start.getMonth() === end.getMonth()
      ? `${format(start, "d")} – ${format(end, "d MMM")}`
      : `${format(start, "d MMM")} – ${format(end, "d MMM")}`;

  return (
    <div
      className={cn(
        "flex min-h-[7.5rem] flex-col gap-2 bg-[color-mix(in_oklab,var(--color-muted)_40%,var(--color-card))] p-2",
        className,
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
          <span className="text-[10px] font-bold uppercase tracking-wide text-foreground">
            Week {weekNum}
          </span>
          <span className="text-[10px] tabular-nums text-muted-foreground">
            {rangeLabel}
          </span>
        </div>
        <p className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">
          <span className="font-semibold text-foreground">
            {weekCounts.completed}
          </span>
          {" / "}
          {weekCounts.planned}{" "}
          {weekCounts.planned === 1 ? "workout" : "workouts"}
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        {sports.map((sport) => {
          const totals = sumSportWeekTotals(planDays, sport, options);
          const metric = weekSportMetric(sport, totals, allWorkouts);
          const pct = weekSportProgressPercent(metric.actual, metric.planned);
          const Icon = WORKOUT_TYPE_ICONS[sport];

          return (
            <div key={sport} className="flex min-w-0 items-center gap-1.5">
              <div className="flex w-[3.75rem] shrink-0 items-center gap-1">
                <Icon
                  className={cn(
                    "h-3 w-3 shrink-0",
                    WEEK_STATS_SPORT_ICON_COLOR[sport],
                  )}
                  strokeWidth={2.25}
                  aria-hidden
                />
                <span className="truncate text-[10px] font-semibold text-foreground">
                  {WORKOUT_TYPE_LABELS[sport]}
                </span>
              </div>
              <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-foreground/6">
                <div
                  className={cn(
                    "h-full rounded-full transition-[width]",
                    WORKOUT_TYPE_DOT_CLASS[sport],
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-[4.75rem] shrink-0 text-right text-[9px] tabular-nums leading-none text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {metric.actualLabel}
                </span>
                {" / "}
                {metric.plannedLabel}
                {metric.unit ? ` ${metric.unit}` : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
