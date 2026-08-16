'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { PersonalBestMetric, PersonalBestSport, WorkoutType } from '@prisma/client'
import { CircleHelp, Plus, Trash2, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Caption } from '@/components/ui/typography'
import { FormField, FormMessage } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { SegmentedControl, SegmentedControlItem } from '@/components/ui/segmented-control'
import { WorkoutSportIcon } from '@/components/plan/workout-sport-icon'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  addCustomPersonalBest,
  addPersonalBestFromPreset,
  deletePersonalBest,
  updatePersonalBestsFromProfile,
} from '@/app/actions/personal-bests'
import {
  comparePersonalBestsByDistance,
  formatPersonalBestDate,
  formatPersonalBestValue,
  PERSONAL_BEST_METRIC_LABELS,
  PERSONAL_BEST_PRESETS,
  PERSONAL_BEST_SPORT_LABELS,
  valuePlaceholder,
  type PersonalBestPreset,
  type PersonalBestRecord,
} from '@/lib/personal-bests'
import { PersonalBestDistanceHistoryModal } from '@/components/settings/personal-best-distance-history-modal'
import { usePreferenceForm } from '@/hooks/use-preference-form'
import type { RaceResultRow } from '@/lib/race-results'
import { cn } from '@/lib/utils'
import {
  DATA_TABLE,
  DATA_TABLE_SHELL,
} from '@/lib/table-styles'

type PersonalBestsFormProps = {
  records: PersonalBestRecord[]
  raceResults?: RaceResultRow[]
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

export function PersonalBestsForm({ records, raceResults = [] }: PersonalBestsFormProps) {
  const [pendingAdd, startAdd] = useTransition()
  const [pendingDelete, startDelete] = useTransition()
  const [listError, setListError] = useState<string | null>(null)
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

  const { formRef, error, saved, isPending, markDirty, handleSubmit } = usePreferenceForm(
    updatePersonalBestsFromProfile,
    { errorFallback: 'Could not save personal bests.' },
  )

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Caption className="m-0">
          PBs are grouped by sport. Sport is set when you add a PB and can’t be changed here.
        </Caption>
        <Button type="button" size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add PB
        </Button>
      </div>

      {records.length === 0 ? (
        <p className="rounded-[6px] border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
          No personal bests yet.
        </p>
      ) : (
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          onInput={markDirty}
          className="space-y-4"
        >
          <SegmentedControl aria-label="Personal best sport" className="flex w-full flex-wrap">
            {sportsWithRecords.map((sport) => (
              <SegmentedControlItem
                key={sport}
                active={activeSport === sport}
                onClick={() => setActiveSport(sport)}
                className="inline-flex items-center gap-1.5"
              >
                <PbSportGlyph sport={sport} />
                <span>{PERSONAL_BEST_SPORT_LABELS[sport]}</span>
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {records.filter((r) => r.sport === sport).length}
                </span>
              </SegmentedControlItem>
            ))}
          </SegmentedControl>

          <div className="flex items-center gap-2">
            <PbSportGlyph sport={activeSport} />
            <p className="text-sm font-semibold text-foreground">
              {PERSONAL_BEST_SPORT_LABELS[activeSport]}
            </p>
          </div>

          <div className={cn('overflow-x-auto', DATA_TABLE_SHELL)}>
            <table className={cn(DATA_TABLE, 'min-w-[32rem]')} data-density="compact">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Result</th>
                  <th>Date</th>
                  <th>Event</th>
                  <th>
                    <span className="sr-only">Delete</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-2 py-1.5 align-middle sm:px-3">
                      <input type="hidden" name="id" value={row.id} />
                      <input type="hidden" name={`${row.id}_metric`} value={row.metric} />
                      <input type="hidden" name={`${row.id}_sport`} value={row.sport} />
                      <input type="hidden" name={`${row.id}_name`} value={row.name} />
                      <button
                        type="button"
                        onClick={() => setHistoryTarget(row)}
                        className="min-w-[6rem] rounded-sm px-2 py-1.5 text-left text-sm font-medium text-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={`View all ${row.name} results`}
                      >
                        {row.name}
                      </button>
                    </td>
                    <td className="px-2 py-1.5 align-middle sm:px-3">
                      <div className="flex items-baseline gap-1">
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
                          className="min-w-[5rem] font-semibold tabular-nums tracking-tight placeholder:font-normal placeholder:text-muted-foreground/40"
                        />
                        {row.metric !== PersonalBestMetric.TIME ? (
                          <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            {PERSONAL_BEST_METRIC_LABELS[row.metric]}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-2 py-1.5 align-middle sm:px-3">
                      <Input
                        name={`${row.id}_date`}
                        type="text"
                        inputMode="numeric"
                        placeholder="2024"
                        defaultValue={formatPersonalBestDate(row.dateText)}
                        variant="ghost"
                        aria-label={`${row.name} date`}
                        className="min-w-[5.5rem] tabular-nums placeholder:text-muted-foreground/40"
                      />
                    </td>
                    <td className="px-2 py-1.5 align-middle sm:px-3">
                      <Input
                        name={`${row.id}_event`}
                        type="text"
                        placeholder="Event / notes"
                        defaultValue={row.event ?? ''}
                        variant="ghost"
                        aria-label={`${row.name} event`}
                        className="min-w-[7rem] placeholder:text-muted-foreground/40"
                      />
                    </td>
                    <td className="px-1 py-1.5 align-middle">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        disabled={pendingDelete}
                        onClick={() => setDeleteTarget(row)}
                        aria-label={`Delete ${row.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Caption>
            Date can be a year (2022), year-month (2022-06), or full date. Result is a finish time,
            or kg / watts / reps for gym and FTP.
          </Caption>
          {error && <FormMessage variant="error">{error}</FormMessage>}
          {saved && !error && (
            <FormMessage variant="success">Personal bests saved.</FormMessage>
          )}
          <Button type="submit" variant="secondary" size="sm" disabled={isPending}>
            {isPending ? 'Saving…' : 'Save personal bests'}
          </Button>
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
      />

      <AddPersonalBestDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        usedPresetKeys={usedPresetKeys}
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
  pending,
  onAddPreset,
  onAddCustom,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  usedPresetKeys: Set<string>
  pending: boolean
  onAddPreset: (presetKey: string) => void
  onAddCustom: (formData: FormData) => void
}) {
  const [mode, setMode] = useState<'preset' | 'custom'>('preset')
  const [sport, setSport] = useState<PersonalBestSport>(PersonalBestSport.RUN)

  const presetsBySport = useMemo(() => {
    const map = new Map<PersonalBestSport, PersonalBestPreset[]>()
    for (const preset of PERSONAL_BEST_PRESETS) {
      if (usedPresetKeys.has(preset.key)) continue
      const list = map.get(preset.sport) ?? []
      list.push(preset)
      map.set(preset.sport, list)
    }
    return map
  }, [usedPresetKeys])

  const sportsWithPresets = SPORT_ORDER.filter((s) => (presetsBySport.get(s)?.length ?? 0) > 0)
  const dialogSport =
    sportsWithPresets.includes(sport) ? sport : (sportsWithPresets[0] ?? PersonalBestSport.RUN)
  const presets = presetsBySport.get(dialogSport) ?? []

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) {
          setMode('preset')
          setSport(PersonalBestSport.RUN)
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add personal best</DialogTitle>
          <DialogDescription>
            Pick a preset for a sport, or create a custom PB. Sport is locked after you add it.
          </DialogDescription>
        </DialogHeader>

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
            {sportsWithPresets.length === 0 ? (
              <Caption>All common presets are already on your list. Use Custom instead.</Caption>
            ) : (
              <>
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
                    .map((preset) => (
                    <button
                      key={preset.key}
                      type="button"
                      disabled={pending}
                      onClick={() => onAddPreset(preset.key)}
                      className="flex w-full items-center justify-between gap-3 rounded-[4px] px-3 py-2 text-left text-sm transition hover:bg-muted/50"
                    >
                      <span className="font-medium text-foreground">{preset.name}</span>
                      {preset.hint ? (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {preset.hint}
                        </span>
                      ) : (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {PERSONAL_BEST_METRIC_LABELS[preset.metric]}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
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
      </DialogContent>
    </Dialog>
  )
}
