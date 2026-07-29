'use client'

import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ChevronDown } from 'lucide-react'
import { SELECT_DROPDOWN_CONTENT_CLASS } from '@/components/ui/select-dropdown'
import { RUNNING_PRESETS } from '@/lib/calculators/race-distances'
import { INTERVAL_PRESETS } from '@/lib/calculators/interval-distances'
import { cn } from '@/lib/utils'

export type DistancePresetOption = {
  id: string
  label: string
  value: number
}

type DistancePresetSelectProps = {
  options: DistancePresetOption[]
  value: number | null
  onSelect: (value: number) => void
  'aria-label'?: string
}

function isActivePreset(current: number | null, presetValue: number): boolean {
  return current != null && Math.abs(current - presetValue) < 0.001
}

/** Minimal chevron that opens a list of distance presets. */
export function DistancePresetSelect({
  options,
  value,
  onSelect,
  'aria-label': ariaLabel = 'Choose distance',
}: DistancePresetSelectProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={ariaLabel}
        className="inline-flex items-center justify-center rounded-sm text-muted-foreground transition hover:text-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-brand/30 data-[state=open]:text-foreground"
      >
        <ChevronDown className="h-3 w-3" strokeWidth={2.5} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="center"
          sideOffset={4}
          className={cn(SELECT_DROPDOWN_CONTENT_CLASS, 'min-w-[10rem]')}
        >
          {options.map((preset) => {
            const active = isActivePreset(value, preset.value)
            return (
              <DropdownMenu.Item
                key={preset.id}
                onSelect={() => onSelect(preset.value)}
                className={cn(
                  'relative flex cursor-pointer select-none items-center px-3 py-2 text-sm outline-none',
                  'data-[highlighted]:bg-foreground/[0.04]',
                  active && 'font-semibold text-foreground',
                )}
              >
                {preset.label}
              </DropdownMenu.Item>
            )
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

export const RUNNING_DISTANCE_PRESET_OPTIONS: DistancePresetOption[] = RUNNING_PRESETS.map(
  (preset) => ({
    id: preset.id,
    label: preset.label,
    value: preset.distanceKm,
  }),
)

export const INTERVAL_DISTANCE_PRESET_OPTIONS: DistancePresetOption[] = INTERVAL_PRESETS.map(
  (preset) => ({
    id: preset.id,
    label: preset.label,
    value: preset.distanceM,
  }),
)

type LabelPresetSelectProps = {
  options: Array<{ id: string; label: string }>
  activeId: string | null
  onSelect: (id: string) => void
  'aria-label'?: string
}

/** Minimal chevron menu for named presets (e.g. triathlon races). */
export function LabelPresetSelect({
  options,
  activeId,
  onSelect,
  'aria-label': ariaLabel = 'Choose preset',
}: LabelPresetSelectProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={ariaLabel}
        className="inline-flex items-center justify-center rounded-sm text-muted-foreground transition hover:text-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-brand/30 data-[state=open]:text-foreground"
      >
        <ChevronDown className="h-3 w-3" strokeWidth={2.5} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="center"
          sideOffset={4}
          className={cn(SELECT_DROPDOWN_CONTENT_CLASS, 'min-w-[10rem]')}
        >
          {options.map((preset) => {
            const active = activeId === preset.id
            return (
              <DropdownMenu.Item
                key={preset.id}
                onSelect={() => onSelect(preset.id)}
                className={cn(
                  'relative flex cursor-pointer select-none items-center px-3 py-2 text-sm outline-none',
                  'data-[highlighted]:bg-foreground/[0.04]',
                  active && 'font-semibold text-foreground',
                )}
              >
                {preset.label}
              </DropdownMenu.Item>
            )
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
