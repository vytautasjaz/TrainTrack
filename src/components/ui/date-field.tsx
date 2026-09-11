'use client'

/**
 * App-wide date control. All date picking in the product should use this —
 * the popover chrome lives in `.tt-date-picker` (globals.css).
 */
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

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
const PANEL_WIDTH = 300
const PANEL_HEIGHT = 340

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
  const [yearPicker, setYearPicker] = useState(false)
  const [viewKey, setViewKey] = useState(() =>
    monthStartKey(value || todayDateKey()),
  )
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState({
    top: 0,
    left: 0,
    caretX: PANEL_WIDTH / 2,
    placement: 'below' as 'below' | 'above',
  })
  const [portalReady, setPortalReady] = useState(false)

  useEffect(() => {
    setPortalReady(true)
  }, [])

  useEffect(() => {
    if (!open) return
    setViewKey(monthStartKey(value || todayDateKey()))
    setYearPicker(false)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps -- only reset view when opening

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const left = Math.min(
      Math.max(8, rect.left + rect.width / 2 - PANEL_WIDTH / 2),
      window.innerWidth - PANEL_WIDTH - 8,
    )
    const below = rect.bottom + 10
    const placeAbove =
      below + PANEL_HEIGHT > window.innerHeight && rect.top - PANEL_HEIGHT - 10 > 8
    const top = placeAbove ? rect.top - PANEL_HEIGHT - 10 : below
    const caretX = Math.min(
      Math.max(16, rect.left + rect.width / 2 - left),
      PANEL_WIDTH - 16,
    )
    setPos({
      top,
      left,
      caretX,
      placement: placeAbove ? 'above' : 'below',
    })
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
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
        <Calendar
          className={cn(
            'h-3.5 w-3.5 shrink-0',
            variant === 'ghost' ? 'opacity-70' : 'opacity-60',
          )}
          strokeWidth={2}
        />
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
            <>
              {/*
                Dedicated backdrop closes the picker without a document capture
                listener (those raced Dialog and unmounted the panel before click).
              */}
              <div
                data-tt-date-field-backdrop
                className="fixed inset-0 z-[219] pointer-events-auto"
                aria-hidden
                onPointerDown={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  setOpen(false)
                }}
              />
              <div
                role="listbox"
                aria-label="Choose date"
                data-tt-date-field-panel
                data-radix-popover-content
                className="tt-date-picker fixed z-[220] pointer-events-auto"
                style={{ top: pos.top, left: pos.left }}
                onPointerDown={(event) => {
                  // Keep parent Dialog from treating this as an outside click.
                  event.stopPropagation()
                }}
              >
                <span
                  className="tt-date-picker__caret"
                  data-placement={pos.placement}
                  style={{ left: pos.caretX }}
                  aria-hidden
                />

                <div className="relative mb-3 flex items-center gap-2">
                  <button
                    type="button"
                    className="tt-date-picker__month-btn"
                    onClick={() => setYearPicker((prev) => !prev)}
                    aria-label={yearPicker ? 'Show calendar' : 'Choose year'}
                    aria-expanded={yearPicker}
                  >
                    <span className="tt-date-picker__month-label">{monthLabel}</span>
                    <ChevronRight
                      className={cn(
                        'h-3.5 w-3.5 shrink-0 text-brand transition-transform',
                        yearPicker && 'rotate-90',
                      )}
                      strokeWidth={2.5}
                    />
                  </button>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      className="tt-date-picker__nav-btn"
                      onClick={() => {
                        setYearPicker(false)
                        setViewKey(
                          toDateKey(addDateOnlyMonths(parseDateOnly(viewKey), -1)),
                        )
                      }}
                      aria-label="Previous month"
                    >
                      <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
                    </button>
                    <button
                      type="button"
                      className="tt-date-picker__nav-btn"
                      onClick={() => {
                        setYearPicker(false)
                        setViewKey(
                          toDateKey(addDateOnlyMonths(parseDateOnly(viewKey), 1)),
                        )
                      }}
                      aria-label="Next month"
                    >
                      <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
                    </button>
                  </div>
                </div>

                {yearPicker ? (
                  <div className="grid max-h-[15.5rem] grid-cols-3 gap-1.5 overflow-y-auto pr-0.5">
                    {years.map((y) => (
                      <button
                        key={y}
                        type="button"
                        data-selected={y === year ? 'true' : undefined}
                        className="tt-date-picker__year"
                        onClick={() => {
                          const d = parseDateOnly(viewKey)
                          setViewKey(
                            toDateKey(new Date(Date.UTC(y, d.getUTCMonth(), 1))),
                          )
                          setYearPicker(false)
                        }}
                      >
                        {y}
                      </button>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="mb-1.5 grid grid-cols-7">
                      {WEEKDAYS.map((day) => (
                        <span key={day} className="tt-date-picker__weekday">
                          {day}
                        </span>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-y-1">
                      {cells.map((key, index) => {
                        if (!key) {
                          return (
                            <span
                              key={`e-${index}`}
                              className="flex h-9 items-center justify-center"
                            />
                          )
                        }
                        const blocked = isOutOfRange(key, min, max)
                        const selected = key === value
                        const isToday = key === today
                        return (
                          <div
                            key={key}
                            className="flex h-9 items-center justify-center"
                          >
                            <button
                              type="button"
                              disabled={blocked}
                              data-selected={selected ? 'true' : undefined}
                              data-today={isToday ? 'true' : undefined}
                              className="tt-date-picker__day"
                              onClick={() => commit(key)}
                            >
                              {Number(key.slice(8, 10))}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            </>,
            document.body,
          )
        : null}
    </>
  )
}
