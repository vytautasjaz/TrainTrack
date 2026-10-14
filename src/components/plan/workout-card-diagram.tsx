"use client";

import { WorkoutType } from "@prisma/client";
import type { PlanWorkoutDetail } from "@/lib/plan-workout";
import { hasIncludeItems, hasStructureContent } from "@/lib/workout-builder/utils";
import { structureDiagramToChartModel } from "@/lib/workout-builder/structure-diagram";
import {
  WorkoutStructureChart,
  type StructureChartTone,
} from "@/components/workout-builder/workout-structure-chart";

type DiagramDensity = "week" | "list" | "month";

type WorkoutCardDiagramProps = {
  workout: PlanWorkoutDetail;
  completed: boolean;
  skipped?: boolean;
  density: DiagramDensity;
  className?: string;
  /** Override auto tone (e.g. week skipped → muted like mock). */
  tone?: StructureChartTone;
};

const CHART_SIZE = {
  week: "card",
  list: "cardLg",
  month: "xs",
} as const;

/** Strength / HYROX use section lists — intensity silhouette is for run/bike-style builders. */
export function sportUsesStructureChart(sport: WorkoutType): boolean {
  return sport !== WorkoutType.STRENGTH && sport !== WorkoutType.HYROX;
}

export function workoutHasCardDiagram(workout: PlanWorkoutDetail): boolean {
  if (!sportUsesStructureChart(workout.type)) return false;
  if (workout.structureDiagram) {
    return structureDiagramToChartModel(workout.structureDiagram) != null;
  }
  if (!workout.structure) return false;
  return (
    hasStructureContent(workout.structure) || hasIncludeItems(workout.structure)
  );
}

export function WorkoutCardDiagram({
  workout,
  completed,
  skipped = false,
  density,
  className,
  tone: toneProp,
}: WorkoutCardDiagramProps) {
  if (!workoutHasCardDiagram(workout)) {
    return null;
  }

  const tone: StructureChartTone =
    toneProp ??
    (completed ? "completed" : skipped ? "skipped" : "muted");

  const chartModel = workout.structureDiagram
    ? structureDiagramToChartModel(workout.structureDiagram)
    : null;

  return (
    <WorkoutStructureChart
      structure={chartModel ? undefined : workout.structure}
      chartModel={chartModel}
      durationMinutes={workout.plannedDuration ?? undefined}
      size={CHART_SIZE[density]}
      showCaption={false}
      tone={tone}
      className={className}
    />
  );
}
