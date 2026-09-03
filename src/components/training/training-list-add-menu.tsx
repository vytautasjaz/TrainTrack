'use client'

import { useState } from 'react'
import {
  CalendarRange,
  ChevronLeft,
  ClipboardList,
  Dumbbell,
  Plus,
  StickyNote,
} from 'lucide-react'
import { WorkoutType } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { LogManualWorkoutModal } from '@/components/history/log-manual-workout-modal'
import { WorkoutEditorDialog } from '@/components/workout-editor/workout-editor-dialog'
import { DayNoteModal } from '@/components/plan/day-note-modal'
import { SeasonEventModal } from '@/components/plan/season-event-modal'
import { WorkoutSportIcon } from '@/components/plan/workout-sport-icon'
import { SPORT_ROW_ORDER, WORKOUT_TYPE_LABELS } from '@/lib/constants'
import { todayDateKey } from '@/lib/dates'
import type { DayNoteKind } from '@/lib/day-notes'
import { cn } from '@/lib/utils'

const ADD_SPORTS = SPORT_ROW_ORDER.filter(
  (t) => t !== WorkoutType.REST && t !== WorkoutType.RECOVERY,
)

type Panel = 'root' | 'workout'

type TrainingListAddMenuProps = {
  isCoach: boolean
  athleteId?: string
  canAddNote: boolean
  canLogWorkout: boolean
  /** Defaults to today. */
  dateKey?: string
  className?: string
}

export function TrainingListAddMenu({
  isCoach,
  athleteId,
  canAddNote,
  canLogWorkout,
  dateKey = todayDateKey(),
  className,
}: TrainingListAddMenuProps) {
  const canAddEvent = Boolean(athleteId) || !isCoach
  const canAddNewWorkout = true

  const [menuOpen, setMenuOpen] = useState(false)
  const [panel, setPanel] = useState<Panel>('root')
  const [logOpen, setLogOpen] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  const [eventOpen, setEventOpen] = useState(false)
  const [workoutOpen, setWorkoutOpen] = useState(false)
  const [workoutSport, setWorkoutSport] = useState<WorkoutType | null>(null)

  if (!canAddNewWorkout && !canLogWorkout && !canAddNote && !canAddEvent) {
    return null
  }

  function closeMenu() {
    setMenuOpen(false)
    setPanel('root')
  }

  function openSport(sport: WorkoutType) {
    closeMenu()
    setWorkoutSport(sport)
    setWorkoutOpen(true)
  }

  function handleWorkoutOpenChange(open: boolean) {
    setWorkoutOpen(open)
    if (!open) setWorkoutSport(null)
  }

  return (
    <div className={cn('relative shrink-0', className)}>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="shrink-0 gap-1 px-2.5 sm:gap-1.5 sm:px-3"
        aria-label="Add to plan"
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        onClick={() => {
          setMenuOpen((open) => {
            if (open) setPanel('root')
            return !open
          })
        }}
      >
        <Plus className="h-4 w-4" />
        Add
      </Button>

      {menuOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-20 cursor-default"
            aria-label="Close add menu"
            onClick={closeMenu}
          />
          <div
            role="menu"
            aria-label="Add to plan"
            className="absolute right-0 top-[calc(100%+0.35rem)] z-30 min-w-[11.5rem] overflow-hidden rounded-[8px] border border-[var(--tt-line,#ebebeb)] bg-[var(--tt-surface,#fff)] py-1 shadow-[var(--tt-shadow)]"
          >
            {panel === 'root' ? (
              <>
                {canAddNewWorkout ? (
                  <MenuRow
                    label="New workout"
                    icon={
                      <Dumbbell
                        className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                        strokeWidth={2}
                      />
                    }
                    onClick={() => setPanel('workout')}
                  />
                ) : null}
                {canLogWorkout ? (
                  <MenuRow
                    label="Log workout"
                    icon={
                      <ClipboardList
                        className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                        strokeWidth={2}
                      />
                    }
                    onClick={() => {
                      closeMenu()
                      setLogOpen(true)
                    }}
                  />
                ) : null}
                {canAddNote ? (
                  <MenuRow
                    label="Note"
                    icon={
                      <StickyNote
                        className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                        strokeWidth={2}
                      />
                    }
                    onClick={() => {
                      closeMenu()
                      setNoteOpen(true)
                    }}
                  />
                ) : null}
                {canAddEvent ? (
                  <MenuRow
                    label="Event"
                    icon={
                      <CalendarRange
                        className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                        strokeWidth={2}
                      />
                    }
                    onClick={() => {
                      closeMenu()
                      setEventOpen(true)
                    }}
                  />
                ) : null}
              </>
            ) : (
              <>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-medium text-[var(--tt-ink-soft,#6b6b6b)] transition hover:bg-[var(--tt-sidebar,#f5f5f5)]"
                  onClick={() => setPanel('root')}
                >
                  <ChevronLeft className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                  New workout
                </button>
                <div className="my-1 h-px bg-[var(--tt-line,#ebebeb)]" aria-hidden />
                {ADD_SPORTS.map((sport) => (
                  <MenuRow
                    key={sport}
                    label={WORKOUT_TYPE_LABELS[sport]}
                    icon={<WorkoutSportIcon type={sport} size="xs" />}
                    onClick={() => openSport(sport)}
                  />
                ))}
              </>
            )}
          </div>
        </>
      ) : null}

      {canLogWorkout ? (
        <LogManualWorkoutModal open={logOpen} onOpenChange={setLogOpen} />
      ) : null}

      {canAddNote ? (
        <DayNoteModal
          dateKey={dateKey}
          note={null}
          noteKind={(isCoach ? 'coach' : 'athlete') as DayNoteKind}
          athleteId={athleteId}
          open={noteOpen}
          onOpenChange={setNoteOpen}
        />
      ) : null}

      {canAddEvent ? (
        <SeasonEventModal
          open={eventOpen}
          onOpenChange={setEventOpen}
          defaultStartDate={dateKey}
          defaultEndDate={dateKey}
        />
      ) : null}

      {workoutOpen && workoutSport ? (
        <WorkoutEditorDialog
          open={workoutOpen}
          onOpenChange={handleWorkoutOpenChange}
          date={dateKey}
          sport={workoutSport}
          athleteMode={!isCoach}
        />
      ) : null}
    </div>
  )
}

function MenuRow({
  label,
  icon,
  onClick,
}: {
  label: string
  icon?: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-medium text-[var(--tt-ink,#111)] transition hover:bg-[var(--tt-sidebar,#f5f5f5)]"
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  )
}
