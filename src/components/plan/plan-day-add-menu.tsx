"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarRange, Flag, Plus } from "lucide-react";
import { RaceIntent, WorkoutType } from "@prisma/client";
import { WorkoutEditorDialog } from "@/components/workout-editor/workout-editor-dialog";
import { DayNoteModal } from "@/components/plan/day-note-modal";
import { RecoveryDayModal } from "@/components/plan/recovery-day-modal";
import { SeasonEventModal } from "@/components/plan/season-event-modal";
import { AddRaceModal } from "@/components/races/add-race-modal";
import { WorkoutSportIcon } from "@/components/plan/workout-sport-icon";
import { SPORT_ROW_ORDER, WORKOUT_TYPE_LABELS } from "@/lib/constants";
import type { DayNoteData } from "@/lib/day-notes";
import type { PlanWorkoutDetail } from "@/lib/plan-workout";
import { cn } from "@/lib/utils";

const COACH_ADD_SPORTS = SPORT_ROW_ORDER.filter(
  (t) => t !== WorkoutType.REST && t !== WorkoutType.RECOVERY,
);

/** Sports athletes can self-add from the day menu (text description only). */
const ATHLETE_ADD_SPORTS = COACH_ADD_SPORTS;

type PlanDayAddMenuProps = {
  dateKey: string;
  isCoach: boolean;
  canAddNote: boolean;
  athleteId?: string;
  dayNote?: DayNoteData | null;
  recoveryWorkout?: PlanWorkoutDetail | null;
  /** Open menu above the trigger (e.g. bottom table row). */
  menuPlacement?: "top" | "bottom";
  /** Lighter + for table add row. */
  variant?: "default" | "subtle";
  className?: string;
};

type MenuItemProps = {
  label: string;
  onClick: () => void;
  className?: string;
  icon?: React.ReactNode;
};

function MenuItem({ label, onClick, className, icon }: MenuItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-muted/60",
        className,
      )}
    >
      {icon}
      {label}
    </button>
  );
}

export function PlanDayAddMenu({
  dateKey,
  isCoach,
  canAddNote,
  athleteId,
  dayNote,
  recoveryWorkout,
  menuPlacement = "bottom",
  variant = "default",
  className,
}: PlanDayAddMenuProps) {
  const canAddWorkout = !isCoach;
  const canShowNoteOption = canAddNote;
  const canAddRecoveryOption = isCoach && !recoveryWorkout;
  const canAddRace = Boolean(athleteId) || !isCoach;
  const canAddEvent = Boolean(athleteId) || !isCoach;
  const [menuOpen, setMenuOpen] = useState(false);
  const [workoutOpen, setWorkoutOpen] = useState(false);
  const [workoutSport, setWorkoutSport] = useState<WorkoutType | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [raceOpen, setRaceOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    function handleClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [menuOpen]);

  if (!isCoach && !canShowNoteOption && !canAddWorkout && !canAddEvent) return null;

  const menuOpensUp = menuPlacement === "top";

  function handleAddClick() {
    if (isCoach || canAddWorkout) {
      setMenuOpen((open) => !open);
      return;
    }
    setNoteOpen(true);
  }

  function openWorkoutSport(sport: WorkoutType) {
    setMenuOpen(false);
    setWorkoutSport(sport);
    setWorkoutOpen(true);
  }

  function handleWorkoutOpenChange(open: boolean) {
    setWorkoutOpen(open);
    if (!open) setWorkoutSport(null);
  }

  function openNote() {
    setMenuOpen(false);
    setNoteOpen(true);
  }

  function openEvent() {
    setMenuOpen(false);
    setEventOpen(true);
  }

  function openRecovery() {
    setMenuOpen(false);
    setRecoveryOpen(true);
  }

  function openRace() {
    setMenuOpen(false);
    setRaceOpen(true);
  }

  const isSubtle = variant === "subtle";

  return (
    <div className={cn("relative shrink-0", className)} ref={menuRef}>
      <button
        type="button"
        onClick={handleAddClick}
        className={cn(
          "group flex min-h-9 min-w-9 items-center justify-center rounded-lg transition-colors",
          isSubtle
            ? "hover:bg-muted/30 active:bg-muted/40"
            : "h-8 w-8 text-muted-foreground hover:bg-muted/50 hover:text-brand",
          !isSubtle && menuOpen && "bg-muted/50 text-brand",
          isSubtle && menuOpen && "bg-muted/30",
        )}
        aria-label={
          isCoach || canAddWorkout
            ? `Add to ${dateKey}`
            : `Add note on ${dateKey}`
        }
        aria-expanded={isCoach || canAddWorkout ? menuOpen : undefined}
      >
        <Plus
          className={cn(
            "shrink-0 transition-colors",
            isSubtle
              ? "h-5 w-5 text-muted-foreground/50 group-hover:text-brand/70 landscape:max-lg:h-4 landscape:max-lg:w-4"
              : "h-4 w-4",
            isSubtle && menuOpen && "text-brand/70",
          )}
        />
      </button>

      {menuOpen && (isCoach || canAddWorkout) && (
        <div
          className={cn(
            "absolute right-0 z-50 min-w-[10rem] overflow-hidden rounded-lg border border-border/80 bg-card py-1 shadow-lg",
            menuOpensUp ? "bottom-full mb-1" : "top-full mt-1",
          )}
        >
          {(isCoach ? COACH_ADD_SPORTS : ATHLETE_ADD_SPORTS).map((sport) => (
            <MenuItem
              key={sport}
              label={WORKOUT_TYPE_LABELS[sport]}
              icon={<WorkoutSportIcon type={sport} size="xs" />}
              onClick={() => openWorkoutSport(sport)}
            />
          ))}
          {canAddRace && (
            <MenuItem
              label="Race"
              icon={
                <Flag
                  className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                  strokeWidth={2}
                />
              }
              onClick={openRace}
              className="border-t border-border/50 font-medium"
            />
          )}
          {canAddEvent && (
            <MenuItem
              label="Event"
              icon={
                <CalendarRange
                  className="h-3.5 w-3.5 shrink-0 text-amber-700"
                  strokeWidth={2}
                />
              }
              onClick={openEvent}
              className={cn(
                !canAddRace && "border-t border-border/50",
                "font-medium text-amber-900 dark:text-amber-200",
              )}
            />
          )}
          {canShowNoteOption && (
            <MenuItem
              label={dayNote ? "Edit note" : "Note"}
              onClick={openNote}
            />
          )}
          {canAddRecoveryOption && (
            <MenuItem
              label="Recovery Day"
              onClick={openRecovery}
              className="text-violet-700 dark:text-violet-300"
            />
          )}
        </div>
      )}

      {workoutOpen && workoutSport && (
        <WorkoutEditorDialog
          open={workoutOpen}
          onOpenChange={handleWorkoutOpenChange}
          date={dateKey}
          sport={workoutSport}
          athleteMode={!isCoach}
        />
      )}
      {canShowNoteOption && (
        <DayNoteModal
          dateKey={dateKey}
          note={dayNote}
          athleteId={athleteId}
          open={noteOpen}
          onOpenChange={setNoteOpen}
        />
      )}
      {canAddEvent && (
        <SeasonEventModal
          open={eventOpen}
          onOpenChange={setEventOpen}
          defaultStartDate={dateKey}
          defaultEndDate={dateKey}
        />
      )}
      {isCoach && (
        <RecoveryDayModal
          date={dateKey}
          workout={recoveryWorkout}
          open={recoveryOpen}
          onOpenChange={setRecoveryOpen}
        />
      )}
      {canAddRace && (
        <AddRaceModal
          open={raceOpen}
          onOpenChange={setRaceOpen}
          athleteId={athleteId}
          defaultIntent={RaceIntent.PLANNED}
          defaultDate={dateKey}
        />
      )}
    </div>
  );
}
