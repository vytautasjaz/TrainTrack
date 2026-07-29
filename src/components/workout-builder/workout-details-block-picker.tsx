'use client'

import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ChevronDown, Plus } from 'lucide-react'
import type { WorkoutType } from '@prisma/client'
import { CORE_BLOCK_OPTIONS, type SmartBlockKind } from '@/lib/workout-builder/smart-blocks'
import {
  resolvePresetMenuOptions,
  type WorkoutBuilderPrefs,
} from '@/lib/workout-builder/workout-builder-prefs'
import { SELECT_DROPDOWN_CONTENT_CLASS } from '@/components/ui/select-dropdown'
import { cn } from '@/lib/utils'

type WorkoutDetailsBlockPickerProps = {
  onSelect: (kind: SmartBlockKind) => void
  sportType: WorkoutType
  builderPrefs?: WorkoutBuilderPrefs | null
  className?: string
}

const addButtonClass =
  'flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[6px] border border-dashed border-border/80 bg-card px-2.5 py-2 text-sm font-medium text-[#166534] transition hover:border-[#86D39A]/50 hover:bg-[#F3FAF5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#86D39A]/50'

export function WorkoutDetailsBlockPicker({
  onSelect,
  sportType,
  builderPrefs,
  className,
}: WorkoutDetailsBlockPickerProps) {
  const presets = resolvePresetMenuOptions(sportType, builderPrefs)

  return (
    <div className={cn('flex flex-wrap gap-2 pt-2', className)}>
      {CORE_BLOCK_OPTIONS.map((option) => (
        <button
          key={option.kind}
          type="button"
          onClick={() => onSelect(option.kind)}
          className={addButtonClass}
        >
          <Plus className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{option.label}</span>
        </button>
      ))}

      {presets.length > 0 ? (
        <DropdownMenu.Root>
          <DropdownMenu.Trigger
            type="button"
            className={cn(
              addButtonClass,
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
              {presets.map((option) => (
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
