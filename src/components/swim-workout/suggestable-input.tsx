'use client'

import { useId, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type SuggestableInputProps = {
  value: string
  onChange: (value: string) => void
  suggestions: readonly string[]
  placeholder: string
  'aria-label': string
  className?: string
  listId?: string
  onBlur?: InputHTMLAttributes<HTMLInputElement>['onBlur']
  onFocus?: InputHTMLAttributes<HTMLInputElement>['onFocus']
  inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode']
  autoComplete?: InputHTMLAttributes<HTMLInputElement>['autoComplete']
}

/** Free-text input with datalist suggestions (combobox-style). */
export function SuggestableInput({
  value,
  onChange,
  suggestions,
  placeholder,
  'aria-label': ariaLabel,
  className,
  listId,
  onBlur,
  onFocus,
  inputMode,
  autoComplete,
}: SuggestableInputProps) {
  const autoId = useId()
  const id = listId ?? autoId

  return (
    <>
      <input
        list={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        onFocus={onFocus}
        placeholder={placeholder}
        aria-label={ariaLabel}
        inputMode={inputMode}
        autoComplete={autoComplete}
        className={cn(
          'min-w-0 truncate rounded-[4px] border border-transparent bg-transparent px-1.5 py-1 text-[13px] text-[#111827] outline-none placeholder:text-muted-foreground/45 hover:border-border/60 focus:border-sky-400/50 focus:bg-white',
          className,
        )}
      />
      <datalist id={id}>
        {suggestions.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </>
  )
}
