'use client'

import { useState } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ChevronDown, Copy, GripVertical, Plus, Trash2 } from 'lucide-react'
import { NumberInput } from '@/components/ui/number-input'
import { WorkoutStructureChart } from '@/components/workout-builder/workout-structure-chart'
import { SELECT_DROPDOWN_CONTENT_CLASS } from '@/components/ui/select-dropdown'
import type { Segment, SegmentUnit, WorkoutIncludeItem } from '@/lib/workout-builder/types'
import {
  INCLUDE_PLACEMENTS,
  INCLUDE_PLACEMENT_LABELS,
  INCLUDE_PLACEMENT_SHORT_LABELS,
  normalizeIncludePlacement,
} from '@/lib/workout-builder/include-placement'
import { updateSegmentUnit, updateSegmentValue } from '@/lib/workout-builder/target-helpers'
import { cn } from '@/lib/utils'

type IncludeItemsEditorProps = {
  items: WorkoutIncludeItem[]
  onChange: (items: WorkoutIncludeItem[]) => void
  durationMinutes?: number
}

const GHOST_INPUT =
  'min-w-0 bg-transparent text-[13px] font-semibold tabular-nums text-[#111827] outline-none placeholder:font-normal placeholder:text-muted-foreground/40'

const GHOST_SELECT =
  'shrink-0 appearance-none bg-transparent text-[11px] font-medium normal-case tracking-normal text-muted-foreground outline-none'

const ADD_BUTTON_CLASS =
  'flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[6px] border border-dashed border-border/80 bg-card px-2.5 py-2 text-sm font-medium text-[#166534] transition hover:border-[#86D39A]/50 hover:bg-[#F3FAF5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#86D39A]/50'

const INCLUDE_UNITS: SegmentUnit[] = ['sec', 'min', 'm', 'km']

const INCLUDE_KIND_LABELS: Record<WorkoutIncludeItem['kind'], string> = {
  strides: 'Strides',
  drill: 'Drill',
  hill_sprint: 'Hill sprint',
  pickup: 'Pickup',
  custom: 'Custom',
}

const INCLUDE_PRESETS: Array<{
  label: string
  kind: WorkoutIncludeItem['kind']
  title: string
  repetitions: number
  workValue: number
  workUnit: SegmentUnit
  recoveryValue?: number
  recoveryUnit?: SegmentUnit
  notes?: string
}> = [
  {
    label: 'Strides',
    kind: 'strides',
    title: 'Strides',
    repetitions: 5,
    workValue: 30,
    workUnit: 'sec',
    recoveryValue: 60,
    recoveryUnit: 'sec',
  },
  {
    label: 'Drills',
    kind: 'drill',
    title: 'Running drills',
    repetitions: 4,
    workValue: 60,
    workUnit: 'sec',
    recoveryValue: 60,
    recoveryUnit: 'sec',
  },
  {
    label: 'Hill sprints',
    kind: 'hill_sprint',
    title: 'Hill sprints',
    repetitions: 6,
    workValue: 20,
    workUnit: 'sec',
    recoveryValue: 90,
    recoveryUnit: 'sec',
  },
]

const CUSTOM_PRESETS: Array<(typeof INCLUDE_PRESETS)[number]> = [
  {
    label: 'Pickups',
    kind: 'pickup',
    title: 'Pickups',
    repetitions: 4,
    workValue: 45,
    workUnit: 'sec',
    recoveryValue: 75,
    recoveryUnit: 'sec',
  },
]

function defaultIncludeItem(): WorkoutIncludeItem {
  return {
    id: crypto.randomUUID(),
    title: 'Custom include',
    kind: 'custom',
    repetitions: 1,
    work: { mode: 'time', value: 1, unit: 'min' },
    placementHint: 'anywhere',
  }
}

function presetToItem(
  preset: (typeof INCLUDE_PRESETS)[number],
): WorkoutIncludeItem {
  return {
    id: crypto.randomUUID(),
    title: preset.title,
    kind: preset.kind,
    repetitions: preset.repetitions,
    work: { mode: 'time', value: preset.workValue, unit: preset.workUnit },
    recovery:
      preset.recoveryValue && preset.recoveryUnit
        ? {
            mode: 'time',
            value: preset.recoveryValue,
            unit: preset.recoveryUnit,
          }
        : undefined,
    notes: preset.notes,
    placementHint: 'anywhere',
  }
}

function IncludeDurationInline({
  segment,
  onChange,
  ariaLabel,
}: {
  segment: Segment
  onChange: (segment: Segment) => void
  ariaLabel: string
}) {
  return (
    <div className="flex shrink-0 items-baseline gap-0.5 tabular-nums">
      <input
        type="number"
        min={0}
        step="any"
        value={segment.value || ''}
        onChange={(e) =>
          onChange(updateSegmentValue(segment, parseFloat(e.target.value) || 0))
        }
        placeholder="0"
        aria-label={ariaLabel}
        className={cn(GHOST_INPUT, 'w-12 text-center')}
      />
      <select
        value={segment.unit}
        onChange={(e) =>
          onChange(updateSegmentUnit(segment, e.target.value as SegmentUnit))
        }
        aria-label={`${ariaLabel} unit`}
        className={GHOST_SELECT}
      >
        {INCLUDE_UNITS.map((unit) => (
          <option key={unit} value={unit}>
            {unit}
          </option>
        ))}
      </select>
    </div>
  )
}

export function IncludeItemsEditor({
  items,
  onChange,
  durationMinutes,
}: IncludeItemsEditorProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  function updateItem(id: string, patch: Partial<WorkoutIncludeItem>) {
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  function removeItem(id: string) {
    onChange(items.filter((item) => item.id !== id))
    if (expandedId === id) setExpandedId(null)
  }

  function duplicateItem(index: number) {
    const source = items[index]
    if (!source) return
    const copy: WorkoutIncludeItem = { ...source, id: crypto.randomUUID() }
    onChange([...items.slice(0, index + 1), copy, ...items.slice(index + 1)])
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) return
    const next = [...items]
    const [moved] = next.splice(dragIndex, 1)
    if (!moved) return
    next.splice(targetIndex, 0, moved)
    onChange(next)
    setDragIndex(null)
  }

  return (
    <div className="min-w-0 space-y-1.5">
      {items.length > 0 ? (
        <div className="pb-1.5">
          <WorkoutStructureChart
            structure={{
              warmup: [],
              mainSet: [],
              cooldown: [],
              includeItems: items,
            }}
            durationMinutes={durationMinutes}
            size="md"
            showCaption
          />
        </div>
      ) : (
        <p className="py-1 text-sm text-muted-foreground">
          No include items yet — add strides, drills, or a custom insert below.
        </p>
      )}

      {items.map((item, index) => {
        const expanded = expandedId === item.id
        const placement = normalizeIncludePlacement(item.placementHint)
        const recovery = item.recovery ?? {
          mode: 'time' as const,
          value: 0,
          unit: 'sec' as const,
        }

        return (
          <div
            key={item.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(index)}
            className={cn(
              'group/block overflow-hidden rounded-[6px] border bg-card transition-colors',
              expanded ? 'border-[#86D39A]/60 shadow-sm' : 'border-border/60',
              dragIndex === index && 'opacity-50',
            )}
          >
            <div className="flex items-stretch">
              <div className="group/handle flex w-8 shrink-0 border-r border-border/40 bg-amber-500/14 sm:w-9">
                <div className="w-1 shrink-0 bg-amber-500" aria-hidden />
                <span
                  draggable
                  onDragStart={(e) => {
                    e.stopPropagation()
                    setDragIndex(index)
                  }}
                  onDragEnd={() => setDragIndex(null)}
                  onClick={(e) => e.stopPropagation()}
                  className="flex min-w-0 flex-1 cursor-grab touch-none items-center justify-center text-amber-700/45 active:cursor-grabbing group-hover/handle:text-amber-700/70"
                  aria-label="Drag to reorder"
                >
                  <GripVertical className="h-3.5 w-3.5" />
                </span>
              </div>

              <div className="min-w-0 flex-1 px-2 py-1.5 sm:px-2.5 sm:py-2">
                <div className="flex min-w-0 flex-nowrap items-center gap-2">
                  <input
                    value={item.title}
                    onChange={(e) => updateItem(item.id, { title: e.target.value })}
                    onFocus={(e) => e.target.select()}
                    aria-label="Include title"
                    placeholder="Include title"
                    className="w-[5.5rem] shrink-0 truncate bg-transparent text-sm font-semibold text-[#111827] outline-none placeholder:text-muted-foreground/50 hover:bg-muted/20 focus:bg-white focus:ring-1 focus:ring-sky-400/40 sm:w-[6.5rem]"
                  />
                  <div
                    className="grid w-full max-w-full flex-1 grid-cols-[3.25rem_4.75rem_minmax(6.75rem,1fr)] items-center gap-x-2 gap-y-0.5 sm:gap-x-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-baseline gap-0.5 tabular-nums">
                      <NumberInput
                        value={item.repetitions}
                        onChange={(repetitions) => updateItem(item.id, { repetitions })}
                        min={1}
                        integer
                        inputMode="numeric"
                        aria-label="Repeats"
                        className={cn(GHOST_INPUT, 'w-6 text-center')}
                      />
                      <span className="text-[11px] text-muted-foreground">×</span>
                    </div>
                    <IncludeDurationInline
                      segment={item.work}
                      onChange={(work) => updateItem(item.id, { work })}
                      ariaLabel="Work duration"
                    />
                    <div className="relative col-start-3 row-span-2 flex h-6 min-w-[6.25rem] items-center justify-center self-center justify-self-center rounded-[5px] border border-border/70 bg-muted/20 px-4">
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-0 flex items-center justify-center truncate px-4 text-center text-[11px] font-medium leading-none text-foreground/80"
                      >
                        {INCLUDE_PLACEMENT_SHORT_LABELS[placement]}
                      </span>
                      <ChevronDown
                        aria-hidden
                        className="pointer-events-none absolute right-1.5 h-3.5 w-3.5 text-muted-foreground/70"
                      />
                      <select
                        value={placement}
                        onChange={(e) =>
                          updateItem(item.id, {
                            placementHint: normalizeIncludePlacement(e.target.value),
                          })
                        }
                        aria-label="Placement"
                        className={cn(
                          GHOST_SELECT,
                          'absolute inset-0 h-full w-full cursor-pointer rounded-[5px] p-0 opacity-0',
                        )}
                      >
                        {INCLUDE_PLACEMENTS.map((option) => (
                          <option key={option} value={option}>
                            {INCLUDE_PLACEMENT_LABELS[option]}
                          </option>
                        ))}
                      </select>
                    </div>

                    <span className="pl-1.5 text-[11px] font-medium text-muted-foreground/70">
                      Rest
                    </span>
                    <IncludeDurationInline
                      segment={recovery}
                      onChange={(next) =>
                        updateItem(item.id, {
                          recovery: next.value > 0 ? next : undefined,
                        })
                      }
                      ariaLabel="Recovery duration"
                    />
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-0 border-l border-border/50 px-0.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    duplicateItem(index)
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-[4px] text-muted-foreground/50 transition hover:bg-muted/40 hover:text-muted-foreground"
                  aria-label="Duplicate include"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeItem(item.id)
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-[4px] text-muted-foreground/50 transition hover:bg-red-500/10 hover:text-red-600"
                  aria-label="Delete include"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setExpandedId((prev) => (prev === item.id ? null : item.id))
                  }
                  className="flex h-7 w-7 items-center justify-center rounded-[4px] text-muted-foreground/50 transition hover:bg-muted/40"
                  aria-label={expanded ? 'Collapse include' : 'Expand include'}
                >
                  <ChevronDown
                    className={cn('h-3.5 w-3.5 transition', expanded && 'rotate-180')}
                  />
                </button>
              </div>
            </div>

            {expanded ? (
              <div className="border-t border-border/40 px-3 pb-3 pt-2 sm:px-4">
                <div className="mb-3">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Kind
                  </p>
                  <select
                    value={item.kind}
                    onChange={(e) =>
                      updateItem(item.id, {
                        kind: e.target.value as WorkoutIncludeItem['kind'],
                      })
                    }
                    className="rounded-[4px] border border-border/50 bg-white/70 px-2 py-1.5 text-[12px] text-[#111827] outline-none focus:border-sky-400/50"
                  >
                    {(Object.keys(INCLUDE_KIND_LABELS) as Array<WorkoutIncludeItem['kind']>).map(
                      (kind) => (
                        <option key={kind} value={kind}>
                          {INCLUDE_KIND_LABELS[kind]}
                        </option>
                      ),
                    )}
                  </select>
                </div>
                <IncludeNotesField
                  value={item.notes ?? ''}
                  onChange={(notes) => updateItem(item.id, { notes })}
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
        )
      })}

      <div className="flex flex-wrap gap-2 pt-2">
        {INCLUDE_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => onChange([...items, presetToItem(preset)])}
            className={ADD_BUTTON_CLASS}
          >
            <Plus className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{preset.label}</span>
          </button>
        ))}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger
            type="button"
            className={cn(
              ADD_BUTTON_CLASS,
              'data-[state=open]:border-[#86D39A]/50 data-[state=open]:bg-[#F3FAF5]',
            )}
          >
            <Plus className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Custom</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="start"
              side="top"
              sideOffset={6}
              collisionPadding={12}
              className={cn(
                SELECT_DROPDOWN_CONTENT_CLASS,
                'z-[250] max-h-[min(20rem,50vh)] w-56',
              )}
            >
              {CUSTOM_PRESETS.map((preset) => (
                <DropdownMenu.Item
                  key={preset.label}
                  onSelect={() => onChange([...items, presetToItem(preset)])}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition data-[highlighted]:bg-foreground/[0.04]"
                >
                  <span>{preset.label}</span>
                </DropdownMenu.Item>
              ))}
              <DropdownMenu.Item
                onSelect={() => onChange([...items, defaultIncludeItem()])}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition data-[highlighted]:bg-foreground/[0.04]"
              >
                <span>Custom include</span>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </div>
  )
}

function IncludeNotesField({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(Boolean(value.trim()))

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-[#166534] transition hover:text-[#166534]/80"
      >
        + Add notes
      </button>
    )
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Notes
        </p>
        {!value.trim() ? (
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-[11px] text-muted-foreground transition hover:text-foreground"
          >
            Hide
          </button>
        ) : null}
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Optional include notes"
        aria-label="Include notes"
        autoFocus={!value.trim()}
        className="w-full rounded-[4px] border border-border/50 bg-white/70 px-2 py-1.5 text-[12px] text-[#111827] outline-none placeholder:text-muted-foreground/45 focus:border-sky-400/50"
      />
    </div>
  )
}
