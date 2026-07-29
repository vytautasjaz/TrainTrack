"use client";

import type { WorkoutType } from "@prisma/client";
import { Smartphone } from "lucide-react";
import {
  PlanMultiWeekTables,
  type PlanMultiWeekBlock,
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
};

/**
 * Week-view rotate hint arrows.
 *
 * Manual tweaks (viewBox is 0–48, center ≈ 24,24):
 * - `RADIUS` — how far arcs sit from the phone
 * - `ARC_SWEEP_DEG` — how long each arc is
 * - `TIP_SPREAD` — open angle of the V tip (larger = wider chevron)
 * - `TIP_LENGTH` — how long each tip arm is
 * - Start/end angles below — rotate where arcs begin/end around the phone
 */
function RotateHintArrows({ className }: { className?: string }) {
  // ——— tweak these ———
  const CX = 24;
  const CY = 24;
  const RADIUS = 20;
  const ARC_SWEEP_DEG = 95;
  /** Clockwise arc starts near top (degrees from +X axis, CSS/math standard). */
  const CW_START_DEG = -70;
  /** Counter-clockwise arc starts near bottom. */
  const CCW_START_DEG = 110;
  const TIP_LENGTH = 5.5;
  const TIP_SPREAD = 35; // degrees each side of the tangent
  // ——— end tweaks ———

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const pointOnCircle = (deg: number) => {
    const r = toRad(deg);
    return { x: CX + RADIUS * Math.cos(r), y: CY + RADIUS * Math.sin(r) };
  };
  const fmt = (n: number) => n.toFixed(2);

  /** Open chevron at `endDeg`, pointing along increasing-angle (clockwise on screen). */
  function tipPath(endDeg: number) {
    const tip = pointOnCircle(endDeg);
    // Path travels with increasing θ → tangent (-sin, cos) in y-down coords
    const r = toRad(endDeg);
    const tx = -Math.sin(r);
    const ty = Math.cos(r);
    // Arms go backward from tip (opposite travel), fanned by TIP_SPREAD
    const backX = -tx;
    const backY = -ty;
    const spread = toRad(TIP_SPREAD);
    const rot = (x: number, y: number, a: number) => ({
      x: x * Math.cos(a) - y * Math.sin(a),
      y: x * Math.sin(a) + y * Math.cos(a),
    });
    const left = rot(backX, backY, spread);
    const right = rot(backX, backY, -spread);
    const a = {
      x: tip.x + left.x * TIP_LENGTH,
      y: tip.y + left.y * TIP_LENGTH,
    };
    const b = {
      x: tip.x + right.x * TIP_LENGTH,
      y: tip.y + right.y * TIP_LENGTH,
    };
    return `M${fmt(a.x)} ${fmt(a.y)} L${fmt(tip.x)} ${fmt(tip.y)} L${fmt(b.x)} ${fmt(b.y)}`;
  }

  const cwStart = CW_START_DEG;
  const cwEnd = CW_START_DEG + ARC_SWEEP_DEG;
  const ccwStart = CCW_START_DEG;
  const ccwEnd = CCW_START_DEG + ARC_SWEEP_DEG;

  const cwA = pointOnCircle(cwStart);
  const cwB = pointOnCircle(cwEnd);
  const ccwA = pointOnCircle(ccwStart);
  const ccwB = pointOnCircle(ccwEnd);

  // Large-arc=0, sweep=1 → clockwise in SVG (y-down)
  const cwArc = `M${fmt(cwA.x)} ${fmt(cwA.y)} A${RADIUS} ${RADIUS} 0 0 1 ${fmt(cwB.x)} ${fmt(cwB.y)}`;
  const ccwArc = `M${fmt(ccwA.x)} ${fmt(ccwA.y)} A${RADIUS} ${RADIUS} 0 0 1 ${fmt(ccwB.x)} ${fmt(ccwB.y)}`;

  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden>
      <path
        d={cwArc}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d={tipPath(cwEnd)}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={ccwArc}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d={tipPath(ccwEnd)}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WeekPortraitRotatePrompt() {
  return (
    <div className="flex min-h-[min(60dvh,28rem)] flex-col items-center justify-center px-6 py-12 text-center">
      <div className="relative mb-6 flex h-28 w-28 items-center justify-center">
        <RotateHintArrows className="absolute inset-0 h-full w-full text-foreground/45 motion-safe:animate-[week-rotate-hint_2.4s_ease-in-out_infinite]" />
        <div className="relative z-10 flex h-12 w-8 items-center justify-center rounded-[10px] bg-muted/50 shadow-sm">
          <Smartphone
            className="h-7 w-7 text-foreground/75"
            aria-hidden
            strokeWidth={1.75}
          />
        </div>
      </div>
      <p className="max-w-xs text-base font-semibold tracking-tight text-foreground">
        Rotate your phone to see the week plan
      </p>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
        Turn the screen sideways for the full weekly table, or switch to List
        view.
      </p>
    </div>
  );
}

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

  const multiWeekTables = (
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
    />
  );

  return (
    <>
      <div className="portrait:max-lg:block landscape:max-lg:hidden">
        <WeekPortraitRotatePrompt />
      </div>

      <div className="hidden landscape:max-lg:block">{multiWeekTables}</div>
    </>
  );
}
