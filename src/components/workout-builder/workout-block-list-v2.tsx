"use client";

import { useMemo, useState, type DragEvent } from "react";
import type { WorkoutType } from "@prisma/client";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  GripVertical,
  Trash2,
} from "lucide-react";
import type { AthletePreferences } from "@/lib/athlete-preferences";
import type { WorkoutStructure } from "@/lib/workout-builder/types";
import {
  createSmartBlock,
  duplicateBlock,
  inferSmartBlockLabel,
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
  insertListedBlock,
  moveListedBlock,
  removeListedBlock,
  unflattenBlocks,
  updateListedBlock,
} from "@/lib/workout-builder/structure-list";
import { formatPlanBlockSummary } from "@/lib/workout-builder/segment-estimation";
import { ContinuousBlockFields } from "@/components/workout-builder/continuous-block-fields";
import {
  IntervalBlockRow,
  RepetitionBlockRow,
} from "@/components/workout-builder/builder-row-fields";
import { ProgressiveBlockRow } from "@/components/workout-builder/builder-segment-editor";
import { WorkoutDetailsBlockList } from "@/components/workout-builder/workout-details-block-list";
import { WorkoutStructureChart } from "@/components/workout-builder/workout-structure-chart";
import { SmartBlockPicker } from "@/components/workout-builder/smart-block-picker";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DragInsertIndicator,
  decodeAddBlockDragData,
  insertIndexFromDragEvent,
  isMeaningfulInsert,
  targetIndexFromInsert,
} from "@/components/ui/drag-insert-indicator";
import { cn } from "@/lib/utils";

type WorkoutBlockListV2Props = {
  structure: WorkoutStructure;
  onChange: (structure: WorkoutStructure) => void;
  sportType: WorkoutType;
  athletePreferences?: AthletePreferences | null;
  builderPrefs?: WorkoutBuilderPrefs | null;
  compact?: boolean;
};

function isPresetKind(kind: SmartBlockKind): kind is PresetBlockKind {
  return (
    kind === "WARM_UP" ||
    kind === "COOL_DOWN" ||
    kind === "THRESHOLD" ||
    kind === "VO2_MAX" ||
    kind === "TEMPO" ||
    kind === "TEMPO_INTERVALS" ||
    kind === "FARTLEK"
  );
}

export function WorkoutBlockListV2({
  structure,
  onChange,
  sportType,
  athletePreferences,
  builderPrefs,
  compact = false,
}: WorkoutBlockListV2Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragAddKind, setDragAddKind] = useState<SmartBlockKind | null>(null);
  const [insertIndex, setInsertIndex] = useState<number | null>(null);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  const items = useMemo(() => flattenStructure(structure), [structure]);

  if (compact) {
    return (
      <WorkoutDetailsBlockList
        structure={structure}
        onChange={onChange}
        sportType={sportType}
        athletePreferences={athletePreferences}
        builderPrefs={builderPrefs}
      />
    );
  }

  function commit(nextItems: typeof items) {
    onChange(unflattenBlocks(nextItems));
  }

  function clearDrag() {
    setDragIndex(null);
    setDragAddKind(null);
    setInsertIndex(null);
  }

  function createBlockForKind(kind: SmartBlockKind) {
    return isPresetKind(kind)
      ? createPresetBlockWithPrefs(kind, items.length, sportType, builderPrefs)
      : createSmartBlock(kind, items.length, sportType);
  }

  function addBlock(kind: SmartBlockKind, at?: number) {
    const entry = {
      block: createBlockForKind(kind),
      section: "mainSet" as const,
    };
    if (at == null || at >= items.length) {
      commit(appendListedBlock(items, entry));
      return;
    }
    commit(insertListedBlock(items, Math.max(0, at), entry));
  }

  function updateBlock(flatIndex: number, block: (typeof items)[0]["block"]) {
    commit(updateListedBlock(items, flatIndex, block));
  }

  function removeBlock(flatIndex: number) {
    commit(removeListedBlock(items, flatIndex));
  }

  function duplicateAt(flatIndex: number) {
    const source = items[flatIndex];
    const copy = duplicateBlock(source.block, items.length);
    commit(appendListedBlock(items, { block: copy, section: source.section }));
  }

  function moveBlock(flatIndex: number, direction: -1 | 1) {
    const target = flatIndex + direction;
    if (target < 0 || target >= items.length) return;
    commit(moveListedBlock(items, flatIndex, target));
  }

  function handleDropAt(insertAt: number, e?: DragEvent) {
    const kind = (e ? decodeAddBlockDragData(e.dataTransfer) : null) ??
      dragAddKind;
    if (kind) {
      addBlock(kind as SmartBlockKind, insertAt);
      clearDrag();
      return;
    }
    if (dragIndex === null || !isMeaningfulInsert(dragIndex, insertAt)) {
      clearDrag();
      return;
    }
    commit(
      moveListedBlock(
        items,
        dragIndex,
        targetIndexFromInsert(dragIndex, insertAt),
      ),
    );
    clearDrag();
  }

  function toggleCollapsed(id: string) {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function setDropEffect(e: DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = dragAddKind ? "copy" : "move";
  }

  const dragging = dragIndex != null || dragAddKind != null;

  const showInsertAt = (slot: number) =>
    dragging &&
    insertIndex === slot &&
    (dragAddKind != null ||
      (dragIndex != null && isMeaningfulInsert(dragIndex, slot)));

  return (
    <div className="min-w-0 space-y-3">
      {items.length > 0 ? (
        <WorkoutStructureChart
          structure={structure}
          size="md"
          showCaption
          onReorderBlocks={(from, to) => {
            commit(moveListedBlock(items, from, to));
          }}
        />
      ) : (
        <div
          onDragOver={(e) => {
            if (!dragAddKind) return;
            setDropEffect(e);
            if (insertIndex !== 0) setInsertIndex(0);
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (!dragAddKind && !decodeAddBlockDragData(e.dataTransfer)) {
              return;
            }
            handleDropAt(0, e);
          }}
          className={cn(
            "rounded-lg border border-dashed px-3 py-4 text-center text-sm text-muted-foreground transition",
            dragAddKind
              ? "border-[#86D39A]/70 bg-[#F3FAF5]"
              : "border-transparent",
          )}
        >
          {dragAddKind
            ? "Drop here to add the first block"
            : "No blocks yet — add your first block below, or drag a type here."}
        </div>
      )}

      {items.map((item, index) => {
        const { block, section } = item;
        const smart = inferSmartBlockLabel(block, section, sportType);
        const summary = formatPlanBlockSummary(block);
        const collapsed = collapsedIds.has(block.id);
        const accent = smartBlockAccentStyles(block, section);

        return (
          <div key={block.id} className="relative">
            <DragInsertIndicator show={showInsertAt(index)} />
            <div
              onDragOver={(e) => {
                setDropEffect(e);
                const next = insertIndexFromDragEvent(e, index);
                if (next !== insertIndex) setInsertIndex(next);
              }}
              onDrop={(e) => {
                e.preventDefault();
                handleDropAt(insertIndexFromDragEvent(e, index), e);
              }}
              className={cn(
                "overflow-hidden rounded-lg border border-l-[3px] border-y-border/60 border-r-border/60",
                accent.surface,
                accent.edge,
                dragIndex === index && "opacity-50",
              )}
            >
            <div
              className={cn(
                "flex items-start gap-1 px-3 py-2.5",
                !collapsed && "border-b border-black/[0.04]",
              )}
            >
              <span
                draggable
                onDragStart={(e) => {
                  e.stopPropagation();
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", String(index));
                  setDragAddKind(null);
                  setDragIndex(index);
                }}
                onDragEnd={clearDrag}
                className={cn(
                  "mt-0.5 shrink-0 cursor-grab touch-none active:cursor-grabbing",
                  accent.grip,
                  compact ? "hidden sm:inline-flex" : "inline-flex",
                )}
                aria-label="Drag to reorder"
              >
                <GripVertical className="h-4 w-4" />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <input
                    value={block.name ?? smart.label}
                    onChange={(e) =>
                      updateBlock(index, { ...block, name: e.target.value })
                    }
                    onFocus={(e) => {
                      if (!block.name?.trim()) {
                        updateBlock(index, { ...block, name: smart.label });
                      }
                      e.target.select();
                    }}
                    className="min-w-0 max-w-[12rem] truncate bg-transparent text-sm font-semibold outline-none focus:ring-1 focus:ring-sky-400/40"
                    aria-label="Block name"
                  />
                  <button
                    type="button"
                    onClick={() => toggleCollapsed(block.id)}
                    className="text-xs text-muted-foreground transition hover:text-foreground"
                  >
                    {collapsed ? "Expand" : "Collapse"}
                  </button>
                </div>
                {collapsed && summary && (
                  <button
                    type="button"
                    onClick={() => toggleCollapsed(block.id)}
                    className="mt-0.5 block w-full truncate text-left text-xs text-muted-foreground"
                  >
                    {summary}
                  </button>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => moveBlock(index, -1)}
                  disabled={index === 0}
                  aria-label="Move up"
                  className="h-7 w-7 p-0"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => moveBlock(index, 1)}
                  disabled={index === items.length - 1}
                  aria-label="Move down"
                  className="h-7 w-7 p-0"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => duplicateAt(index)}
                  aria-label="Duplicate"
                  className="h-7 w-7 p-0"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeBlock(index)}
                  aria-label="Delete"
                  className="h-7 w-7 p-0 text-muted-foreground"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {!collapsed && (
              <div className="px-3 py-3">
                <SmartBlockFields
                  block={block}
                  sportType={sportType}
                  athletePreferences={athletePreferences}
                  onChange={(updated) => updateBlock(index, updated)}
                  compact={compact}
                />
              </div>
            )}
            </div>
          </div>
        );
      })}

      {items.length > 0 ? (
        <div
          className="relative h-2"
          onDragOver={(e) => {
            setDropEffect(e);
            if (insertIndex !== items.length) setInsertIndex(items.length);
          }}
          onDrop={(e) => {
            e.preventDefault();
            handleDropAt(items.length, e);
          }}
        >
          <DragInsertIndicator show={showInsertAt(items.length)} />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/50 pt-3">
        <SmartBlockPicker
          onSelect={addBlock}
          sportType={sportType}
          builderPrefs={builderPrefs}
          onDragAddStart={(kind) => {
            setDragIndex(null);
            setDragAddKind(kind);
          }}
          onDragAddEnd={clearDrag}
        />
      </div>
    </div>
  );
}

function SmartBlockFields({
  block,
  sportType,
  athletePreferences,
  onChange,
  compact,
}: {
  block: WorkoutBlockListV2Props["structure"]["mainSet"][0];
  sportType: WorkoutType;
  athletePreferences?: AthletePreferences | null;
  onChange: (block: WorkoutBlockListV2Props["structure"]["mainSet"][0]) => void;
  compact?: boolean;
}) {
  const update = (patch: Partial<typeof block>) =>
    onChange({ ...block, ...patch });

  if (block.type === "FREE_TEXT") {
    return (
      <Textarea
        value={block.text ?? ""}
        onChange={(e) => update({ text: e.target.value })}
        placeholder="Coach notes for this block..."
        rows={compact ? 2 : 3}
        variant="ghost"
        className="min-h-[4rem] text-sm"
      />
    );
  }

  if (block.type === "INTERVAL") {
    return (
      <IntervalBlockRow
        block={block}
        onChange={update}
        sportType={sportType}
        athletePreferences={athletePreferences}
        embedded={compact}
      />
    );
  }

  if (block.type === "REPETITION") {
    return (
      <RepetitionBlockRow block={block} onChange={update} embedded={compact} />
    );
  }

  if (block.type === "PROGRESSIVE") {
    return (
      <ProgressiveBlockRow
        block={block}
        onChange={update}
        sportType={sportType}
      />
    );
  }

  return (
    <ContinuousBlockFields
      block={block}
      onChange={update}
      sportType={sportType}
      embedded={compact}
    />
  );
}
