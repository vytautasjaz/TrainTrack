'use client'

import { useEffect, useId, useMemo, useState, useTransition } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { WorkoutType } from '@prisma/client'
import { Button } from '@/components/ui/button'
import {
  getLibraryMonthPlanMarkers,
  type LibraryPlanDayWorkout,
} from '@/app/actions/library-schedule'
import { cn } from '@/lib/utils'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

const SPORT_DOT: Record<WorkoutType, string> = {
  RUN: 'var(--color-sport-run)',
  BIKE: 'var(--color-sport-bike)',
  SWIM: 'var(--color-sport-swim)',
  STRENGTH: 'var(--color-sport-strength)',
  HYROX: 'var(--color-sport-hyrox)',
  TRIATHLON: 'var(--color-sport-tri)',
  RECOVERY: 'var(--color-sport-recovery)',
  REST: 'var(--color-sport-rest)',
}

function parseDateKey(key: string) {
  const [y, m, d] = key.split('-').map(Number)
  return { y: y!, m0: (m ?? 1) - 1, d: d! }
}

function toDateKey(y: number, m0: number, d: number) {
  return `${y}-${String(m0 + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function daysInMonth(y: number, m0: number) {
  return new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate()
}

function leadingBlanksMon(y: number, m0: number) {
  const dow = new Date(Date.UTC(y, m0, 1)).getUTCDay()
  return (dow + 6) % 7
}

function formatScheduleLabel(dateKey: string) {
  const { y, m0, d } = parseDateKey(dateKey)
  const date = new Date(Date.UTC(y, m0, d))
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}

function addDays(dateKey: string, delta: number) {
  const { y, m0, d } = parseDateKey(dateKey)
  const next = new Date(Date.UTC(y, m0, d + delta))
  return toDateKey(next.getUTCFullYear(), next.getUTCMonth(), next.getUTCDate())
}

type LibraryScheduleDayModalProps = {
  templateTitle: string
  templateMeta?: string | null
  today: string
  open: boolean
  pending?: boolean
  onClose: () => void
  onConfirm: (dateKey: string) => void
}

export function LibraryScheduleDayModal({
  templateTitle,
  templateMeta,
  today,
  open,
  pending = false,
  onClose,
  onConfirm,
}: LibraryScheduleDayModalProps) {
  const titleId = useId()
  const initial = parseDateKey(today)
  const [cursor, setCursor] = useState({ y: initial.y, m0: initial.m0 })
  const [selected, setSelected] = useState(today)
  const [markers, setMarkers] = useState<LibraryPlanDayWorkout[]>([])
  const [loadPending, startLoad] = useTransition()

  useEffect(() => {
    if (!open) return
    setSelected(today)
    const t = parseDateKey(today)
    setCursor({ y: t.y, m0: t.m0 })
  }, [open, today])

  useEffect(() => {
    if (!open) return
    startLoad(() => {
      void getLibraryMonthPlanMarkers(cursor.y, cursor.m0).then(setMarkers)
    })
  }, [open, cursor.y, cursor.m0])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  const byDate = useMemo(() => {
    const map = new Map<string, LibraryPlanDayWorkout[]>()
    for (const w of markers) {
      const list = map.get(w.dateKey) ?? []
      list.push(w)
      map.set(w.dateKey, list)
    }
    return map
  }, [markers])

  const blanks = leadingBlanksMon(cursor.y, cursor.m0)
  const dim = daysInMonth(cursor.y, cursor.m0)
  const cells: Array<{ key: string; day: number } | null> = [
    ...Array.from({ length: blanks }, () => null),
    ...Array.from({ length: dim }, (_, i) => {
      const day = i + 1
      return { key: toDateKey(cursor.y, cursor.m0, day), day }
    }),
  ]

  const dayWorkouts = byDate.get(selected) ?? []

  if (!open) return null

  function shiftMonth(delta: number) {
    setCursor((c) => {
      const d = new Date(Date.UTC(c.y, c.m0 + delta, 1))
      return { y: d.getUTCFullYear(), m0: d.getUTCMonth() }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex cursor-pointer items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4 [&_a]:cursor-pointer [&_button:not(:disabled)]:cursor-pointer [&_select]:cursor-pointer"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !pending) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[min(92vh,40rem)] w-full max-w-[24rem] cursor-default flex-col overflow-hidden rounded-t-[8px] border border-[var(--tt-line,#ebebeb)] bg-white shadow-[0_20px_50px_rgba(17,17,17,0.18)] sm:rounded-[8px]"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--tt-line,#ebebeb)] px-4 py-3">
          <div className="min-w-0">
            <p
              id={titleId}
              className="text-[14px] font-semibold text-[var(--tt-ink,#111)]"
            >
              Schedule workout
            </p>
            <p className="mt-0.5 truncate text-[12px] text-[var(--tt-ink-soft,#666)]">
              {templateTitle}
              {templateMeta ? ` · ${templateMeta}` : null}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-md p-1 text-[var(--tt-ink-faint,#9a9a9a)] hover:bg-black/[0.04] hover:text-[var(--tt-ink,#111)]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] text-[var(--tt-ink-soft,#666)] hover:bg-[var(--tt-sidebar,#f5f5f5)] hover:text-[var(--tt-ink,#111)]"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-[13px] font-semibold text-[var(--tt-ink,#111)]">
              {MONTH_NAMES[cursor.m0]} {cursor.y}
              {loadPending ? (
                <span className="ml-1.5 text-[10px] font-normal text-[var(--tt-ink-faint,#9a9a9a)]">
                  …
                </span>
              ) : null}
            </p>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] text-[var(--tt-ink-soft,#666)] hover:bg-[var(--tt-sidebar,#f5f5f5)] hover:text-[var(--tt-ink,#111)]"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-0.5 text-center text-[10px] font-semibold uppercase tracking-wide text-[var(--tt-ink-faint,#9a9a9a)]">
            {WEEKDAYS.map((d) => (
              <span key={d} className="py-1">
                {d}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((cell, i) => {
              if (!cell) return <span key={`b-${i}`} className="h-11" />
              const isSelected = cell.key === selected
              const isToday = cell.key === today
              const existing = byDate.get(cell.key) ?? []
              const dots = existing.slice(0, 3)
              return (
                <button
                  key={cell.key}
                  type="button"
                  onClick={() => setSelected(cell.key)}
                  className={cn(
                    'relative flex h-11 flex-col items-center justify-center rounded-[6px] text-[13px] tabular-nums transition',
                    isSelected
                      ? 'bg-[var(--tt-ink,#111)] font-semibold text-white'
                      : 'text-[var(--tt-ink,#111)] hover:bg-[var(--tt-sidebar,#f5f5f5)]',
                  )}
                >
                  <span className="leading-none">{cell.day}</span>
                  {dots.length > 0 ? (
                    <span className="mt-1 flex items-center gap-0.5">
                      {dots.map((w) => (
                        <span
                          key={w.id}
                          className="h-1 w-1 rounded-full"
                          style={{
                            background: isSelected
                              ? 'rgba(255,255,255,0.85)'
                              : SPORT_DOT[w.type],
                          }}
                        />
                      ))}
                      {existing.length > 3 ? (
                        <span
                          className={cn(
                            'text-[8px] leading-none',
                            isSelected
                              ? 'text-white/80'
                              : 'text-[var(--tt-ink-faint,#9a9a9a)]',
                          )}
                        >
                          +
                        </span>
                      ) : null}
                    </span>
                  ) : isToday && !isSelected ? (
                    <span className="mt-1 h-1 w-1 rounded-full bg-[var(--tt-red,#c8102e)]" />
                  ) : (
                    <span className="mt-1 h-1 w-1" aria-hidden />
                  )}
                </button>
              )
            })}
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => {
                setSelected(today)
                const { y, m0 } = parseDateKey(today)
                setCursor({ y, m0 })
              }}
              className="rounded-[6px] px-2 py-1 text-[11px] font-medium text-[var(--tt-ink-soft,#666)] hover:text-[var(--tt-ink,#111)]"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                const key = addDays(today, 1)
                setSelected(key)
                const { y, m0 } = parseDateKey(key)
                setCursor({ y, m0 })
              }}
              className="rounded-[6px] px-2 py-1 text-[11px] font-medium text-[var(--tt-ink-soft,#666)] hover:text-[var(--tt-ink,#111)]"
            >
              Tomorrow
            </button>
          </div>

          <div className="mt-4 border-t border-[var(--tt-line,#ebebeb)] pt-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--tt-ink-faint,#9a9a9a)]">
              Already on {formatScheduleLabel(selected)}
            </p>
            {dayWorkouts.length === 0 ? (
              <p className="rounded-[6px] border border-dashed border-[var(--tt-line,#ebebeb)] px-3 py-3 text-[12px] text-[var(--tt-ink-faint,#9a9a9a)]">
                Free day — nothing scheduled yet.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {dayWorkouts.map((w) => (
                  <li
                    key={w.id}
                    className="flex items-center gap-2 rounded-[6px] border border-[var(--tt-line,#ebebeb)] px-2.5 py-1.5"
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: SPORT_DOT[w.type] }}
                    />
                    <span className="min-w-0 truncate text-[12px] font-medium text-[var(--tt-ink,#111)]">
                      {w.title}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-[11px] leading-relaxed text-[var(--tt-ink-faint,#9a9a9a)]">
              New ·{' '}
              <span className="font-medium text-[var(--tt-ink-soft,#666)]">
                {templateTitle}
              </span>{' '}
              will be added to this day.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-[var(--tt-line,#ebebeb)] px-4 py-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() => onConfirm(selected)}
          >
            {pending ? 'Scheduling…' : `Schedule · ${formatScheduleLabel(selected)}`}
          </Button>
        </div>
      </div>
    </div>
  )
}
