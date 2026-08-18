'use client'

import { useEffect, useRef, useState, useTransition, type ButtonHTMLAttributes, type DragEvent } from 'react'
import { useRouter } from 'next/navigation'
import { WorkoutType } from '@prisma/client'
import { GripVertical, Plus, Trash2 } from 'lucide-react'
import { updateCoachWorkoutTypePrefs } from '@/app/actions/preferences'
import { WorkoutSportIcon } from '@/components/plan/workout-sport-icon'
import { Button } from '@/components/ui/button'
import { FormMessage } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { SegmentedControl, SegmentedControlItem } from '@/components/ui/segmented-control'
import { UnsavedChangesDialog } from '@/components/ui/unsaved-changes-dialog'
import { DATA_TABLE, DATA_TABLE_SHELL } from '@/lib/table-styles'
import {
  BIKE_INTENSITY_TARGET_OPTIONS,
  HR_TARGET_OPTIONS,
  PACE_TARGET_OPTIONS,
  defaultBikeKindOptions,
  defaultRunSessionOptions,
  defaultSwimSessionOptions,
  defaultSessionOptionsForSport,
  createBlankBikeOption,
  createBlankSessionOption,
  type BikeKindOptionPref,
  type WorkoutSessionOptionPref,
  type WorkoutTypePrefSport,
  type WorkoutTypePrefs,
} from '@/lib/workout-builder/workout-type-prefs'
import { cn } from '@/lib/utils'

type CoachWorkoutTypePrefsFormProps = {
  initialPrefs: WorkoutTypePrefs
}

const SPORTS: { value: WorkoutTypePrefSport; label: string; sport: WorkoutType; hasPaceTargets: boolean }[] = [
  { value: 'RUN', label: 'Run', sport: WorkoutType.RUN, hasPaceTargets: true },
  { value: 'BIKE', label: 'Bike', sport: WorkoutType.BIKE, hasPaceTargets: false },
  { value: 'SWIM', label: 'Swim', sport: WorkoutType.SWIM, hasPaceTargets: true },
  { value: 'STRENGTH', label: 'Strength', sport: WorkoutType.STRENGTH, hasPaceTargets: false },
  { value: 'HYROX', label: 'HYROX', sport: WorkoutType.HYROX, hasPaceTargets: false },
  { value: 'TRIATHLON', label: 'Triathlon', sport: WorkoutType.TRIATHLON, hasPaceTargets: false },
  { value: 'RECOVERY', label: 'Recovery', sport: WorkoutType.RECOVERY, hasPaceTargets: false },
  { value: 'REST', label: 'Rest', sport: WorkoutType.REST, hasPaceTargets: false },
]

const SELECT_CLASS =
  'h-8 w-full rounded-[4px] border border-border bg-background px-1.5 text-xs text-foreground'

const NONE = ''

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

function hrefFromAnchor(anchor: HTMLAnchorElement): string {
  const url = new URL(anchor.href)
  if (url.origin !== window.location.origin) return anchor.href
  return `${url.pathname}${url.search}${url.hash}`
}

function isSamePage(href: string): boolean {
  try {
    const url = new URL(href, window.location.href)
    return (
      url.origin === window.location.origin &&
      url.pathname === window.location.pathname &&
      url.search === window.location.search
    )
  } catch {
    return false
  }
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

export function CoachWorkoutTypePrefsForm({ initialPrefs }: CoachWorkoutTypePrefsFormProps) {
  const router = useRouter()
  const [sport, setSport] = useState<WorkoutTypePrefSport>('RUN')
  const [runRows, setRunRows] = useState(
    () => initialPrefs.RUN ?? defaultRunSessionOptions(),
  )
  const [bikeRows, setBikeRows] = useState(
    () => initialPrefs.BIKE ?? defaultBikeKindOptions(),
  )
  const [swimRows, setSwimRows] = useState(
    () => initialPrefs.SWIM ?? defaultSwimSessionOptions(),
  )
  const [strengthRows, setStrengthRows] = useState(
    () => initialPrefs.STRENGTH ?? defaultSessionOptionsForSport(WorkoutType.STRENGTH),
  )
  const [hyroxRows, setHyroxRows] = useState(
    () => initialPrefs.HYROX ?? defaultSessionOptionsForSport(WorkoutType.HYROX),
  )
  const [triathlonRows, setTriathlonRows] = useState(
    () => initialPrefs.TRIATHLON ?? defaultSessionOptionsForSport(WorkoutType.TRIATHLON),
  )
  const [recoveryRows, setRecoveryRows] = useState(
    () => initialPrefs.RECOVERY ?? defaultSessionOptionsForSport(WorkoutType.RECOVERY),
  )
  const [restRows, setRestRows] = useState(
    () => initialPrefs.REST ?? defaultSessionOptionsForSport(WorkoutType.REST),
  )
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [unsavedOpen, setUnsavedOpen] = useState(false)
  const [pendingHref, setPendingHref] = useState<string | null>(null)
  const dirtyRef = useRef(false)

  function markDirty() {
    setSaved(false)
    dirtyRef.current = true
    setDirty(true)
  }

  async function savePrefs(): Promise<boolean> {
    setError(null)
    setSaved(false)
    const prefs: WorkoutTypePrefs = {
      RUN: runRows,
      BIKE: bikeRows,
      SWIM: swimRows,
      STRENGTH: strengthRows,
      HYROX: hyroxRows,
      TRIATHLON: triathlonRows,
      RECOVERY: recoveryRows,
      REST: restRows,
    }
    try {
      await updateCoachWorkoutTypePrefs(prefs)
      dirtyRef.current = false
      setDirty(false)
      setSaved(true)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.')
      return false
    }
  }

  function handleSave() {
    startTransition(async () => {
      await savePrefs()
    })
  }

  function handleResetSport() {
    markDirty()
    switch (sport) {
      case 'RUN': setRunRows(defaultRunSessionOptions()); break
      case 'BIKE': setBikeRows(defaultBikeKindOptions()); break
      case 'SWIM': setSwimRows(defaultSwimSessionOptions()); break
      case 'STRENGTH': setStrengthRows(defaultSessionOptionsForSport(WorkoutType.STRENGTH)); break
      case 'HYROX': setHyroxRows(defaultSessionOptionsForSport(WorkoutType.HYROX)); break
      case 'TRIATHLON': setTriathlonRows(defaultSessionOptionsForSport(WorkoutType.TRIATHLON)); break
      case 'RECOVERY': setRecoveryRows(defaultSessionOptionsForSport(WorkoutType.RECOVERY)); break
      case 'REST': setRestRows(defaultSessionOptionsForSport(WorkoutType.REST)); break
    }
  }

  function navigateTo(href: string) {
    if (/^(https?:)?\/\//.test(href) || href.startsWith('mailto:')) {
      window.location.href = href
      return
    }
    router.push(href)
  }

  function handleDiscardAndLeave() {
    dirtyRef.current = false
    setUnsavedOpen(false)
    setDirty(false)
    const href = pendingHref
    setPendingHref(null)
    if (href) navigateTo(href)
  }

  function handleSaveAndLeave() {
    startTransition(async () => {
      const ok = await savePrefs()
      if (!ok) return
      setUnsavedOpen(false)
      const href = pendingHref
      setPendingHref(null)
      if (href) navigateTo(href)
    })
  }

  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!dirtyRef.current) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!dirtyRef.current) return
      if (event.defaultPrevented) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const target = event.target
      if (!(target instanceof Element)) return
      const anchor = target.closest('a[href]')
      if (!(anchor instanceof HTMLAnchorElement)) return
      if (anchor.target === '_blank' || anchor.hasAttribute('download')) return
      const rawHref = anchor.getAttribute('href')
      if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('javascript:')) return
      const href = hrefFromAnchor(anchor)
      if (isSamePage(href)) return
      event.preventDefault()
      event.stopPropagation()
      setPendingHref(href)
      setUnsavedOpen(true)
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])

  const currentSportConfig = SPORTS.find((s) => s.value === sport)!

  const currentSessionRows = (() => {
    switch (sport) {
      case 'RUN': return runRows
      case 'SWIM': return swimRows
      case 'STRENGTH': return strengthRows
      case 'HYROX': return hyroxRows
      case 'TRIATHLON': return triathlonRows
      case 'RECOVERY': return recoveryRows
      case 'REST': return restRows
      default: return []
    }
  })()

  function setCurrentSessionRows(nextOrUpdater: WorkoutSessionOptionPref[] | ((prev: WorkoutSessionOptionPref[]) => WorkoutSessionOptionPref[])) {
    switch (sport) {
      case 'RUN': setRunRows(nextOrUpdater); break
      case 'SWIM': setSwimRows(nextOrUpdater); break
      case 'STRENGTH': setStrengthRows(nextOrUpdater); break
      case 'HYROX': setHyroxRows(nextOrUpdater); break
      case 'TRIATHLON': setTriathlonRows(nextOrUpdater); break
      case 'RECOVERY': setRecoveryRows(nextOrUpdater); break
      case 'REST': setRestRows(nextOrUpdater); break
    }
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto pb-1">
        <SegmentedControl aria-label="Sport for workout preferences" className="min-w-max">
          {SPORTS.map((s) => (
            <SegmentedControlItem
              key={s.value}
              active={sport === s.value}
              onClick={() => setSport(s.value)}
            >
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <WorkoutSportIcon type={s.sport} size="xs" />
                {s.label}
              </span>
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
      </div>

      <p className="text-xs text-muted-foreground">
        Names appear in the workout-type dropdown. Drag the grip to change order. Pace and HR are
        zone targets — the athlete’s actual numbers come from their profile.
      </p>

      {sport === 'BIKE' ? (
        <BikeKindsTable
          rows={bikeRows}
          onChange={(next) => {
            setBikeRows(next)
            markDirty()
          }}
          onAdd={() => {
            setBikeRows((prev) => [...prev, createBlankBikeOption()])
            markDirty()
          }}
        />
      ) : (
        <SessionOptionsTable
          rows={currentSessionRows}
          intensityLabel="Pace target"
          showPaceColumn={currentSportConfig.hasPaceTargets}
          onChange={(next) => {
            setCurrentSessionRows(next)
            markDirty()
          }}
          onAdd={() => {
            setCurrentSessionRows((prev) => [...prev, createBlankSessionOption()])
            markDirty()
          }}
        />
      )}

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
          {isPending ? 'Saving…' : 'Save workout preferences'}
        </Button>
        <Button type="button" variant="ghost" size="sm" disabled={isPending} onClick={handleResetSport}>
          Reset {currentSportConfig.label.toLowerCase()} defaults
        </Button>
        {saved ? <FormMessage variant="success">Saved</FormMessage> : null}
        {error ? <FormMessage variant="error">{error}</FormMessage> : null}
      </div>

      <UnsavedChangesDialog
        open={unsavedOpen}
        onOpenChange={(open) => {
          setUnsavedOpen(open)
          if (!open) setPendingHref(null)
        }}
        pending={isPending}
        onSave={handleSaveAndLeave}
        onDiscard={handleDiscardAndLeave}
        description="You have unsaved workout type settings. Save them before leaving?"
      />
    </div>
  )
}

function SessionOptionsTable({
  rows,
  intensityLabel,
  showPaceColumn = true,
  onChange,
  onAdd,
}: {
  rows: WorkoutSessionOptionPref[]
  intensityLabel: string
  showPaceColumn?: boolean
  onChange: (rows: WorkoutSessionOptionPref[]) => void
  onAdd: () => void
}) {
  const sortable = useSortableRows(rows, onChange)

  function update(index: number, patch: Partial<WorkoutSessionOptionPref>) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  function remove(index: number) {
    onChange(rows.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
    <div className={cn(DATA_TABLE_SHELL, 'overflow-x-auto')}>
      <table className={cn(DATA_TABLE, 'min-w-[32rem]')} data-density="compact">
        <thead>
          <tr>
            <th className="w-8" aria-label="Reorder" />
            <th className="w-8" aria-label="Show in dropdown" />
            <th>Name</th>
            {showPaceColumn && <th>{intensityLabel}</th>}
            {showPaceColumn && <th>HR target</th>}
            <th className="w-8" aria-label="Remove" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row.id}
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
                <DragHandle {...sortable.handleProps(index)} label={`Reorder ${row.name}`} />
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={row.enabled}
                  onChange={(e) => update(index, { enabled: e.target.checked })}
                  aria-label={`Show ${row.name} in dropdown`}
                  className="h-4 w-4 accent-[#166534]"
                />
              </td>
              <td>
                <Input
                  value={row.name}
                  onChange={(e) => update(index, { name: e.target.value })}
                  className="h-8 text-sm"
                  aria-label="Dropdown name"
                />
              </td>
              {showPaceColumn && (
                <td>
                  <select
                    value={row.paceTarget ?? NONE}
                    onChange={(e) =>
                      update(index, {
                        paceTarget: (e.target.value || null) as WorkoutSessionOptionPref['paceTarget'],
                      })
                    }
                    className={SELECT_CLASS}
                    aria-label={intensityLabel}
                  >
                    <option value={NONE}>—</option>
                    {PACE_TARGET_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </td>
              )}
              {showPaceColumn && (
                <td>
                  <HrSelect
                    value={row.hrTarget}
                    onChange={(hrTarget) => update(index, { hrTarget })}
                  />
                </td>
              )}
              <td>
                <RemoveRowButton label={`Remove ${row.name}`} onClick={() => remove(index)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <AddRowButton onClick={onAdd} />
    </div>
  )
}

function BikeKindsTable({
  rows,
  onChange,
  onAdd,
}: {
  rows: BikeKindOptionPref[]
  onChange: (rows: BikeKindOptionPref[]) => void
  onAdd: () => void
}) {
  const sortable = useSortableRows(rows, onChange)

  function update(index: number, patch: Partial<BikeKindOptionPref>) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  function remove(index: number) {
    onChange(rows.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
    <div className={cn(DATA_TABLE_SHELL, 'overflow-x-auto')}>
      <table className={cn(DATA_TABLE, 'min-w-[32rem]')} data-density="compact">
        <thead>
          <tr>
            <th className="w-8" aria-label="Reorder" />
            <th className="w-8" aria-label="Show in dropdown" />
            <th>Name</th>
            <th>Intensity target</th>
            <th>HR target</th>
            <th className="w-8" aria-label="Remove" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row.id}
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
                <DragHandle {...sortable.handleProps(index)} label={`Reorder ${row.name}`} />
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={row.enabled}
                  onChange={(e) => update(index, { enabled: e.target.checked })}
                  aria-label={`Show ${row.name} in dropdown`}
                  className="h-4 w-4 accent-[#166534]"
                />
              </td>
              <td>
                <Input
                  value={row.name}
                  onChange={(e) => update(index, { name: e.target.value })}
                  className="h-8 text-sm"
                  aria-label="Dropdown name"
                />
              </td>
              <td>
                <select
                  value={row.intensityTarget ?? NONE}
                  onChange={(e) =>
                    update(index, {
                      intensityTarget: (e.target.value ||
                        null) as BikeKindOptionPref['intensityTarget'],
                    })
                  }
                  className={SELECT_CLASS}
                  aria-label="Intensity target"
                >
                  <option value={NONE}>—</option>
                  {BIKE_INTENSITY_TARGET_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <HrSelect
                  value={row.hrTarget}
                  onChange={(hrTarget) => update(index, { hrTarget })}
                />
              </td>
              <td>
                <RemoveRowButton label={`Remove ${row.name}`} onClick={() => remove(index)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <AddRowButton onClick={onAdd} />
    </div>
  )
}

function RemoveRowButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-[4px] text-muted-foreground/40 transition hover:bg-muted/50 hover:text-foreground"
      aria-label={label}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  )
}

function AddRowButton({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={onClick}>
      <Plus className="h-3.5 w-3.5" />
      Add
    </Button>
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

function HrSelect({
  value,
  onChange,
}: {
  value: WorkoutSessionOptionPref['hrTarget']
  onChange: (value: WorkoutSessionOptionPref['hrTarget']) => void
}) {
  return (
    <select
      value={value ?? NONE}
      onChange={(e) =>
        onChange((e.target.value || null) as WorkoutSessionOptionPref['hrTarget'])
      }
      className={SELECT_CLASS}
      aria-label="HR target"
    >
      <option value={NONE}>—</option>
      {HR_TARGET_OPTIONS.map((opt) => (
        <option key={opt.id} value={opt.id}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}
