import type { Segment, WorkoutIncludeItem } from "@/lib/workout-builder/types";
import {
  INCLUDE_PLACEMENT_LABELS,
  normalizeIncludePlacement,
} from "@/lib/workout-builder/include-placement";

type IncludeItemsSummaryProps = {
  items: WorkoutIncludeItem[];
  compact?: boolean;
};

function formatSegment(value: number, unit: string) {
  if (!Number.isFinite(value) || value <= 0) return "";
  return `${value} ${unit}`;
}

/** Compact segment for auto subtitle, e.g. 15" or 1 min or 200 m. */
function formatIncludeSegmentCompact(segment?: Segment): string {
  if (!segment || !Number.isFinite(segment.value) || segment.value <= 0)
    return "";
  if (segment.unit === "sec") return `${segment.value}"`;
  if (segment.unit === "min") return `${segment.value} min`;
  if (segment.unit === "m") return `${segment.value} m`;
  return `${segment.value} km`;
}

/**
 * Auto-subtitle fragment for includes, e.g. "with 5 x 15\" / 30\" strides".
 */
export function formatIncludeItemsForSubtitle(
  items: WorkoutIncludeItem[],
): string {
  if (items.length === 0) return "";
  return items
    .map((item) => {
      const work = formatIncludeSegmentCompact(item.work);
      if (!work) return "";
      const recovery = formatIncludeSegmentCompact(item.recovery);
      const label = (item.title || item.kind).trim().toLowerCase();
      const pattern = recovery
        ? `${item.repetitions} x ${work} / ${recovery}`
        : `${item.repetitions} x ${work}`;
      return label ? `with ${pattern} ${label}` : `with ${pattern}`;
    })
    .filter(Boolean)
    .join(" · ");
}

export function IncludeItemsSummary({
  items,
  compact = false,
}: IncludeItemsSummaryProps) {
  if (items.length === 0) return null;

  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      {items.map((item) => (
        <div
          key={item.id}
          className={
            compact
              ? "text-xs text-muted-foreground"
              : "text-sm text-muted-foreground"
          }
        >
          <span className="font-semibold text-foreground">{item.title}</span>{" "}
          <span>
            {item.repetitions} x{" "}
            {formatSegment(item.work.value, item.work.unit)}
            {item.recovery && item.recovery.value > 0
              ? `, rec ${formatSegment(item.recovery.value, item.recovery.unit)}`
              : ""}
            {` · ${INCLUDE_PLACEMENT_LABELS[normalizeIncludePlacement(item.placementHint)]}`}
          </span>
        </div>
      ))}
    </div>
  );
}
