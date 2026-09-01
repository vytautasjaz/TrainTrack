'use client'

import { useState } from 'react'
import { ChevronDown, Plus } from 'lucide-react'
import type { WorkoutType } from '@prisma/client'
import {
  QUICK_ADD_BLOCK_OPTIONS,
  intensityForAddBlockKind,
  labelForAddBlockOption,
  type SmartBlockKind,
  type SmartBlockOption,
} from '@/lib/workout-builder/smart-blocks'
import { intensityChipStyles } from '@/lib/workout-builder/intensity-colors'
import {
  resolvePresetMenuOptions,
  type WorkoutBuilderPrefs,
} from '@/lib/workout-builder/workout-builder-prefs'
import {
  DragInsertIndicator,
  encodeAddBlockDragData,
  WORKOUT_ADD_BLOCK_MIME,
} from '@/components/ui/drag-insert-indicator'
import { cn } from '@/lib/utils'

type SmartBlockPickerProps = {
  onSelect: (kind: SmartBlockKind) => void
  sportType?: WorkoutType
  builderPrefs?: WorkoutBuilderPrefs | null
  className?: string
  onDragAddStart?: (kind: SmartBlockKind) => void
  onDragAddEnd?: () => void
}

const addButtonBaseClass =
  'inline-flex shrink-0 cursor-grab items-center gap-1 rounded-[5px] border border-dashed px-1.5 py-1 text-[11px] font-medium leading-tight transition active:cursor-grabbing'

function quickAddOptions(
  sportType: WorkoutType,
  builderPrefs?: WorkoutBuilderPrefs | null,
): { quick: SmartBlockOption[]; custom: SmartBlockOption[] } {
  const presets = resolvePresetMenuOptions(sportType, builderPrefs)
  const byKind = new Map(presets.map((option) => [option.kind, option]))

  const quick = QUICK_ADD_BLOCK_OPTIONS.map((option) => {
    const fromPrefs = byKind.get(option.kind)
    if (fromPrefs) return fromPrefs
    return {
      ...option,
      label: labelForAddBlockOption(option, sportType),
    }
  })

  const custom = presets.filter(
    (option) => option.kind !== 'WARM_UP' && option.kind !== 'COOL_DOWN',
  )

  return { quick, custom }
}

export function SmartBlockPicker({
  onSelect,
  sportType = 'RUN',
  builderPrefs,
  className,
  onDragAddStart,
  onDragAddEnd,
}: SmartBlockPickerProps) {
  const [customOpen, setCustomOpen] = useState(false)
  const { quick, custom } = quickAddOptions(sportType, builderPrefs)

  return (
    <div className={cn('flex flex-wrap items-center gap-x-2 gap-y-1', className)}>
      {quick.map((option) => {
        const chip = intensityChipStyles(intensityForAddBlockKind(option.kind))
        return (
          <button
            key={option.kind}
            type="button"
            draggable
            onClick={() => onSelect(option.kind)}
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = 'copyMove'
              e.dataTransfer.setData(WORKOUT_ADD_BLOCK_MIME, option.kind)
              e.dataTransfer.setData(
                'text/plain',
                encodeAddBlockDragData(option.kind),
              )
              onDragAddStart?.(option.kind)
            }}
            onDragEnd={() => onDragAddEnd?.()}
            className={cn(addButtonBaseClass, chip.button)}
          >
            <Plus className={cn('h-3 w-3', chip.icon)} />
            {option.label}
          </button>
        )
      })}

      {custom.length > 0 ? (
        <div className="relative">
          <button
            type="button"
            onClick={() => setCustomOpen((v) => !v)}
            className={cn(
              addButtonBaseClass,
              'border-border/70 text-foreground hover:border-brand/50 hover:text-brand',
            )}
          >
            <Plus className="h-3 w-3" />
            Custom
            <ChevronDown className="h-2.5 w-2.5 opacity-60" />
          </button>

          {customOpen ? (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setCustomOpen(false)}
                aria-hidden
              />
              <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border border-border/80 bg-card py-1 shadow-lg">
                {custom.map((option) => (
                  <button
                    key={option.kind}
                    type="button"
                    onClick={() => {
                      onSelect(option.kind)
                      setCustomOpen(false)
                    }}
                    className="flex w-full items-center px-3 py-2 text-left text-sm transition hover:bg-foreground/[0.04]"
                  >
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
