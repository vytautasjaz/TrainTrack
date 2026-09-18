'use client'

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ComboboxOption = {
  value: string
  label: string
}

type ComboboxProps = {
  value: string
  onChange: (value: string) => void
  options: ComboboxOption[]
  placeholder?: string
  /** Called when the user picks a listed option (not free-typed). */
  onSelectOption?: (option: ComboboxOption) => void
  disabled?: boolean
  name?: string
  id?: string
  required?: boolean
  className?: string
  inputClassName?: string
  emptyMessage?: ReactNode
  /** Allow values that are not in `options` (default true). */
  allowCustom?: boolean
  autoFocus?: boolean
}

/**
 * Text input with a filterable suggestion list. Free text is allowed unless
 * `allowCustom` is false.
 */
export function Combobox({
  value,
  onChange,
  options,
  placeholder,
  onSelectOption,
  disabled = false,
  name,
  id: idProp,
  required = false,
  className,
  inputClassName,
  emptyMessage = 'No matches',
  allowCustom = true,
  autoFocus = false,
}: ComboboxProps) {
  const autoId = useId()
  const id = idProp ?? autoId
  const listId = `${id}-listbox`
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)

  const query = value.trim().toLowerCase()
  const filtered = query
    ? options.filter(
        (opt) =>
          opt.label.toLowerCase().includes(query) ||
          opt.value.toLowerCase().includes(query),
      )
    : options

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  useEffect(() => {
    setHighlight(0)
  }, [query, open])

  function pick(option: ComboboxOption) {
    onChange(option.label)
    onSelectOption?.(option)
    setOpen(false)
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (!open) {
        setOpen(true)
        return
      }
      setHighlight((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlight((i) => Math.max(i - 1, 0))
      return
    }
    if (event.key === 'Enter' && open && filtered[highlight]) {
      event.preventDefault()
      pick(filtered[highlight]!)
      return
    }
    if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <div className="relative">
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && filtered[highlight]
              ? `${listId}-opt-${highlight}`
              : undefined
          }
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          value={value}
          autoComplete="off"
          autoFocus={autoFocus}
          className={cn('input-field pr-8', inputClassName)}
          onChange={(e) => {
            onChange(e.target.value)
            if (!open) setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          aria-label="Show suggestions"
          className="absolute inset-y-0 right-0 flex w-8 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40"
          onClick={() => setOpen((prev) => !prev)}
        >
          <ChevronDown className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-[200] mt-1 max-h-48 w-full overflow-y-auto overscroll-contain rounded-[6px] border border-border bg-card py-1 shadow-lg"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-xs text-muted-foreground">
              {allowCustom ? (
                <span>
                  Use “{value.trim() || '…'}” as a custom name
                </span>
              ) : (
                emptyMessage
              )}
            </li>
          ) : (
            filtered.map((opt, index) => {
              const selected =
                opt.label.toLowerCase() === value.trim().toLowerCase()
              return (
                <li
                  key={opt.value}
                  id={`${listId}-opt-${index}`}
                  role="option"
                  aria-selected={selected}
                  className={cn(
                    'cursor-pointer px-3 py-2 text-sm outline-none',
                    index === highlight
                      ? 'bg-foreground/[0.06]'
                      : 'hover:bg-foreground/[0.04]',
                  )}
                  onMouseEnter={() => setHighlight(index)}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    pick(opt)
                  }}
                >
                  {opt.label}
                </li>
              )
            })
          )}
        </ul>
      ) : null}
    </div>
  )
}
