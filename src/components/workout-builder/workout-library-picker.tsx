'use client'

import { useMemo, useState } from 'react'
import { FolderOpen, Search } from 'lucide-react'
import type { WorkoutTemplatePickerItem } from '@/app/actions/workout-builder'
import { WORKOUT_TYPE_LABELS } from '@/lib/constants'
import { getSessionTypeLabel } from '@/lib/workout-builder/session-modes'
import { WorkoutSportIcon } from '@/components/plan/workout-sport-icon'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const TEMPLATE_NONE = '__none__'

type WorkoutLibraryPickerProps = {
  templates: WorkoutTemplatePickerItem[]
  selectedTemplateId: string
  onSelect: (template: WorkoutTemplatePickerItem) => void
}

export function WorkoutLibraryPicker({
  templates,
  selectedTemplateId,
  onSelect,
}: WorkoutLibraryPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return templates
    return templates.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        WORKOUT_TYPE_LABELS[t.type].toLowerCase().includes(q) ||
        getSessionTypeLabel(t.sessionType, t.type).toLowerCase().includes(q),
    )
  }, [templates, query])

  if (templates.length === 0) return null

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'rounded-md p-1.5 text-muted-foreground transition hover:bg-muted/60 hover:text-foreground',
          open && 'bg-muted/60 text-foreground',
          selectedTemplateId !== TEMPLATE_NONE && 'text-brand',
        )}
        aria-label="Workout library"
        aria-expanded={open}
        title="Workout library"
      >
        <FolderOpen className="h-4 w-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 top-full z-[110] mt-1 w-72 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
            <div className="border-b border-border/60 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Workout Library
              </p>
              <p className="text-[11px] text-muted-foreground">Full workouts — creates an editable copy</p>
            </div>
            <div className="border-b border-border/60 px-3 py-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search workouts..."
                  className="h-8 pl-8 text-sm"
                />
              </div>
            </div>
            <div className="max-h-56 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <p className="px-3 py-4 text-center text-sm text-muted-foreground">No matches</p>
              ) : (
                filtered.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => {
                      onSelect(template)
                      setOpen(false)
                      setQuery('')
                    }}
                    className={cn(
                      'flex w-full flex-col px-3 py-2 text-left transition hover:bg-muted/60',
                      selectedTemplateId === template.id && 'bg-brand/5',
                    )}
                  >
                    <span className="truncate text-sm font-medium">{template.title}</span>
                    <span className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                      <WorkoutSportIcon type={template.type} size="xs" />
                      {WORKOUT_TYPE_LABELS[template.type]} ·{' '}
                      {getSessionTypeLabel(template.sessionType, template.type)}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
