'use client'

import { useEffect, useMemo, useState } from 'react'
import { Trash2 } from 'lucide-react'
import type { ExerciseLibraryDto } from '@/app/actions/exercises'
import { ExerciseInfoTrigger } from '@/components/exercises/exercise-info-trigger'
import {
  ExerciseAutocomplete,
  type ExercisePick,
} from '@/components/workout-builder/sections/exercise-autocomplete'
import { prescriptionModesForExercise } from '@/lib/exercises/prescription'
import type {
  ExerciseSearchContext,
} from '@/lib/exercises/types'
import type {
  ExerciseItem,
  ExerciseLoad,
  PrescriptionMode,
  RestSpec,
} from '@/lib/workout-builder/structure-v2'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const ALL_PRESCRIPTION_MODES: { value: PrescriptionMode; label: string }[] = [
  { value: 'REPS', label: 'Reps' },
  { value: 'TIME', label: 'Time' },
  { value: 'DISTANCE', label: 'Dist' },
  { value: 'CALORIES', label: 'Cal' },
  { value: 'WEIGHT', label: 'Wt' },
  { value: 'UNTIMED', label: '—' },
]

const fieldClass =
  'h-7 w-full rounded-[5px] border border-transparent bg-transparent px-1.5 text-[12px] tabular-nums text-[var(--tt-ink,#111315)] outline-none transition placeholder:text-[var(--tt-ink-faint,#9ca3af)] hover:bg-white/80 focus:border-[var(--tt-v2-light-panel-line,#E3E6E9)] focus:bg-white'

/** Free-form effort: RPE, kg/lb, %, BW, km, min, or any custom note. */
export function parseEffortField(raw: string): ExerciseLoad | undefined {
  const t = raw.trim()
  if (!t) return undefined
  if (t.toUpperCase() === 'BW' || t.toUpperCase() === 'BODYWEIGHT') {
    return { type: 'BODYWEIGHT' }
  }
  const rpe = t.match(/^RPE\s*[:=]?\s*(.+)$/i)
  if (rpe) {
    const n = Number.parseFloat(rpe[1]!)
    return {
      type: 'RPE',
      value: Number.isFinite(n) ? n : rpe[1]!.trim(),
    }
  }
  const pct = t.match(/^(\d+(?:\.\d+)?)\s*%$/)
  if (pct) {
    return { type: 'PERCENT_1RM', value: Number.parseFloat(pct[1]!) }
  }
  const withUnit = t.match(
    /^(\d+(?:\.\d+)?)\s*(kg|lb|km|m|mi|min|sec|s)$/i,
  )
  if (withUnit) {
    const n = Number.parseFloat(withUnit[1]!)
    const unit = withUnit[2]!.toLowerCase()
    if (unit === 'kg' || unit === 'lb') {
      return { type: 'ABSOLUTE', value: n, unit }
    }
    return { type: 'CUSTOM', value: t }
  }
  if (/^\d+(?:\.\d+)?$/.test(t)) {
    return { type: 'ABSOLUTE', value: Number.parseFloat(t) }
  }
  return { type: 'CUSTOM', value: t }
}

export function formatEffortField(load: ExerciseLoad | undefined): string {
  if (!load) return ''
  if (load.type === 'BODYWEIGHT') return 'BW'
  if (load.type === 'COMPETITION') {
    return load.division ? `Comp ${load.division}` : 'Competition'
  }
  if (load.type === 'RPE' && load.value != null) return `RPE ${load.value}`
  if (load.type === 'PERCENT_1RM' && load.value != null) {
    return `${load.value}%`
  }
  if (load.type === 'CUSTOM' && load.value != null) return String(load.value)
  if (load.value != null) {
    return load.unit ? `${load.value}${load.unit}` : String(load.value)
  }
  return ''
}

type ExerciseRowEditorProps = {
  item: ExerciseItem
  onChange: (item: ExerciseItem) => void
  onRemove: () => void
  library: ExerciseLibraryDto[]
  searchContext?: ExerciseSearchContext
  /** Show column header labels (first row only). */
  showHeaders?: boolean
  /** Rest between sets/reps (EXERCISE blocks). */
  rest?: RestSpec
  onRestChange?: (rest: RestSpec | undefined) => void
  className?: string
}

export function ExerciseRowEditor({
  item,
  onChange,
  onRemove,
  library,
  searchContext = 'GENERAL',
  showHeaders = false,
  rest,
  onRestChange,
  className,
}: ExerciseRowEditorProps) {
  const [query, setQuery] = useState(item.name ?? '')
  const showRest = typeof onRestChange === 'function'

  useEffect(() => {
    setQuery(item.name ?? '')
  }, [item.exerciseId, item.name])

  const libraryEntry = useMemo(
    () => library.find((e) => e.id === item.exerciseId),
    [library, item.exerciseId],
  )

  const modeOptions = useMemo(() => {
    const preferred = libraryEntry
      ? prescriptionModesForExercise(libraryEntry.prescriptionTypes)
      : null
    if (!preferred || preferred.length === 0) return ALL_PRESCRIPTION_MODES
    const set = new Set(preferred)
    const ordered = ALL_PRESCRIPTION_MODES.filter((m) => set.has(m.value))
    // Always allow current mode even if not in metadata
    const mode = item.prescription?.mode
    if (mode && !ordered.some((m) => m.value === mode)) {
      const extra = ALL_PRESCRIPTION_MODES.find((m) => m.value === mode)
      if (extra) ordered.push(extra)
    }
    return ordered.length > 0 ? ordered : ALL_PRESCRIPTION_MODES
  }, [libraryEntry, item.prescription?.mode])

  function applyPick(pick: ExercisePick) {
    onChange({
      ...item,
      exerciseId: pick.exerciseId,
      name: pick.name,
      prescription: {
        mode: pick.defaultMode,
        value: item.prescription?.value ?? 10,
        unit: item.prescription?.unit,
      },
    })
  }

  const mode = item.prescription?.mode ?? 'REPS'
  // … Target · Effort · Rest (rest last) · delete
  const gridClass = showRest
    ? 'grid-cols-[1.75rem_minmax(0,1fr)_4.25rem_3.25rem_3.5rem_3rem_1.75rem]'
    : 'grid-cols-[1.75rem_minmax(0,1fr)_4.25rem_3.25rem_3.5rem_1.75rem]'

  return (
    <div className={cn('min-w-0', className)}>
      {showHeaders ? (
        <div
          className={cn(
            'mb-0.5 grid items-center gap-1 px-1',
            gridClass,
          )}
          aria-hidden
        >
          <span />
          <span className="text-[9px] font-semibold uppercase tracking-[0.05em] text-[var(--tt-ink-faint,#9ca3af)]">
            Exercise
          </span>
          <span className="text-[9px] font-semibold uppercase tracking-[0.05em] text-[var(--tt-ink-faint,#9ca3af)]">
            Mode
          </span>
          <span className="text-right text-[9px] font-semibold uppercase tracking-[0.05em] text-[var(--tt-ink-faint,#9ca3af)]">
            Target
          </span>
          <span className="text-right text-[9px] font-semibold uppercase tracking-[0.05em] text-[var(--tt-ink-faint,#9ca3af)]">
            Effort
          </span>
          {showRest ? (
            <span className="text-right text-[9px] font-semibold uppercase tracking-[0.05em] text-[var(--tt-ink-faint,#9ca3af)]">
              Rest
            </span>
          ) : null}
          <span />
        </div>
      ) : null}

      <div
        className={cn(
          'grid items-center gap-1 rounded-[6px] bg-white px-1 py-0.5 ring-1 ring-[var(--tt-v2-light-panel-line,#E3E6E9)]/70',
          gridClass,
        )}
      >
        {item.exerciseId ? (
          <ExerciseInfoTrigger
            exerciseId={item.exerciseId}
            name={item.name || libraryEntry?.canonicalName || 'Exercise'}
            thumbnailUrl={libraryEntry?.thumbnailUrl}
            size="xs"
          />
        ) : (
          <span className="inline-flex h-6 w-6 shrink-0" aria-hidden />
        )}

        <ExerciseAutocomplete
          library={library}
          value={query}
          onValueChange={setQuery}
          onPick={applyPick}
          context={searchContext}
          inputClassName={cn(fieldClass, 'font-medium')}
        />

        <select
          value={mode}
          onChange={(e) =>
            onChange({
              ...item,
              prescription: {
                mode: e.target.value as PrescriptionMode,
                value: item.prescription?.value,
                unit: item.prescription?.unit,
              },
            })
          }
          className={cn(fieldClass, 'appearance-none pr-0 text-[11px]')}
          aria-label="Prescription mode"
        >
          {modeOptions.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>

        <input
          type="number"
          inputMode="decimal"
          value={item.prescription?.value ?? ''}
          onChange={(e) => {
            const n = Number.parseFloat(e.target.value)
            onChange({
              ...item,
              prescription: {
                mode,
                value: Number.isFinite(n) ? n : undefined,
                unit: item.prescription?.unit,
              },
            })
          }}
          placeholder="—"
          className={cn(fieldClass, 'text-right')}
          disabled={mode === 'UNTIMED'}
          aria-label="Target value"
        />

        <input
          value={formatEffortField(item.load)}
          onChange={(e) => {
            onChange({ ...item, load: parseEffortField(e.target.value) })
          }}
          placeholder="RPE / kg…"
          className={cn(fieldClass, 'text-right')}
          aria-label="Effort (RPE, weight, distance, time…)"
          title="RPE, kg, lb, %, BW, km, min…"
        />

        {showRest ? (
          <input
            type="number"
            inputMode="numeric"
            value={rest?.type === 'TIME' ? (rest.value ?? '') : ''}
            onChange={(e) => {
              const raw = e.target.value.trim()
              if (!raw) {
                onRestChange?.(undefined)
                return
              }
              const n = Number.parseInt(raw, 10)
              onRestChange?.(
                Number.isFinite(n)
                  ? { type: 'TIME', value: n, unit: rest?.unit ?? 'sec' }
                  : undefined,
              )
            }}
            placeholder="s"
            className={cn(fieldClass, 'text-right')}
            aria-label="Rest between sets (seconds)"
            title="Rest between sets (seconds)"
          />
        ) : null}

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-[var(--tt-ink-faint,#9ca3af)] hover:text-destructive"
          onClick={onRemove}
          aria-label="Remove exercise"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {item.notes != null && item.notes !== '' ? (
        <input
          value={item.notes}
          onChange={(e) =>
            onChange({ ...item, notes: e.target.value || undefined })
          }
          placeholder="Notes"
          className={cn(
            fieldClass,
            'mt-0.5 h-6 border border-transparent px-2 text-[11px] text-muted-foreground',
          )}
        />
      ) : null}
    </div>
  )
}
