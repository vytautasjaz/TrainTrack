/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { PersonalBestMetric, PersonalBestSport, WorkoutType } from '@prisma/client'
import { CircleHelp, Pencil, Plus, Trash2, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FormField, FormMessage } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { WorkoutSportIcon } from '@/components/plan/workout-sport-icon'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  addCustomPersonalBest,
  addPersonalBestFromPreset,
  deletePersonalBest,
  recordPersonalBestFromPreset,
  updatePersonalBestsFromProfile,
} from '@/app/actions/personal-bests'
import {
  comparePersonalBestsByDistance,
  displayPersonalBestDate,
  formatPersonalBestDate,
  formatPersonalBestValue,
  PERSONAL_BEST_METRIC_LABELS,
  PERSONAL_BEST_PRESETS,
  PERSONAL_BEST_SPORT_LABELS,
  valuePlaceholder,
  type PersonalBestHistoryRecord,
  type PersonalBestPreset,
  type PersonalBestRecord,
} from '@/lib/personal-bests'
import { PersonalBestDistanceHistoryModal } from '@/components/settings/personal-best-distance-history-modal'
import { usePreferenceForm } from '@/hooks/use-preference-form'
import type { RaceResultRow } from '@/lib/race-results'
import { sportColors } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'
import {
  DATA_CELL_PRIMARY,
  DATA_NUM,
  DATA_TABLE,
  DATA_TABLE_SHELL,
} from '@/lib/table-styles'

type PersonalBestsFormProps = {
  records: PersonalBestRecord[]
  raceResults?: RaceResultRow[]
  history?: PersonalBestHistoryRecord[]
}

const SPORT_ORDER: PersonalBestSport[] = [
  PersonalBestSport.RUN,
  PersonalBestSport.SWIM,
  PersonalBestSport.BIKE,
  PersonalBestSport.TRIATHLON,
  PersonalBestSport.HYROX,
  PersonalBestSport.GYM,
  PersonalBestSport.OTHER,
]

function sportDotColor(sport: PersonalBestSport): string {
  switch (sport) {
    case PersonalBestSport.RUN:
      return sportColors.run
    case PersonalBestSport.BIKE:
      return sportColors.bike
    case PersonalBestSport.SWIM:
      return sportColors.swim
    case PersonalBestSport.TRIATHLON:
      return sportColors.triathlon
    case PersonalBestSport.HYROX:
      return sportColors.hyrox
    case PersonalBestSport.GYM:
      return sportColors.strength
    default:
      return 'var(--tt-ink-faint)'
  }
}

function workoutTypeForPbSport(sport: PersonalBestSport): WorkoutType | null {
  switch (sport) {
    case PersonalBestSport.RUN:
      return WorkoutType.RUN
    case PersonalBestSport.BIKE:
      return WorkoutType.BIKE
    case PersonalBestSport.SWIM:
      return WorkoutType.SWIM
    case PersonalBestSport.TRIATHLON:
      return WorkoutType.TRIATHLON
    case PersonalBestSport.HYROX:
      return WorkoutType.HYROX
    case PersonalBestSport.GYM:
      return WorkoutType.STRENGTH
    default:
      return null
  }
}

function PbSportGlyph({ sport, className }: { sport: PersonalBestSport; className?: string }) {
  const workoutType = workoutTypeForPbSport(sport)
  if (workoutType) {
    return <WorkoutSportIcon type={workoutType} size="xs" className={className} />
  }
  const Icon: LucideIcon = CircleHelp
  return (
    <span
      className={cn(
        'flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground',
        className,
      )}
    >
      <Icon className="h-3 w-3" />
    </span>
  )
}

export function PersonalBestsForm({
  records,
  raceResults = [],
  history = [],
}: PersonalBestsFormProps) {
  const [pendingAdd, startAdd] = useTransition()
  const [pendingDelete, startDelete] = useTransition()
  const [listError, setListError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<PersonalBestRecord | null>(null)
  const [historyTarget, setHistoryTarget] = useState<PersonalBestRecord | null>(null)

  const sportsWithRecords = useMemo(
    () => SPORT_ORDER.filter((sport) => records.some((r) => r.sport === sport)),
    [records],
  )

  const [activeSport, setActiveSport] = useState<PersonalBestSport>(
    () => sportsWithRecords[0] ?? PersonalBestSport.RUN,
  )

  useEffect(() => {
    if (sportsWithRecords.length === 0) return
    if (!sportsWithRecords.includes(activeSport)) {
      setActiveSport(sportsWithRecords[0]!)
    }
  }, [sportsWithRecords, activeSport])

  const visibleRows = useMemo(
    () =>
      records
        .filter((r) => r.sport === activeSport)
        .slice()
        .sort(comparePersonalBestsByDistance),
    [records, activeSport],
  )

  const usedPresetKeys = useMemo(
    () => new Set(records.map((r) => r.presetKey).filter(Boolean) as string[]),
    [records],
  )

  const { formRef, dirty, error, saved, isPending, markDirty, handleSubmit, save } =
    usePreferenceForm(updatePersonalBestsFromProfile, {
      errorFallback: 'Could not save personal bests.',
    })

  async function handleSaveAndDone(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const ok = await save()
    if (ok) setEditing(false)
  }

  function cancelEditing() {
    setEditing(false)
  }

  function confirmDelete() {
    if (!deleteTarget) return
    const id = deleteTarget.id
    setListError(null)
    startDelete(async () => {
      try {
        await deletePersonalBest(id)
        setDeleteTarget(null)
      } catch (err) {
        setListError(err instanceof Error ? err.message : 'Could not delete personal best.')
      }
    })
  }

  function afterAdd(sport: PersonalBestSport) {
    setActiveSport(sport)
    setAddOpen(false)
  }

  const tabSports =
    sportsWithRecords.length > 0
      ? sportsWithRecords
      : [PersonalBestSport.RUN, PersonalBestSport.SWIM, PersonalBestSport.BIKE]

  const actionButtons = (
    <div className="flex flex-wrap items-center gap-1.5">
      {records.length > 0 ? (
        editing ? (
          <>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 px-2.5 text-[12px] font-medium text-[var(--tt-ink-soft)]"
              disabled={isPending}
              onClick={cancelEditing}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="h-8"
              form="personal-bests-form"
              disabled={isPending || !dirty}
            >
              {isPending ? 'Saving…' : 'Save'}
            </Button>
          </>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 border-[var(--tt-line)] bg-white px-2.5 text-[12px] font-medium"
            onClick={() => setEditing(true)}
          >
            <Pencil className="mr-1 h-3.5 w-3.5" />
            Edit
          </Button>
        )
      ) : null}
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 border-[var(--tt-line)] bg-white px-2.5 text-[12px] font-medium"
        onClick={() => setAddOpen(true)}
      >
        <Plus className="mr-1 h-3.5 w-3.5" />
        Add PB
      </Button>
    </div>
  )

  return (
    <div className="space-y-[var(--tt-space-snug)]">
      <h2 className="tt-stats-section-title text-[15px] font-bold tracking-tight">
        Personal bests
      </h2>

      {records.length === 0 ? (
        <>
          <div className={cn(DATA_TABLE_SHELL, 'overflow-hidden')}>
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-medium text-[var(--tt-ink)]">No personal bests yet</p>
              <p className="mt-1 text-[12px] text-[var(--tt-ink-soft)]">
                Add a distance to start tracking times.
              </p>
            </div>
          </div>
          {actionButtons}
        </>
      ) : (
        <form
          id="personal-bests-form"
          key={editing ? 'edit' : 'view'}
          ref={formRef}
          onSubmit={editing ? handleSaveAndDone : handleSubmit}
          onInput={markDirty}
          className="space-y-[var(--tt-space-snug)]"
        >
          <div className={cn(DATA_TABLE_SHELL, 'overflow-hidden')}>
            <div
              className="flex border-b border-[var(--tt-line)]"
              role="tablist"
              aria-label="Personal bests by sport"
            >
              {tabSports.map((sport, i) => {
                const active = activeSport === sport
                const count = records.filter((r) => r.sport === sport).length
                return (
                  <button
                    key={sport}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveSport(sport)}
                    className={cn(
                      'flex min-w-0 flex-1 items-center justify-center gap-1.5 px-1.5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.05em] transition',
                      i < tabSports.length - 1 && 'border-r border-[var(--tt-line)]',
                      active
                        ? 'bg-white text-[var(--tt-ink)]'
                        : 'bg-[var(--color-surface-subtle)] text-[var(--tt-ink-faint)] hover:text-[var(--tt-ink-soft)]',
                    )}
                  >
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{
                        background: sportDotColor(sport),
                        opacity: active ? 1 : 0.5,
                      }}
                      aria-hidden
                    />
                    <span className={cn('truncate', active && 'font-bold')}>
                      {PERSONAL_BEST_SPORT_LABELS[sport]}
                    </span>
                    <span
                      className={cn(
                        'tabular-nums normal-case tracking-normal',
                        active
                          ? 'font-bold text-[var(--tt-ink-soft)]'
                          : 'font-medium text-[var(--tt-ink-faint)]',
                      )}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="max-h-[min(28rem,55vh)] overflow-y-auto bg-white">
              {visibleRows.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-[var(--tt-ink-soft)]">
                  No personal bests for this sport yet.
                </p>
              ) : (
                <table className={cn(DATA_TABLE, 'w-full')} data-density="compact">
                  <thead>
                    <tr>
                      <th>Distance</th>
                      <th className="w-[38%] text-right">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((row) => {
                      const eventLabel = row.event?.trim() || null
                      const dateLabel =
                        row.dateText?.trim()
                          ? displayPersonalBestDate(row.dateText)
                          : null
                      const metaParts = [eventLabel, dateLabel].filter(Boolean)

                      return (
                        <tr
                          key={row.id}
                          className={cn(
                            'group/row',
                            !editing &&
                              'cursor-pointer transition-colors hover:bg-[var(--color-surface-subtle)]/70',
                          )}
                          onClick={
                            editing
                              ? undefined
                              : () => setHistoryTarget(row)
                          }
                          onKeyDown={
                            editing
                              ? undefined
                              : (e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    setHistoryTarget(row)
                                  }
                                }
                          }
                          tabIndex={editing ? undefined : 0}
                          role={editing ? undefined : 'button'}
                          aria-label={
                            editing ? undefined : `View history for ${row.name}`
                          }
                        >
                          <td className="align-top">
                            <input type="hidden" name="id" value={row.id} />
                            <input type="hidden" name={`${row.id}_metric`} value={row.metric} />
                            <input type="hidden" name={`${row.id}_sport`} value={row.sport} />
                            <input type="hidden" name={`${row.id}_name`} value={row.name} />
                            <div className="flex items-start gap-1 pr-1">
                              <div className="min-w-0 flex-1">
                                <p className={cn(DATA_CELL_PRIMARY, 'truncate')}>{row.name}</p>
                                {editing ? (
                                  <div className="mt-0.5 flex min-w-0 flex-col gap-0.5">
                                    <Input
                                      name={`${row.id}_event`}
                                      type="text"
                                      placeholder="Event"
                                      defaultValue={row.event ?? ''}
                                      variant="ghost"
                                      aria-label={`${row.name} event`}
                                      className={cn(
                                        'h-auto min-h-0 w-full px-0 py-0 text-[11px] leading-snug',
                                        'text-[var(--tt-ink-soft)] placeholder:text-[var(--tt-ink-faint)]',
                                      )}
                                    />
                                    <Input
                                      name={`${row.id}_date`}
                                      type="text"
                                      inputMode="numeric"
                                      placeholder="Date (2024 or 2024-04-13)"
                                      defaultValue={formatPersonalBestDate(row.dateText)}
                                      variant="ghost"
                                      aria-label={`${row.name} date`}
                                      className={cn(
                                        DATA_NUM,
                                        'h-auto min-h-0 w-full px-0 py-0 text-[11px] leading-snug',
                                        'text-[var(--tt-ink-soft)] placeholder:text-[var(--tt-ink-faint)]',
                                      )}
                                    />
                                  </div>
                                ) : metaParts.length > 0 ? (
                                  <p className="mt-0.5 truncate text-[11px] leading-snug text-[var(--tt-ink-soft)]">
                                    {metaParts.join(' · ')}
                                  </p>
                                ) : (
                                  <p className="mt-0.5 text-[11px] leading-snug text-[var(--tt-ink-faint)]">
                                    —
                                  </p>
                                )}
                              </div>
                              {editing ? (
                                <button
                                  type="button"
                                  className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-[4px] text-[var(--tt-ink-faint)] transition hover:bg-[var(--color-surface-subtle)] hover:text-destructive"
                                  disabled={pendingDelete}
                                  onClick={() => setDeleteTarget(row)}
                                  aria-label={`Delete ${row.name}`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              ) : null}
                            </div>
                          </td>
                          <td className="align-top text-right">
                            {editing ? (
                              <div className="inline-flex max-w-full items-baseline justify-end gap-0.5">
                                <Input
                                  name={`${row.id}_value`}
                                  type="text"
                                  inputMode="decimal"
                                  placeholder={valuePlaceholder(row.metric)}
                                  defaultValue={
                                    row.value > 0
                                      ? formatPersonalBestValue(row.value, row.metric)
                                      : ''
                                  }
                                  variant="ghost"
                                  aria-label={`${row.name} result`}
                                  className={cn(
                                    DATA_CELL_PRIMARY,
                                    DATA_NUM,
                                    'h-auto min-h-0 w-[5.5rem] px-0 py-0 text-right font-semibold',
                                    'placeholder:font-normal placeholder:text-[var(--tt-ink-faint)]',
                                  )}
                                />
                                {row.metric !== PersonalBestMetric.TIME ? (
                                  <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-[var(--tt-ink-faint)]">
                                    {PERSONAL_BEST_METRIC_LABELS[row.metric]}
                                  </span>
                                ) : null}
                              </div>
                            ) : (
                              <div className="inline-flex items-baseline justify-end gap-0.5">
                                <span
                                  className={cn(
                                    DATA_CELL_PRIMARY,
                                    DATA_NUM,
                                    'font-semibold',
                                  )}
                                >
                                  {row.value > 0
                                    ? formatPersonalBestValue(row.value, row.metric)
                                    : '—'}
                                </span>
                                {row.metric !== PersonalBestMetric.TIME && row.value > 0 ? (
                                  <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-[var(--tt-ink-faint)]">
                                    {PERSONAL_BEST_METRIC_LABELS[row.metric]}
                                  </span>
                                ) : null}
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {error ? <FormMessage variant="error">{error}</FormMessage> : null}
          {saved && !error && !editing ? (
            <FormMessage variant="success">Saved.</FormMessage>
          ) : null}

          {actionButtons}
        </form>
      )}

      {listError ? <FormMessage variant="error">{listError}</FormMessage> : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title="Delete personal best?"
        description={
          deleteTarget
            ? `Are you sure you want to delete “${deleteTarget.name}”? This can’t be undone.`
            : undefined
        }
        confirmLabel="Delete"
        pending={pendingDelete}
        onConfirm={confirmDelete}
      />

      <PersonalBestDistanceHistoryModal
        open={Boolean(historyTarget)}
        onOpenChange={(open) => {
          if (!open) setHistoryTarget(null)
        }}
        personalBest={historyTarget}
        results={raceResults}
        history={history}
      />

      <AddPersonalBestDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        usedPresetKeys={usedPresetKeys}
        records={records}
        pending={pendingAdd}
        onAddPreset={(presetKey) => {
          const preset = PERSONAL_BEST_PRESETS.find((p) => p.key === presetKey)
          setListError(null)
          startAdd(async () => {
            try {
              await addPersonalBestFromPreset(presetKey)
              afterAdd(preset?.sport ?? PersonalBestSport.RUN)
            } catch (err) {
              setListError(
                err instanceof Error ? err.message : 'Could not add personal best.',
              )
            }
          })
        }}
        onRecordPreset={(formData) => {
          const presetKey = String(formData.get('presetKey') ?? '')
          const preset = PERSONAL_BEST_PRESETS.find((p) => p.key === presetKey)
          setListError(null)
          startAdd(async () => {
            try {
              await recordPersonalBestFromPreset(formData)
              afterAdd(preset?.sport ?? PersonalBestSport.RUN)
            } catch (err) {
              setListError(
                err instanceof Error ? err.message : 'Could not save personal best.',
              )
            }
          })
        }}
        onAddCustom={(formData) => {
          const sportRaw = String(formData.get('sport') ?? PersonalBestSport.RUN)
          const sport = (SPORT_ORDER as string[]).includes(sportRaw)
            ? (sportRaw as PersonalBestSport)
            : PersonalBestSport.RUN
          setListError(null)
          startAdd(async () => {
            try {
              await addCustomPersonalBest(formData)
              afterAdd(sport)
            } catch (err) {
              setListError(
                err instanceof Error ? err.message : 'Could not add personal best.',
              )
            }
          })
        }}
      />
    </div>
  )
}

function AddPersonalBestDialog({
  open,
  onOpenChange,
  usedPresetKeys,
  records,
  pending,
  onAddPreset,
  onRecordPreset,
  onAddCustom,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  usedPresetKeys: Set<string>
  records: PersonalBestRecord[]
  pending: boolean
  onAddPreset: (presetKey: string) => void
  onRecordPreset: (formData: FormData) => void
  onAddCustom: (formData: FormData) => void
}) {
  const [mode, setMode] = useState<'preset' | 'custom'>('preset')
  const [sport, setSport] = useState<PersonalBestSport>(PersonalBestSport.RUN)
  const [updatePreset, setUpdatePreset] = useState<PersonalBestPreset | null>(null)

  const presetsBySport = useMemo(() => {
    const map = new Map<PersonalBestSport, PersonalBestPreset[]>()
    for (const preset of PERSONAL_BEST_PRESETS) {
      const list = map.get(preset.sport) ?? []
      list.push(preset)
      map.set(preset.sport, list)
    }
    return map
  }, [])

  const sportsWithPresets = SPORT_ORDER.filter((s) => (presetsBySport.get(s)?.length ?? 0) > 0)
  const dialogSport =
    sportsWithPresets.includes(sport) ? sport : (sportsWithPresets[0] ?? PersonalBestSport.RUN)
  const presets = presetsBySport.get(dialogSport) ?? []

  const existingForUpdate = updatePreset
    ? records.find((r) => r.presetKey === updatePreset.key) ?? null
    : null

  function resetDialog() {
    setMode('preset')
    setSport(PersonalBestSport.RUN)
    setUpdatePreset(null)
  }

  function handlePresetClick(preset: PersonalBestPreset) {
    if (usedPresetKeys.has(preset.key)) {
      setUpdatePreset(preset)
      return
    }
    onAddPreset(preset.key)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) resetDialog()
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {updatePreset ? `Update ${updatePreset.name}` : 'Add personal best'}
          </DialogTitle>
          <DialogDescription>
            {updatePreset
              ? existingForUpdate && existingForUpdate.value > 0
                ? `Current PB is ${formatPersonalBestValue(existingForUpdate.value, existingForUpdate.metric)}. Saving a new result overwrites it and keeps the old one in history.`
                : 'Enter a result. This becomes your current personal best.'
              : 'Pick a preset for a sport, or create a custom PB. You can re-add a preset later to update the time.'}
          </DialogDescription>
        </DialogHeader>

        {updatePreset ? (
          <form action={onRecordPreset} className="space-y-3">
            <input type="hidden" name="presetKey" value={updatePreset.key} />
            <FormField label="Result">
              <Input
                name="value"
                type="text"
                inputMode="decimal"
                placeholder={valuePlaceholder(updatePreset.metric)}
                required
                autoFocus
              />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Date">
                <Input
                  name="date"
                  type="text"
                  inputMode="numeric"
                  placeholder="2024"
                  defaultValue={formatPersonalBestDate(existingForUpdate?.dateText)}
                />
              </FormField>
              <FormField label="Event">
                <Input name="event" type="text" placeholder="Event / notes" />
              </FormField>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => setUpdatePreset(null)}
              >
                Back
              </Button>
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? 'Saving…' : 'Save new PB'}
              </Button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex gap-1 rounded-[6px] border border-border/60 p-1">
              <button
                type="button"
                onClick={() => setMode('preset')}
                className={cn(
                  'flex-1 rounded-[4px] px-3 py-1.5 text-sm font-medium transition',
                  mode === 'preset'
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Preset
              </button>
              <button
                type="button"
                onClick={() => setMode('custom')}
                className={cn(
                  'flex-1 rounded-[4px] px-3 py-1.5 text-sm font-medium transition',
                  mode === 'custom'
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Custom
              </button>
            </div>

            {mode === 'preset' ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {sportsWithPresets.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSport(s)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-[6px] border px-2.5 py-1 text-xs font-medium transition',
                        dialogSport === s
                          ? 'border-foreground bg-foreground text-background'
                          : 'border-border/70 text-muted-foreground hover:border-foreground/30 hover:text-foreground',
                      )}
                    >
                      <PbSportGlyph sport={s} />
                      {PERSONAL_BEST_SPORT_LABELS[s]}
                    </button>
                  ))}
                </div>

                <div className="max-h-56 space-y-1 overflow-y-auto rounded-[6px] border border-border/60 p-1">
                  {[...presets]
                    .sort((a, b) => (a.km ?? 9999) - (b.km ?? 9999) || a.name.localeCompare(b.name))
                    .map((preset) => {
                      const alreadyAdded = usedPresetKeys.has(preset.key)
                      return (
                        <button
                          key={preset.key}
                          type="button"
                          disabled={pending}
                          onClick={() => handlePresetClick(preset)}
                          className="flex w-full items-center justify-between gap-3 rounded-[4px] px-3 py-2 text-left text-sm transition hover:bg-muted/50"
                        >
                          <span className="font-medium text-foreground">{preset.name}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {alreadyAdded
                              ? 'Update'
                              : preset.hint ?? PERSONAL_BEST_METRIC_LABELS[preset.metric]}
                          </span>
                        </button>
                      )
                    })}
                </div>
              </div>
            ) : (
              <form action={onAddCustom} className="space-y-3">
                <FormField label="Name">
                  <Input name="name" placeholder="e.g. Fran, 5 km TT" required />
                </FormField>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Sport">
                    <Select name="sport" defaultValue={PersonalBestSport.RUN} required>
                      {(Object.keys(PERSONAL_BEST_SPORT_LABELS) as PersonalBestSport[]).map(
                        (s) => (
                          <option key={s} value={s}>
                            {PERSONAL_BEST_SPORT_LABELS[s]}
                          </option>
                        ),
                      )}
                    </Select>
                  </FormField>
                  <FormField label="Metric">
                    <Select name="metric" defaultValue={PersonalBestMetric.TIME} required>
                      {(Object.keys(PERSONAL_BEST_METRIC_LABELS) as PersonalBestMetric[]).map(
                        (metric) => (
                          <option key={metric} value={metric}>
                            {PERSONAL_BEST_METRIC_LABELS[metric]}
                          </option>
                        ),
                      )}
                    </Select>
                  </FormField>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => onOpenChange(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={pending}>
                    {pending ? 'Adding…' : 'Add custom'}
                  </Button>
                </div>
              </form>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
