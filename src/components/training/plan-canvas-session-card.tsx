'use client'

import { useState } from 'react'
import { Copy, Trash2 } from 'lucide-react'
import { WeekPlanWorkoutCard } from '@/components/plan/week-plan-workout-card'
import { usePlanCanvasDnd } from '@/components/training/plan-canvas-dnd'
import { useTrainingLibrary } from '@/components/training/training-library-context'
import { CopyPlanCanvasSessionModal } from '@/components/training/copy-plan-canvas-session-modal'
import { planSessionToPlanWorkoutDetail } from '@/lib/training-plan-session-map'
import type { TrainingPlanSessionDetail } from '@/lib/training-plan'
import { cn } from '@/lib/utils'

export function PlanCanvasSessionCard({
  session,
  slotKey,
  weekCount,
  occupiedSlots,
  onEdit,
}: {
  session: TrainingPlanSessionDetail
  slotKey: string
  weekCount: number
  occupiedSlots?: Record<string, number>
  onEdit: (session: TrainingPlanSessionDetail) => void
}) {
  const dnd = usePlanCanvasDnd()
  const library = useTrainingLibrary()
  const [copyOpen, setCopyOpen] = useState(false)
  const workout = planSessionToPlanWorkoutDetail(session)
  const dragging =
    dnd?.dragItem?.kind === 'session' && dnd.dragItem.id === session.id

  return (
    <div
      draggable={Boolean(dnd)}
      onDragStart={(e) => {
        if (!dnd) return
        dnd.setDragItem({
          kind: 'session',
          id: session.id,
          sport: session.type,
          slotKey,
        })
        e.dataTransfer.effectAllowed = 'copyMove'
        e.dataTransfer.setData('text/plain', `session:${session.id}`)
        library?.setOpen(true)
      }}
      onDragEnd={() => dnd?.setDragItem(null)}
      className={cn(
        'group/session relative cursor-grab active:cursor-grabbing',
        dragging && 'opacity-40',
      )}
    >
      <button
        type="button"
        className="block w-full min-w-0 cursor-pointer text-left"
        onClick={(e) => {
          e.stopPropagation()
          onEdit(session)
        }}
      >
        <WeekPlanWorkoutCard workout={workout} isCoach />
      </button>
      <div className="absolute right-1 top-1 z-10 hidden items-center gap-0.5 group-hover/session:flex">
        <button
          type="button"
          className="inline-flex h-6 w-6 items-center justify-center rounded-[4px] bg-white/90 text-[var(--tt-ink-soft,#6b6b6b)] shadow-sm hover:bg-[var(--tt-sidebar,#f5f5f5)] hover:text-foreground"
          aria-label={`Copy ${session.title}`}
          title="Copy"
          onClick={(e) => {
            e.stopPropagation()
            setCopyOpen(true)
          }}
        >
          <Copy className="h-3 w-3" strokeWidth={2} aria-hidden />
        </button>
        <button
          type="button"
          className="inline-flex h-6 w-6 items-center justify-center rounded-[4px] bg-white/90 text-[var(--tt-red,#da2f36)] shadow-sm hover:bg-[color-mix(in_srgb,var(--tt-red,#da2f36)_10%,white)]"
          aria-label={`Delete ${session.title}`}
          title="Delete"
          onClick={(e) => {
            e.stopPropagation()
            if (!confirm(`Remove “${session.title}” from this plan?`)) return
            dnd?.deleteSession(session.id)
          }}
        >
          <Trash2 className="h-3 w-3" strokeWidth={2} aria-hidden />
        </button>
      </div>

      <CopyPlanCanvasSessionModal
        open={copyOpen}
        onOpenChange={setCopyOpen}
        sessionId={session.id}
        sessionTitle={session.title}
        weekCount={weekCount}
        sourceWeekIndex={session.weekIndex}
        sourceDayOfWeek={session.dayOfWeek}
        occupiedSlots={occupiedSlots}
      />
    </div>
  )
}
