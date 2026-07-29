'use client'

import { useState } from 'react'
import { ChevronDown, Plus } from 'lucide-react'
import type { WorkoutType } from '@prisma/client'
import { CORE_BLOCK_OPTIONS, type SmartBlockKind } from '@/lib/workout-builder/smart-blocks'
import {
  resolvePresetMenuOptions,
  type WorkoutBuilderPrefs,
} from '@/lib/workout-builder/workout-builder-prefs'
import { cn } from '@/lib/utils'

type SmartBlockPickerProps = {
  onSelect: (kind: SmartBlockKind) => void
  sportType?: WorkoutType
  builderPrefs?: WorkoutBuilderPrefs | null
  className?: string
}

const addButtonClass =
  'inline-flex items-center gap-1 text-xs font-medium text-foreground transition hover:text-brand'

export function SmartBlockPicker({
  onSelect,
  sportType = 'RUN',
  builderPrefs,
  className,
}: SmartBlockPickerProps) {
  const [customOpen, setCustomOpen] = useState(false)
  const presets = resolvePresetMenuOptions(sportType, builderPrefs)

  return (
    <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-1', className)}>
      {CORE_BLOCK_OPTIONS.map((option) => (
        <button
          key={option.kind}
          type="button"
          onClick={() => onSelect(option.kind)}
          className={addButtonClass}
        >
          <Plus className="h-3.5 w-3.5" />
          {option.label}
        </button>
      ))}

      {presets.length > 0 ? (
        <div className="relative">
          <button
            type="button"
            onClick={() => setCustomOpen((v) => !v)}
            className={addButtonClass}
          >
            <Plus className="h-3.5 w-3.5" />
            Custom
            <ChevronDown className="h-3 w-3 opacity-60" />
          </button>

          {customOpen ? (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setCustomOpen(false)}
                aria-hidden
              />
              <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border border-border/80 bg-card py-1 shadow-lg">
                {presets.map((option) => (
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
