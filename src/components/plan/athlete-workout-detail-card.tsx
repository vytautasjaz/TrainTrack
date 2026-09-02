"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  CalendarClock,
  Check,
  Clock,
  ExternalLink,
  Flame,
  Link2,
  MessageSquare,
  MoreHorizontal,
  Share2,
  Unlink,
  X,
} from "lucide-react";
import { WorkoutStatus, WorkoutType } from "@prisma/client";
import { WorkoutSportIcon } from "@/components/plan/workout-sport-icon";
import { SelfAddedBadge } from "@/components/plan/self-added-badge";
import { RescheduleBadge } from "@/components/plan/reschedule-badge";
import { RescheduleWorkoutModal } from "@/components/plan/reschedule-workout-modal";
import { SwimWorkoutBuilder } from "@/components/swim-workout/swim-workout-builder";
import {
  StravaDetachButton,
  StravaLinkPicker,
} from "@/components/plan/strava-activity-picker";
import { AthleteWorkoutQuickActions } from "@/components/plan/athlete-workout-quick-actions";
import { StravaSyncedIndicator } from "@/components/plan/strava-synced-indicator";
import { StatusPill } from "@/components/ui/status-pill";
import { WorkoutStructureChart } from "@/components/workout-builder/workout-structure-chart";
import { IncludeItemsSummary } from "@/components/workout-editor/include-items-summary";
import type { PlanWorkoutDetail } from "@/lib/plan-workout";
import { athleteHasQuickLogActions, isStravaSynced } from "@/lib/plan-workout";
import { isStravaConnected } from "@/app/actions/strava";
import {
  approxMetricsFromTags,
  durationUnitFromTags,
  primaryMetricFromTags,
  secondaryMetricVisibleFromTags,
} from "@/lib/workout-approx-tags";
import {
  formatWorkoutCardDurationParts,
  getWorkoutCardSubtitle,
} from "@/lib/workout-card";
import { getWorkoutPlanMetrics } from "@/lib/workout-plan-metrics";
import {
  bikeKindFromTags,
  bikeKindLabel,
  bikePrimaryMetricFromTags,
} from "@/lib/bike-workout/defaults";
import { getSessionTypeLabel } from "@/lib/workout-builder/session-modes";
import {
  buildAthleteStructureDisplay,
  type PhaseBlockDisplay,
} from "@/lib/workout-builder/athlete-structure-display";
import { hasIncludeItems, hasStructureContent } from "@/lib/workout-builder/utils";
import { hasSwimStructureContent } from "@/lib/swim-workout/calculations";
import { getSportEditorConfig } from "@/lib/workout-editor/types";
import { WORKOUT_TYPE_LABELS } from "@/lib/constants";
import { parseDateOnly } from "@/lib/dates";
import { formatPaceMinPerKm } from "@/lib/athlete-preferences";
import { cn } from "@/lib/utils";
import type { PlanColorMode } from "@/lib/plan-sport-filter";

const SPORT_ACCENT: Record<WorkoutType, string> = {
  RUN: "var(--color-sport-run)",
  BIKE: "var(--color-sport-bike)",
  SWIM: "var(--color-sport-swim)",
  STRENGTH: "var(--color-sport-strength)",
  HYROX: "var(--color-sport-hyrox)",
  TRIATHLON: "var(--color-sport-tri)",
  RECOVERY: "var(--color-sport-recovery)",
  REST: "var(--color-sport-rest)",
};

type HeroTone = "dark" | "light";

function formatWorkoutDate(dateKey: string) {
  return parseDateOnly(dateKey).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function splitDistanceDisplay(distance: string): {
  value: string;
  unit: string;
} {
  const trimmed = distance.trim();
  const match = trimmed.match(/^(.+?)\s+(km|m)$/i);
  if (match) {
    return { value: match[1]!, unit: match[2]!.toLowerCase() };
  }
  return { value: trimmed, unit: "" };
}

function blockSubtitle(block: PhaseBlockDisplay) {
  if (block.intervalPreview) {
    const target = block.paceLabel ?? block.zoneLabel;
    return `${block.intervalPreview.reps} × ${block.intervalPreview.work}${
      target ? ` @ ${target}` : ""
    }`;
  }

  const target = block.paceLabel ?? block.zoneLabel;
  return target ? `${block.primary} @ ${target}` : block.primary;
}

function isHardIntensity(label: string | null): boolean {
  if (!label) return false;
  return /hard|vo2|threshold|race|interval/i.test(label);
}

/** Clock-style elapsed from planned/actual minutes (e.g. 49.2 → 49:12). */
function formatResultClock(minutes: number): string {
  const totalSecs = Math.max(0, Math.round(minutes * 60));
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function resultThirdMetric(workout: PlanWorkoutDetail): {
  value: string;
  unit: string;
  label: string;
} | null {
  const distanceKm = workout.result?.actualDistance;
  const durationMin = workout.result?.actualDuration;
  if (
    distanceKm == null ||
    distanceKm <= 0 ||
    durationMin == null ||
    durationMin <= 0
  ) {
    return null;
  }

  if (workout.type === WorkoutType.BIKE) {
    const hours = durationMin / 60;
    const kph = distanceKm / hours;
    if (!Number.isFinite(kph) || kph <= 0) return null;
    return {
      value: kph >= 10 ? kph.toFixed(1) : kph.toFixed(2),
      unit: "km/h",
      label: "Avg speed",
    };
  }

  if (workout.type === WorkoutType.SWIM) {
    const pace100 = formatPaceMinPerKm(durationMin / (distanceKm * 10));
    if (!pace100) return null;
    return { value: pace100, unit: "/100m", label: "Avg pace" };
  }

  if (
    workout.type === WorkoutType.RUN ||
    workout.type === WorkoutType.TRIATHLON ||
    workout.type === WorkoutType.HYROX
  ) {
    const pace = formatPaceMinPerKm(durationMin / distanceKm);
    if (!pace) return null;
    return {
      value: pace,
      unit: "/km",
      label: "Avg pace",
    };
  }

  return null;
}

function HeroMetricColumn({
  label,
  value,
  unit,
  approximate,
  planned,
  icon,
  tone = "dark",
}: {
  label: string;
  value: string | null;
  unit?: string | null;
  approximate?: boolean;
  planned?: string | null;
  icon?: ReactNode;
  tone?: HeroTone;
}) {
  const dark = tone === "dark";
  return (
    <div className="flex min-w-0 flex-[1_1_0%] flex-col items-center overflow-hidden px-1.5 text-center">
      <div
        className={cn(
          "inline-flex h-4 shrink-0 items-center justify-center gap-1",
          dark ? "text-white/50" : "text-[var(--tt-ink-soft)]",
        )}
      >
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wide">
          {label}
        </span>
      </div>
      <div className="mt-1.5 flex h-9 w-full shrink-0 items-center justify-center gap-0.5">
        {approximate && value ? (
          <span
            className={cn(
              "text-sm font-semibold leading-none",
              dark ? "text-white/40" : "text-[var(--tt-ink-faint)]",
            )}
          >
            ~
          </span>
        ) : null}
        <span
          className={cn(
            "max-w-full truncate text-[22px] font-bold leading-none tracking-tight tabular-nums",
            dark
              ? value
                ? "text-white"
                : "text-white/25"
              : value
                ? "text-[var(--tt-ink)]"
                : "text-[var(--tt-line-strong)]",
          )}
        >
          {value || "—"}
        </span>
        {unit ? (
          <span
            className={cn(
              "text-[12px] font-semibold leading-none tracking-tight",
              dark ? "text-white/90" : "text-[var(--tt-ink)]",
            )}
          >
            {unit}
          </span>
        ) : null}
      </div>
      {planned ? (
        <p
          className={cn(
            "mt-0.5 text-[11px] font-medium tabular-nums",
            dark ? "text-white/40" : "text-[var(--tt-ink-faint)]",
          )}
        >
          / {planned}
        </p>
      ) : null}
    </div>
  );
}

function StructureRow({
  block,
  compactHero = false,
}: {
  block: PhaseBlockDisplay;
  compactHero?: boolean;
}) {
  const subtitle = blockSubtitle(block);
  const durationLabel = block.durationLabel
    ? block.durationApproximate
      ? block.durationLabel
      : block.durationLabel.replace(/^~/, "")
    : null;

  return (
    <div
      className={cn(
        "flex items-start gap-3 py-3.5 transition-colors hover:bg-[var(--tt-sidebar)]/80",
        compactHero ? "px-2.5" : "px-5",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-[var(--tt-ink)]">
          {block.title}
        </p>
        {subtitle ? (
          <p className="mt-0.5 truncate text-[12px] text-[var(--tt-ink-soft)]">
            {subtitle}
          </p>
        ) : null}
        {block.recoveryNote ? (
          <p className="mt-0.5 truncate text-[12px] text-[var(--tt-ink-faint)]">
            {block.recoveryNote}
          </p>
        ) : null}
        {block.notes ? (
          <p className="mt-0.5 text-[12px] leading-snug text-[var(--tt-ink-faint)]">
            {block.notes}
          </p>
        ) : null}
      </div>
      {durationLabel ? (
        <span className="shrink-0 pt-0.5 text-[12px] font-semibold tabular-nums text-[var(--tt-ink-soft)]">
          {durationLabel}
        </span>
      ) : null}
    </div>
  );
}

type AthleteWorkoutDetailCardProps = {
  workout: PlanWorkoutDetail;
  className?: string;
  /** When false (athlete modal), today/past workouts show Done/Skip in the hero. */
  isCoach?: boolean;
  /** Athlete can link / detach Strava from the hero ⋮ menu. */
  showStravaActions?: boolean;
  onStravaChange?: () => void;
  /** Reschedule + Share live under the hero ⋮ menu (athlete modal). */
  showUtilityActions?: boolean;
  /** Completed / Skipped chip next to Strava or Done/Skip (athlete modal only). */
  showStatusBadge?: boolean;
  /** Matches training Color / Plain / Completion chrome. */
  colorMode?: PlanColorMode;
  /** Modal / preview use dark; list side panel stays light. */
  heroTone?: HeroTone;
  /** Tighter hero padding for embedded side panels (inbox, roster). */
  compactHero?: boolean;
  /** Minimal right inset when flush against a panel edge. */
  compactFlush?: boolean;
  onShare?: () => void;
  onRescheduleDone?: () => void;
  /** Prefer over DialogClose when detail is not inside a Dialog (e.g. list panel). */
  onClose?: () => void;
};

export function AthleteWorkoutDetailCard({
  workout,
  className,
  isCoach = true,
  showStravaActions = false,
  onStravaChange,
  showUtilityActions = false,
  showStatusBadge = false,
  colorMode = "completion",
  heroTone = "dark",
  compactHero = false,
  compactFlush = false,
  onShare,
  onRescheduleDone,
  onClose,
}: AthleteWorkoutDetailCardProps) {
  const [stravaConnected, setStravaConnected] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [detachOpen, setDetachOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);

  useEffect(() => {
    if (!showStravaActions) return;
    let cancelled = false;
    void isStravaConnected()
      .then((value) => {
        if (!cancelled) setStravaConnected(value);
      })
      .catch(() => {
        if (!cancelled) setStravaConnected(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showStravaActions]);

  const config = getSportEditorConfig(workout.type);
  const metrics = getWorkoutPlanMetrics(workout, workout.status);
  const subtitle = getWorkoutCardSubtitle(workout);
  const hasSwimStructure = hasSwimStructureContent(workout.swimStructure);
  const approx = approxMetricsFromTags(workout.tags);
  const stravaSynced = isStravaSynced(workout);
  const stravaUrl = workout.result?.stravaActivityUrl ?? null;
  const showQuickLog = athleteHasQuickLogActions(workout, isCoach);
  const sportColor = SPORT_ACCENT[workout.type];
  const sportLabel = WORKOUT_TYPE_LABELS[workout.type];
  const completed = workout.status === WorkoutStatus.COMPLETED;
  const skipped = workout.status === WorkoutStatus.SKIPPED;
  const statusChrome = colorMode === "completion";
  const darkHero = heroTone === "dark";
  const insetX = compactHero ? (compactFlush ? "pl-2.5 pr-1" : "px-2.5") : "px-5";
  const insetMX = compactHero ? (compactFlush ? "ml-2.5 mr-1" : "mx-2.5") : "mx-5";
  const accentColor = completed
    ? "var(--tt-good)"
    : statusChrome && skipped
      ? "#b91c1c"
      : sportColor;
  const accentSoft = completed
    ? "var(--tt-good)"
    : statusChrome && skipped
      ? "#f5a3a3"
      : sportColor;
  const dividerClass = darkHero
    ? "w-px shrink-0 self-stretch bg-white/15"
    : "w-px shrink-0 self-stretch bg-[var(--tt-line)]";
  const metricsRowClass = cn(
    "flex min-w-0 items-stretch overflow-hidden",
    compactHero ? "mt-3" : "mt-5",
    !darkHero && "border-y border-[var(--tt-line)] py-2.5",
  );
  const iconButtonClass = darkHero
    ? "rounded-md p-1.5 text-white/55 transition hover:bg-white/10 hover:text-white"
    : "rounded-md p-1.5 text-muted-foreground transition hover:bg-muted/60 hover:text-foreground";

  const canReschedule =
    showUtilityActions &&
    !workout.isRace &&
    !workout.isRescheduleGhost &&
    workout.type !== WorkoutType.REST &&
    workout.type !== WorkoutType.RECOVERY;

  const showMenu =
    Boolean(stravaUrl) ||
    (showStravaActions && (stravaConnected || stravaSynced)) ||
    canReschedule ||
    Boolean(showUtilityActions && onShare);

  const primary =
    primaryMetricFromTags(workout.tags) ??
    (workout.type === WorkoutType.BIKE
      ? bikePrimaryMetricFromTags(workout.tags)
      : null) ??
    (config.showDistance ? "distance" : "duration");
  const secondaryVisible = secondaryMetricVisibleFromTags(workout.tags);

  const distanceOnCard =
    config.showDistance && (primary === "distance" || secondaryVisible);
  const durationOnCard =
    primary === "duration" || !config.showDistance || secondaryVisible;

  const durationUnit =
    durationUnitFromTags(workout.tags) ?? config.durationUnitDefault;

  const distanceParts = metrics.distance
    ? splitDistanceDisplay(metrics.distance)
    : null;
  const plannedDistanceParts = metrics.plannedDistance
    ? splitDistanceDisplay(metrics.plannedDistance)
    : null;

  const durationMinutes =
    workout.status === WorkoutStatus.COMPLETED &&
    workout.result?.actualDuration != null &&
    workout.result.actualDuration > 0
      ? Math.round(workout.result.actualDuration)
      : workout.plannedDuration != null && workout.plannedDuration > 0
        ? Math.round(workout.plannedDuration)
        : null;
  const durationParts =
    durationMinutes != null
      ? formatWorkoutCardDurationParts(durationMinutes, durationUnit)
      : null;
  const plannedDurationParts =
    metrics.showPlannedComparison &&
    workout.plannedDuration != null &&
    workout.plannedDuration > 0
      ? formatWorkoutCardDurationParts(
          Math.round(workout.plannedDuration),
          durationUnit,
        )
      : null;

  const bikeKind =
    workout.type === WorkoutType.BIKE
      ? bikeKindFromTags(workout.tags ?? [])
      : null;
  const intensityLabel =
    workout.type === WorkoutType.SWIM
      ? null
      : bikeKind
        ? bikeKindLabel(bikeKind)
        : workout.sessionType
          ? getSessionTypeLabel(workout.sessionType, workout.type)
          : null;

  const structureDisplay =
    !hasSwimStructure &&
    workout.structure &&
    hasStructureContent(workout.structure)
      ? buildAthleteStructureDisplay({
          structure: workout.structure,
          plannedDistance: workout.plannedDistance,
          plannedDuration: workout.plannedDuration,
          sportType: workout.type,
        })
      : null;

  const hasBuilderStructure = Boolean(
    structureDisplay && structureDisplay.blocks.length > 0,
  );
  const hasIncludes = hasIncludeItems(workout.structure);

  const fullDescription = workout.description?.trim() || null;
  const showDescriptionDetails =
    Boolean(fullDescription) && !hasSwimStructure && !hasBuilderStructure;

  const showMetricsRow =
    Boolean(intensityLabel) || distanceOnCard || durationOnCard;

  const statusBadge =
    showStatusBadge && skipped ? (
      <StatusPill tone="skipped">Skipped</StatusPill>
    ) : null;

  const dateLabel = formatWorkoutDate(workout.dateKey);
  const coachNotes = workout.coachNotes?.trim() || null;
  const thirdMetric = completed ? resultThirdMetric(workout) : null;
  const actualDistanceParts = metrics.distance
    ? splitDistanceDisplay(metrics.distance)
    : null;
  const plannedDistanceCaption =
    metrics.showPlannedComparison && metrics.plannedDistance
      ? metrics.plannedDistance
      : null;
  const actualTimeLabel =
    workout.result?.actualDuration != null && workout.result.actualDuration > 0
      ? formatResultClock(workout.result.actualDuration)
      : metrics.duration;
  const plannedTimeCaption =
    metrics.showPlannedComparison &&
    workout.plannedDuration != null &&
    workout.plannedDuration > 0
      ? formatResultClock(workout.plannedDuration)
      : metrics.showPlannedComparison && metrics.plannedDuration
        ? metrics.plannedDuration
        : null;

  return (
    <div className={cn(className)}>
      <div
        className={cn(
          "tt-workout-hero px-5 pb-5 pt-5",
          compactHero && (compactFlush ? "pl-2.5 pr-1 pb-2 pt-2" : "px-2.5 pb-2 pt-2"),
          darkHero
            ? "bg-[var(--tt-workout-hero-bg,#151827)] text-white/[0.92]"
            : "bg-white text-[var(--tt-ink)]",
        )}
      >
        <div
          className={cn(
            "relative flex items-start gap-3",
            compactHero
              ? "pr-8"
              : statusBadge && (showQuickLog || stravaSynced)
              ? "pr-[13rem]"
              : showQuickLog || stravaSynced
                ? "pr-[7.5rem]"
                : statusBadge
                  ? "pr-[9rem]"
                  : "pr-16",
          )}
        >
          {darkHero ? (
            <div className="mt-0.5 shrink-0">
              <WorkoutSportIcon
                type={workout.type}
                isRace={workout.isRace}
                size="md"
                className={
                  completed
                    ? "!bg-[color-mix(in_srgb,var(--tt-good)_22%,transparent)] !text-[var(--tt-good)]"
                    : statusChrome && skipped
                      ? "!bg-[color-mix(in_srgb,#b91c1c_22%,transparent)] !text-[#fca5a5]"
                      : undefined
                }
              />
            </div>
          ) : (
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]"
              style={{
                background: `color-mix(in srgb, ${accentSoft} 12%, white)`,
                color: accentColor,
              }}
            >
              <WorkoutSportIcon
                type={workout.type}
                isRace={workout.isRace}
                size="xs"
                appearance="outline"
                className="!h-auto !w-auto !border-0 !bg-transparent"
              />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <h2
                className={cn(
                  "text-[18px] font-bold leading-snug",
                  darkHero ? "text-white" : "text-[var(--tt-ink)]",
                )}
              >
                {workout.title}
              </h2>
              {workout.selfLogged ? <SelfAddedBadge /> : null}
              <RescheduleBadge workout={workout} />
            </div>
            <p
              className={cn(
                "mt-0.5 text-[12px]",
                darkHero ? "text-white/55" : "text-[var(--tt-ink-soft)]",
              )}
            >
              <span
                className={cn("font-semibold", darkHero && "text-white/75")}
                style={darkHero ? undefined : { color: accentColor }}
              >
                {sportLabel}
              </span>
              {" · "}
              {dateLabel}
              {subtitle && !showDescriptionDetails && !hasBuilderStructure ? (
                <>
                  {" · "}
                  {subtitle}
                </>
              ) : null}
            </p>
            {completed ? (
              <p
                className={cn(
                  "mt-1 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide",
                  darkHero ? "text-[#86d39a]" : "text-[var(--tt-good)]",
                )}
              >
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                Completed
              </p>
            ) : null}
          </div>

          <div className="absolute right-0 top-0 z-10 flex items-center gap-1.5">
            {statusBadge}
            {stravaSynced ? (
              <StravaSyncedIndicator
                workout={workout}
                variant="wordmark"
                size="xs"
              />
            ) : showQuickLog ? (
              <AthleteWorkoutQuickActions
                workout={workout}
                isCoach={isCoach}
                size="sm"
              />
            ) : null}

            {showMenu ? (
              <DropdownMenu.Root modal={false}>
                <DropdownMenu.Trigger asChild>
                  <button
                    type="button"
                    aria-label="Workout actions"
                    className={iconButtonClass}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    align="end"
                    sideOffset={6}
                    avoidCollisions={false}
                    className="z-[220] min-w-[12.5rem] overflow-hidden rounded-[10px] border border-border bg-card p-1 shadow-lg"
                    onCloseAutoFocus={(e) => e.preventDefault()}
                  >
                    {canReschedule ? (
                      <DropdownMenu.Item
                        onSelect={() => setRescheduleOpen(true)}
                        className="flex cursor-pointer items-center gap-2 rounded-[6px] px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-foreground/[0.04]"
                      >
                        <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                        Reschedule
                      </DropdownMenu.Item>
                    ) : null}
                    {showUtilityActions && onShare ? (
                      <DropdownMenu.Item
                        onSelect={() => onShare()}
                        className="flex cursor-pointer items-center gap-2 rounded-[6px] px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-foreground/[0.04]"
                      >
                        <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
                        Share card
                      </DropdownMenu.Item>
                    ) : null}
                    {stravaUrl ? (
                      <DropdownMenu.Item
                        onSelect={() => {
                          window.open(
                            stravaUrl,
                            "_blank",
                            "noopener,noreferrer",
                          );
                        }}
                        className="flex cursor-pointer items-center gap-2 rounded-[6px] px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-foreground/[0.04]"
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-[#FC4C02]" />
                        View on Strava
                      </DropdownMenu.Item>
                    ) : null}
                    {showStravaActions && stravaConnected && !stravaSynced ? (
                      <DropdownMenu.Item
                        onSelect={() => setLinkOpen(true)}
                        className="flex cursor-pointer items-center gap-2 rounded-[6px] px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-foreground/[0.04]"
                      >
                        <Link2 className="h-3.5 w-3.5 text-[#FC4C02]" />
                        Link Strava activity
                      </DropdownMenu.Item>
                    ) : null}
                    {showStravaActions && stravaSynced ? (
                      <DropdownMenu.Item
                        onSelect={() => setDetachOpen(true)}
                        className="flex cursor-pointer items-center gap-2 rounded-[6px] px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-foreground/[0.04]"
                      >
                        <Unlink className="h-3.5 w-3.5 text-muted-foreground" />
                        Detach Strava activity
                      </DropdownMenu.Item>
                    ) : null}
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            ) : null}

            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className={iconButtonClass}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </button>
            ) : null}
          </div>
        </div>

        {showStravaActions ? (
          <>
            <StravaLinkPicker
              workoutId={workout.id}
              hideTrigger
              open={linkOpen}
              onOpenChange={setLinkOpen}
              onLinked={onStravaChange}
            />
            <StravaDetachButton
              workoutId={workout.id}
              hideTrigger
              open={detachOpen}
              onOpenChange={setDetachOpen}
              onDetached={onStravaChange}
            />
          </>
        ) : null}

        {canReschedule ? (
          <RescheduleWorkoutModal
            workout={workout}
            open={rescheduleOpen}
            onOpenChange={setRescheduleOpen}
            onDone={onRescheduleDone}
          />
        ) : null}

        {completed ? (
          <div className={metricsRowClass}>
            <HeroMetricColumn
              tone={heroTone}
              label="Distance"
              value={actualDistanceParts?.value ?? null}
              unit={
                actualDistanceParts?.unit ||
                (config.showDistance ? config.distanceUnit : null)
              }
              planned={plannedDistanceCaption}
              icon={<Link2 className="h-3 w-3" strokeWidth={1.75} />}
            />
            <div className={dividerClass} />
            <HeroMetricColumn
              tone={heroTone}
              label="Time"
              value={actualTimeLabel ?? null}
              planned={plannedTimeCaption}
              icon={<Clock className="h-3 w-3" strokeWidth={1.75} />}
            />
            <div className={dividerClass} />
            <HeroMetricColumn
              tone={heroTone}
              label={thirdMetric?.label ?? "Avg pace"}
              value={thirdMetric?.value ?? null}
              unit={thirdMetric?.unit ?? null}
            />
          </div>
        ) : showMetricsRow ? (
          <div className={metricsRowClass}>
            {intensityLabel ? (
              <>
                <HeroMetricColumn
                  tone={heroTone}
                  label="Workout type"
                  value={intensityLabel}
                  icon={
                    isHardIntensity(intensityLabel) ? (
                      <Flame
                        className={cn(
                          "h-3 w-3",
                          darkHero ? "text-[#fca5a5]" : "text-[#B91C1C]",
                        )}
                        strokeWidth={2.25}
                      />
                    ) : undefined
                  }
                />
                {distanceOnCard || durationOnCard ? (
                  <div className={dividerClass} />
                ) : null}
              </>
            ) : null}

            {distanceOnCard ? (
              <>
                <HeroMetricColumn
                  tone={heroTone}
                  label="Distance"
                  value={distanceParts?.value ?? null}
                  unit={distanceParts?.unit || config.distanceUnit}
                  approximate={approx.distance}
                  planned={
                    metrics.showPlannedComparison && plannedDistanceParts
                      ? `${plannedDistanceParts.value}${
                          plannedDistanceParts.unit
                            ? ` ${plannedDistanceParts.unit}`
                            : ""
                        }`
                      : null
                  }
                  icon={<Link2 className="h-3 w-3" strokeWidth={1.75} />}
                />
                {durationOnCard ? <div className={dividerClass} /> : null}
              </>
            ) : null}

            {durationOnCard ? (
              <HeroMetricColumn
                tone={heroTone}
                label="Time"
                value={durationParts?.value ?? null}
                unit={durationParts?.unit ?? null}
                approximate={approx.duration}
                planned={
                  metrics.showPlannedComparison && plannedDurationParts
                    ? `${plannedDurationParts.value} ${plannedDurationParts.unit}`
                    : null
                }
                icon={<Clock className="h-3 w-3" strokeWidth={1.75} />}
              />
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Intensity graph — keep for planned and completed */}
      {(hasBuilderStructure || hasIncludes) && workout.structure ? (
        <div className={cn(compactHero ? "pt-4" : "pt-6", insetX)}>
          <WorkoutStructureChart
            structure={workout.structure}
            durationMinutes={workout.plannedDuration ?? undefined}
            size="md"
            showCaption
            tone={
              statusChrome && completed
                ? "completed"
                : statusChrome && skipped
                  ? "skipped"
                  : "default"
            }
          />
        </div>
      ) : null}

      {hasSwimStructure && workout.swimStructure ? (
        <section className={cn("space-y-2 py-4", insetX)}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--tt-ink-faint)]">
            Workout details
          </p>
          <SwimWorkoutBuilder
            sections={workout.swimStructure.sections}
            onChange={() => {}}
            readOnly
          />
        </section>
      ) : hasBuilderStructure && structureDisplay ? (
        <>
          <div className="divide-y divide-[var(--tt-line)]">
            {structureDisplay.blocks.map((block) => (
              <StructureRow key={block.id} block={block} compactHero={compactHero} />
            ))}
          </div>
          {hasIncludes && workout.structure?.includeItems ? (
            <section className={cn(insetMX, "mb-4 mt-2 rounded-[8px] bg-[var(--tt-sidebar)] px-3 py-2.5")}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--tt-ink-faint)]">
                Include
              </p>
              <div className="mt-1.5">
                <IncludeItemsSummary items={workout.structure.includeItems} />
              </div>
            </section>
          ) : null}
        </>
      ) : hasIncludes && workout.structure?.includeItems ? (
        <section className={cn(insetMX, "mb-4 space-y-2 rounded-[8px] bg-[var(--tt-sidebar)] px-3 py-2.5")}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--tt-ink-faint)]">
            Include
          </p>
          <IncludeItemsSummary items={workout.structure.includeItems} />
          {showDescriptionDetails && fullDescription ? (
            <p className="whitespace-pre-wrap pt-1 text-[14px] leading-relaxed text-[var(--tt-ink)]">
              {fullDescription}
            </p>
          ) : null}
        </section>
      ) : showDescriptionDetails && fullDescription ? (
        <section className={cn("space-y-1.5 pb-4 pt-4 sm:pt-5", insetX)}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--tt-ink-faint)]">
            Session plan
          </p>
          <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-[var(--tt-ink)]">
            {fullDescription}
          </p>
        </section>
      ) : null}

      {coachNotes ? (
        <section className={cn("space-y-1.5 py-4", insetX)}>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--tt-ink-faint)]">
            <MessageSquare className="h-3 w-3" strokeWidth={2.25} />
            Coach notes
            {workout.coachNotesPrivate ? (
              <span className="ml-0.5 font-medium normal-case tracking-normal">
                · private
              </span>
            ) : null}
          </div>
          <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-[var(--tt-ink)]">
            {coachNotes}
          </p>
        </section>
      ) : null}
    </div>
  );
}
