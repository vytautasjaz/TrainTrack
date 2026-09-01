'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarRange, Flag, StickyNote } from 'lucide-react'
import { RaceIntent, WorkoutType } from '@prisma/client'
import { WorkoutEditorDialog } from '@/components/workout-editor/workout-editor-dialog'
import { DayNoteModal } from '@/components/plan/day-note-modal'
import { RecoveryDayModal } from '@/components/plan/recovery-day-modal'
import { SeasonEventModal } from '@/components/plan/season-event-modal'
import { AddRaceModal } from '@/components/races/add-race-modal'
import { WorkoutSportIcon } from '@/components/plan/workout-sport-icon'
import {
  WeekAddPlusMark,
  weekAddPlusButtonClass,
  weekAddPlusIconButtonClass,
} from '@/components/plan/week-add-plus'
import { SPORT_ROW_ORDER, WORKOUT_TYPE_LABELS } from '@/lib/constants'
import {
  dayNoteKindHasContent,
  type DayNoteData,
  type DayNoteKind,
} from '@/lib/day-notes'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { cn } from '@/lib/utils'

const COACH_ADD_SPORTS = SPORT_ROW_ORDER.filter(
  (t) => t !== WorkoutType.REST && t !== WorkoutType.RECOVERY,
)

/** Sports athletes can self-add from the day menu (text description only). */
const ATHLETE_ADD_SPORTS = COACH_ADD_SPORTS

type PlanDayAddMenuProps = {
  dateKey: string
  isCoach: boolean
  canAddNote: boolean
  athleteId?: string
  dayNote?: DayNoteData | null
  recoveryWorkout?: PlanWorkoutDetail | null
  /** Prefer opening above (`top`) or below (`bottom`). Flips automatically if clipped. */
  menuPlacement?: 'top' | 'bottom'
  /** Lighter + for table add row. */
  variant?: 'default' | 'subtle'
  /**
   * `icon` — compact control (month occupied days, list chrome).
   * `cell` — nearly full parent hit target (empty month / week day cells).
   */
  hitArea?: 'icon' | 'cell'
  /** Hide until parent `group/day` hover (or menu open). */
  revealOnHover?: boolean
  className?: string
}

type MenuItemProps = {
  label: string
  onClick: () => void
  className?: string
  icon?: React.ReactNode
}

function MenuItem({ label, onClick, className, icon }: MenuItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm text-foreground transition hover:bg-foreground/[0.04]',
        className,
      )}
    >
      {icon}
      {label}
    </button>
  )
}

type MenuPosition = {
  left: number
  top?: number
  bottom?: number
  maxHeight: number
  alignCenter: boolean
}

export function PlanDayAddMenu({
  dateKey,
  isCoach,
  canAddNote,
  athleteId,
  dayNote,
  recoveryWorkout,
  menuPlacement = 'bottom',
  variant = 'default',
  hitArea = 'icon',
  revealOnHover = false,
  className,
}: PlanDayAddMenuProps) {
  const canAddWorkout = !isCoach
  const canShowNoteOption = canAddNote
  const canAddRecoveryOption = isCoach && !recoveryWorkout
  const canAddRace = Boolean(athleteId) || !isCoach
  const canAddEvent = Boolean(athleteId) || !isCoach
  const [menuOpen, setMenuOpen] = useState(false)
  const [workoutOpen, setWorkoutOpen] = useState(false)
  const [workoutSport, setWorkoutSport] = useState<WorkoutType | null>(null)
  const [noteOpen, setNoteOpen] = useState(false)
  const [eventOpen, setEventOpen] = useState(false)
  const [recoveryOpen, setRecoveryOpen] = useState(false)
  const [raceOpen, setRaceOpen] = useState(false)
  const [menuPos, setMenuPos] = useState<MenuPosition | null>(null)
  const [portalReady, setPortalReady] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuPanelRef = useRef<HTMLDivElement>(null)
  /** Pointer position when opening — keeps the menu next to the + / click, not the cell edge. */
  const anchorRef = useRef<{ x: number; y: number } | null>(null)

  const isSubtle = variant === 'subtle'
  const fillCell = hitArea === 'cell'

  useEffect(() => {
    setPortalReady(true)
  }, [])

  function updateMenuPosition() {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const gap = 2
    const viewportPad = 8
    const anchor = anchorRef.current
    const anchorX =
      anchor?.x ?? (fillCell ? rect.left + rect.width / 2 : rect.right)
    const anchorY =
      anchor?.y ?? (fillCell ? rect.top + rect.height / 2 : rect.bottom)
    const spaceBelow = window.innerHeight - anchorY - viewportPad - gap
    const spaceAbove = anchorY - viewportPad - gap
    // Prefer requested side, but flip when the menu would clip off-screen.
    const openUp =
      menuPlacement === 'top'
        ? spaceAbove >= 120 || spaceAbove >= spaceBelow
        : spaceBelow < 200 && spaceAbove > spaceBelow

    if (openUp) {
      setMenuPos({
        left: anchorX,
        bottom: window.innerHeight - anchorY + gap,
        maxHeight: Math.max(120, spaceAbove),
        alignCenter: true,
      })
    } else {
      setMenuPos({
        left: anchorX,
        top: anchorY + gap,
        maxHeight: Math.max(120, spaceBelow),
        alignCenter: true,
      })
    }
  }

  useLayoutEffect(() => {
    if (!menuOpen) {
      setMenuPos(null)
      return
    }
    updateMenuPosition()
    function onReposition() {
      updateMenuPosition()
    }
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    return () => {
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when open / layout
  }, [menuOpen, menuPlacement, fillCell])

  useEffect(() => {
    if (!menuOpen) return

    function handleClick(event: MouseEvent) {
      const target = event.target as Node
      if (triggerRef.current?.contains(target)) return
      if (menuPanelRef.current?.contains(target)) return
      setMenuOpen(false)
      anchorRef.current = null
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [menuOpen])

  if (!isCoach && !canShowNoteOption && !canAddWorkout && !canAddEvent) return null

  function handleAddClick() {
    if (isCoach || canAddWorkout) {
      setMenuOpen((open) => {
        if (open) anchorRef.current = null
        return !open
      })
      return
    }
    setNoteOpen(true)
  }

  function openWorkoutSport(sport: WorkoutType) {
    setMenuOpen(false)
    setWorkoutSport(sport)
    setWorkoutOpen(true)
  }

  function handleWorkoutOpenChange(open: boolean) {
    setWorkoutOpen(open)
    if (!open) setWorkoutSport(null)
  }

  function openNote() {
    setMenuOpen(false)
    setNoteOpen(true)
  }

  function openEvent() {
    setMenuOpen(false)
    setEventOpen(true)
  }

  function openRecovery() {
    setMenuOpen(false)
    setRecoveryOpen(true)
  }

  function openRace() {
    setMenuOpen(false)
    setRaceOpen(true)
  }

  const menuPanel =
    menuOpen && (isCoach || canAddWorkout) && menuPos && portalReady
      ? createPortal(
          <div
            ref={menuPanelRef}
            className="fixed z-[300] min-w-[10rem] overflow-y-auto rounded-lg border border-border/80 bg-card py-1 shadow-lg"
            style={{
              left: menuPos.left,
              top: menuPos.top,
              bottom: menuPos.bottom,
              maxHeight: menuPos.maxHeight,
              transform: menuPos.alignCenter
                ? 'translateX(-50%)'
                : 'translateX(-100%)',
            }}
          >
            {(isCoach ? COACH_ADD_SPORTS : ATHLETE_ADD_SPORTS).map((sport) => (
              <MenuItem
                key={sport}
                label={WORKOUT_TYPE_LABELS[sport]}
                icon={<WorkoutSportIcon type={sport} size="xs" />}
                onClick={() => openWorkoutSport(sport)}
              />
            ))}
            {canAddRace && (
              <MenuItem
                label="Race"
                icon={
                  <Flag
                    className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                    strokeWidth={2}
                  />
                }
                onClick={openRace}
                className="border-t border-border/50 font-medium"
              />
            )}
            {canAddEvent && (
              <MenuItem
                label="Event"
                icon={
                  <CalendarRange
                    className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                    strokeWidth={2}
                  />
                }
                onClick={openEvent}
                className={cn(!canAddRace && 'border-t border-border/50', 'font-medium')}
              />
            )}
            {canShowNoteOption && (
              <MenuItem
                label={
                  dayNoteKindHasContent(dayNote, isCoach ? 'coach' : 'athlete')
                    ? isCoach
                      ? 'Edit coach note'
                      : 'Edit athlete note'
                    : isCoach
                      ? 'Coach note'
                      : 'Athlete note'
                }
                icon={
                  <StickyNote
                    className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                    strokeWidth={2}
                  />
                }
                onClick={openNote}
              />
            )}
            {canAddRecoveryOption && (
              <MenuItem
                label="Recovery Day"
                onClick={openRecovery}
                className="font-medium"
              />
            )}
          </div>,
          document.body,
        )
      : null

  return (
    <div
      className={cn(
        fillCell ? 'absolute inset-0 z-[1]' : 'relative shrink-0',
        !fillCell &&
          revealOnHover &&
          !menuOpen &&
          'opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/day:opacity-100 [@media(hover:hover)]:group-focus-within/day:opacity-100',
        !fillCell && revealOnHover && menuOpen && 'opacity-100',
        className,
      )}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          anchorRef.current = { x: e.clientX, y: e.clientY }
          handleAddClick()
        }}
        className={cn(
          fillCell
            ? cn(
                'group flex h-full min-h-0 w-full cursor-pointer items-center justify-center rounded-[4px] bg-transparent transition',
                isSubtle
                  ? 'opacity-40 hover:opacity-100 focus-visible:opacity-100'
                  : cn(
                      'text-[var(--tt-ink-faint,#9a9a9a)] opacity-0 hover:opacity-100 focus-visible:opacity-100',
                      '[@media(hover:none)]:opacity-40',
                    ),
                menuOpen && 'opacity-100',
              )
            : isSubtle
              ? cn(weekAddPlusButtonClass.footer, menuOpen && 'opacity-100')
              : weekAddPlusIconButtonClass,
          !fillCell &&
            !isSubtle &&
            menuOpen &&
            'bg-[var(--tt-sidebar,#f5f5f5)] opacity-100',
        )}
        aria-label={
          isCoach || canAddWorkout
            ? `Add to ${dateKey}`
            : `Add note on ${dateKey}`
        }
        aria-expanded={isCoach || canAddWorkout ? menuOpen : undefined}
      >
        <WeekAddPlusMark size={isSubtle ? 'footer' : 'cell'} />
      </button>

      {menuPanel}

      {workoutOpen && workoutSport && (
        <WorkoutEditorDialog
          open={workoutOpen}
          onOpenChange={handleWorkoutOpenChange}
          date={dateKey}
          sport={workoutSport}
          athleteMode={!isCoach}
        />
      )}
      {canShowNoteOption && (
        <DayNoteModal
          dateKey={dateKey}
          note={dayNote}
          noteKind={(isCoach ? 'coach' : 'athlete') as DayNoteKind}
          athleteId={athleteId}
          open={noteOpen}
          onOpenChange={setNoteOpen}
        />
      )}
      {canAddEvent && (
        <SeasonEventModal
          open={eventOpen}
          onOpenChange={setEventOpen}
          defaultStartDate={dateKey}
          defaultEndDate={dateKey}
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
      {canAddRace && (
        <AddRaceModal
          open={raceOpen}
          onOpenChange={setRaceOpen}
          athleteId={athleteId}
          defaultIntent={RaceIntent.PLANNED}
          defaultDate={dateKey}
        />
      )}
    </div>
  )
}
