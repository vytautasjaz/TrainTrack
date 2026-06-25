'use client'

import { useState, type ReactNode } from 'react'
import { GripVertical, Plus, Trash2 } from 'lucide-react'
import type { WorkoutBlock, Target } from '@/lib/workout-builder/types'
import { BLOCK_TYPE_LABELS } from '@/lib/workout-builder/types'
import {
  createDefaultCooldownBlock,
  createDefaultWarmupBlock,
  DEFAULT_WU_CD_KM,
} from '@/lib/workout-builder/default-structure'
import { createBlock, normalizeOrders } from '@/lib/workout-builder/utils'
import type { WorkoutStructure } from '@/lib/workout-builder/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type WorkoutBlockBuilderProps = {
  structure: WorkoutStructure
  onChange: (structure: WorkoutStructure) => void
}

export function WorkoutBlockBuilder({ structure, onChange }: WorkoutBlockBuilderProps) {
  const [dragId, setDragId] = useState<string | null>(null)

  const warmup = structure.warmup[0] ?? createDefaultWarmupBlock()
  const cooldown = structure.cooldown[0] ?? createDefaultCooldownBlock()

  function updateWarmup(patch: Partial<WorkoutBlock>) {
    onChange({ ...structure, warmup: [{ ...warmup, ...patch }] })
  }

  function updateCooldown(patch: Partial<WorkoutBlock>) {
    onChange({ ...structure, cooldown: [{ ...cooldown, ...patch }] })
  }

  function updateMainBlock(index: number, block: WorkoutBlock) {
    const mainSet = [...structure.mainSet]
    mainSet[index] = block
    onChange({ ...structure, mainSet })
  }

  function addMainBlock(type: WorkoutBlock['type']) {
    onChange({
      ...structure,
      mainSet: normalizeOrders([...structure.mainSet, createBlock(type, structure.mainSet.length)]),
    })
  }

  function removeMainBlock(index: number) {
    onChange({
      ...structure,
      mainSet: normalizeOrders(structure.mainSet.filter((_, i) => i !== index)),
    })
  }

  function moveMainBlock(from: number, to: number) {
    if (to < 0 || to >= structure.mainSet.length) return
    const mainSet = [...structure.mainSet]
    const [item] = mainSet.splice(from, 1)
    mainSet.splice(to, 0, item)
    onChange({ ...structure, mainSet: normalizeOrders(mainSet) })
  }

  function handleDrop(targetIndex: number) {
    if (!dragId) return
    const fromIndex = structure.mainSet.findIndex((b) => b.id === dragId)
    if (fromIndex === -1 || fromIndex === targetIndex) return
    moveMainBlock(fromIndex, targetIndex)
    setDragId(null)
  }

  return (
    <div className="min-w-0 space-y-3">
      <DistanceSection
        label="Warm-up"
        distance={warmup.distance ?? DEFAULT_WU_CD_KM}
        onChange={(distance) => updateWarmup({ distance, durationType: 'distance', distanceUnit: 'km' })}
      />

      <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Main set
        </p>

        <div className="space-y-2">
          {structure.mainSet.map((block, index) => (
            <div
              key={block.id}
              draggable
              onDragStart={() => setDragId(block.id)}
              onDragEnd={() => setDragId(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(index)}
              className={cn(
                'rounded-lg border border-border/70 bg-card p-3',
                dragId === block.id && 'opacity-50',
              )}
            >
              <MainBlockEditor
                block={block}
                onChange={(updated) => updateMainBlock(index, updated)}
                onRemove={() => removeMainBlock(index)}
              />
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <AddBlockButton label="Interval" onClick={() => addMainBlock('INTERVAL')} />
          <AddBlockButton label="Easy / recovery" onClick={() => addMainBlock('RECOVERY')} />
          <AddBlockButton label="Rest" onClick={() => addMainBlock('REST')} />
        </div>
      </div>

      <DistanceSection
        label="Cool-down"
        distance={cooldown.distance ?? DEFAULT_WU_CD_KM}
        onChange={(distance) => updateCooldown({ distance, durationType: 'distance', distanceUnit: 'km' })}
      />
    </div>
  )
}

function AddBlockButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button type="button" variant="ghost" size="sm" onClick={onClick} className="gap-1">
      <Plus className="h-3.5 w-3.5" />
      {label}
    </Button>
  )
}

function DistanceSection({
  label,
  distance,
  onChange,
}: {
  label: string
  distance: number
  onChange: (distance: number) => void
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/30 px-3 py-3">
      <label className="block text-sm">
        <span className="font-medium">{label}</span>
        <div className="mt-2 flex max-w-[12rem] items-center gap-2">
          <input
            type="number"
            min={0}
            step={0.1}
            inputMode="decimal"
            value={distance}
            onChange={(e) => onChange(Number(e.target.value))}
            className="input-field min-w-0 flex-1 text-center"
          />
          <span className="shrink-0 text-sm text-muted-foreground">km</span>
        </div>
      </label>
    </div>
  )
}

function MainBlockEditor({
  block,
  onChange,
  onRemove,
}: {
  block: WorkoutBlock
  onChange: (block: WorkoutBlock) => void
  onRemove: () => void
}) {
  const update = (patch: Partial<WorkoutBlock>) => onChange({ ...block, ...patch })

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <GripVertical className="hidden h-3.5 w-3.5 shrink-0 cursor-grab sm:block" />
          {BLOCK_TYPE_LABELS[block.type]}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          aria-label="Remove block"
          className="shrink-0"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {block.type === 'INTERVAL' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Repeats">
            <input
              type="number"
              min={1}
              inputMode="numeric"
              value={block.repetitions ?? 1}
              onChange={(e) => update({ repetitions: Number(e.target.value) })}
              className="input-field max-w-[8rem]"
            />
          </Field>
          <Field label="Work">
            <SegmentRow
              segment={block.work ?? { mode: 'distance', value: 1000, unit: 'm' }}
              onChange={(work) => update({ work })}
            />
          </Field>
          <Field label="Pace / intensity">
            <input
              value={block.targets?.[0]?.value ?? ''}
              onChange={(e) =>
                update({ targets: [{ type: 'pace', value: e.target.value }] })
              }
              placeholder="3:45/km"
              className="input-field"
            />
          </Field>
          <Field label="HR">
            <input
              value={block.targets?.find((t) => t.type === 'heartRate')?.value ?? ''}
              onChange={(e) => {
                const pace = block.targets?.find((t) => t.type === 'pace')
                const targets: Target[] = []
                if (pace) targets.push(pace)
                if (e.target.value) targets.push({ type: 'heartRate', value: e.target.value })
                update({ targets })
              }}
              placeholder="165-175 bpm"
              className="input-field"
            />
          </Field>
          <Field label="Rest" className="sm:col-span-2">
            <SegmentRow
              segment={block.recovery ?? { mode: 'time', value: 2, unit: 'min' }}
              onChange={(recovery) => update({ recovery })}
            />
          </Field>
        </div>
      )}

      {(block.type === 'RECOVERY' || block.type === 'REST') && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Duration (min)">
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={block.time ?? 0}
              onChange={(e) => update({ durationType: 'time', time: Number(e.target.value) })}
              className="input-field"
            />
          </Field>
          <Field label="Note">
            <input
              value={block.targets?.[0]?.value ?? (block.type === 'RECOVERY' ? 'Easy jog' : '')}
              onChange={(e) => update({ targets: [{ type: 'rpe', value: e.target.value }] })}
              placeholder={block.type === 'RECOVERY' ? 'Easy jog' : 'Rest'}
              className="input-field"
            />
          </Field>
        </div>
      )}

      {block.type === 'CONTINUOUS' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Distance (km)">
            <input
              type="number"
              min={0}
              step={0.1}
              inputMode="decimal"
              value={block.distance ?? ''}
              onChange={(e) =>
                update({ durationType: 'distance', distance: Number(e.target.value), distanceUnit: 'km' })
              }
              className="input-field"
            />
          </Field>
          <Field label="Intensity">
            <input
              value={block.targets?.[0]?.value ?? ''}
              onChange={(e) => update({ targets: [{ type: 'pace', value: e.target.value }] })}
              className="input-field"
            />
          </Field>
        </div>
      )}

      {block.type === 'FREE_TEXT' && (
        <textarea
          value={block.text ?? ''}
          onChange={(e) => update({ text: e.target.value })}
          rows={3}
          className="input-field min-h-[5.5rem]"
          placeholder="Describe the effort..."
        />
      )}
    </div>
  )
}

function Field({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={cn('block min-w-0 text-sm', className)}>
      <span className="text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}

function SegmentRow({
  segment,
  onChange,
}: {
  segment: NonNullable<WorkoutBlock['work']>
  onChange: (segment: NonNullable<WorkoutBlock['work']>) => void
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_5.5rem] gap-2">
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
        <option value="m">m</option>
        <option value="km">km</option>
        <option value="min">min</option>
        <option value="sec">sec</option>
      </select>
    </div>
  )
}
