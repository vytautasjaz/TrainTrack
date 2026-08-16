'use client'

import { cn } from '@/lib/utils'

type PrivateNoteToggleProps = {
  /** Who should be blocked from seeing the note. */
  hideFrom: 'coach' | 'athlete'
  name?: string
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  className?: string
}

export function PrivateNoteToggle({
  hideFrom,
  name,
  checked,
  defaultChecked,
  onCheckedChange,
  className,
}: PrivateNoteToggleProps) {
  const label =
    hideFrom === 'coach'
      ? 'Keep private — don’t show to coach'
      : 'Keep private — don’t show to athlete'

  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-2 text-xs leading-snug text-muted-foreground',
        className,
      )}
    >
      <input
        type="checkbox"
        name={name}
        value="true"
        checked={checked}
        defaultChecked={defaultChecked}
        onChange={
          onCheckedChange
            ? (e) => onCheckedChange(e.target.checked)
            : undefined
        }
        className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-brand"
      />
      <span>{label}</span>
    </label>
  )
}
