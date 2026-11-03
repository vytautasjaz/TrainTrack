'use client'

import { FormLabel } from '@/components/ui/typography'
import { cn } from '@/lib/utils'

export type CoachAthleteOption = {
  id: string
  name: string
}

type CoachAthleteMultiPickerProps = {
  athletes: CoachAthleteOption[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  label?: string
  /** Highlight / prefer these when using “Only current”. */
  currentAthleteId?: string | null
  className?: string
  /** Compact empty / loading copy. */
  emptyLabel?: string
}

export function CoachAthleteMultiPicker({
  athletes,
  selectedIds,
  onChange,
  label = 'Athletes',
  currentAthleteId = null,
  className,
  emptyLabel = 'No athletes on your roster.',
}: CoachAthleteMultiPickerProps) {
  const selected = new Set(selectedIds)

  function toggle(id: string) {
    if (selected.has(id)) {
      onChange(selectedIds.filter((x) => x !== id))
    } else {
      onChange([...selectedIds, id])
    }
  }

  function selectAll() {
    onChange(athletes.map((a) => a.id))
  }

  function selectCurrentOnly() {
    if (currentAthleteId && athletes.some((a) => a.id === currentAthleteId)) {
      onChange([currentAthleteId])
      return
    }
    onChange(athletes[0] ? [athletes[0].id] : [])
  }

  return (
    <div className={cn('block space-y-1 text-body', className)}>
      <FormLabel>{label}</FormLabel>
      <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border/60 p-2">
        <div className="mb-1 flex flex-wrap items-center gap-2 px-1 pb-1">
          <button
            type="button"
            className="text-[11px] font-medium text-muted-foreground hover:underline"
            onClick={selectAll}
          >
            Select all
          </button>
          <span className="text-[11px] text-muted-foreground">·</span>
          <button
            type="button"
            className="text-[11px] font-medium text-muted-foreground hover:underline"
            onClick={selectCurrentOnly}
          >
            Only current
          </button>
        </div>
        {athletes.length === 0 ? (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">{emptyLabel}</p>
        ) : (
          athletes.map((a) => {
            const checked = selected.has(a.id)
            return (
              <label
                key={a.id}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition',
                  checked ? 'bg-muted/50' : 'hover:bg-muted/30',
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(a.id)}
                  className="rounded border-border"
                />
                <span className="truncate">{a.name}</span>
              </label>
            )
          })
        )}
      </div>
    </div>
  )
}
