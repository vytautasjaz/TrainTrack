import { cn } from "@/lib/utils";
import type { RacePriority } from "@prisma/client";
import { RACE_PRIORITY_LABELS } from "@/lib/constants";

const PRIORITY_BADGE: Record<RacePriority, string> = {
  A: "border-red-300 bg-red-50 text-red-800",
  B: "border-blue-300 bg-blue-50 text-blue-800",
  C: "border-emerald-300 bg-emerald-50 text-emerald-900",
};

/** Icon / text color for priority markers. */
const PRIORITY_DOT: Record<RacePriority, string> = {
  A: "text-red-600",
  B: "text-blue-600",
  C: "text-emerald-600",
};

/** Full marker chip: tinted fill + matching contour. */
const PRIORITY_MARKER: Record<RacePriority, string> = {
  A: "border-red-400 bg-red-50 text-red-600",
  B: "border-blue-400 bg-blue-50 text-blue-600",
  C: "border-emerald-400 bg-emerald-50 text-emerald-700",
};

type PriorityBadgeProps = {
  priority: RacePriority;
  className?: string;
  /** Compact letter-only badge. */
  compact?: boolean;
};

export function PriorityBadge({
  priority,
  className,
  compact = false,
}: PriorityBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[6px] border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        PRIORITY_BADGE[priority],
        className,
      )}
    >
      {compact ? priority : `${priority} ${RACE_PRIORITY_LABELS[priority]}`}
    </span>
  );
}

export function priorityMarkerClass(priority: RacePriority): string {
  return PRIORITY_DOT[priority];
}

export function priorityMarkerSurfaceClass(priority: RacePriority): string {
  return PRIORITY_MARKER[priority];
}
