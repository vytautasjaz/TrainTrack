'use client';

import type { WorkoutType } from "@prisma/client";
import {
  PlanMultiWeekTables,
  type PlanMultiWeekBlock,
  type WeatherLocation,
} from "@/components/plan/plan-multi-week-tables";
import type { PlanDay } from "@/lib/plan-week";
import type { TrainingDay } from "@/lib/training-timeline";

type TrainingMobileWeekViewProps = {
  days: TrainingDay[];
  planDays: PlanDay[];
  isCoach: boolean;
  canEditDayNotes?: boolean;
  athleteId?: string;
  prevWeekHref: string;
  nextWeekHref: string;
  weekLabel?: string;
  athleteName?: string;
  weekStartKey?: string;
  planSportRows?: WorkoutType[];
  weekExtraPlanSportRows?: WorkoutType[];
  weekHiddenPlanSportRows?: WorkoutType[];
  weekBlocks?: PlanMultiWeekBlock[];
  addWeekHref?: string | null;
  removeWeekHref?: string | null;
  swimCssSecPer100m?: number | null;
  weatherLocation?: WeatherLocation | null;
  weatherVisibleByDefault?: boolean;
};

/**
 * Mobile Week shell — portrait and landscape both use the week matrix
 * (horizontal scroll + zoom on portrait). List remains the agenda view.
 */
export function TrainingMobileWeekView({
  planDays,
  isCoach,
  canEditDayNotes,
  athleteId,
  prevWeekHref,
  nextWeekHref,
  weekLabel,
  athleteName,
  weekStartKey,
  planSportRows,
  weekExtraPlanSportRows,
  weekHiddenPlanSportRows,
  weekBlocks,
  addWeekHref,
  removeWeekHref,
  swimCssSecPer100m = null,
  weatherLocation = null,
  weatherVisibleByDefault = true,
}: TrainingMobileWeekViewProps) {
  const blocks: PlanMultiWeekBlock[] =
    weekBlocks && weekBlocks.length > 0
      ? weekBlocks
      : [
          {
            weekStartKey: weekStartKey ?? "week",
            weekLabel: weekLabel ?? "",
            planDays,
            weekExtraPlanSportRows: weekExtraPlanSportRows ?? [],
            weekHiddenPlanSportRows: weekHiddenPlanSportRows ?? [],
          },
        ];

  return (
    <PlanMultiWeekTables
      weeks={blocks}
      isCoach={isCoach}
      canEditDayNotes={canEditDayNotes}
      athleteId={athleteId}
      athleteName={athleteName}
      planSportRows={planSportRows}
      prevWeekHref={prevWeekHref}
      nextWeekHref={nextWeekHref}
      addWeekHref={addWeekHref}
      removeWeekHref={removeWeekHref}
      swimCssSecPer100m={swimCssSecPer100m}
      weatherLocation={weatherLocation}
      weatherVisibleByDefault={weatherVisibleByDefault}
    />
  );
}
