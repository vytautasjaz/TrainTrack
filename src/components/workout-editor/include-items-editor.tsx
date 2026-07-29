'use client'

import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { WorkoutIncludeItem } from '@/lib/workout-builder/types'
import { cn } from '@/lib/utils'

type IncludeItemsEditorProps = {
  items: WorkoutIncludeItem[]
  onChange: (items: WorkoutIncludeItem[]) => void
}

const INCLUDE_PRESETS: Array<{
  label: string
  kind: WorkoutIncludeItem['kind']
  title: string
  repetitions: number
  workValue: number
  workUnit: WorkoutIncludeItem['work']['unit']
  recoveryValue?: number
  recoveryUnit?: WorkoutIncludeItem['work']['unit']
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
    notes: 'Place anywhere in the run.',
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

function presetToItem(preset: (typeof INCLUDE_PRESETS)[number]): WorkoutIncludeItem {
  return {
    id: crypto.randomUUID(),
    title: preset.title,
    kind: preset.kind,
    repetitions: preset.repetitions,
    work: { mode: 'time', value: preset.workValue, unit: preset.workUnit },
    recovery:
      preset.recoveryValue && preset.recoveryUnit
        ? { mode: 'time', value: preset.recoveryValue, unit: preset.recoveryUnit }
        : undefined,
    notes: preset.notes,
    placementHint: 'anywhere',
  }
}

export function IncludeItemsEditor({ items, onChange }: IncludeItemsEditorProps) {
  function updateItem(id: string, patch: Partial<WorkoutIncludeItem>) {
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  function removeItem(id: string) {
    onChange(items.filter((item) => item.id !== id))
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {INCLUDE_PRESETS.map((preset) => (
          <Button
            key={preset.label}
            type="button"
            size="xs"
            variant="outline"
            onClick={() => onChange([...items, presetToItem(preset)])}
          >
            + {preset.label}
          </Button>
        ))}
        <Button type="button" size="xs" variant="outline" onClick={() => onChange([...items, defaultIncludeItem()])}>
          <Plus className="h-3.5 w-3.5" />
          Custom
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-[6px] border border-dashed border-border/80 px-3 py-2 text-xs text-muted-foreground">
          No include items yet. Add optional inserts like strides, drills, or pickups.
        </div>
      ) : null}

      {items.map((item) => (
        <div key={item.id} className="rounded-[6px] border border-border/80 bg-card p-3">
          <div className="mb-2 flex items-start justify-between gap-2">
            <input
              value={item.title}
              onChange={(e) => updateItem(item.id, { title: e.target.value })}
              placeholder="Include title"
              className="w-full min-w-0 bg-transparent text-sm font-semibold outline-none"
            />
            <Button type="button" size="icon" variant="ghost" onClick={() => removeItem(item.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <label className="text-xs text-muted-foreground">
              Reps
              <input
                type="number"
                min={1}
                value={item.repetitions}
                onChange={(e) =>
                  updateItem(item.id, { repetitions: Math.max(1, Number.parseInt(e.target.value || '1', 10)) })
                }
                className="mt-1 w-full rounded-[6px] border border-border bg-background px-2 py-1 text-sm"
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Work
              <input
                type="number"
                min={0}
                value={item.work.value}
                onChange={(e) =>
                  updateItem(item.id, {
                    work: { ...item.work, value: Math.max(0, Number.parseFloat(e.target.value || '0')) },
                  })
                }
                className="mt-1 w-full rounded-[6px] border border-border bg-background px-2 py-1 text-sm"
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Work unit
              <select
                value={item.work.unit}
                onChange={(e) =>
                  updateItem(item.id, {
                    work: {
                      ...item.work,
                      unit: e.target.value as WorkoutIncludeItem['work']['unit'],
                    },
                  })
                }
                className="mt-1 w-full rounded-[6px] border border-border bg-background px-2 py-1 text-sm"
              >
                <option value="sec">sec</option>
                <option value="min">min</option>
                <option value="m">m</option>
                <option value="km">km</option>
              </select>
            </label>
            <label className="text-xs text-muted-foreground">
              Placement
              <select
                value={item.placementHint ?? 'anywhere'}
                onChange={(e) =>
                  updateItem(item.id, {
                    placementHint: e.target.value as WorkoutIncludeItem['placementHint'],
                  })
                }
                className="mt-1 w-full rounded-[6px] border border-border bg-background px-2 py-1 text-sm"
              >
                <option value="anywhere">Anywhere</option>
                <option value="before_main">Before main set</option>
                <option value="inside_main">Inside main set</option>
                <option value="after_main">After main set</option>
              </select>
            </label>
          </div>

          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <label className="text-xs text-muted-foreground">
              Recovery (optional)
              <input
                type="number"
                min={0}
                value={item.recovery?.value ?? 0}
                onChange={(e) => {
                  const value = Math.max(0, Number.parseFloat(e.target.value || '0'))
                  if (value <= 0) {
                    updateItem(item.id, { recovery: undefined })
                    return
                  }
                  updateItem(item.id, {
                    recovery: {
                      mode: item.work.mode,
                      value,
                      unit: item.recovery?.unit ?? 'sec',
                    },
                  })
                }}
                className="mt-1 w-full rounded-[6px] border border-border bg-background px-2 py-1 text-sm"
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Recovery unit
              <select
                value={item.recovery?.unit ?? 'sec'}
                onChange={(e) =>
                  updateItem(item.id, {
                    recovery: item.recovery
                      ? { ...item.recovery, unit: e.target.value as WorkoutIncludeItem['work']['unit'] }
                      : { mode: 'time', value: 30, unit: e.target.value as WorkoutIncludeItem['work']['unit'] },
                  })
                }
                className={cn(
                  'mt-1 w-full rounded-[6px] border border-border bg-background px-2 py-1 text-sm',
                  !item.recovery && 'opacity-60',
                )}
              >
                <option value="sec">sec</option>
                <option value="min">min</option>
                <option value="m">m</option>
                <option value="km">km</option>
              </select>
            </label>
            <label className="text-xs text-muted-foreground">
              Kind
              <select
                value={item.kind}
                onChange={(e) => updateItem(item.id, { kind: e.target.value as WorkoutIncludeItem['kind'] })}
                className="mt-1 w-full rounded-[6px] border border-border bg-background px-2 py-1 text-sm"
              >
                <option value="custom">Custom</option>
                <option value="strides">Strides</option>
                <option value="drill">Drill</option>
                <option value="hill_sprint">Hill sprint</option>
                <option value="pickup">Pickup</option>
              </select>
            </label>
          </div>

          <textarea
            value={item.notes ?? ''}
            onChange={(e) => updateItem(item.id, { notes: e.target.value })}
            placeholder="Notes (optional)"
            rows={2}
            className="mt-2 w-full rounded-[6px] border border-border bg-background px-2 py-1.5 text-sm"
          />
        </div>
      ))}
    </div>
  )
}
