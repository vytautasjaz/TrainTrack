'use client'

import { useMemo, useState } from 'react'
import type { WorkoutType } from '@prisma/client'
import { ChevronDown, ChevronUp, Copy, GripVertical, Trash2 } from 'lucide-react'
import type { AthletePreferences } from '@/lib/athlete-preferences'
import type { WorkoutStructure } from '@/lib/workout-builder/types'
import {
  createSmartBlock,
  duplicateBlock,
  inferSmartBlockLabel,
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
  moveListedBlock,
  removeListedBlock,
  unflattenBlocks,
  updateListedBlock,
} from '@/lib/workout-builder/structure-list'
import { formatPlanBlockSummary } from '@/lib/workout-builder/segment-estimation'
import { ContinuousBlockFields } from '@/components/workout-builder/continuous-block-fields'
import {
  IntervalBlockRow,
  RepetitionBlockRow,
} from '@/components/workout-builder/builder-row-fields'
import { ProgressiveBlockRow } from '@/components/workout-builder/builder-segment-editor'
import { WorkoutDetailsBlockList } from '@/components/workout-builder/workout-details-block-list'
import { SmartBlockPicker } from '@/components/workout-builder/smart-block-picker'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

type WorkoutBlockListV2Props = {
  structure: WorkoutStructure
  onChange: (structure: WorkoutStructure) => void
  sportType: WorkoutType
  athletePreferences?: AthletePreferences | null
  builderPrefs?: WorkoutBuilderPrefs | null
  compact?: boolean
}

export function WorkoutBlockListV2({
  structure,
  onChange,
  sportType,
  athletePreferences,
  builderPrefs,
  compact = false,
}: WorkoutBlockListV2Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())
  const items = useMemo(() => flattenStructure(structure), [structure])

  if (compact) {
    return (
      <WorkoutDetailsBlockList
        structure={structure}
        onChange={onChange}
        sportType={sportType}
        athletePreferences={athletePreferences}
        builderPrefs={builderPrefs}
      />
    )
  }

  function commit(nextItems: typeof items) {
    onChange(unflattenBlocks(nextItems))
  }

  function addBlock(kind: SmartBlockKind) {
    const option =
      kind === 'WARM_UP' ||
      kind === 'COOL_DOWN' ||
      kind === 'THRESHOLD' ||
      kind === 'VO2_MAX' ||
      kind === 'TEMPO' ||
      kind === 'TEMPO_INTERVALS' ||
      kind === 'FARTLEK'
        ? createPresetBlockWithPrefs(kind as PresetBlockKind, items.length, sportType, builderPrefs)
        : createSmartBlock(kind, items.length, sportType)
    commit(appendListedBlock(items, { block: option, section: 'mainSet' }))
  }

  function updateBlock(flatIndex: number, block: typeof items[0]['block']) {
    commit(updateListedBlock(items, flatIndex, block))
  }

  function removeBlock(flatIndex: number) {
    commit(removeListedBlock(items, flatIndex))
  }

  function duplicateAt(flatIndex: number) {
    const source = items[flatIndex]
    const copy = duplicateBlock(source.block, items.length)
    commit(appendListedBlock(items, { block: copy, section: source.section }))
  }

  function moveBlock(flatIndex: number, direction: -1 | 1) {
    const target = flatIndex + direction
    if (target < 0 || target >= items.length) return
    commit(moveListedBlock(items, flatIndex, target))
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) return
    commit(moveListedBlock(items, dragIndex, targetIndex))
    setDragIndex(null)
  }

  function toggleCollapsed(id: string) {
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="min-w-0 space-y-3">
      {items.length === 0 && (
        <p className="py-2 text-sm text-muted-foreground">
          No blocks yet — add your first block below.
        </p>
      )}

      {items.map((item, index) => {
        const { block, section } = item
        const smart = inferSmartBlockLabel(block, section, sportType)
        const summary = formatPlanBlockSummary(block)
        const collapsed = collapsedIds.has(block.id)

        return (
          <div
            key={block.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(index)}
            className={cn(
              'overflow-hidden rounded-lg border border-border/80',
              dragIndex === index && 'opacity-50',
            )}
          >
            <div
              className={cn(
                'flex items-start gap-1 px-3 py-2.5',
                !collapsed && 'border-b border-border/50',
              )}
            >
              <span
                draggable
                onDragStart={(e) => {
                  e.stopPropagation()
                  setDragIndex(index)
                }}
                onDragEnd={() => setDragIndex(null)}
                className={cn(
                  'mt-0.5 shrink-0 cursor-grab touch-none text-muted-foreground/50 active:cursor-grabbing',
                  compact ? 'hidden sm:inline-flex' : 'inline-flex',
                )}
                aria-label="Drag to reorder"
              >
                <GripVertical className="h-4 w-4" />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <input
                    value={block.name ?? smart.label}
                    onChange={(e) => updateBlock(index, { ...block, name: e.target.value })}
                    onFocus={(e) => {
                      if (!block.name?.trim()) {
                        updateBlock(index, { ...block, name: smart.label })
                      }
                      e.target.select()
                    }}
                    className="min-w-0 max-w-[12rem] truncate bg-transparent text-sm font-semibold outline-none focus:ring-1 focus:ring-sky-400/40"
                    aria-label="Block name"
                  />
                  <button
                    type="button"
                    onClick={() => toggleCollapsed(block.id)}
                    className="text-xs text-muted-foreground transition hover:text-foreground"
                  >
                    {collapsed ? 'Expand' : 'Collapse'}
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
        )
      })}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/50 pt-3">
        <SmartBlockPicker
          onSelect={addBlock}
          sportType={sportType}
          builderPrefs={builderPrefs}
        />
        <button
          type="button"
          onClick={() => addBlock('WARM_UP')}
          className="text-xs text-muted-foreground transition hover:text-foreground"
        >
          + Warm up
        </button>
        <button
          type="button"
          onClick={() => addBlock('COOL_DOWN')}
          className="text-xs text-muted-foreground transition hover:text-foreground"
        >
          + Cool down
        </button>
      </div>
    </div>
  )
}

function SmartBlockFields({
  block,
  sportType,
  athletePreferences,
  onChange,
  compact,
}: {
  block: WorkoutBlockListV2Props['structure']['mainSet'][0]
  sportType: WorkoutType
  athletePreferences?: AthletePreferences | null
  onChange: (block: WorkoutBlockListV2Props['structure']['mainSet'][0]) => void
  compact?: boolean
}) {
  const update = (patch: Partial<typeof block>) => onChange({ ...block, ...patch })

  if (block.type === 'FREE_TEXT') {
    return (
      <Textarea
        value={block.text ?? ''}
        onChange={(e) => update({ text: e.target.value })}
        placeholder="Coach notes for this block..."
        rows={compact ? 2 : 3}
        variant="ghost"
        className="min-h-[4rem] text-sm"
      />
    )
  }

  if (block.type === 'INTERVAL') {
    return (
      <IntervalBlockRow
        block={block}
        onChange={update}
        sportType={sportType}
        athletePreferences={athletePreferences}
        embedded={compact}
      />
    )
  }

  if (block.type === 'REPETITION') {
    return <RepetitionBlockRow block={block} onChange={update} embedded={compact} />
  }

  if (block.type === 'PROGRESSIVE') {
    return (
      <ProgressiveBlockRow block={block} onChange={update} sportType={sportType} />
    )
  }

  return (
    <ContinuousBlockFields
      block={block}
      onChange={update}
      sportType={sportType}
      embedded={compact}
    />
  )
}
