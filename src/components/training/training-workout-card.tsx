"use client";

import { useState } from "react";
import { WorkoutModalTrigger } from "@/components/plan/workout-modal-trigger";
import {
  AthleteWorkoutQuickActions,
  useOptimisticWorkoutStatus,
} from "@/components/plan/athlete-workout-quick-actions";
import { PlanWorkoutActionsMenu } from "@/components/plan/plan-workout-actions-menu";
import { usePlanWeekDnd } from "@/components/plan/plan-week-dnd";
import { WorkoutBlock } from "@/components/workout-block";
import {
  athleteHasQuickLogActions,
  type PlanWorkoutDetail,
} from "@/lib/plan-workout";
import { cn } from "@/lib/utils";

type TrainingWorkoutCardProps = {
  workout: PlanWorkoutDetail;
  isCoach: boolean;
  compact?: boolean;
  detailed?: boolean;
  className?: string;
};

export function TrainingWorkoutCard({
  workout,
  isCoach,
  className,
}: TrainingWorkoutCardProps) {
  const dnd = usePlanWeekDnd();
  const [dragging, setDragging] = useState(false);
  const { status, setOptimisticStatus } = useOptimisticWorkoutStatus(workout);

  const showQuickActions = athleteHasQuickLogActions(workout, isCoach);
  const showCoachDelete = isCoach && !workout.isRace;
  const canDrag = isCoach && !workout.isRace && Boolean(dnd);
  const reserveActions = showCoachDelete || showQuickActions;

  return (
    <div className={cn("py-3", className, dragging && "opacity-50")}>
      <div className="group/card relative min-w-0 overflow-hidden">
        <WorkoutModalTrigger
          workout={workout}
          isCoach={isCoach}
          className="block w-full min-w-0"
          title={canDrag ? `${workout.title} — drag to move` : undefined}
          draggable={canDrag}
          onDragStart={(e) => {
            if (!dnd) return;
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
          <WorkoutBlock
            workout={workout}
            density="lg"
            status={status}
            hideCompletedBadge={showQuickActions}
            actions={
              reserveActions ? (
                <span
                  className={cn(
                    "inline-block",
                    showCoachDelete ? "w-7" : showQuickActions ? "w-14" : "w-7",
                  )}
                  aria-hidden
                />
              ) : null
            }
          />
        </WorkoutModalTrigger>

        {showCoachDelete ? (
          <div className="absolute right-2 top-2 z-10 opacity-60 transition group-hover/card:opacity-100">
            <PlanWorkoutActionsMenu workout={workout} />
          </div>
        ) : null}

        {showQuickActions ? (
          <div className="absolute right-2 top-2 z-10 opacity-60 transition group-hover/card:opacity-100">
            <AthleteWorkoutQuickActions
              workout={workout}
              isCoach={isCoach}
              size="sm"
              displayStatus={status}
              onDisplayStatusChange={setOptimisticStatus}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
