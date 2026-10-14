'use client'

import type { DragEvent } from 'react'
import { GripVertical } from 'lucide-react'
import type { ExerciseLibraryDto } from '@/app/actions/exercises'
import type { ExerciseSearchContext } from '@/lib/exercises/types'
import {
  createEmptyExerciseItem,
  type ExerciseItem,
  type WorkoutBlockV2,
} from '@/lib/workout-builder/structure-v2'
import { ExerciseRowEditor } from '@/components/workout-builder/sections/exercise-row-editor'
import { cn } from '@/lib/utils'

type SectionExerciseItemProps = {
  block: Extract<WorkoutBlockV2, { type: 'EXERCISE' }>
  onChange: (block: WorkoutBlockV2) => void
  onRemove: () => void
  library: ExerciseLibraryDto[]
  searchContext?: ExerciseSearchContext
  showHeaders?: boolean
  className?: string
  dragging?: boolean
  onDragHandleStart?: (e: DragEvent<HTMLButtonElement>) => void
  onDragHandleEnd?: () => void
}

function exerciseFromBlock(
  block: Extract<WorkoutBlockV2, { type: 'EXERCISE' }>,
): ExerciseItem {
  return block.exercise ?? block.exercises?.[0] ?? createEmptyExerciseItem()
}

/** Standalone exercise at section level — peer to blocks, not a nested block card. */
export function SectionExerciseItem({
  block,
  onChange,
  onRemove,
  library,
  searchContext,
  showHeaders = false,
  className,
  dragging = false,
  onDragHandleStart,
  onDragHandleEnd,
}: SectionExerciseItemProps) {
  const item = exerciseFromBlock(block)

  return (
    <div
      className={cn(
        'flex items-start gap-1',
        dragging && 'opacity-50',
        className,
      )}
    >
      <button
        type="button"
        draggable
        onDragStart={onDragHandleStart}
        onDragEnd={onDragHandleEnd}
        className="mt-1.5 inline-flex h-7 w-6 shrink-0 cursor-grab items-center justify-center rounded-[4px] text-[var(--tt-ink-faint,#9ca3af)] hover:bg-black/[0.04] hover:text-[var(--tt-ink-soft,#6b7280)] active:cursor-grabbing"
        aria-label="Drag to reorder exercise"
      >
        <GripVertical className="h-3.5 w-3.5" aria-hidden />
      </button>
      <div className="min-w-0 flex-1">
        <ExerciseRowEditor
          item={item}
          library={library}
          searchContext={searchContext}
          showHeaders={showHeaders}
          onChange={(next) =>
            onChange({
              ...block,
              type: 'EXERCISE',
              exercise: next,
              exercises: undefined,
            })
          }
          onRemove={onRemove}
        />
      </div>
    </div>
  )
}
