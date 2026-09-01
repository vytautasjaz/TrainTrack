'use client'

import { useMemo, useState, type DragEvent } from 'react'
import type { WorkoutType } from '@prisma/client'
import {
  CirclePause,
  Copy,
  ChevronDown,
  Flag,
  GripVertical,
  HeartPulse,
  Repeat,
  Repeat2,
  StickyNote,
  TrendingUp,
  Waves,
  Wind,
  X,
} from 'lucide-react'
import type { AthletePreferences } from '@/lib/athlete-preferences'
import type { WorkoutBlock, WorkoutStructure } from '@/lib/workout-builder/types'
import {
  createSmartBlock,
  duplicateBlock,
  getBlockDisplayName,
  smartBlockAccentStyles,
  type PresetBlockKind,
  type SmartBlockKind,
} from '@/lib/workout-builder/smart-blocks'
import {
  createPresetBlockWithPrefs,
  type WorkoutBuilderPrefs,
} from '@/lib/workout-builder/workout-builder-prefs'
import {
  appendListedBlock,
  flattenStructure,
  insertListedBlock,
  moveListedBlock,
  removeListedBlock,
  unflattenBlocks,
  updateListedBlock,
} from '@/lib/workout-builder/structure-list'
import { estimateBlockDurationMinutes, estimateStructureDistanceKm, estimateStructureDurationMinutes } from '@/lib/workout-builder/segment-estimation'
import {
  formatBlockSummary,
  formatBuilderBlockTimeLabel,
} from '@/lib/workout-builder/utils'
import {
  WorkoutDetailsExpandedExtras,
  WorkoutDetailsInlineFields,
} from '@/components/workout-builder/workout-details-inline-fields'
import { WorkoutDetailsBlockPicker } from '@/components/workout-builder/workout-details-block-picker'
import { WorkoutStructureChart } from '@/components/workout-builder/workout-structure-chart'
import {
  DragInsertIndicator,
  decodeAddBlockDragData,
  insertIndexFromDragEvent,
  isMeaningfulInsert,
  targetIndexFromInsert,
} from '@/components/ui/drag-insert-indicator'
import { cn } from '@/lib/utils'

/** Drag | Type | Details | Time | Actions — fixed tracks so columns stay aligned. */
const ROW_GRID =
  'grid grid-cols-[1.5rem_8.5rem_1fr_4.5rem_5.25rem] items-center gap-x-2 sm:grid-cols-[1.5rem_9.5rem_1fr_4.75rem_5.25rem] sm:gap-x-3'

type WorkoutDetailsBlockListProps = {
  structure: WorkoutStructure
  onChange: (structure: WorkoutStructure) => void
  sportType: WorkoutType
  athletePreferences?: AthletePreferences | null
  builderPrefs?: WorkoutBuilderPrefs | null
}

function isPresetKind(kind: SmartBlockKind): kind is PresetBlockKind {
  return (
    kind === 'WARM_UP' ||
    kind === 'COOL_DOWN' ||
    kind === 'THRESHOLD' ||
    kind === 'VO2_MAX' ||
    kind === 'TEMPO' ||
    kind === 'TEMPO_INTERVALS' ||
    kind === 'FARTLEK'
  )
}

function hasExactDurationInput(block: WorkoutBlock): boolean {
  switch (block.type) {
    case 'CONTINUOUS':
    case 'RECOVERY':
    case 'REST':
    case 'PROGRESSIVE':
      return block.durationType === 'time' && (block.time ?? 0) > 0
    case 'INTERVAL':
      return (
        (block.repetitions ?? 1) > 0 &&
        block.work?.mode === 'time' &&
        (block.work.value ?? 0) > 0 &&
        (!block.recovery ||
          (block.recovery.mode === 'time' && (block.recovery.value ?? 0) > 0))
      )
    case 'REPETITION':
      return (
        (block.repetitions ?? 1) > 0 &&
        block.work?.mode === 'time' &&
        (block.work.value ?? 0) > 0
      )
    default:
      return false
  }
}

function BlockTypeIcon({
  block,
  className,
}: {
  block: WorkoutBlock
  className?: string
}) {
  const iconClass = cn('h-3.5 w-3.5 shrink-0', className)
  const name = (block.name ?? '').toLowerCase()

  // Named continuous presets share CONTINUOUS type — distinguish by title.
  if (name.includes('warm')) return <Flag className={iconClass} aria-hidden />
  if (name.includes('cool')) return <Wind className={iconClass} aria-hidden />

  switch (block.type) {
    case 'INTERVAL':
      return <Repeat className={iconClass} aria-hidden />
    case 'PROGRESSIVE':
      return <TrendingUp className={iconClass} aria-hidden />
    case 'REPETITION':
      return <Repeat2 className={iconClass} aria-hidden />
    case 'RECOVERY':
      return <HeartPulse className={iconClass} aria-hidden />
    case 'REST':
      return <CirclePause className={iconClass} aria-hidden />
    case 'FREE_TEXT':
      return <StickyNote className={iconClass} aria-hidden />
    case 'CONTINUOUS':
    default:
      return <Waves className={iconClass} aria-hidden />
  }
}

export function WorkoutDetailsBlockList({
  structure,
  onChange,
  sportType,
  athletePreferences,
  builderPrefs,
}: WorkoutDetailsBlockListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragAddKind, setDragAddKind] = useState<SmartBlockKind | null>(null)
  const [insertIndex, setInsertIndex] = useState<number | null>(null)

  const items = useMemo(() => flattenStructure(structure), [structure])

  function commit(nextItems: typeof items) {
    onChange(unflattenBlocks(nextItems))
  }

  function clearDrag() {
    setDragIndex(null)
    setDragAddKind(null)
    setInsertIndex(null)
  }

  function createBlockForKind(kind: SmartBlockKind) {
    return isPresetKind(kind)
      ? createPresetBlockWithPrefs(kind, items.length, sportType, builderPrefs)
      : createSmartBlock(kind, items.length, sportType)
  }

  function addBlock(kind: SmartBlockKind, at?: number) {
    const entry = {
      block: createBlockForKind(kind),
      section: 'mainSet' as const,
    }
    if (at == null || at >= items.length) {
      commit(appendListedBlock(items, entry))
      return
    }
    commit(insertListedBlock(items, Math.max(0, at), entry))
  }

  function updateBlock(flatIndex: number, block: (typeof items)[0]['block']) {
    commit(updateListedBlock(items, flatIndex, block))
  }

  function removeBlock(flatIndex: number) {
    const id = items[flatIndex]?.block.id
    commit(removeListedBlock(items, flatIndex))
    if (expandedId === id) setExpandedId(null)
  }

  function duplicateAt(flatIndex: number) {
    const source = items[flatIndex]
    const copy = duplicateBlock(source.block, items.length)
    commit(appendListedBlock(items, { block: copy, section: source.section }))
  }

  function handleDropAt(insertAt: number, e?: DragEvent) {
    const kind = (e ? decodeAddBlockDragData(e.dataTransfer) : null) ?? dragAddKind
    if (kind) {
      addBlock(kind as SmartBlockKind, insertAt)
      clearDrag()
      return
    }
    if (dragIndex === null || !isMeaningfulInsert(dragIndex, insertAt)) {
      clearDrag()
      return
    }
    commit(moveListedBlock(items, dragIndex, targetIndexFromInsert(dragIndex, insertAt)))
    clearDrag()
  }

  function expandBlock(id: string) {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  function setDropEffect(e: DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = dragAddKind ? 'copy' : 'move'
  }

  const dragging = dragIndex != null || dragAddKind != null

  const showInsertAt = (slot: number) =>
    dragging &&
    insertIndex === slot &&
    (dragAddKind != null ||
      (dragIndex != null && isMeaningfulInsert(dragIndex, slot)))

  const structureTotals = useMemo(() => {
    if (items.length === 0) return null
    const minutes = Math.round(
      estimateStructureDurationMinutes(structure, athletePreferences, sportType),
    )
    const km = estimateStructureDistanceKm(structure, athletePreferences, sportType)
    const timeLabel =
      minutes > 0 ? formatBuilderBlockTimeLabel(minutes, false) : null
    let distanceLabel: string | null = null
    if (km > 0) {
      if (sportType === 'SWIM') {
        const meters = Math.round(km * 1000)
        distanceLabel = `~${meters.toLocaleString()} m`
      } else {
        const rounded = Math.round(km * 10) / 10
        distanceLabel = `~${rounded} km`
      }
    }
    if (!timeLabel && !distanceLabel) return null
    return { timeLabel, distanceLabel }
  }, [items.length, structure, athletePreferences, sportType])

  return (
    <div className="min-w-0 space-y-2">
      {items.length > 0 ? (
        <div className="pb-1">
          <WorkoutStructureChart
            structure={structure}
            size="md"
            showCaption
            onReorderBlocks={(from, to) => {
              commit(moveListedBlock(items, from, to))
            }}
          />
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            if (!dragAddKind) return
            setDropEffect(e)
            if (insertIndex !== 0) setInsertIndex(0)
          }}
          onDrop={(e) => {
            e.preventDefault()
            if (!dragAddKind && !decodeAddBlockDragData(e.dataTransfer)) return
            handleDropAt(0, e)
          }}
          className={cn(
            'rounded-lg border border-dashed px-3 py-4 text-center text-sm text-muted-foreground transition',
            dragAddKind
              ? 'border-border bg-muted/40'
              : 'border-transparent',
          )}
        >
          {dragAddKind
            ? 'Drop here to add the first block'
            : 'No blocks yet — add one below, or drag a block type here.'}
        </div>
      )}

      {items.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-border/80 bg-white">
          <div
            className={cn(
              ROW_GRID,
              'border-b border-border/70 bg-[var(--tt-sidebar,#f5f5f5)] px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:px-4',
            )}
          >
            <span aria-hidden />
            <span>Type</span>
            <span>Details</span>
            <span className="text-right">Time</span>
            <span className="sr-only">Actions</span>
          </div>

          <div className="divide-y divide-border/70">
            {items.map((item, index) => {
              const { block } = item
              const displayName = getBlockDisplayName(block, item.section, sportType)
              const accent = smartBlockAccentStyles(block, item.section)
              const expanded = expandedId === block.id
              const details = formatBlockSummary(block, sportType)
              const durationMin = estimateBlockDurationMinutes(
                block,
                athletePreferences,
                sportType,
              )
              const timeLabel = formatBuilderBlockTimeLabel(
                durationMin,
                hasExactDurationInput(block),
              )

              return (
                <div
                  key={block.id}
                  className="relative"
                  onDragOver={(e) => {
                    setDropEffect(e)
                    const next = insertIndexFromDragEvent(e, index)
                    if (next !== insertIndex) setInsertIndex(next)
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    handleDropAt(insertIndexFromDragEvent(e, index), e)
                  }}
                >
                  <DragInsertIndicator show={showInsertAt(index)} />
                  <div
                    className={cn(
                      'border-l-[3px] transition-colors',
                      accent.edge,
                      expanded
                        ? 'bg-neutral-50 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.08)]'
                        : 'bg-white hover:bg-muted/[0.35]',
                      dragIndex === index && 'opacity-50',
                    )}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => expandBlock(block.id)}
                      onKeyDown={(e) => {
                        if (e.target !== e.currentTarget) return
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          expandBlock(block.id)
                        }
                      }}
                      className={cn(
                        ROW_GRID,
                        'min-h-[56px] min-w-0 cursor-pointer px-3 py-2.5 text-left sm:px-4',
                      )}
                    >
                      <span
                        draggable
                        onDragStart={(e) => {
                          e.stopPropagation()
                          e.dataTransfer.effectAllowed = 'move'
                          e.dataTransfer.setData('text/plain', String(index))
                          setDragAddKind(null)
                          setDragIndex(index)
                        }}
                        onDragEnd={clearDrag}
                        onClick={(e) => e.stopPropagation()}
                        className={cn(
                          'flex cursor-grab touch-none items-center justify-center active:cursor-grabbing',
                          accent.grip,
                        )}
                        aria-label="Drag to reorder"
                      >
                        <GripVertical className="h-3.5 w-3.5" />
                      </span>

                      <span className="flex min-w-0 items-center gap-1.5 overflow-hidden">
                        <span className={cn('shrink-0', accent.grip)}>
                          <BlockTypeIcon block={block} />
                        </span>
                        {expanded ? (
                          <input
                            value={block.name ?? displayName}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                            onChange={(e) =>
                              updateBlock(index, { ...block, name: e.target.value })
                            }
                            onFocus={(e) => {
                              if (!block.name?.trim()) {
                                updateBlock(index, { ...block, name: displayName })
                              }
                              e.target.select()
                            }}
                            aria-label="Block name"
                            className="min-w-0 flex-1 truncate bg-transparent text-[13px] font-semibold text-[#111827] outline-none focus:ring-1 focus:ring-sky-400/40"
                          />
                        ) : (
                          <span className="min-w-0 truncate text-[13px] font-semibold text-[#111827]">
                            {displayName}
                          </span>
                        )}
                      </span>

                      <span className="min-w-0 truncate text-[13px] font-medium text-[#374151]">
                        {details}
                      </span>

                      <span className="truncate text-right text-xs font-medium tabular-nums text-muted-foreground">
                        {timeLabel}
                      </span>

                      <span
                        className="flex w-full items-center justify-end gap-0.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => duplicateAt(index)}
                          className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground/50 transition hover:bg-muted/50 hover:text-muted-foreground"
                          aria-label="Duplicate block"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeBlock(index)}
                          className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground/50 transition hover:bg-red-50 hover:text-red-600"
                          aria-label="Delete block"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => expandBlock(block.id)}
                          className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground/55 transition hover:bg-muted/50"
                          aria-label={expanded ? 'Collapse block' : 'Expand block'}
                        >
                          <ChevronDown
                            className={cn(
                              'h-3.5 w-3.5 transition',
                              expanded && 'rotate-180',
                            )}
                          />
                        </button>
                      </span>
                    </div>

                    <div
                      className={cn(
                        'grid transition-[grid-template-rows] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]',
                        expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                      )}
                      aria-hidden={!expanded}
                    >
                      <div className="min-h-0 overflow-hidden">
                        <div
                          className={cn(
                            ROW_GRID,
                            'items-start px-3 pb-3 pt-2 sm:px-4',
                            'origin-top transition-[opacity,transform,border-color] duration-200 ease-out',
                            expanded
                              ? 'border-t border-border/70 opacity-100 translate-y-0'
                              : 'pointer-events-none border-t border-transparent opacity-0 -translate-y-1',
                          )}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span aria-hidden />
                          <span aria-hidden />
                          <div className="col-span-3 min-w-0">
                            <WorkoutDetailsInlineFields
                              block={block}
                              sportType={sportType}
                              onChange={(updated) => updateBlock(index, updated)}
                              className="min-w-0 w-full"
                            />
                            <div className="mt-2.5">
                              <WorkoutDetailsExpandedExtras
                                block={block}
                                sportType={sportType}
                                onChange={(updated) => updateBlock(index, updated)}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div
            className="relative h-2"
            onDragOver={(e) => {
              setDropEffect(e)
              if (insertIndex !== items.length) setInsertIndex(items.length)
            }}
            onDrop={(e) => {
              e.preventDefault()
              handleDropAt(items.length, e)
            }}
          >
            <DragInsertIndicator show={showInsertAt(items.length)} />
          </div>
        </div>
      ) : null}

      {structureTotals ? (
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 pt-1 text-[11px] text-muted-foreground">
          <span className="text-muted-foreground/80">Tip: Drag blocks to reorder</span>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-medium tabular-nums text-foreground/80">
            {structureTotals.timeLabel ? (
              <span>
                <span className="font-normal text-muted-foreground">Time </span>
                {structureTotals.timeLabel}
              </span>
            ) : null}
            {structureTotals.distanceLabel ? (
              <span>
                <span className="font-normal text-muted-foreground">Distance </span>
                {structureTotals.distanceLabel}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      <WorkoutDetailsBlockPicker
        onSelect={addBlock}
        sportType={sportType}
        builderPrefs={builderPrefs}
        onDragAddStart={(kind) => {
          setDragIndex(null)
          setDragAddKind(kind)
        }}
        onDragAddEnd={clearDrag}
      />
    </div>
  )
}
