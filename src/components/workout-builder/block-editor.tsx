'use client'

import { useState } from 'react'
import type { WorkoutType } from '@prisma/client'
import type { AthletePreferences } from '@/lib/athlete-preferences'
import type { WorkoutBlock, WorkoutSection } from '@/lib/workout-builder/types'
import { BLOCK_TYPE_LABELS } from '@/lib/workout-builder/types'
import {
  targetPlaceholder,
  targetTypeLabel,
  targetTypesForSport,
} from '@/lib/workout-builder/target-helpers'
import {
  createBlock,
  formatBlockSummary,
  newBlockId,
  normalizeOrders,
} from '@/lib/workout-builder/utils'
import { ContinuousBlockFields } from '@/components/workout-builder/continuous-block-fields'
import {
  IntervalBlockRow,
  RepetitionBlockRow,
} from '@/components/workout-builder/builder-row-fields'
import { ProgressiveBlockRow } from '@/components/workout-builder/builder-segment-editor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Caption } from '@/components/ui/typography'
import { ChevronDown, ChevronUp, Copy, GripVertical, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type BlockEditorProps = {
  block: WorkoutBlock
  onChange: (block: WorkoutBlock) => void
  onDuplicate: () => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  canMoveUp: boolean
  canMoveDown: boolean
  compact?: boolean
  athletePreferences?: AthletePreferences | null
  sportType: WorkoutType
}

export function BlockEditor({
  block,
  onChange,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  compact,
  athletePreferences,
  sportType,
}: BlockEditorProps) {
  const update = (patch: Partial<WorkoutBlock>) => onChange({ ...block, ...patch })

  return (
    <div className="rounded-lg border border-border/70 bg-background p-2">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2 px-0.5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <GripVertical className="hidden h-4 w-4 shrink-0 text-muted-foreground/40 sm:block" />
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {BLOCK_TYPE_LABELS[block.type]}
          </span>
          <Input
            value={block.name ?? ''}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="Block name"
            className="h-7 max-w-[10rem] text-xs"
            aria-label="Block name"
          />
          {!compact && (
            <span className="hidden truncate text-xs text-muted-foreground sm:inline">{formatBlockSummary(block)}</span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={onMoveUp} disabled={!canMoveUp} aria-label="Move up">
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onMoveDown} disabled={!canMoveDown} aria-label="Move down">
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onDuplicate} aria-label="Duplicate">
            <Copy className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onDelete} aria-label="Delete">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {block.type === 'FREE_TEXT' && (
        <Textarea
          value={block.text ?? ''}
          onChange={(e) => update({ text: e.target.value })}
          placeholder="Enter coaching instructions..."
          className="min-h-[72px]"
          rows={3}
        />
      )}

      {(block.type === 'CONTINUOUS' || block.type === 'RECOVERY' || block.type === 'REST') && (
        <ContinuousBlockFields
          block={block}
          onChange={update}
          sportType={sportType}
          embedded
        />
      )}

      {block.type === 'PROGRESSIVE' && (
        <ProgressiveBlockRow block={block} onChange={update} sportType={sportType} />
      )}

      {block.type === 'INTERVAL' && (
        <IntervalBlockRow
          block={block}
          onChange={update}
          sportType={sportType}
          athletePreferences={athletePreferences}
          embedded
        />
      )}

      {block.type === 'REPETITION' && (
        <RepetitionBlockRow block={block} onChange={update} embedded />
      )}

      {block.type !== 'FREE_TEXT' && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-muted-foreground">Advanced settings</summary>
          <div className="mt-2 space-y-2">
            <TargetFields block={block} onChange={update} sportType={sportType} />
            <label className="block text-xs">
              <span className="text-muted-foreground">Block notes</span>
              <Input
                value={block.notes ?? ''}
                onChange={(e) => update({ notes: e.target.value })}
                className="mt-1"
                placeholder="Optional"
              />
            </label>
          </div>
        </details>
      )}
    </div>
  )
}

function TargetFields({
  block,
  onChange,
  sportType,
}: {
  block: WorkoutBlock
  onChange: (patch: Partial<WorkoutBlock>) => void
  sportType: WorkoutType
}) {
  const targets = block.targets ?? []
  const target = targets[0] ?? { type: 'rpe' as const, value: '' }
  const types = targetTypesForSport(sportType)

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="block min-w-0 text-sm">
        <span className="text-muted-foreground">Target type</span>
        <Select
          value={target.type}
          onChange={(e) =>
            onChange({
              targets: [{ ...target, type: e.target.value as typeof target.type }],
            })
          }
          className="mt-1"
        >
          {types.map((type) => (
            <option key={type} value={type}>
              {targetTypeLabel(type)}
            </option>
          ))}
        </Select>
      </label>
      <label className="block min-w-0 text-sm">
        <span className="text-muted-foreground">Target value</span>
        <Input
          value={target.value ?? ''}
          onChange={(e) =>
            onChange({ targets: [{ ...target, value: e.target.value }] })
          }
          className="mt-1"
          placeholder={targetPlaceholder(target.type, sportType)}
        />
      </label>
    </div>
  )
}

type WorkoutSectionPanelProps = {
  title: string
  section: WorkoutSection
  blocks: WorkoutBlock[]
  onChange: (blocks: WorkoutBlock[]) => void
  allowedTypes: WorkoutBlock['type'][]
  defaultCollapsed?: boolean
  athletePreferences?: AthletePreferences | null
  sportType: WorkoutType
}

export function WorkoutSectionPanel({
  title,
  blocks,
  onChange,
  allowedTypes,
  defaultCollapsed = false,
  athletePreferences,
  sportType,
}: WorkoutSectionPanelProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)

  function updateBlock(index: number, block: WorkoutBlock) {
    const next = [...blocks]
    next[index] = block
    onChange(next)
  }

  function addBlock(type: WorkoutBlock['type']) {
    onChange(normalizeOrders([...blocks, createBlock(type, blocks.length, sportType)]))
  }

  function duplicateBlock(index: number) {
    const copy = { ...blocks[index], id: newBlockId(), order: blocks.length }
    onChange(normalizeOrders([...blocks, copy]))
  }

  function deleteBlock(index: number) {
    onChange(normalizeOrders(blocks.filter((_, i) => i !== index)))
  }

  function moveBlock(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= blocks.length) return
    const next = [...blocks]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(normalizeOrders(next))
  }

  return (
    <section className="rounded-lg border border-border/70 bg-muted/15">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold uppercase tracking-wide">{title}</span>
        <ChevronDown className={cn('h-4 w-4 transition', !collapsed && 'rotate-180')} />
      </button>

      {!collapsed && (
        <div className="min-w-0 space-y-3 border-t border-border/60 px-3 pb-4 pt-3 sm:px-4">
          {blocks.length === 0 && (
            <Caption>No segments yet.</Caption>
          )}
          {blocks.map((block, index) => (
            <BlockEditor
              key={block.id}
              block={block}
              onChange={(updated) => updateBlock(index, updated)}
              onDuplicate={() => duplicateBlock(index)}
              onDelete={() => deleteBlock(index)}
              onMoveUp={() => moveBlock(index, -1)}
              onMoveDown={() => moveBlock(index, 1)}
              canMoveUp={index > 0}
              canMoveDown={index < blocks.length - 1}
              athletePreferences={athletePreferences}
              sportType={sportType}
            />
          ))}

          <div className="flex flex-wrap gap-2">
            {allowedTypes.map((type) => (
              <Button
                key={type}
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => addBlock(type)}
              >
                + {BLOCK_TYPE_LABELS[type]}
              </Button>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
