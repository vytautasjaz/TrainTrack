'use client'

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
  encodeAddBlockDragData,
  WORKOUT_ADD_BLOCK_MIME,
} from '@/components/ui/drag-insert-indicator'
import {
  FixedPortalMenu,
  FixedPortalMenuItem,
} from '@/components/ui/fixed-portal-menu'
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
        <FixedPortalMenu
          side="top"
          sideOffset={6}
          menuClassName="max-h-[min(20rem,50vh)] w-56"
          trigger={({ open, props }) => (
            <button
              {...props}
              className={cn(
                addButtonBaseClass,
                'border-border/80 bg-muted/30 text-muted-foreground hover:border-border hover:bg-muted/60 hover:text-foreground',
                open && 'border-border bg-muted/70 text-foreground',
              )}
            >
              <Plus className="h-3 w-3 shrink-0 opacity-70" />
              <span>Custom</span>
              <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
            </button>
          )}
        >
          {(close) =>
            custom.map((option) => (
              <FixedPortalMenuItem
                key={option.kind}
                onSelect={() => {
                  onSelect(option.kind)
                  close()
                }}
              >
                {option.label}
              </FixedPortalMenuItem>
            ))
          }
        </FixedPortalMenu>
      ) : null}
    </div>
  )
}
