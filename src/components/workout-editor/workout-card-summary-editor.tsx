'use client'

import type { WorkoutType } from '@prisma/client'
import { FormField } from '@/components/ui/form-field'
import { Textarea } from '@/components/ui/textarea'
import {
  getAutomaticCardBlockIds,
  getWorkoutCardEssenceLines,
  listCardWorkBlocks,
  pruneCardSummary,
} from '@/lib/workout-builder/card-summary'
import { useDurationNotation } from '@/components/workout-builder/duration-notation-context'
import type { WorkoutStructure } from '@/lib/workout-builder/types'
import { cn } from '@/lib/utils'

type Props = {
  structure: WorkoutStructure
  sportType: WorkoutType
  onChange: (structure: WorkoutStructure) => void
}

export function WorkoutCardSummaryEditor({ structure, sportType, onChange }: Props) {
  const durationNotation = useDurationNotation()
  const eligibleBlocks = listCardWorkBlocks(structure)
  const selectedIds = structure.cardSummary?.highlightedBlockIds ?? []
  const override = structure.cardSummary?.essence ?? ''
  const automaticIds = getAutomaticCardBlockIds(structure)
  const automaticMode = selectedIds.length === 0
  const preview = getWorkoutCardEssenceLines(structure, sportType, durationNotation, {
    includeAllBlocks: true,
  })

  if (eligibleBlocks.length === 0) return null

  function updateSummary(patch: Partial<NonNullable<WorkoutStructure['cardSummary']>>) {
    const next = pruneCardSummary({
      ...structure,
      cardSummary: { ...structure.cardSummary, ...patch },
    })
    onChange({ ...structure, cardSummary: next })
  }

  function toggleBlock(id: string) {
    const current = automaticMode ? [] : selectedIds
    const next = current.includes(id)
      ? current.filter((blockId) => blockId !== id)
      : [...current, id]
    updateSummary({ highlightedBlockIds: next })
  }

  return (
    <section className="rounded-lg border border-border/80 bg-muted/[0.2] p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div>
          <h3 className="text-[13px] font-semibold text-foreground">Workout card</h3>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
            Show the athlete the key work, not every builder detail.
          </p>
        </div>
        {preview.length > 0 ? (
          <div className="max-w-[14rem] text-right text-[11px] font-medium leading-snug text-muted-foreground">
            {preview.map((line, index) => (
              <p key={`${index}-${line}`} className="truncate">
                {line}
              </p>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-3">
        <p className="text-[11px] font-medium text-foreground">Main blocks</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <button
            type="button"
            aria-pressed={automaticMode}
            onClick={() => updateSummary({ highlightedBlockIds: [] })}
            className={cn(
              'rounded-md border px-2 py-1 text-[11px] font-medium transition',
              automaticMode
                ? 'border-foreground/20 bg-foreground text-background'
                : 'border-border bg-background text-muted-foreground hover:border-foreground/20 hover:text-foreground',
            )}
          >
            Auto
          </button>
          {eligibleBlocks.map((block, index) => {
            const selected = automaticMode
              ? automaticIds.includes(block.id)
              : selectedIds.includes(block.id)
            const label =
              getWorkoutCardEssenceLines(
                { ...structure, cardSummary: { highlightedBlockIds: [block.id] } },
                sportType,
                durationNotation,
              )[0] ?? block.name ?? `Block ${index + 1}`
            return (
              <button
                key={block.id}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleBlock(block.id)}
                className={cn(
                  'max-w-full truncate rounded-md border px-2 py-1 text-[11px] font-medium transition',
                  selected
                    ? 'border-foreground/20 bg-foreground text-background'
                    : 'border-border bg-background text-muted-foreground hover:border-foreground/20 hover:text-foreground',
                )}
              >
                {index + 1}. {label}
              </button>
            )
          })}
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          Pick any number of blocks. S cards show the selection (Auto = every
          meaningful main-set block). M and L cards show the full workout.
        </p>
      </div>

      <FormField label="Card summary override" className="mt-3">
        <Textarea
          value={override}
          onChange={(event) =>
            updateSummary({ essence: event.target.value.slice(0, 160) })
          }
          rows={2}
          placeholder={'Optional — one block per line, e.g.\n4 × 1000 m · 60 sec rest\n5 × 200 m · 90 sec rest'}
          className="min-h-[4.5rem] resize-y text-sm whitespace-pre-wrap"
        />
        <p className="mt-1 text-[11px] text-muted-foreground">
          A custom summary takes priority. Put each block on its own line.
        </p>
      </FormField>
    </section>
  )
}
