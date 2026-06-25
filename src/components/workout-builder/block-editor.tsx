'use client'

import { useState } from 'react'
import type { WorkoutBlock, WorkoutSection } from '@/lib/workout-builder/types'
import { BLOCK_TYPE_LABELS, TARGET_TYPE_LABELS } from '@/lib/workout-builder/types'
import {
  createBlock,
  formatBlockSummary,
  newBlockId,
  normalizeOrders,
} from '@/lib/workout-builder/utils'
import { Button } from '@/components/ui/button'
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
}: BlockEditorProps) {
  const update = (patch: Partial<WorkoutBlock>) => onChange({ ...block, ...patch })

  return (
    <div className="rounded-xl border border-border/70 bg-card p-3 shadow-[var(--shadow-card)]">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <GripVertical className="hidden h-4 w-4 shrink-0 text-muted-foreground/40 sm:block" />
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {BLOCK_TYPE_LABELS[block.type]}
          </span>
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
        <textarea
          value={block.text ?? ''}
          onChange={(e) => update({ text: e.target.value })}
          placeholder="Enter coaching instructions..."
          className="input-field min-h-[72px]"
          rows={3}
        />
      )}

      {(block.type === 'CONTINUOUS' || block.type === 'RECOVERY' || block.type === 'REST') && (
        <ContinuousFields block={block} onChange={update} />
      )}

      {block.type === 'INTERVAL' && <IntervalFields block={block} onChange={update} />}

      {block.type === 'REPETITION' && <RepetitionFields block={block} onChange={update} />}

      {block.type !== 'FREE_TEXT' && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-muted-foreground">Advanced settings</summary>
          <div className="mt-2 space-y-2">
            <TargetFields block={block} onChange={update} />
            <label className="block text-xs">
              <span className="text-muted-foreground">Block notes</span>
              <input
                value={block.notes ?? ''}
                onChange={(e) => update({ notes: e.target.value })}
                className="input-field mt-1"
                placeholder="Optional"
              />
            </label>
          </div>
        </details>
      )}
    </div>
  )
}

function ContinuousFields({
  block,
  onChange,
}: {
  block: WorkoutBlock
  onChange: (patch: Partial<WorkoutBlock>) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="block min-w-0 text-sm sm:col-span-2">
        <span className="text-muted-foreground">Duration type</span>
        <select
          value={block.durationType ?? 'time'}
          onChange={(e) =>
            onChange({ durationType: e.target.value as 'time' | 'distance' })
          }
          className="input-field mt-1"
        >
          <option value="time">Time</option>
          <option value="distance">Distance</option>
        </select>
      </label>
      {block.durationType === 'distance' ? (
        <label className="block min-w-0 text-sm">
          <span className="text-muted-foreground">Distance</span>
          <div className="mt-1 grid grid-cols-[minmax(0,1fr)_5.5rem] gap-2">
            <input
              type="number"
              min={0}
              step="0.1"
              inputMode="decimal"
              value={block.distance ?? ''}
              onChange={(e) => onChange({ distance: Number(e.target.value) })}
              className="input-field min-w-0"
            />
            <select
              value={block.distanceUnit ?? 'km'}
              onChange={(e) => onChange({ distanceUnit: e.target.value as 'km' | 'm' })}
              className="input-field min-w-0 px-2"
            >
              <option value="km">km</option>
              <option value="m">m</option>
            </select>
          </div>
        </label>
      ) : (
        <label className="block min-w-0 text-sm">
          <span className="text-muted-foreground">Duration (min)</span>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={block.time ?? ''}
            onChange={(e) => onChange({ time: Number(e.target.value) })}
            className="input-field mt-1"
          />
        </label>
      )}
      <label className="block min-w-0 text-sm">
        <span className="text-muted-foreground">Primary target</span>
        <input
          value={block.targets?.[0]?.value ?? ''}
          onChange={(e) =>
            onChange({
              targets: [{ type: block.targets?.[0]?.type ?? 'rpe', value: e.target.value }],
            })
          }
          placeholder="e.g. Easy, 4:30/km"
          className="input-field mt-1"
        />
      </label>
    </div>
  )
}

function IntervalFields({
  block,
  onChange,
}: {
  block: WorkoutBlock
  onChange: (patch: Partial<WorkoutBlock>) => void
}) {
  const work = block.work ?? { mode: 'distance' as const, value: 0, unit: 'm' as const }
  const recovery = block.recovery ?? { mode: 'time' as const, value: 0, unit: 'min' as const }

  return (
    <div className="space-y-3">
      <label className="block min-w-0 text-sm">
        <span className="text-muted-foreground">Repeats</span>
        <input
          type="number"
          min={1}
          inputMode="numeric"
          value={block.repetitions ?? 1}
          onChange={(e) => onChange({ repetitions: Number(e.target.value) })}
          className="input-field mt-1 max-w-[8rem]"
        />
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SegmentInput label="Work" segment={work} onChange={(work) => onChange({ work })} />
        <SegmentInput label="Recovery" segment={recovery} onChange={(recovery) => onChange({ recovery })} />
      </div>
      <label className="block min-w-0 text-sm">
        <span className="text-muted-foreground">Target pace / effort</span>
        <input
          value={block.targets?.[0]?.value ?? ''}
          onChange={(e) =>
            onChange({ targets: [{ type: 'pace', value: e.target.value }] })
          }
          placeholder="3:45/km"
          className="input-field mt-1"
        />
      </label>
    </div>
  )
}

function RepetitionFields({
  block,
  onChange,
}: {
  block: WorkoutBlock
  onChange: (patch: Partial<WorkoutBlock>) => void
}) {
  const work = block.work ?? { mode: 'distance' as const, value: 100, unit: 'm' as const }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="block min-w-0 text-sm">
        <span className="text-muted-foreground">Repeats</span>
        <input
          type="number"
          min={1}
          inputMode="numeric"
          value={block.repetitions ?? 1}
          onChange={(e) => onChange({ repetitions: Number(e.target.value) })}
          className="input-field mt-1"
        />
      </label>
      <SegmentInput label="Effort" segment={work} onChange={(work) => onChange({ work })} />
    </div>
  )
}

function SegmentInput({
  label,
  segment,
  onChange,
}: {
  label: string
  segment: NonNullable<WorkoutBlock['work']>
  onChange: (segment: NonNullable<WorkoutBlock['work']>) => void
}) {
  return (
    <label className="block min-w-0 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="mt-1 grid grid-cols-[minmax(0,1fr)_5.5rem] gap-2">
        <input
          type="number"
          min={0}
          inputMode="decimal"
          value={segment.value}
          onChange={(e) => onChange({ ...segment, value: Number(e.target.value) })}
          className="input-field min-w-0"
        />
        <select
          value={segment.unit}
          onChange={(e) =>
            onChange({ ...segment, unit: e.target.value as typeof segment.unit })
          }
          className="input-field min-w-0 px-2"
        >
          <option value="min">min</option>
          <option value="sec">sec</option>
          <option value="m">m</option>
          <option value="km">km</option>
        </select>
      </div>
    </label>
  )
}

function TargetFields({
  block,
  onChange,
}: {
  block: WorkoutBlock
  onChange: (patch: Partial<WorkoutBlock>) => void
}) {
  const targets = block.targets ?? []
  const target = targets[0] ?? { type: 'rpe' as const, value: '' }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="block min-w-0 text-sm">
        <span className="text-muted-foreground">Target type</span>
        <select
          value={target.type}
          onChange={(e) =>
            onChange({
              targets: [{ ...target, type: e.target.value as typeof target.type }],
            })
          }
          className="input-field mt-1"
        >
          {Object.entries(TARGET_TYPE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="block min-w-0 text-sm">
        <span className="text-muted-foreground">Target value</span>
        <input
          value={target.value ?? ''}
          onChange={(e) =>
            onChange({ targets: [{ ...target, value: e.target.value }] })
          }
          className="input-field mt-1"
          placeholder="e.g. 165-175 bpm"
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
}

export function WorkoutSectionPanel({
  title,
  blocks,
  onChange,
  allowedTypes,
  defaultCollapsed = false,
}: WorkoutSectionPanelProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)

  function updateBlock(index: number, block: WorkoutBlock) {
    const next = [...blocks]
    next[index] = block
    onChange(next)
  }

  function addBlock(type: WorkoutBlock['type']) {
    onChange(normalizeOrders([...blocks, createBlock(type, blocks.length)]))
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
    <section className="rounded-2xl border border-border/70 bg-muted/20">
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
            <p className="text-sm text-muted-foreground">No segments yet.</p>
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
