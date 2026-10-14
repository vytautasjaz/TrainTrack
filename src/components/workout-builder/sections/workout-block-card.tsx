'use client'

import { useRef, type DragEvent, type ReactNode } from 'react'
import { GripVertical, Plus, Trash2 } from 'lucide-react'
import type { ExerciseLibraryDto } from '@/app/actions/exercises'
import type { ExerciseSearchContext } from '@/lib/exercises/types'
import {
  BLOCK_TYPE_V2_LABELS,
  createEmptyExerciseItem,
  type WorkoutBlockV2,
} from '@/lib/workout-builder/structure-v2'
import {
  exercisesOfBlock,
  withBlockExercises,
  type BlockContainerRef,
} from '@/lib/workout-builder/structure-move'
import { sourcesEqual } from '@/lib/workout-builder/structure-move-eq'
import { ExerciseRowEditor } from '@/components/workout-builder/sections/exercise-row-editor'
import { useStructureDnd } from '@/components/workout-builder/sections/structure-dnd-context'
import {
  DragInsertIndicator,
  insertIndexFromClientY,
  insertIndexFromDragEvent,
} from '@/components/ui/drag-insert-indicator'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type WorkoutBlockCardProps = {
  block: WorkoutBlockV2
  /** Where this block lives in the structure (for nested exercise drags). */
  blockContainer: BlockContainerRef
  onChange: (block: WorkoutBlockV2) => void
  onRemove: () => void
  library: ExerciseLibraryDto[]
  searchContext?: ExerciseSearchContext
  className?: string
  dragging?: boolean
  onDragHandleStart?: (e: DragEvent<HTMLButtonElement>) => void
  onDragHandleEnd?: () => void
}

const metaInputClass =
  'h-6 w-11 rounded-[4px] border border-[var(--tt-v2-light-panel-line,#E3E6E9)] bg-white px-1 text-center text-[11px] tabular-nums text-[var(--tt-ink,#111315)] outline-none focus:border-[var(--tt-ink-faint,#9ca3af)]'

function MetaLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-[10px] font-medium uppercase tracking-[0.04em] text-[var(--tt-ink-faint,#9ca3af)]">
      {children}
    </span>
  )
}

export function WorkoutBlockCard({
  block,
  blockContainer,
  onChange,
  onRemove,
  library,
  searchContext,
  className,
  dragging = false,
  onDragHandleStart,
  onDragHandleEnd,
}: WorkoutBlockCardProps) {
  const dnd = useStructureDnd()
  const exerciseListRef = useRef<HTMLDivElement>(null)
  const exercises = exercisesOfBlock(block)
  const supportsExercises =
    block.type !== 'REST' && block.type !== 'FREE_TEXT'

  function acceptsExerciseDrop(e: DragEvent) {
    return dnd.isDraggingType(e, ['exercise', 'sectionBlock', 'rootItem'])
  }

  function resolveExerciseInsert(clientY: number): number {
    const root = exerciseListRef.current
    if (!root) return exercises.length
    const rows = root.querySelectorAll('[data-tt-block-exercise]')
    return insertIndexFromClientY(clientY, rows, exercises.length)
  }

  function highlightExercises(insertAt: number) {
    dnd.setHighlight({
      kind: 'blockExercises',
      container: blockContainer,
      insertAt,
    })
  }

  function showExerciseInsert(insertAt: number) {
    return (
      dnd.highlight?.kind === 'blockExercises' &&
      dnd.highlight.insertAt === insertAt &&
      ((dnd.highlight.container.kind === 'root' &&
        blockContainer.kind === 'root' &&
        dnd.highlight.container.rootIndex === blockContainer.rootIndex) ||
        (dnd.highlight.container.kind === 'section' &&
          blockContainer.kind === 'section' &&
          dnd.highlight.container.sectionRootIndex ===
            blockContainer.sectionRootIndex &&
          dnd.highlight.container.blockIndex === blockContainer.blockIndex))
    )
  }

  return (
    <div
      className={cn(
        'rounded-[8px] border border-[var(--tt-v2-light-panel-line,#E3E6E9)] bg-[var(--tt-v2-light,#F5F6F7)]/60',
        dragging && 'opacity-50',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-[var(--tt-v2-light-panel-line,#E3E6E9)]/80 px-2 py-1.5">
        <button
          type="button"
          draggable
          onDragStart={onDragHandleStart}
          onDragEnd={onDragHandleEnd}
          className="inline-flex h-6 w-6 shrink-0 cursor-grab items-center justify-center rounded-[4px] text-[var(--tt-ink-faint,#9ca3af)] hover:bg-black/[0.04] hover:text-[var(--tt-ink-soft,#6b7280)] active:cursor-grabbing"
          aria-label="Drag to reorder block"
        >
          <GripVertical className="h-3.5 w-3.5" aria-hidden />
        </button>

        <span className="inline-flex h-5 shrink-0 items-center rounded-[4px] bg-[var(--tt-ink,#111315)] px-1.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-white">
          {BLOCK_TYPE_V2_LABELS[block.type]}
        </span>

        {block.type === 'SET' ||
        block.type === 'CIRCUIT' ||
        block.type === 'SUPERSET' ||
        block.type === 'INTERVAL' ||
        block.type === 'LADDER' ||
        block.type === 'EMOM' ||
        block.type === 'FOR_TIME' ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <MetaLabel>×</MetaLabel>
            <input
              type="number"
              inputMode="numeric"
              value={block.rounds ?? ''}
              onChange={(e) => {
                const n = Number.parseInt(e.target.value, 10)
                onChange({
                  ...block,
                  rounds: Number.isFinite(n) && n > 0 ? n : undefined,
                })
              }}
              className={metaInputClass}
              aria-label="Rounds"
            />
            {block.type === 'EMOM' ? (
              <>
                <MetaLabel>every</MetaLabel>
                <input
                  type="number"
                  inputMode="numeric"
                  value={block.interval?.value ?? ''}
                  onChange={(e) => {
                    const n = Number.parseInt(e.target.value, 10)
                    onChange({
                      ...block,
                      interval: {
                        value: Number.isFinite(n) ? n : 60,
                        unit: 'sec',
                      },
                    })
                  }}
                  className={metaInputClass}
                  aria-label="Interval seconds"
                />
                <MetaLabel>s</MetaLabel>
              </>
            ) : null}
            {block.type !== 'EMOM' && block.type !== 'FOR_TIME' ? (
              <>
                <MetaLabel>rest</MetaLabel>
                <input
                  type="number"
                  inputMode="numeric"
                  value={block.rest?.value ?? ''}
                  onChange={(e) => {
                    const n = Number.parseInt(e.target.value, 10)
                    onChange({
                      ...block,
                      rest: {
                        type: 'TIME',
                        value: Number.isFinite(n) ? n : undefined,
                        unit: 'sec',
                      },
                    })
                  }}
                  className={metaInputClass}
                  aria-label="Rest seconds"
                />
                <MetaLabel>s</MetaLabel>
              </>
            ) : null}
          </div>
        ) : null}

        {block.type === 'AMRAP' ? (
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              inputMode="numeric"
              value={block.duration?.value ?? ''}
              onChange={(e) => {
                const n = Number.parseInt(e.target.value, 10)
                onChange({
                  ...block,
                  duration: {
                    value: Number.isFinite(n) ? n : 12,
                    unit: 'min',
                  },
                })
              }}
              className={metaInputClass}
              aria-label="Duration minutes"
            />
            <MetaLabel>min</MetaLabel>
          </div>
        ) : null}

        {block.type === 'REST' ? (
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              inputMode="decimal"
              value={block.rest?.value ?? ''}
              onChange={(e) => {
                const n = Number.parseFloat(e.target.value)
                onChange({
                  ...block,
                  rest: {
                    type: 'TIME',
                    value: Number.isFinite(n) ? n : undefined,
                    unit: block.rest?.unit ?? 'sec',
                  },
                })
              }}
              className={metaInputClass}
              placeholder="90"
              aria-label="Rest duration"
            />
            <MetaLabel>{block.rest?.unit ?? 'sec'}</MetaLabel>
          </div>
        ) : null}

        <div className="ml-auto flex shrink-0 items-center">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
            aria-label="Remove block"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="space-y-1 p-1.5">
        {block.type === 'FREE_TEXT' ? (
          <textarea
            value={block.text ?? ''}
            onChange={(e) => onChange({ ...block, text: e.target.value })}
            rows={2}
            placeholder="Instructions…"
            className="w-full resize-y rounded-[5px] border border-[var(--tt-v2-light-panel-line,#E3E6E9)] bg-white px-2 py-1.5 text-[12px] outline-none focus:border-[var(--tt-ink-faint,#9ca3af)]"
          />
        ) : null}

        {supportsExercises ? (
          <div
            ref={exerciseListRef}
            className="space-y-1"
            onDragOver={(e) => {
              if (!acceptsExerciseDrop(e)) return
              e.preventDefault()
              e.stopPropagation()
              e.dataTransfer.dropEffect = 'move'
              highlightExercises(resolveExerciseInsert(e.clientY))
            }}
            onDrop={(e) => {
              if (!acceptsExerciseDrop(e)) return
              dnd.dropOn(
                {
                  kind: 'blockExercises',
                  container: blockContainer,
                  insertAt: resolveExerciseInsert(e.clientY),
                },
                e,
              )
            }}
          >
            {exercises.map((item, index) => {
              const source = {
                kind: 'exercise' as const,
                container: blockContainer,
                exerciseIndex: index,
              }
              const exerciseDragging = sourcesEqual(dnd.active, source)

              return (
                <div
                  key={`${block.id}-ex-${index}-${item.exerciseId}`}
                  data-tt-block-exercise=""
                  className="relative"
                  onDragOver={(e) => {
                    if (!acceptsExerciseDrop(e)) return
                    e.preventDefault()
                    e.stopPropagation()
                    e.dataTransfer.dropEffect = 'move'
                    highlightExercises(insertIndexFromDragEvent(e, index))
                  }}
                  onDrop={(e) => {
                    if (!acceptsExerciseDrop(e)) return
                    dnd.dropOn(
                      {
                        kind: 'blockExercises',
                        container: blockContainer,
                        insertAt: insertIndexFromDragEvent(e, index),
                      },
                      e,
                    )
                  }}
                >
                  <DragInsertIndicator show={showExerciseInsert(index)} />
                  <div
                    className={cn(
                      'flex items-start gap-1',
                      exerciseDragging && 'opacity-50',
                    )}
                  >
                    <button
                      type="button"
                      draggable
                      onDragStart={(e) => dnd.beginDrag(source, e)}
                      onDragEnd={dnd.endDrag}
                      className="mt-1.5 inline-flex h-7 w-5 shrink-0 cursor-grab items-center justify-center rounded-[4px] text-[var(--tt-ink-faint,#9ca3af)] hover:bg-black/[0.04] hover:text-[var(--tt-ink-soft,#6b7280)] active:cursor-grabbing"
                      aria-label="Drag exercise between blocks or sections"
                    >
                      <GripVertical className="h-3.5 w-3.5" aria-hidden />
                    </button>
                    <div className="min-w-0 flex-1">
                      <ExerciseRowEditor
                        item={item}
                        library={library}
                        searchContext={searchContext}
                        showHeaders={index === 0}
                        onChange={(next) => {
                          const nextExercises = exercises.map((ex, i) =>
                            i === index ? next : ex,
                          )
                          onChange(withBlockExercises(block, nextExercises))
                        }}
                        onRemove={() => {
                          onChange(
                            withBlockExercises(
                              block,
                              exercises.filter((_, i) => i !== index),
                            ),
                          )
                        }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
            {exercises.length > 0 ? (
              <div className="relative h-3">
                <DragInsertIndicator
                  show={showExerciseInsert(exercises.length)}
                />
              </div>
            ) : (
              <p className="px-1 py-1 text-[11px] text-[var(--tt-ink-faint,#9ca3af)]">
                Drop exercises here
              </p>
            )}
            <button
              type="button"
              className="inline-flex h-6 items-center gap-1 px-1 text-[11px] font-medium text-[var(--tt-ink-soft,#6b7280)] transition hover:text-[var(--tt-ink,#111315)]"
              onClick={() =>
                onChange(
                  withBlockExercises(block, [
                    ...exercises,
                    createEmptyExerciseItem(),
                  ]),
                )
              }
            >
              <Plus className="h-3 w-3" aria-hidden />
              Exercise
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
