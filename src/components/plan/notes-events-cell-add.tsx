'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarRange, StickyNote } from 'lucide-react'
import { DayNoteModal } from '@/components/plan/day-note-modal'
import { SeasonEventModal } from '@/components/plan/season-event-modal'
import {
  WeekAddPlusMark,
  weekAddPlusButtonClass,
} from '@/components/plan/week-add-plus'
import type { DayNoteData, DayNoteKind } from '@/lib/day-notes'
import { cn } from '@/lib/utils'

type NotesEventsCellAddProps = {
  dateKey: string
  canAddNote: boolean
  canAddEvent: boolean
  noteKind: DayNoteKind
  dayNote?: DayNoteData | null
  athleteId?: string
}

type MenuPosition = {
  left: number
  top: number
  maxHeight: number
}

/**
 * Empty Notes · Events week cell — + opens a chooser when both add paths are available.
 * Menu is portaled so the week table `overflow: hidden` cannot clip it.
 */
export function NotesEventsCellAdd({
  dateKey,
  canAddNote,
  canAddEvent,
  noteKind,
  dayNote,
  athleteId,
}: NotesEventsCellAddProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  const [eventOpen, setEventOpen] = useState(false)
  const [menuPos, setMenuPos] = useState<MenuPosition | null>(null)
  const [portalReady, setPortalReady] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuPanelRef = useRef<HTMLDivElement>(null)

  const both = canAddNote && canAddEvent

  useEffect(() => {
    setPortalReady(true)
  }, [])

  function updateMenuPosition() {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const gap = 4
    const viewportPad = 8
    setMenuPos({
      left: rect.left + rect.width / 2,
      top: rect.top + rect.height / 2,
      maxHeight: Math.max(
        80,
        window.innerHeight - rect.top - rect.height / 2 - viewportPad - gap,
      ),
    })
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
  }, [menuOpen])

  useEffect(() => {
    if (!menuOpen) return
    function handleClick(event: MouseEvent) {
      const target = event.target as Node
      if (triggerRef.current?.contains(target)) return
      if (menuPanelRef.current?.contains(target)) return
      setMenuOpen(false)
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [menuOpen])

  if (!canAddNote && !canAddEvent) return null

  function openNote() {
    setMenuOpen(false)
    setNoteOpen(true)
  }

  function openEvent() {
    setMenuOpen(false)
    setEventOpen(true)
  }

  const menuPanel =
    menuOpen && both && menuPos && portalReady
      ? createPortal(
          <div
            ref={menuPanelRef}
            className="fixed z-[300] min-w-[9.5rem] overflow-y-auto rounded-lg border border-border/80 bg-card py-1 shadow-lg"
            style={{
              left: menuPos.left,
              top: menuPos.top,
              maxHeight: menuPos.maxHeight,
              transform: 'translateX(-50%)',
            }}
          >
            <button
              type="button"
              onClick={openEvent}
              className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm font-medium text-foreground transition hover:bg-foreground/[0.04]"
            >
              <CalendarRange
                className="h-3.5 w-3.5 shrink-0 text-foreground"
                strokeWidth={2}
              />
              Event
            </button>
            <button
              type="button"
              onClick={openNote}
              className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm font-medium text-foreground transition hover:bg-foreground/[0.04]"
            >
              <StickyNote
                className="h-3.5 w-3.5 shrink-0 text-foreground"
                strokeWidth={2}
              />
              {noteKind === 'coach' ? 'Coach note' : 'Athlete note'}
            </button>
          </div>,
          document.body,
        )
      : null

  return (
    <div className="absolute inset-0 z-[1]">
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          if (both) {
            setMenuOpen((open) => !open)
            return
          }
          if (canAddNote) setNoteOpen(true)
          else setEventOpen(true)
        }}
        className={cn(weekAddPlusButtonClass.cell, menuOpen && 'opacity-100')}
        aria-label={
          both
            ? `Add note or event on ${dateKey}`
            : canAddNote
              ? `Add note on ${dateKey}`
              : `Add event on ${dateKey}`
        }
        aria-expanded={both ? menuOpen : undefined}
      >
        <WeekAddPlusMark size="cell" />
      </button>

      {menuPanel}

      {canAddNote ? (
        <DayNoteModal
          dateKey={dateKey}
          note={dayNote}
          noteKind={noteKind}
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
    </div>
  )
}
