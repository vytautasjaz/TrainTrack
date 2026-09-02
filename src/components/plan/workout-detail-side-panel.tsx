'use client'

import { ChevronLeft } from 'lucide-react'
import { WorkoutDetailView } from '@/components/plan/workout-detail-view'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'

type WorkoutDetailSidePanelProps = {
  workout: PlanWorkoutDetail
  isCoach: boolean
  collapsed: boolean
  onExpand: () => void
  onCollapse: () => void
  /** Flush against the hosting panel edge (inbox workout rail). */
  flushEdge?: boolean
}

export function WorkoutDetailSidePanel({
  workout,
  isCoach,
  collapsed,
  onExpand,
  onCollapse,
  flushEdge = false,
}: WorkoutDetailSidePanelProps) {
  if (collapsed) {
    return (
      <button
        type="button"
        className="group flex h-full w-full cursor-pointer flex-col items-center gap-2 border-l border-[var(--tt-line,#ebebeb)] bg-[var(--tt-bg,#fafafa)] px-1 py-3 transition hover:bg-white"
        onClick={(e) => {
          e.stopPropagation()
          onExpand()
        }}
        aria-label="Show workout detail"
        title={workout.title}
      >
        <ChevronLeft
          className="h-4 w-4 shrink-0 text-[var(--tt-ink-faint,#9a9a9a)] transition group-hover:text-[var(--tt-ink,#111)]"
          strokeWidth={2}
        />
        <span
          className="max-h-[12rem] truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--tt-ink-soft,#6b6b6b)] [writing-mode:vertical-rl] rotate-180"
          aria-hidden
        >
          {workout.title}
        </span>
      </button>
    )
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-white">
      <WorkoutDetailView
        key={workout.id}
        workout={workout}
        isCoach={isCoach}
        active
        heroTone="light"
        showCloseButton
        hideCoachingThread
        compact
        compactFlush={flushEdge}
        onClose={onCollapse}
        className="h-full"
      />
    </div>
  )
}
