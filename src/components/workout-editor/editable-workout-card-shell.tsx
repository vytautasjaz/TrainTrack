"use client";

import type { MouseEvent, ReactNode } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Clock, Eye, EyeOff, Link2 } from "lucide-react";
import { WorkoutType } from "@prisma/client";
import { WorkoutSportIcon } from "@/components/plan/workout-sport-icon";
import { WORKOUT_TYPE_LABELS } from "@/lib/constants";
import type {
  DistanceUnit,
  DurationUnit,
  WorkoutPrimaryMetric,
  WorkoutPrimaryMetricState,
} from "@/lib/workout-editor/types";
import { cn } from "@/lib/utils";

function metricValueWidthCh(value: string, placeholder: string, minChars = 2) {
  const len = Math.max(value.length, placeholder.length, minChars);
  return `${len}ch`;
}

function AutoTextButton({
  active,
  onClick,
  disabled,
}: {
  active: boolean
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        'shrink-0 whitespace-nowrap text-[11px] font-medium transition',
        active
          ? 'text-white/55'
          : 'text-white/35 hover:text-white/55',
        disabled && 'pointer-events-none opacity-40',
      )}
    >
      Auto
    </button>
  )
}

function SourceToggle({
  isAuto,
  locked,
  onToggle,
}: {
  isAuto: boolean
  locked?: boolean
  onToggle: () => void
}) {
  if (locked) {
    return (
      <span className="text-[11px] font-medium text-white/40">Auto</span>
    )
  }
  return (
    <button
      type="button"
      onClick={onToggle}
      className="text-[11px] font-medium text-white/50 transition hover:text-white/75"
    >
      {isAuto ? 'Auto' : 'Manual'}
    </button>
  )
}

function MetricFooterControls({
  isAuto,
  locked,
  onToggleSource,
  onCard,
  canHide,
  onToggleCardVisibility,
}: {
  isAuto: boolean
  locked?: boolean
  onToggleSource: () => void
  onCard: boolean
  canHide: boolean
  onToggleCardVisibility: () => void
}) {
  return (
    <div className="flex flex-nowrap items-center justify-center gap-x-2">
      <SourceToggle isAuto={isAuto} locked={locked} onToggle={onToggleSource} />
      <button
        type="button"
        onClick={onToggleCardVisibility}
        disabled={onCard && !canHide}
        aria-pressed={!onCard}
        aria-label={
          onCard
            ? canHide
              ? 'Hide on workout card'
              : 'At least one metric must stay on the card'
            : 'Show on workout card'
        }
        title={
          onCard
            ? canHide
              ? 'Hide on workout card'
              : 'At least one metric must stay on the card'
            : 'Show on workout card'
        }
        className={cn(
          'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm transition',
          onCard
            ? 'text-white/90 hover:text-white'
            : 'text-white/30 hover:text-white/45',
          onCard && !canHide && 'pointer-events-none opacity-40',
        )}
      >
        {onCard ? (
          <Eye className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        ) : (
          <EyeOff className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        )}
      </button>
    </div>
  )
}

export type EditableWorkoutCardShellProps = {
  sportType: WorkoutType;
  title: string;
  subtitle: string;
  titleAuto: boolean;
  subtitleAuto: boolean;
  primaryMetric: WorkoutPrimaryMetricState;
  durationInput: string;
  distanceInput: string;
  autoDistanceInput?: string;
  autoDurationInput?: string;
  durationManual: boolean;
  distanceManual: boolean;
  secondaryMetricVisible?: boolean;
  metricsLocked: boolean;
  showDistance?: boolean;
  distanceUnit?: DistanceUnit;
  durationUnit?: DurationUnit;
  allowDurationUnitToggle?: boolean;
  onTitleChange: (value: string) => void;
  onSubtitleChange: (value: string) => void;
  onTitleAutoEnable: () => void;
  onSubtitleAutoEnable: () => void;
  onDurationChange: (value: string) => void;
  onDistanceChange: (value: string) => void;
  onPrimaryMetricChange: (metric: WorkoutPrimaryMetric) => void;
  onDistanceSourceChange?: (source: "manual" | "auto") => void;
  onDurationSourceChange?: (source: "manual" | "auto") => void;
  onSecondaryMetricVisibleChange?: (visible: boolean) => void;
  onToggleDurationUnit?: (event: MouseEvent) => void;
  distanceLocked?: boolean;
  durationLocked?: boolean;
  cornerSlot?: ReactNode;
  /** Full date line above icon + title, e.g. "Friday, Jul 31 2026". */
  dateLabel?: string | null;
  /** Workout-type control for the first metrics column. */
  workoutTypeControl?: ReactNode;
  sportOptions?: WorkoutType[];
  onSportChange?: (sport: WorkoutType) => void;
  className?: string;
  footer?: ReactNode;
};

export function EditableWorkoutCardShell({
  sportType,
  title,
  subtitle,
  titleAuto,
  subtitleAuto,
  primaryMetric,
  durationInput,
  distanceInput,
  autoDistanceInput = "",
  autoDurationInput = "",
  durationManual,
  distanceManual,
  secondaryMetricVisible = false,
  metricsLocked,
  showDistance = true,
  distanceUnit = "km",
  durationUnit = "min",
  allowDurationUnitToggle = false,
  onTitleChange,
  onSubtitleChange,
  onTitleAutoEnable,
  onSubtitleAutoEnable,
  onDurationChange,
  onDistanceChange,
  onPrimaryMetricChange,
  onDistanceSourceChange,
  onDurationSourceChange,
  onSecondaryMetricVisibleChange,
  onToggleDurationUnit,
  distanceLocked,
  durationLocked,
  cornerSlot,
  dateLabel,
  workoutTypeControl,
  sportOptions,
  onSportChange,
  className,
  footer,
}: EditableWorkoutCardShellProps) {
  const canChangeSport =
    Boolean(onSportChange) && Boolean(sportOptions && sportOptions.length > 1);
  const hasPrimary = primaryMetric != null;
  const durationIsPrimary =
    hasPrimary && (primaryMetric === "duration" || !showDistance);
  const distanceIsPrimary = hasPrimary && primaryMetric === "distance";

  const lockDistance = distanceLocked ?? metricsLocked;
  const lockDuration = durationLocked ?? metricsLocked;

  const durationPlaceholder = durationUnit === "hours" ? "0:00" : "0";
  const distancePlaceholder = "0";

  const autoDistanceDisplay = autoDistanceInput.trim();
  const autoDurationDisplay = autoDurationInput.trim();

  const distanceSourceIsManual = lockDistance ? false : distanceManual;
  const durationSourceIsManual = lockDuration ? false : durationManual;

  const shownDistance = distanceSourceIsManual
    ? distanceInput
    : autoDistanceDisplay || distanceInput;
  const shownDuration = durationSourceIsManual
    ? durationInput
    : autoDurationDisplay || durationInput;

  const distanceIsAuto = !distanceSourceIsManual;
  const durationIsAuto = !durationSourceIsManual;

  /** Manual (or locked) text entered — not an empty field / placeholder. */
  const distanceHasEnteredValue = distanceSourceIsManual
    ? distanceInput.trim().length > 0
    : Boolean(autoDistanceDisplay || distanceInput.trim());
  const durationHasEnteredValue = durationSourceIsManual
    ? durationInput.trim().length > 0
    : Boolean(autoDurationDisplay || durationInput.trim());

  /** Only the primary metric is on the card unless the coach enables both eyes. */
  const distanceOnCard =
    showDistance &&
    hasPrimary &&
    (primaryMetric === "distance" || secondaryMetricVisible);
  const durationOnCard =
    hasPrimary &&
    (primaryMetric === "duration" || !showDistance || secondaryMetricVisible);
  const canHideDistance = hasPrimary && distanceOnCard && durationOnCard;
  const canHideDuration =
    hasPrimary && showDistance && distanceOnCard && durationOnCard;

  const unitLabel = (unit: DurationUnit) => (unit === "min" ? "min" : "h");

  function selectDistanceSource(source: "manual" | "auto") {
    if (lockDistance) return;
    onDistanceSourceChange?.(source);
  }

  function selectDurationSource(source: "manual" | "auto") {
    if (lockDuration) return;
    onDurationSourceChange?.(source);
  }

  function toggleDistanceSource() {
    if (lockDistance) return;
    selectDistanceSource(distanceSourceIsManual ? "auto" : "manual");
  }

  function toggleDurationSource() {
    if (lockDuration) return;
    selectDurationSource(durationSourceIsManual ? "auto" : "manual");
  }

  function toggleDistanceCardVisibility() {
    if (!hasPrimary) {
      onPrimaryMetricChange("distance");
      onSecondaryMetricVisibleChange?.(false);
      return;
    }
    if (distanceOnCard) {
      if (!canHideDistance) return;
      if (primaryMetric === "distance") {
        onPrimaryMetricChange("duration");
      }
      onSecondaryMetricVisibleChange?.(false);
      return;
    }
    if (primaryMetric === "duration") {
      onSecondaryMetricVisibleChange?.(true);
    } else {
      onPrimaryMetricChange("distance");
      onSecondaryMetricVisibleChange?.(true);
    }
  }

  function toggleDurationCardVisibility() {
    if (!hasPrimary) {
      onPrimaryMetricChange("duration");
      onSecondaryMetricVisibleChange?.(false);
      return;
    }
    if (durationOnCard) {
      if (!canHideDuration) return;
      if (primaryMetric === "duration") {
        onPrimaryMetricChange("distance");
      }
      onSecondaryMetricVisibleChange?.(false);
      return;
    }
    if (primaryMetric === "distance") {
      onSecondaryMetricVisibleChange?.(true);
    } else {
      onPrimaryMetricChange("duration");
      onSecondaryMetricVisibleChange?.(true);
    }
  }

  /**
   * Size follows pending/actual primary (grows on focus).
   * Color stays soft until a value is actually entered.
   */
  const valueTone = (
    onCard: boolean,
    isPrimary: boolean,
    hasEnteredValue: boolean,
  ) =>
    cn(
      'font-bold',
      isPrimary ? 'text-[32px]' : 'text-[18px]',
      onCard && hasEnteredValue ? 'text-white' : 'text-white/35',
    )

  const unitTone = (
    onCard: boolean,
    isPrimary: boolean,
    hasEnteredValue: boolean,
  ) =>
    cn(
      'font-semibold leading-none tracking-tight',
      onCard && hasEnteredValue ? 'text-white/90' : 'text-white/35',
      isPrimary ? 'text-base' : 'text-[11px]',
    )

  const sportIcon = canChangeSport ? (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={`Sport: ${WORKOUT_TYPE_LABELS[sportType]}. Change sport`}
          title="Change sport"
          className="shrink-0 rounded-xl outline-none ring-offset-2 transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-foreground/20"
        >
          <WorkoutSportIcon type={sportType} size="md" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="z-[220] min-w-[10.5rem] overflow-hidden rounded-[10px] border border-border bg-card p-1 shadow-lg"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          {sportOptions!.map((sport) => {
            const selected = sport === sportType;
            return (
              <DropdownMenu.Item
                key={sport}
                onSelect={() => onSportChange?.(sport)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-[6px] px-2.5 py-2 text-sm outline-none",
                  "data-[highlighted]:bg-foreground/[0.04]",
                  selected && "bg-foreground/[0.06] font-semibold",
                )}
              >
                <WorkoutSportIcon type={sport} size="xs" />
                <span className="flex-1">{WORKOUT_TYPE_LABELS[sport]}</span>
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  ) : (
    <WorkoutSportIcon type={sportType} size="md" className="mt-0.5 shrink-0" />
  );

  return (
    <div
      className={cn(
        'tt-workout-hero relative rounded-none border-0 border-b border-white/[0.08] px-5 pb-5 pt-5 shadow-none sm:px-6',
        'bg-[var(--tt-workout-hero-bg,#151827)] text-white/[0.92]',
        cornerSlot && 'pb-14',
        className,
      )}
    >
      {dateLabel ? (
        <p className="mb-2.5 text-[13px] leading-snug text-white/55">
          {dateLabel}
        </p>
      ) : null}

      <div className="flex items-start gap-3">
        {sportIcon}

        <div className="flex min-w-0 flex-1 flex-col gap-1.5 pr-8">
          <div className="flex max-w-full min-w-0 items-baseline gap-1.5">
            <input
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              aria-label="Workout title"
              style={{ width: `${Math.max(title.length + 1, 6)}ch` }}
              className="max-w-[calc(100%-2.75rem)] min-w-0 bg-transparent text-[17px] font-semibold leading-snug text-white outline-none placeholder:text-white/35"
              placeholder="Workout title"
            />
            <AutoTextButton active={titleAuto} onClick={onTitleAutoEnable} />
          </div>

          <div className="flex max-w-full min-w-0 items-baseline gap-1.5">
            <input
              value={subtitle}
              onChange={(e) => onSubtitleChange(e.target.value)}
              aria-label="Workout subtitle"
              style={{ width: `${Math.max(subtitle.length + 1, 6)}ch` }}
              className="max-w-[calc(100%-2.75rem)] min-w-0 bg-transparent text-[13px] leading-snug text-white/60 outline-none placeholder:text-white/30"
              placeholder="Subtitle"
            />
            <AutoTextButton
              active={subtitleAuto}
              onClick={onSubtitleAutoEnable}
            />
          </div>
        </div>
      </div>

      <div className="mt-5 flex min-w-0 items-stretch overflow-hidden">
        {workoutTypeControl ? (
          <>
            <div className="flex min-w-0 flex-[1_1_0%] flex-col items-center overflow-hidden px-2 text-center">
              <span className="flex h-4 shrink-0 items-center text-[10px] font-semibold uppercase tracking-wide text-white/50">
                Workout type
              </span>
              <div className="mt-1.5 flex h-8 w-full shrink-0 items-center justify-center overflow-hidden">
                {workoutTypeControl}
              </div>
            </div>
            <div className="w-px shrink-0 self-stretch bg-white/15" />
          </>
        ) : null}

        {showDistance ? (
          <>
            <div
              className={cn(
                "flex min-w-0 flex-[1_1_0%] flex-col items-center overflow-hidden px-1.5 text-center transition-opacity",
                !distanceOnCard && "opacity-55",
              )}
            >
              <button
                type="button"
                aria-pressed={distanceIsPrimary && distanceOnCard}
                title={
                  distanceOnCard
                    ? distanceIsPrimary
                      ? "Primary metric on plan card"
                      : "Set as primary metric"
                    : "Show on workout card"
                }
                onClick={() => {
                  onPrimaryMetricChange("distance");
                }}
                className={cn(
                  "inline-flex h-4 shrink-0 items-center justify-center gap-1.5",
                  hasPrimary && distanceOnCard && distanceHasEnteredValue
                    ? "text-white"
                    : distanceIsPrimary
                      ? "text-white/65"
                      : "text-white/35",
                )}
              >
                <Link2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                <span className="text-[10px] font-bold uppercase tracking-wide">
                  Distance
                </span>
              </button>

              <div className="mt-1.5 flex h-8 w-full shrink-0 items-center justify-center gap-0.5">
                {distanceIsAuto && shownDistance ? (
                  <span
                    className={cn(
                      "font-semibold leading-none",
                      distanceOnCard
                        ? "text-white/55"
                        : "text-white/30",
                      distanceIsPrimary ? "text-xl" : "text-sm",
                    )}
                  >
                    ~
                  </span>
                ) : null}
                {lockDistance ? (
                  <span
                    className={cn(
                      "tabular-nums leading-none tracking-tight",
                      valueTone(
                        distanceOnCard,
                        distanceIsPrimary,
                        distanceHasEnteredValue,
                      ),
                      !shownDistance && "text-white/35",
                    )}
                  >
                    {shownDistance || "—"}
                  </span>
                ) : (
                  <input
                    type="text"
                    inputMode="decimal"
                    value={
                      distanceSourceIsManual ? distanceInput : shownDistance
                    }
                    onChange={(e) => onDistanceChange(e.target.value)}
                    onFocus={() => {
                      if (!lockDistance) onPrimaryMetricChange("distance");
                    }}
                    placeholder={distancePlaceholder}
                    style={{
                      width: metricValueWidthCh(
                        distanceSourceIsManual ? distanceInput : shownDistance,
                        distancePlaceholder,
                      ),
                    }}
                    className={cn(
                      "m-0 bg-transparent p-0 text-center tabular-nums leading-none tracking-tight outline-none placeholder:text-white/30",
                      valueTone(
                        distanceOnCard,
                        distanceIsPrimary,
                        distanceHasEnteredValue,
                      ),
                    )}
                  />
                )}
                <span
                  className={unitTone(
                    distanceOnCard,
                    distanceIsPrimary,
                    distanceHasEnteredValue,
                  )}
                >
                  {distanceUnit}
                </span>
              </div>

              <div className="mt-1.5 flex h-4 shrink-0 items-center justify-center">
                <MetricFooterControls
                  isAuto={distanceIsAuto}
                  locked={lockDistance}
                  onToggleSource={toggleDistanceSource}
                  onCard={distanceOnCard}
                  canHide={canHideDistance}
                  onToggleCardVisibility={toggleDistanceCardVisibility}
                />
              </div>
            </div>
            <div className="w-px shrink-0 self-stretch bg-white/15" />
          </>
        ) : null}

        <div
          className={cn(
            "flex min-w-0 flex-[1_1_0%] flex-col items-center overflow-hidden px-1.5 text-center transition-opacity",
            !durationOnCard && "opacity-55",
          )}
        >
          <button
            type="button"
            aria-pressed={durationIsPrimary && durationOnCard}
            title={
              durationOnCard
                ? durationIsPrimary
                  ? "Primary metric on plan card"
                  : "Set as primary metric"
                : "Show on workout card"
            }
            onClick={() => {
              onPrimaryMetricChange("duration");
            }}
            className={cn(
              "inline-flex h-4 shrink-0 items-center justify-center gap-1.5",
              hasPrimary && durationOnCard && durationHasEnteredValue
                ? "text-white"
                : durationIsPrimary
                  ? "text-white/65"
                  : "text-white/35",
            )}
          >
            <Clock className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span className="text-[10px] font-bold uppercase tracking-wide">
              Time
            </span>
          </button>

          <div className="mt-1.5 flex h-8 w-full shrink-0 items-center justify-center gap-0.5">
            {durationIsAuto && shownDuration ? (
              <span
                className={cn(
                  "font-semibold leading-none",
                  durationOnCard
                    ? "text-white/55"
                    : "text-white/30",
                  durationIsPrimary ? "text-xl" : "text-sm",
                )}
              >
                ~
              </span>
            ) : null}
            {lockDuration ? (
              <span
                className={cn(
                  "tabular-nums leading-none tracking-tight",
                  valueTone(
                    durationOnCard,
                    durationIsPrimary,
                    durationHasEnteredValue,
                  ),
                  !shownDuration && "text-white/35",
                )}
              >
                {shownDuration || "—"}
              </span>
            ) : (
              <input
                type="text"
                inputMode={durationUnit === "min" ? "numeric" : "text"}
                value={durationSourceIsManual ? durationInput : shownDuration}
                onChange={(e) => onDurationChange(e.target.value)}
                onFocus={() => {
                  if (!lockDuration) onPrimaryMetricChange("duration");
                }}
                placeholder={durationPlaceholder}
                style={{
                  width: metricValueWidthCh(
                    durationSourceIsManual ? durationInput : shownDuration,
                    durationPlaceholder,
                  ),
                }}
                className={cn(
                  "m-0 bg-transparent p-0 text-center tabular-nums leading-none tracking-tight outline-none placeholder:text-white/30",
                  valueTone(
                    durationOnCard,
                    durationIsPrimary,
                    durationHasEnteredValue,
                  ),
                )}
              />
            )}
            {allowDurationUnitToggle && onToggleDurationUnit ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!lockDuration) onToggleDurationUnit(e);
                }}
                disabled={lockDuration}
                title={`Unit: ${unitLabel(durationUnit)}. Click to switch.`}
                aria-label={`Duration unit ${unitLabel(durationUnit)}. Click to switch between min and hours.`}
                className={cn(
                  unitTone(
                    durationOnCard,
                    durationIsPrimary,
                    durationHasEnteredValue,
                  ),
                  "underline-offset-2 hover:underline",
                  lockDuration && "pointer-events-none opacity-50",
                )}
              >
                {unitLabel(durationUnit)}
              </button>
            ) : (
              <span
                className={unitTone(
                  durationOnCard,
                  durationIsPrimary,
                  durationHasEnteredValue,
                )}
              >
                {unitLabel(durationUnit)}
              </span>
            )}
          </div>

          <div className="mt-1.5 flex h-4 shrink-0 items-center justify-center">
            <MetricFooterControls
              isAuto={durationIsAuto}
              locked={lockDuration}
              onToggleSource={toggleDurationSource}
              onCard={durationOnCard}
              canHide={canHideDuration}
              onToggleCardVisibility={toggleDurationCardVisibility}
            />
          </div>
        </div>
      </div>

      {footer}

      {cornerSlot ? (
        <div className="absolute bottom-3 right-5 flex items-center sm:right-6">
          {cornerSlot}
        </div>
      ) : null}
    </div>
  );
}
