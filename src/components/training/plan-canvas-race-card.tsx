'use client'

import { Flag } from 'lucide-react'
import { usePlanCanvasDnd } from '@/components/training/plan-canvas-dnd'
import type { TrainingPlanRacePlaceholderDetail } from '@/lib/training-plan'
import { RACE_PRIORITY_BLOCK } from '@/lib/race-day'
import { RACE_PRIORITY_LABELS, RACE_TYPE_LABELS } from '@/lib/constants'
import { cn } from '@/lib/utils'

const PRIORITY_ACCENT: Record<
  TrainingPlanRacePlaceholderDetail['priority'],
  string
> = {
  A: 'bg-red-500 text-white',
  B: 'bg-blue-500 text-white',
  C: 'bg-emerald-600 text-white',
}

const PRIORITY_FLAG: Record<
  TrainingPlanRacePlaceholderDetail['priority'],
  string
> = {
  A: 'text-red-600',
  B: 'text-blue-600',
  C: 'text-emerald-700',
}

type PlanCanvasRaceCardProps = {
  race: TrainingPlanRacePlaceholderDetail
  slotKey: string
  onEdit: (race: TrainingPlanRacePlaceholderDetail) => void
}

export function PlanCanvasRaceCard({
  race,
  slotKey,
  onEdit,
}: PlanCanvasRaceCardProps) {
  const dnd = usePlanCanvasDnd()
  const dragging =
    dnd?.dragItem?.kind === 'race' && dnd.dragItem.id === race.id

  return (
    <button
      type="button"
      draggable={Boolean(dnd)}
      onDragStart={(e) => {
        if (!dnd) return
        dnd.setDragItem({
          kind: 'race',
          id: race.id,
          sport: race.sport,
          slotKey,
        })
        e.dataTransfer.effectAllowed = 'copyMove'
        e.dataTransfer.setData('text/plain', `race:${race.id}`)
      }}
      onDragEnd={() => dnd?.setDragItem(null)}
      onClick={() => onEdit(race)}
      title={`${race.name} — drag to reorder or move`}
      className={cn(
        'flex w-full min-w-0 cursor-grab items-start gap-2 rounded-[7px] px-2 py-1.5 text-left shadow-[0_1px_2px_rgba(17,17,17,0.08)] ring-1 ring-black/5 transition active:cursor-grabbing',
        RACE_PRIORITY_BLOCK[race.priority],
        'hover:brightness-[0.97]',
        dragging && 'opacity-40',
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[5px] bg-white/70',
          PRIORITY_FLAG[race.priority],
        )}
      >
        <Flag className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-foreground/55">
            Race
          </span>
          <span
            className={cn(
              'inline-flex h-[14px] shrink-0 items-center rounded-[3px] px-1 text-[9px] font-bold leading-none',
              PRIORITY_ACCENT[race.priority],
            )}
          >
            {race.priority}
          </span>
        </span>
        <span className="mt-0.5 block truncate text-[13px] font-bold leading-snug text-foreground">
          {race.name}
        </span>
        <span className="mt-0.5 block truncate text-[10px] font-medium text-foreground/65">
          {RACE_TYPE_LABELS[race.type]} · {RACE_PRIORITY_LABELS[race.priority]}
        </span>
      </span>
    </button>
  )
}
