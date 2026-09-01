'use client'

import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
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
import { SELECT_DROPDOWN_CONTENT_CLASS } from '@/components/ui/select-dropdown'
import { cn } from '@/lib/utils'

type WorkoutDetailsBlockPickerProps = {
  onSelect: (kind: SmartBlockKind) => void
  sportType: WorkoutType
  builderPrefs?: WorkoutBuilderPrefs | null
  className?: string
  onDragAddStart?: (kind: SmartBlockKind) => void
  onDragAddEnd?: () => void
}

const addButtonBaseClass =
  'inline-flex shrink-0 cursor-grab items-center justify-center gap-1 rounded-[5px] border border-dashed px-2 py-1.5 text-[11px] font-medium leading-tight transition active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-border'

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

export function WorkoutDetailsBlockPicker({
  onSelect,
  sportType,
  builderPrefs,
  className,
  onDragAddStart,
  onDragAddEnd,
}: WorkoutDetailsBlockPickerProps) {
  const { quick, custom } = quickAddOptions(sportType, builderPrefs)

  return (
    <div className={cn('flex flex-wrap gap-2 pt-2', className)}>
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
            <Plus className={cn('h-3 w-3 shrink-0', chip.icon)} />
            <span>{option.label}</span>
          </button>
        )
      })}

      {custom.length > 0 ? (
        <DropdownMenu.Root>
          <DropdownMenu.Trigger
            type="button"
            className={cn(
              addButtonBaseClass,
              'border-border/80 bg-muted/30 text-muted-foreground hover:border-border hover:bg-muted/60 hover:text-foreground',
              'data-[state=open]:border-border data-[state=open]:bg-muted/70 data-[state=open]:text-foreground',
            )}
          >
            <Plus className="h-3 w-3 shrink-0 opacity-70" />
            <span>Custom</span>
            <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
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
              {custom.map((option) => (
                <DropdownMenu.Item
                  key={option.kind}
                  onSelect={() => onSelect(option.kind)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition data-[highlighted]:bg-foreground/[0.04]"
                >
                  <span>{option.label}</span>
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      ) : null}
    </div>
  )
}
