'use client'

import { useEffect, useRef, useState, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export const editableInputDragHandlers = {
  onMouseDown: (e: React.SyntheticEvent) => e.stopPropagation(),
  onPointerDown: (e: React.SyntheticEvent) => e.stopPropagation(),
  onDragStart: (e: React.DragEvent) => e.preventDefault(),
}

function formatNumberDraft(value: number): string {
  if (value === 0) return ''
  return String(value)
}

export type NumberInputProps = {
  value: number
  onChange: (value: number) => void
  className?: string
  min?: number
  integer?: boolean
  inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode']
  'aria-label'?: string
  preventDrag?: boolean
}

export function NumberInput({
  value,
  onChange,
  className,
  min,
  integer = false,
  inputMode = 'decimal',
  'aria-label': ariaLabel,
  preventDrag = true,
}: NumberInputProps) {
  const [draft, setDraft] = useState(() => formatNumberDraft(value))
  const focusedRef = useRef(false)

  useEffect(() => {
    if (!focusedRef.current) {
      setDraft(formatNumberDraft(value))
    }
  }, [value])

  function commit(raw: string) {
    if (raw === '' || raw === '.' || raw === '-') {
      const fallback = min ?? 0
      onChange(fallback)
      setDraft(formatNumberDraft(fallback))
      return
    }

    const num = integer ? parseInt(raw, 10) : parseFloat(raw)
    if (Number.isNaN(num)) {
      setDraft(formatNumberDraft(value))
      return
    }

    const next = min != null ? Math.max(min, num) : num
    onChange(next)
    setDraft(formatNumberDraft(next))
  }

  function isValidDraft(next: string) {
    if (next === '') return true
    return integer ? /^\d+$/.test(next) : /^-?\d*\.?\d*$/.test(next)
  }

  return (
    <input
      type="text"
      inputMode={inputMode}
      value={draft}
      onChange={(e) => {
        const next = e.target.value
        if (!isValidDraft(next)) return
        setDraft(next)
        if (next === '' || next === '.' || next === '-') return
        const num = integer ? parseInt(next, 10) : parseFloat(next)
        if (!Number.isNaN(num)) onChange(min != null ? Math.max(min, num) : num)
      }}
      onFocus={() => {
        focusedRef.current = true
      }}
      onBlur={() => {
        focusedRef.current = false
        commit(draft)
      }}
      aria-label={ariaLabel}
      className={className}
      {...(preventDrag ? editableInputDragHandlers : {})}
    />
  )
}
