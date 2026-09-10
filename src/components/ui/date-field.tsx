'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  addDateOnlyMonths,
  formatDateKeyLong,
  parseDateOnly,
  toDateKey,
  todayDateKey,
} from '@/lib/dates'
import { cn } from '@/lib/utils'

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const

type DateFieldProps = {
  name?: string
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  required?: boolean
  min?: string
  max?: string
  disabled?: boolean
  readOnly?: boolean
  className?: string
  /** `ghost` — text button (race hero). `compact` — library schedule row. */
  variant?: 'field' | 'compact' | 'ghost'
  placeholder?: string
  id?: string
}

function monthStartKey(dateKey: string): string {
  const d = parseDateOnly(dateKey)
  return toDateKey(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)))
}

function monthGrid(monthKey: string): (string | null)[] {
  const start = parseDateOnly(monthKey)
  const year = start.getUTCFullYear()
  const month = start.getUTCMonth()
  const firstDow = (start.getUTCDay() + 6) % 7
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const cells: (string | null)[] = Array.from({ length: firstDow }, () => null)
  for (let day = 1; day <= lastDay; day += 1) {
    cells.push(toDateKey(new Date(Date.UTC(year, month, day))))
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function isOutOfRange(key: string, min?: string, max?: string): boolean {
  if (min && key < min) return true
  if (max && key > max) return true
  return false
}

export function DateField({
  name,
  value: valueProp,
  defaultValue = '',
  onChange,
  required = false,
  min,
  max,
  disabled = false,
  readOnly = false,
  className,
  variant = 'field',
  placeholder = 'Pick a date',
  id,
}: DateFieldProps) {
  const controlled = valueProp !== undefined
  const [inner, setInner] = useState(defaultValue)
  const value = controlled ? valueProp : inner
  const [open, setOpen] = useState(false)
  const [viewKey, setViewKey] = useState(() =>
    monthStartKey(value || todayDateKey()),
  )
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const [portalReady, setPortalReady] = useState(false)

  useEffect(() => {
    setPortalReady(true)
  }, [])

  useEffect(() => {
    if (open) setViewKey(monthStartKey(value || todayDateKey()))
  }, [open, value])

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const width = 272
    const height = 340
    const left = Math.min(
      Math.max(8, rect.left),
      window.innerWidth - width - 8,
    )
    const below = rect.bottom + 6
    const top =
      below + height > window.innerHeight && rect.top - height - 6 > 8
        ? rect.top - height - 6
        : below
    setPos({ top, left })
  }, [open])

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) {
        return
      }
      setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function commit(next: string) {
    if (!controlled) setInner(next)
    onChange?.(next)
    setOpen(false)
  }

  const viewDate = parseDateOnly(viewKey)
  const monthLabel = viewDate.toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
  const cells = monthGrid(viewKey)
  const today = todayDateKey()
  const year = viewDate.getUTCFullYear()
  const around = new Date().getFullYear()
  const years = (() => {
    const list: number[] = []
    for (let y = around - 6; y <= around + 8; y += 1) list.push(y)
    if (!list.includes(year)) list.push(year)
    return [...new Set(list)].sort((a, b) => a - b)
  })()

  const canOpen = !disabled && !readOnly
  const label = value ? formatDateKeyLong(value) : placeholder

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={!canOpen}
        onClick={() => canOpen && setOpen((prev) => !prev)}
        className={cn(
          variant === 'ghost'
            ? 'inline-flex items-center gap-1.5 text-left text-[13px] leading-snug transition hover:opacity-80'
            : cn(
                'input-field flex items-center gap-2 text-left',
                variant === 'compact' && 'h-8 min-h-0 px-2 py-0',
              ),
          !value && 'text-muted-foreground',
          !value && variant === 'ghost' && 'italic',
          className,
        )}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {variant !== 'ghost' ? (
          <Calendar className="h-3.5 w-3.5 shrink-0 opacity-60" strokeWidth={2} />
        ) : (
          <Calendar className="h-3.5 w-3.5 shrink-0 opacity-70" strokeWidth={2} />
        )}
        <span className="min-w-0 flex-1 truncate">{label}</span>
      </button>
      {name ? (
        <input
          type="text"
          name={name}
          value={value}
          required={required}
          tabIndex={-1}
          aria-hidden
          className="sr-only"
          onChange={() => {}}
          onFocus={() => triggerRef.current?.click()}
        />
      ) : null}

      {portalReady && open
        ? createPortal(
            <div
              ref={panelRef}
              role="dialog"
              aria-label="Choose date"
              data-radix-popover-content
              className="fixed z-[220] w-[17rem] rounded-[10px] border border-border bg-card p-3 shadow-lg"
              style={{ top: pos.top, left: pos.left }}
            >
              <div className="mb-2 flex items-center gap-1">
                <button
                  type="button"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-muted-foreground hover:bg-muted/70"
                  onClick={() =>
                    setViewKey(toDateKey(addDateOnlyMonths(parseDateOnly(viewKey), -1)))
                  }
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <p className="min-w-0 flex-1 text-center text-sm font-medium capitalize">
                  {monthLabel}
                </p>
                <button
                  type="button"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-muted-foreground hover:bg-muted/70"
                  onClick={() =>
                    setViewKey(toDateKey(addDateOnlyMonths(parseDateOnly(viewKey), 1)))
                  }
                  aria-label="Next month"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="mb-2 flex justify-center">
                <select
                  value={year}
                  onChange={(e) => {
                    const nextYear = Number(e.target.value)
                    const d = parseDateOnly(viewKey)
                    setViewKey(
                      toDateKey(new Date(Date.UTC(nextYear, d.getUTCMonth(), 1))),
                    )
                  }}
                  className="rounded-[6px] border border-border bg-card px-2 py-0.5 text-xs text-muted-foreground"
                  aria-label="Year"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {WEEKDAYS.map((day) => (
                  <span key={day} className="py-1">
                    {day}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {cells.map((key, index) => {
                  if (!key) {
                    return <span key={`e-${index}`} className="h-8" />
                  }
                  const blocked = isOutOfRange(key, min, max)
                  const selected = key === value
                  const isToday = key === today
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={blocked}
                      onClick={() => commit(key)}
                      className={cn(
                        'h-8 rounded-[6px] text-sm tabular-nums transition',
                        blocked && 'cursor-not-allowed text-muted-foreground/40',
                        !blocked && !selected && 'hover:bg-muted/80',
                        selected && 'bg-foreground font-semibold text-background',
                        isToday && !selected && 'ring-1 ring-inset ring-foreground/30',
                      )}
                    >
                      {Number(key.slice(8, 10))}
                    </button>
                  )
                })}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
