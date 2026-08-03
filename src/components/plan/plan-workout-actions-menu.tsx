'use client'

import { useState, useTransition } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Copy, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { WorkoutType } from '@prisma/client'
import { deleteWorkout } from '@/app/actions/workouts'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { CopyPlanWorkoutModal } from '@/components/plan/copy-plan-workout-modal'
import { WorkoutEditorDialog } from '@/components/workout-editor/workout-editor-dialog'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { cn } from '@/lib/utils'

type PlanWorkoutActionsMenuProps = {
  workout: PlanWorkoutDetail
  className?: string
  /** Smaller trigger for week grid cells */
  compact?: boolean
}

export function PlanWorkoutActionsMenu({
  workout,
  className,
  compact = false,
}: PlanWorkoutActionsMenuProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [copyOpen, setCopyOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  if (workout.isRace || workout.type === WorkoutType.RECOVERY) {
    return null
  }

  function handleDelete() {
    startTransition(async () => {
      const formData = new FormData()
      formData.set('workoutId', workout.id)
      await deleteWorkout(formData)
      setDeleteOpen(false)
    })
  }

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className={cn(
              'inline-flex shrink-0 items-center justify-center rounded-md text-muted-foreground/70 transition',
              'hover:bg-muted hover:text-foreground',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand/30',
              'data-[state=open]:bg-muted data-[state=open]:text-foreground',
              compact ? 'h-6 w-6' : 'h-7 w-7',
              className,
            )}
            aria-label={`Actions for ${workout.title}`}
            title="Actions"
          >
            <MoreVertical className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} strokeWidth={1.75} />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={4}
            collisionPadding={8}
            className="z-[200] min-w-[9.5rem] overflow-hidden rounded-[10px] border border-border bg-card p-1 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenu.Item
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-[6px] px-2.5 py-2 text-sm outline-none',
                'text-foreground data-[highlighted]:bg-foreground/[0.04]',
              )}
              onSelect={(e) => {
                e.preventDefault()
                setEditOpen(true)
              }}
            >
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} />
              Edit
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-[6px] px-2.5 py-2 text-sm outline-none',
                'text-foreground data-[highlighted]:bg-foreground/[0.04]',
              )}
              onSelect={(e) => {
                e.preventDefault()
                setCopyOpen(true)
              }}
            >
              <Copy className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} />
              Copy
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-[6px] px-2.5 py-2 text-sm outline-none',
                'text-destructive data-[highlighted]:bg-destructive/5',
              )}
              onSelect={(e) => {
                e.preventDefault()
                setDeleteOpen(true)
              }}
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
              Delete
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <WorkoutEditorDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        date={workout.dateKey}
        sport={workout.type}
        workout={workout}
      />

      <CopyPlanWorkoutModal
        open={copyOpen}
        onOpenChange={setCopyOpen}
        workoutId={workout.id}
        workoutTitle={workout.title}
        sourceDateKey={workout.dateKey}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Remove workout?"
        description={`“${workout.title}” will be removed from the plan.`}
        confirmLabel="Remove"
        pending={pending}
        onConfirm={handleDelete}
      />
    </>
  )
}
