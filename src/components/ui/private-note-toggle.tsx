'use client'

import { Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

type PrivateNoteToggleProps = {
  /** Who should be blocked from seeing the note. */
  hideFrom: 'coach' | 'athlete'
  name?: string
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  /** Overrides the default hideFrom copy. */
  label?: string
  /** Secondary line under the label. */
  description?: string
  className?: string
}

export function PrivateNoteToggle({
  hideFrom,
  name,
  checked,
  defaultChecked,
  onCheckedChange,
  label: labelOverride,
  description: descriptionOverride,
  className,
}: PrivateNoteToggleProps) {
  const label =
    labelOverride ??
    (hideFrom === 'coach'
      ? 'Keep private — don’t show to coach'
      : 'Keep private — don’t show to athlete')
  const description =
    descriptionOverride ??
    (labelOverride ? undefined : 'Only you will be able to see this note')

  return (
    <label
      className={cn(
        'grid cursor-pointer grid-cols-[auto_auto_minmax(0,1fr)] items-start gap-x-2.5 gap-y-0.5 text-xs leading-snug',
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
      <Lock
        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground"
        strokeWidth={2}
        aria-hidden
      />
      <span className="min-w-0">
        <span className="block font-medium text-foreground">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-[11px] text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  )
}
