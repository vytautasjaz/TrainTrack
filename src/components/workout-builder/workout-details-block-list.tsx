"use client";

import { useMemo, useState } from "react";
import type { WorkoutType } from "@prisma/client";
import { ChevronDown, Copy, GripVertical, Trash2 } from "lucide-react";
import type { AthletePreferences } from "@/lib/athlete-preferences";
import type { WorkoutStructure } from "@/lib/workout-builder/types";
import {
  createSmartBlock,
  duplicateBlock,
  getBlockDisplayName,
  smartBlockAccentStyles,
  type PresetBlockKind,
  type SmartBlockKind,
} from "@/lib/workout-builder/smart-blocks";
import {
  createPresetBlockWithPrefs,
  type WorkoutBuilderPrefs,
} from "@/lib/workout-builder/workout-builder-prefs";
import {
  appendListedBlock,
  flattenStructure,
  moveListedBlock,
  removeListedBlock,
  unflattenBlocks,
  updateListedBlock,
} from "@/lib/workout-builder/structure-list";
import {
  WorkoutDetailsExpandedExtras,
  WorkoutDetailsInlineFields,
} from "@/components/workout-builder/workout-details-inline-fields";
import { WorkoutDetailsBlockPicker } from "@/components/workout-builder/workout-details-block-picker";
import { cn } from "@/lib/utils";

type WorkoutDetailsBlockListProps = {
  structure: WorkoutStructure;
  onChange: (structure: WorkoutStructure) => void;
  sportType: WorkoutType;
  athletePreferences?: AthletePreferences | null;
  builderPrefs?: WorkoutBuilderPrefs | null;
};

export function WorkoutDetailsBlockList({
  structure,
  onChange,
  sportType,
  builderPrefs,
}: WorkoutDetailsBlockListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const items = useMemo(() => flattenStructure(structure), [structure]);

  function commit(nextItems: typeof items) {
    onChange(unflattenBlocks(nextItems));
  }

  function addBlock(kind: SmartBlockKind) {
    const option =
      kind === "WARM_UP" ||
      kind === "COOL_DOWN" ||
      kind === "THRESHOLD" ||
      kind === "VO2_MAX" ||
      kind === "TEMPO" ||
      kind === "TEMPO_INTERVALS" ||
      kind === "FARTLEK"
        ? createPresetBlockWithPrefs(
            kind as PresetBlockKind,
            items.length,
            sportType,
            builderPrefs,
          )
        : createSmartBlock(kind, items.length, sportType);
    const next = appendListedBlock(items, {
      block: option,
      section: "mainSet",
    });
    commit(next);
  }

  function updateBlock(flatIndex: number, block: (typeof items)[0]["block"]) {
    commit(updateListedBlock(items, flatIndex, block));
  }

  function removeBlock(flatIndex: number) {
    const id = items[flatIndex]?.block.id;
    commit(removeListedBlock(items, flatIndex));
    if (expandedId === id) setExpandedId(null);
  }

  function duplicateAt(flatIndex: number) {
    const source = items[flatIndex];
    const copy = duplicateBlock(source.block, items.length);
    commit(appendListedBlock(items, { block: copy, section: source.section }));
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) return;
    commit(moveListedBlock(items, dragIndex, targetIndex));
    setDragIndex(null);
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="min-w-0 space-y-1.5">
      {items.length === 0 && (
        <p className="py-1 text-sm text-muted-foreground">
          No blocks yet — add one below.
        </p>
      )}

      {items.map((item, index) => {
        const { block } = item;
        const displayName = getBlockDisplayName(block, item.section, sportType);
        const accent = smartBlockAccentStyles(block, item.section);
        const expanded = expandedId === block.id;

        return (
          <div
            key={block.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(index)}
            className={cn(
              "group/block overflow-hidden rounded-[6px] border bg-card transition-colors",
              expanded ? "border-[#86D39A]/60 shadow-sm" : "border-border/60",
              dragIndex === index && "opacity-50",
            )}
          >
            <div className="flex items-stretch">
              <div
                className={cn(
                  "group/handle flex w-8 shrink-0 border-r border-border/40 sm:w-9",
                  accent.handle,
                )}
              >
                <div
                  className={cn("w-1 shrink-0", accent.stripe)}
                  aria-hidden
                />
                <span
                  draggable
                  onDragStart={(e) => {
                    e.stopPropagation();
                    setDragIndex(index);
                  }}
                  onDragEnd={() => setDragIndex(null)}
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    "flex min-w-0 flex-1 cursor-grab touch-none items-center justify-center active:cursor-grabbing",
                    accent.grip,
                  )}
                  aria-label="Drag to reorder"
                >
                  <GripVertical className="h-3.5 w-3.5" />
                </span>
              </div>

              <div className="min-w-0 flex-1 px-2 py-1.5 sm:px-2.5 sm:py-2">
                <div className="flex min-w-0 flex-nowrap items-center gap-2">
                  <input
                    value={block.name ?? displayName}
                    onChange={(e) =>
                      updateBlock(index, { ...block, name: e.target.value })
                    }
                    onFocus={(e) => {
                      if (!block.name?.trim()) {
                        // Seed name from inferred label so edits stick
                        updateBlock(index, { ...block, name: displayName });
                      }
                      e.target.select();
                    }}
                    aria-label="Block name"
                    className="w-[5.5rem] shrink-0 truncate bg-transparent text-sm font-semibold text-[#111827] outline-none placeholder:text-muted-foreground/50 hover:bg-muted/20 focus:bg-white focus:ring-1 focus:ring-sky-400/40 sm:w-[6.5rem]"
                    placeholder="Block name"
                  />
                  <WorkoutDetailsInlineFields
                    block={block}
                    sportType={sportType}
                    onChange={(updated) => updateBlock(index, updated)}
                    className="min-w-0 flex-1"
                  />
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-0 border-l border-border/50 px-0.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    duplicateAt(index);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-[4px] text-muted-foreground/50 transition hover:bg-muted/40 hover:text-muted-foreground"
                  aria-label="Duplicate block"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeBlock(index);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-[4px] text-muted-foreground/50 transition hover:bg-red-500/10 hover:text-red-600"
                  aria-label="Delete block"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => toggleExpand(block.id)}
                  className="flex h-7 w-7 items-center justify-center rounded-[4px] text-muted-foreground/50 transition hover:bg-muted/40"
                  aria-label={expanded ? "Collapse block" : "Expand block"}
                >
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 transition",
                      expanded && "rotate-180",
                    )}
                  />
                </button>
              </div>
            </div>

            {expanded ? (
              <div className="border-t border-border/40 px-3 pb-3 pt-2 sm:px-4">
                <WorkoutDetailsExpandedExtras
                  block={block}
                  sportType={sportType}
                  onChange={(updated) => updateBlock(index, updated)}
                />
                <div className="mt-4 flex justify-end border-t border-border/40 pt-3">
                  <button
                    type="button"
                    onClick={() => setExpandedId(null)}
                    className="text-xs font-medium text-[#166534] transition hover:text-[#166534]/80"
                  >
                    Collapse
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}

      <WorkoutDetailsBlockPicker
        onSelect={addBlock}
        sportType={sportType}
        builderPrefs={builderPrefs}
      />
    </div>
  );
}
