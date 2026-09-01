'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { MockAppChrome } from '../_components/mock-app-chrome'
import { WorkoutBuilderModal } from '../_components/workout-builder-mock-content'
import {
  PrescriptionWorkoutCard,
  type PrescriptionWorkout,
} from '../_components/prescription-workout-card'

const HOST_CARDS: PrescriptionWorkout[] = [
  {
    id: 'threshold',
    sport: 'run',
    title: 'Threshold Intervals',
    prescription: '3 × 2 km @ 4:05/km',
    recovery: "2' easy recovery",
    metric: '12 km',
    zone: 'Z3',
    include: '6 × 100 m strides',
    status: 'planned',
  },
  {
    id: 'easy',
    sport: 'run',
    title: 'Easy Run',
    prescription: '10 km · Z2',
    metric: '10 km',
    zone: 'Z2',
    status: 'planned',
  },
]

/**
 * Host week + create/edit modal matching production card editor shape.
 */
export default function WorkoutBuilderMockPage() {
  const [open, setOpen] = useState(true)
  const [mode, setMode] = useState<'create' | 'edit'>('create')

  function openCreate() {
    setMode('create')
    setOpen(true)
  }

  function openEdit() {
    setMode('edit')
    setOpen(true)
  }

  return (
    <MockAppChrome
      title="Workout Builder · Modal"
      status="Draft"
      role="coach"
      activeNav="Training"
      switchHomesOnRole={false}
    >
      <div className="w-full min-w-0 max-w-[90rem] space-y-6">
        <header className="space-y-2 pt-1">
          <h1 className="tt-mock-h1 !text-5xl">Training.</h1>
          <p className="max-w-lg text-[13px] leading-relaxed text-[var(--tt-ink-soft)]">
            Create/edit modal mirrors the existing card editor: sport header, metrics, Library /
            Build / Include, notes, Cancel · Preview · Save.
          </p>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[12px] text-[var(--tt-ink-soft)]">Wed 26 Aug</p>
          <button
            type="button"
            onClick={openCreate}
            className="tt-mock-btn tt-mock-btn-primary inline-flex items-center gap-1.5 !normal-case !tracking-normal"
          >
            <Plus className="h-3.5 w-3.5" />
            New workout
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {HOST_CARDS.map((w) => (
            <button key={w.id} type="button" onClick={openEdit} className="text-left">
              <PrescriptionWorkoutCard workout={w} size="l" />
            </button>
          ))}
          <button
            type="button"
            onClick={openCreate}
            className="flex min-h-[7.5rem] items-center justify-center rounded-[8px] border border-dashed border-[var(--tt-line)] text-[13px] text-[var(--tt-ink-soft)] hover:border-[var(--tt-line-strong)] hover:text-[var(--tt-ink)]"
          >
            + Add session
          </button>
        </div>

        <p className="text-[11px] text-[var(--tt-ink-faint)]">
          New workout → empty card editor · existing card → edit with Build open
        </p>
      </div>

      <WorkoutBuilderModal open={open} onClose={() => setOpen(false)} mode={mode} />
    </MockAppChrome>
  )
}
