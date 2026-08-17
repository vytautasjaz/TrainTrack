'use client'

import { useMemo, useState, useTransition, type ButtonHTMLAttributes, type DragEvent } from 'react'
import { GripVertical } from 'lucide-react'
import { WorkoutType } from '@prisma/client'
import { updateCoachWorkoutBuilderPrefs } from '@/app/actions/preferences'
import {
  editableRowsToSportPrefs,
  isIntervalPresetKind,
  mergeEditablePresetRows,
  type EditablePresetRow,
  type WorkoutBuilderPrefs,
} from '@/lib/workout-builder/workout-builder-prefs'
import { WorkoutSportIcon } from '@/components/plan/workout-sport-icon'
import { Button } from '@/components/ui/button'
import { FormMessage } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { SegmentedControl, SegmentedControlItem } from '@/components/ui/segmented-control'
import { DATA_TABLE, DATA_TABLE_SHELL } from '@/lib/table-styles'
import { cn } from '@/lib/utils'

type CoachWorkoutBuilderPrefsFormProps = {
  initialPrefs: WorkoutBuilderPrefs
}

const SPORTS: { value: 'RUN' | 'BIKE'; label: string; sport: WorkoutType }[] = [
  { value: 'RUN', label: 'Run', sport: WorkoutType.RUN },
  { value: 'BIKE', label: 'Bike', sport: WorkoutType.BIKE },
]

const DURATION_UNITS = ['km', 'm', 'min', 'sec'] as const

const SELECT_CLASS =
  'h-8 w-full rounded-[4px] border border-border bg-background px-1.5 text-xs text-foreground'

const UNIT_SELECT_CLASS =
  'h-8 rounded-[4px] border border-border bg-background px-1.5 text-xs text-foreground'

const NUM_INPUT_CLASS = 'h-8 w-14 text-center text-sm'

function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) {
    return list
  }
  const next = [...list]
  const [item] = next.splice(from, 1)
  if (!item) return list
  next.splice(to, 0, item)
  return next
}

function useSortableRows<T>(rows: T[], onChange: (rows: T[]) => void) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  return {
    dragIndex,
    overIndex,
    handleProps: (index: number) => ({
      draggable: true as const,
      onDragStart: (e: DragEvent) => {
        setDragIndex(index)
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', String(index))
      },
      onDragEnd: () => {
        setDragIndex(null)
        setOverIndex(null)
      },
    }),
    rowProps: (index: number) => ({
      onDragOver: (e: DragEvent) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        if (overIndex !== index) setOverIndex(index)
      },
      onDrop: (e: DragEvent) => {
        e.preventDefault()
        const fromRaw = e.dataTransfer.getData('text/plain')
        const from = dragIndex ?? (fromRaw ? Number(fromRaw) : -1)
        onChange(moveItem(rows, from, index))
        setDragIndex(null)
        setOverIndex(null)
      },
    }),
  }
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
  const [dirty, setDirty] = useState(false)

  const rows = sport === 'RUN' ? runRows : bikeRows
  const setRows = sport === 'RUN' ? setRunRows : setBikeRows

  function markDirty() {
    setSaved(false)
    setDirty(true)
  }

  function handleRowsChange(next: EditablePresetRow[]) {
    setRows(next)
    markDirty()
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
        setDirty(false)
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
    markDirty()
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
            <span className="inline-flex items-center gap-1.5">
              <WorkoutSportIcon type={s.sport} size="xs" />
              {s.label}
            </span>
          </SegmentedControlItem>
        ))}
      </SegmentedControl>

      <p className="text-xs text-muted-foreground">
        These appear below Continuous / Intervals / Progressive in Add Block. Drag the grip to
        change order. Uncheck to hide a preset without deleting it.
      </p>

      <PresetsTable rows={rows} sport={sport} onChange={handleRowsChange} />

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={isPending}
          onClick={handleSave}
          className={
            dirty
              ? 'border-transparent bg-foreground text-background hover:bg-foreground/90 hover:text-background'
              : undefined
          }
        >
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

function PresetsTable({
  rows,
  sport,
  onChange,
}: {
  rows: EditablePresetRow[]
  sport: 'RUN' | 'BIKE'
  onChange: (rows: EditablePresetRow[]) => void
}) {
  const sortable = useSortableRows(rows, onChange)
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

  function update(index: number, patch: Partial<EditablePresetRow>) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  return (
    <div className={cn(DATA_TABLE_SHELL, 'overflow-x-auto')}>
      <table className={cn(DATA_TABLE, 'min-w-[40rem]')} data-density="compact">
        <thead>
          <tr>
            <th className="w-8" aria-label="Reorder" />
            <th className="w-8" aria-label="Show in Add Block" />
            <th>Name</th>
            <th>Duration</th>
            <th>Intensity</th>
            <th>Target</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row.kind}
              {...sortable.rowProps(index)}
              className={cn(
                !row.enabled && 'opacity-50',
                sortable.dragIndex === index && 'opacity-40',
                sortable.overIndex === index &&
                  sortable.dragIndex != null &&
                  sortable.dragIndex !== index &&
                  'border-t-2 border-t-foreground',
              )}
            >
              <td>
                <DragHandle {...sortable.handleProps(index)} label={`Reorder ${row.label}`} />
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={row.enabled}
                  onChange={(e) => update(index, { enabled: e.target.checked })}
                  aria-label={`Show ${row.label} in Add Block`}
                  className="h-4 w-4 accent-[#166534]"
                />
              </td>
              <td>
                <Input
                  value={row.label}
                  onChange={(e) => update(index, { label: e.target.value })}
                  className="h-8 min-w-[8rem] text-sm"
                  aria-label="Preset label"
                />
              </td>
              <td>
                <DurationFields
                  row={row}
                  onChange={(patch) => update(index, patch)}
                />
              </td>
              <td>
                <select
                  value={row.intensityType}
                  onChange={(e) =>
                    update(index, {
                      intensityType: e.target.value as EditablePresetRow['intensityType'],
                    })
                  }
                  className={SELECT_CLASS}
                  aria-label="Intensity type"
                >
                  {intensityOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <Input
                  value={row.intensityValue}
                  onChange={(e) => update(index, { intensityValue: e.target.value })}
                  placeholder={sport === 'BIKE' ? 'Z2 / 220' : 'Z2 / 4:30'}
                  className="h-8 min-w-[5rem] text-sm"
                  aria-label="Intensity value"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DurationFields({
  row,
  onChange,
}: {
  row: EditablePresetRow
  onChange: (patch: Partial<EditablePresetRow>) => void
}) {
  if (isIntervalPresetKind(row.kind)) {
    return (
      <div className="flex flex-nowrap items-center gap-1">
        <Input
          type="number"
          min={1}
          value={row.repetitions}
          onChange={(e) =>
            onChange({ repetitions: Math.max(1, parseInt(e.target.value, 10) || 1) })
          }
          className={NUM_INPUT_CLASS}
          aria-label="Repeats"
        />
        <span className="text-xs text-muted-foreground">×</span>
        <Input
          type="number"
          min={0}
          value={row.workValue}
          onChange={(e) =>
            onChange({ workValue: Math.max(0, parseFloat(e.target.value) || 0) })
          }
          className={NUM_INPUT_CLASS}
          aria-label="Work amount"
        />
        <select
          value={row.workUnit}
          onChange={(e) =>
            onChange({ workUnit: e.target.value as EditablePresetRow['workUnit'] })
          }
          className={UNIT_SELECT_CLASS}
          aria-label="Work unit"
        >
          {DURATION_UNITS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">/</span>
        <Input
          type="number"
          min={0}
          value={row.recoveryValue}
          onChange={(e) =>
            onChange({ recoveryValue: Math.max(0, parseFloat(e.target.value) || 0) })
          }
          className={NUM_INPUT_CLASS}
          aria-label="Recovery amount"
        />
        <select
          value={row.recoveryUnit}
          onChange={(e) =>
            onChange({ recoveryUnit: e.target.value as EditablePresetRow['recoveryUnit'] })
          }
          className={UNIT_SELECT_CLASS}
          aria-label="Recovery unit"
        >
          {DURATION_UNITS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>
    )
  }

  return (
    <div className="flex flex-nowrap items-center gap-1">
      <Input
        type="number"
        min={0}
        value={row.durationValue}
        onChange={(e) =>
          onChange({ durationValue: Math.max(0, parseFloat(e.target.value) || 0) })
        }
        className={NUM_INPUT_CLASS}
        aria-label="Duration amount"
      />
      <select
        value={row.durationUnit}
        onChange={(e) => {
          const unit = e.target.value as EditablePresetRow['durationUnit']
          onChange({
            durationUnit: unit,
            durationType: unit === 'min' || unit === 'sec' ? 'time' : 'distance',
          })
        }}
        className={UNIT_SELECT_CLASS}
        aria-label="Duration unit"
      >
        {DURATION_UNITS.map((u) => (
          <option key={u} value={u}>
            {u}
          </option>
        ))}
      </select>
    </div>
  )
}

function DragHandle({
  label,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      {...props}
      className="flex h-7 w-7 cursor-grab items-center justify-center rounded-[4px] text-muted-foreground/40 transition hover:bg-muted/50 hover:text-muted-foreground active:cursor-grabbing"
      aria-label={label}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  )
}
