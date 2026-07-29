'use client'

import { useMemo, useState, useTransition } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { WorkoutType } from '@prisma/client'
import { updateCoachWorkoutBuilderPrefs } from '@/app/actions/preferences'
import {
  editableRowsToSportPrefs,
  isIntervalPresetKind,
  mergeEditablePresetRows,
  type EditablePresetRow,
  type WorkoutBuilderPrefs,
} from '@/lib/workout-builder/workout-builder-prefs'
import { Button } from '@/components/ui/button'
import { FormMessage } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { SegmentedControl, SegmentedControlItem } from '@/components/ui/segmented-control'
import { cn } from '@/lib/utils'

type CoachWorkoutBuilderPrefsFormProps = {
  initialPrefs: WorkoutBuilderPrefs
}

const SPORTS = [
  { value: 'RUN', label: 'Run' },
  { value: 'BIKE', label: 'Bike' },
] as const

const DURATION_UNITS = ['km', 'm', 'min', 'sec'] as const

function cloneRows(rows: EditablePresetRow[]): EditablePresetRow[] {
  return rows.map((row) => ({ ...row }))
}

export function CoachWorkoutBuilderPrefsForm({
  initialPrefs,
}: CoachWorkoutBuilderPrefsFormProps) {
  const [sport, setSport] = useState<'RUN' | 'BIKE'>('RUN')
  const [runRows, setRunRows] = useState(() =>
    mergeEditablePresetRows(WorkoutType.RUN, initialPrefs.RUN),
  )
  const [bikeRows, setBikeRows] = useState(() =>
    mergeEditablePresetRows(WorkoutType.BIKE, initialPrefs.BIKE),
  )
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const rows = sport === 'RUN' ? runRows : bikeRows
  const setRows = sport === 'RUN' ? setRunRows : setBikeRows

  const intensityOptions = useMemo(
    () =>
      sport === 'BIKE'
        ? [
            { value: 'rpe', label: 'Effort' },
            { value: 'power', label: 'Watts' },
          ]
        : [
            { value: 'rpe', label: 'Effort' },
            { value: 'pace', label: 'Pace' },
          ],
    [sport],
  )

  function updateRow(index: number, patch: Partial<EditablePresetRow>) {
    setRows((prev) => {
      const next = cloneRows(prev)
      next[index] = { ...next[index]!, ...patch }
      return next
    })
  }

  function moveRow(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= rows.length) return
    setRows((prev) => {
      const next = cloneRows(prev)
      const tmp = next[index]!
      next[index] = next[target]!
      next[target] = tmp
      return next
    })
  }

  function handleSave() {
    setError(null)
    setSaved(false)
    const prefs: WorkoutBuilderPrefs = {
      RUN: editableRowsToSportPrefs(runRows, WorkoutType.RUN),
      BIKE: editableRowsToSportPrefs(bikeRows, WorkoutType.BIKE),
    }
    startTransition(async () => {
      try {
        await updateCoachWorkoutBuilderPrefs(prefs)
        setSaved(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save.')
      }
    })
  }

  function handleResetSport() {
    const defaults = mergeEditablePresetRows(
      sport === 'RUN' ? WorkoutType.RUN : WorkoutType.BIKE,
      undefined,
    )
    setRows(defaults)
    setSaved(false)
  }

  return (
    <div className="space-y-4">
      <SegmentedControl aria-label="Sport for builder presets">
        {SPORTS.map((s) => (
          <SegmentedControlItem
            key={s.value}
            active={sport === s.value}
            onClick={() => setSport(s.value)}
          >
            {s.label}
          </SegmentedControlItem>
        ))}
      </SegmentedControl>

      <p className="text-xs text-muted-foreground">
        These appear below Continuous / Intervals / Progressive in Add Block. Toggle,
        rename, reorder, and set default duration and intensity for this sport.
      </p>

      <ul className="space-y-2">
        {rows.map((row, index) => {
          const interval = isIntervalPresetKind(row.kind)
          return (
            <li
              key={row.kind}
              className={cn(
                'rounded-[6px] border border-border/70 bg-card p-3',
                !row.enabled && 'opacity-60',
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="checkbox"
                  checked={row.enabled}
                  onChange={(e) => updateRow(index, { enabled: e.target.checked })}
                  aria-label={`Show ${row.label} in menu`}
                  className="h-4 w-4 accent-[#166534]"
                />
                <Input
                  value={row.label}
                  onChange={(e) => updateRow(index, { label: e.target.value })}
                  className="h-8 min-w-[8rem] flex-1 text-sm"
                  aria-label="Preset label"
                />
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => moveRow(index, -1)}
                    disabled={index === 0}
                    className="flex h-7 w-7 items-center justify-center rounded-[4px] text-muted-foreground transition hover:bg-muted/50 disabled:opacity-30"
                    aria-label="Move up"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveRow(index, 1)}
                    disabled={index === rows.length - 1}
                    className="flex h-7 w-7 items-center justify-center rounded-[4px] text-muted-foreground transition hover:bg-muted/50 disabled:opacity-30"
                    aria-label="Move down"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                {interval ? (
                  <>
                    <Input
                      type="number"
                      min={1}
                      value={row.repetitions}
                      onChange={(e) =>
                        updateRow(index, {
                          repetitions: Math.max(1, parseInt(e.target.value, 10) || 1),
                        })
                      }
                      className="h-8 w-14 text-center text-sm"
                      aria-label="Repeats"
                    />
                    <span className="text-muted-foreground">×</span>
                    <Input
                      type="number"
                      min={0}
                      value={row.workValue}
                      onChange={(e) =>
                        updateRow(index, {
                          workValue: Math.max(0, parseFloat(e.target.value) || 0),
                        })
                      }
                      className="h-8 w-16 text-center text-sm"
                      aria-label="Work amount"
                    />
                    <select
                      value={row.workUnit}
                      onChange={(e) =>
                        updateRow(index, {
                          workUnit: e.target.value as EditablePresetRow['workUnit'],
                        })
                      }
                      className="h-8 rounded-[4px] border border-border bg-background px-1.5 text-xs"
                      aria-label="Work unit"
                    >
                      {DURATION_UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                    <span className="text-muted-foreground">/</span>
                    <Input
                      type="number"
                      min={0}
                      value={row.recoveryValue}
                      onChange={(e) =>
                        updateRow(index, {
                          recoveryValue: Math.max(0, parseFloat(e.target.value) || 0),
                        })
                      }
                      className="h-8 w-16 text-center text-sm"
                      aria-label="Recovery amount"
                    />
                    <select
                      value={row.recoveryUnit}
                      onChange={(e) =>
                        updateRow(index, {
                          recoveryUnit: e.target.value as EditablePresetRow['recoveryUnit'],
                        })
                      }
                      className="h-8 rounded-[4px] border border-border bg-background px-1.5 text-xs"
                      aria-label="Recovery unit"
                    >
                      {DURATION_UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </>
                ) : (
                  <>
                    <Input
                      type="number"
                      min={0}
                      value={row.durationValue}
                      onChange={(e) =>
                        updateRow(index, {
                          durationValue: Math.max(0, parseFloat(e.target.value) || 0),
                        })
                      }
                      className="h-8 w-16 text-center text-sm"
                      aria-label="Duration amount"
                    />
                    <select
                      value={row.durationUnit}
                      onChange={(e) => {
                        const unit = e.target.value as EditablePresetRow['durationUnit']
                        updateRow(index, {
                          durationUnit: unit,
                          durationType: unit === 'min' || unit === 'sec' ? 'time' : 'distance',
                        })
                      }}
                      className="h-8 rounded-[4px] border border-border bg-background px-1.5 text-xs"
                      aria-label="Duration unit"
                    >
                      {DURATION_UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </>
                )}

                <span className="text-muted-foreground">@</span>
                <select
                  value={row.intensityType}
                  onChange={(e) =>
                    updateRow(index, {
                      intensityType: e.target.value as EditablePresetRow['intensityType'],
                    })
                  }
                  className="h-8 rounded-[4px] border border-border bg-background px-1.5 text-xs"
                  aria-label="Intensity type"
                >
                  {intensityOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <Input
                  value={row.intensityValue}
                  onChange={(e) => updateRow(index, { intensityValue: e.target.value })}
                  placeholder={sport === 'BIKE' ? 'Z2 / 220' : 'Z2 / 4:30'}
                  className="h-8 min-w-[5rem] flex-1 text-sm"
                  aria-label="Intensity value"
                />
              </div>
            </li>
          )
        })}
      </ul>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="secondary" size="sm" disabled={isPending} onClick={handleSave}>
          {isPending ? 'Saving…' : 'Save presets'}
        </Button>
        <Button type="button" variant="ghost" size="sm" disabled={isPending} onClick={handleResetSport}>
          Reset {sport === 'RUN' ? 'run' : 'bike'} defaults
        </Button>
        {saved ? <FormMessage variant="success">Saved</FormMessage> : null}
        {error ? <FormMessage variant="error">{error}</FormMessage> : null}
      </div>
    </div>
  )
}
