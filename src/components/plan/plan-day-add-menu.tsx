'use client'

import { useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { AddWorkoutModal } from '@/components/plan/add-workout-modal'
import { DayNoteModal } from '@/components/plan/day-note-modal'
import { RecoveryDayModal } from '@/components/plan/recovery-day-modal'
import type { DayNoteData } from '@/lib/day-notes'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { cn } from '@/lib/utils'

type PlanDayAddMenuProps = {
  dateKey: string
  isCoach: boolean
  canAddNote: boolean
  athleteId?: string
  dayNote?: DayNoteData | null
  recoveryWorkout?: PlanWorkoutDetail | null
}

type MenuItemProps = {
  label: string
  onClick: () => void
  className?: string
}

function MenuItem({ label, onClick, className }: MenuItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center px-3 py-2 text-left text-sm transition hover:bg-muted/60',
        className,
      )}
    >
      {label}
    </button>
  )
}

export function PlanDayAddMenu({
  dateKey,
  isCoach,
  canAddNote,
  athleteId,
  dayNote,
  recoveryWorkout,
}: PlanDayAddMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [workoutOpen, setWorkoutOpen] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  const [recoveryOpen, setRecoveryOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return

    function handleClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  if (!isCoach && !canAddNote) return null

  function handleAddClick() {
    if (isCoach) {
      setMenuOpen((open) => !open)
      return
    }
    setNoteOpen(true)
  }

  function openWorkout() {
    setMenuOpen(false)
    setWorkoutOpen(true)
  }

  function openNote() {
    setMenuOpen(false)
    setNoteOpen(true)
  }

  function openRecovery() {
    setMenuOpen(false)
    setRecoveryOpen(true)
  }

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        type="button"
        onClick={handleAddClick}
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted/50 hover:text-brand',
          menuOpen && 'bg-muted/50 text-brand',
        )}
        aria-label={isCoach ? `Add to ${dateKey}` : `Add note on ${dateKey}`}
        aria-expanded={isCoach ? menuOpen : undefined}
      >
        <Plus className="h-4 w-4" />
      </button>

      {isCoach && menuOpen && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[9.5rem] overflow-hidden rounded-lg border border-border/80 bg-card py-1 shadow-lg">
          <MenuItem label="Workout" onClick={openWorkout} />
          {canAddNote && <MenuItem label="Note" onClick={openNote} />}
          <MenuItem
            label="Recovery Day"
            onClick={openRecovery}
            className="text-violet-700 dark:text-violet-300"
          />
        </div>
      )}

      {isCoach && (
        <AddWorkoutModal open={workoutOpen} onOpenChange={setWorkoutOpen} date={dateKey} />
      )}
      {canAddNote && (
        <DayNoteModal
          dateKey={dateKey}
          note={dayNote}
          athleteId={athleteId}
          open={noteOpen}
          onOpenChange={setNoteOpen}
        />
      )}
      {isCoach && (
        <RecoveryDayModal
          date={dateKey}
          workout={recoveryWorkout}
          open={recoveryOpen}
          onOpenChange={setRecoveryOpen}
        />
      )}
    </div>
  )
}
