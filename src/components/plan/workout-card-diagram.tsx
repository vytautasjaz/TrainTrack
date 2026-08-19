"use client";

import type { PlanWorkoutDetail } from "@/lib/plan-workout";
import { hasIncludeItems, hasStructureContent } from "@/lib/workout-builder/utils";
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
};

const CHART_SIZE = {
  week: "card",
  list: "cardLg",
  month: "xs",
} as const;

export function workoutHasCardDiagram(workout: PlanWorkoutDetail): boolean {
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
}: WorkoutCardDiagramProps) {
  if (!workoutHasCardDiagram(workout)) {
    return null;
  }

  const tone: StructureChartTone = completed
    ? "completed"
    : skipped
      ? "skipped"
      : "muted";

  return (
    <WorkoutStructureChart
      structure={workout.structure}
      durationMinutes={workout.plannedDuration ?? undefined}
      size={CHART_SIZE[density]}
      showCaption={false}
      tone={tone}
      className={className}
    />
  );
}
