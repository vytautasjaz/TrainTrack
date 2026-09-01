"use client";

import { useMemo, useState, type DragEvent } from "react";
import type { WorkoutStructure } from "@/lib/workout-builder/types";
import { buildStructureChart } from "@/lib/workout-builder/structure-chart";
import { intensityChartClass } from "@/lib/workout-builder/intensity-colors";
import {
  DragInsertIndicatorVertical,
  insertIndexFromDragEventX,
  isMeaningfulInsert,
  targetIndexFromInsert,
} from "@/components/ui/drag-insert-indicator";
import { cn } from "@/lib/utils";

const TONE_SEGMENT_CLASS = {
  muted: "bg-neutral-400/55 dark:bg-neutral-400/45",
  completed: "bg-emerald-500/70",
  skipped: "bg-red-400/75",
} as const;

export type StructureChartTone = "default" | "muted" | "completed" | "skipped";

type ChartSize = "xs" | "card" | "cardLg" | "sm" | "md";

type WorkoutStructureChartProps = {
  structure: WorkoutStructure | null | undefined;
  size?: ChartSize;
  showCaption?: boolean;
  /** Scales the easy-run silhouette when the chart is include-only. */
  durationMinutes?: number;
  /** Monochrome modes for plan data cards; default keeps multi-color builder chart. */
  tone?: StructureChartTone;
  className?: string;
  /**
   * When set (and the chart has block groups), regions are draggable to reorder
   * blocks. `from`/`to` are flattenStructure indices.
   */
  onReorderBlocks?: (fromIndex: number, toIndex: number) => void;
};

/** `sm`/`md` preserve builder & detail chart heights; `xs`/`card*` are plan data-card sizes. */
const HEIGHT: Record<ChartSize, string> = {
  xs: "h-3",
  card: "h-4",
  cardLg: "h-5",
  sm: "h-7",
  md: "h-9",
};

export function WorkoutStructureChart({
  structure,
  size = "sm",
  showCaption = true,
  durationMinutes,
  tone = "default",
  className,
  onReorderBlocks,
}: WorkoutStructureChartProps) {
  const model = useMemo(
    () => buildStructureChart(structure, { durationMinutes }),
    [structure, durationMinutes],
  );
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [insertIndex, setInsertIndex] = useState<number | null>(null);

  if (!model) return null;

  const chartModel = model;
  const chartHeight = HEIGHT[size];
  const monochrome =
    tone === "muted" || tone === "completed" || tone === "skipped";
  const sortable =
    Boolean(onReorderBlocks) &&
    !monochrome &&
    chartModel.blocks != null &&
    chartModel.blocks.length > 1;

  function clearDrag() {
    setDragIndex(null);
    setInsertIndex(null);
  }

  function handleDropAt(insertAt: number) {
    if (dragIndex === null || !onReorderBlocks) {
      clearDrag();
      return;
    }
    if (!isMeaningfulInsert(dragIndex, insertAt)) {
      clearDrag();
      return;
    }
    onReorderBlocks(dragIndex, targetIndexFromInsert(dragIndex, insertAt));
    clearDrag();
  }

  const showInsertAt = (slot: number) =>
    sortable &&
    dragIndex != null &&
    insertIndex === slot &&
    isMeaningfulInsert(dragIndex, slot);

  function renderSegments(
    segments: (typeof chartModel)["segments"],
    keyPrefix: string,
  ) {
    return segments.map((segment, index) => (
      <div
        key={`${keyPrefix}-${segment.kind}-${index}`}
        className={cn(
          "min-w-px shrink-0 rounded-t-[2px]",
          monochrome
            ? TONE_SEGMENT_CLASS[tone]
            : intensityChartClass(segment.intensity),
        )}
        style={{
          flexGrow: segment.weight,
          flexBasis: 0,
          height: `${Math.max(8, Math.round(segment.intensity * 100))}%`,
        }}
      />
    ));
  }

  return (
    <div className={cn("min-w-0", className)}>
      <div
        className={cn(
          "relative w-full",
          chartHeight,
          !monochrome && "border-b border-border/50",
        )}
        role={sortable ? "list" : "img"}
        aria-label={
          sortable
            ? "Workout intensity profile — drag regions to reorder blocks"
            : chartModel.caption || "Workout intensity profile"
        }
      >
        {sortable && chartModel.blocks ? (
          <div className="absolute inset-0 flex min-w-0 items-stretch overflow-hidden">
            {chartModel.blocks.map((block) => (
              <div
                key={block.id}
                className="relative flex h-full min-w-0"
                style={{ flexGrow: block.weight, flexBasis: 0 }}
                onDragOver={(e: DragEvent<HTMLDivElement>) => {
                  if (!sortable) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  const next = insertIndexFromDragEventX(e, block.index);
                  if (next !== insertIndex) setInsertIndex(next);
                }}
                onDrop={(e: DragEvent<HTMLDivElement>) => {
                  e.preventDefault();
                  handleDropAt(insertIndexFromDragEventX(e, block.index));
                }}
              >
                <DragInsertIndicatorVertical show={Boolean(showInsertAt(block.index))} />
                <div
                  role="listitem"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", String(block.index));
                    setDragIndex(block.index);
                  }}
                  onDragEnd={clearDrag}
                  title="Drag to reorder"
                  className={cn(
                    "flex h-full min-w-0 flex-1 cursor-grab items-end gap-px active:cursor-grabbing",
                    dragIndex === block.index && "opacity-45",
                  )}
                >
                  {renderSegments(block.segments, block.id)}
                </div>
              </div>
            ))}
            <div className="relative w-0 shrink-0 self-stretch">
              <DragInsertIndicatorVertical
                show={Boolean(showInsertAt(chartModel.blocks.length))}
              />
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex min-w-0 items-end gap-px overflow-hidden">
            {renderSegments(chartModel.segments, "seg")}
          </div>
        )}
      </div>
      {showCaption && chartModel.caption && (
        <p
          className={cn(
            "mt-1 truncate text-muted-foreground",
            size === "md" ? "text-xs leading-snug" : "text-[10px] leading-snug",
          )}
        >
          {chartModel.caption}
          {sortable ? " · drag graph to reorder" : null}
        </p>
      )}
    </div>
  );
}
