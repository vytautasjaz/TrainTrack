'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import {
  RaceOutcome,
  RaceType,
  TriathlonDistance,
  WorkoutType,
} from '@prisma/client'
import { Plus, Trash2 } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { Caption } from '@/components/ui/typography'
import {
  createManualRaceResult,
  deleteRaceResult,
} from '@/app/actions/race-results'
import {
  RACE_FORM_SPORTS,
  RUN_DISTANCE_OPTIONS,
  TRI_DISTANCE_OPTIONS,
  type RaceFormSportId,
} from '@/lib/race-form'
import {
  hasRaceResultLegSplits,
  raceResultDistanceLabel,
  raceResultOutcomeLabel,
  raceResultYear,
  type RaceResultRow,
} from '@/lib/race-results'
import { RACE_OUTCOME_LABELS, WORKOUT_TYPE_LABELS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import {
  DATA_CELL_PRIMARY,
  DATA_CELL_SECONDARY,
  DATA_EMPTY,
  DATA_NUM,
  DATA_TABLE,
  DATA_TABLE_SHELL,
  DATA_TOOLBAR,
} from '@/lib/table-styles'

type RaceResultsClientProps = {
  results: RaceResultRow[]
}

const ALL = 'all'

export function RaceResultsClient({ results }: RaceResultsClientProps) {
  const [sport, setSport] = useState<string>(ALL)
  const [distance, setDistance] = useState<string>(ALL)
  const [year, setYear] = useState<string>(ALL)
  const [outcome, setOutcome] = useState<string>(ALL)
  const [query, setQuery] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const years = useMemo(() => {
    const set = new Set(results.map((r) => raceResultYear(r.date)))
    return Array.from(set).sort((a, b) => b - a)
  }, [results])

  const distanceOptions = useMemo(() => {
    const byType = new Map<string, string>()
    for (const row of results) {
      const key =
        row.type === RaceType.TRIATHLON && row.triathlonDistance
          ? `TRI:${row.triathlonDistance}`
          : row.type
      byType.set(key, raceResultDistanceLabel(row))
    }
    return Array.from(byType.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [results])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return results.filter((row) => {
      if (sport !== ALL && row.sport !== sport) return false
      if (outcome !== ALL && row.outcome !== outcome) return false
      if (year !== ALL && String(raceResultYear(row.date)) !== year) return false
      if (distance !== ALL) {
        const key =
          row.type === RaceType.TRIATHLON && row.triathlonDistance
            ? `TRI:${row.triathlonDistance}`
            : row.type
        if (key !== distance) return false
      }
      if (q) {
        const hay = `${row.name} ${row.location ?? ''} ${row.resultNotes ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [results, sport, distance, year, outcome, query])

  function handleDelete(id: string) {
    setError(null)
    startTransition(async () => {
      try {
        await deleteRaceResult(id)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not delete result.')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap">
          <FilterSelect
            label="Sport"
            value={sport}
            onChange={setSport}
            options={[
              { value: ALL, label: 'All sports' },
              ...([
                WorkoutType.RUN,
                WorkoutType.BIKE,
                WorkoutType.SWIM,
                WorkoutType.TRIATHLON,
                WorkoutType.HYROX,
              ] as const).map((s) => ({
                value: s,
                label: WORKOUT_TYPE_LABELS[s],
              })),
            ]}
          />
          <FilterSelect
            label="Distance"
            value={distance}
            onChange={setDistance}
            options={[
              { value: ALL, label: 'All distances' },
              ...distanceOptions.map(([value, label]) => ({ value, label })),
            ]}
          />
          <FilterSelect
            label="Year"
            value={year}
            onChange={setYear}
            options={[
              { value: ALL, label: 'All years' },
              ...years.map((y) => ({ value: String(y), label: String(y) })),
            ]}
          />
          <FilterSelect
            label="Outcome"
            value={outcome}
            onChange={setOutcome}
            options={[
              { value: ALL, label: 'All outcomes' },
              { value: RaceOutcome.FINISHED, label: RACE_OUTCOME_LABELS.FINISHED },
              { value: RaceOutcome.DNF, label: RACE_OUTCOME_LABELS.DNF },
              {
                value: RaceOutcome.DID_NOT_START,
                label: RACE_OUTCOME_LABELS.DID_NOT_START,
              },
            ]}
          />
          <label className="min-w-[10rem] flex-1 space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Search
            </span>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name, place, notes…"
              className="h-9"
            />
          </label>
        </div>
        <Button type="button" size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Log past result
        </Button>
      </div>

      {error ? <FormMessage variant="error">{error}</FormMessage> : null}

      <div className={DATA_TABLE_SHELL}>
        {filtered.length === 0 ? (
          <div className={DATA_EMPTY}>
            <p className="text-sm">
              {results.length === 0
                ? 'No race results yet. Log a past race or finish a season-plan race.'
                : 'No results match these filters.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table
              className={cn(DATA_TABLE, 'min-w-[36rem] table-fixed')}
              data-density="comfortable"
            >
              <colgroup>
                <col className="w-auto" />
                <col className="w-[6.75rem]" />
                <col className="w-[5.5rem]" />
                <col className="w-[5.25rem]" />
                <col className="w-[7.5rem]" />
                <col className="w-[4.25rem]" />
                <col className="w-10" />
              </colgroup>
              <thead>
                <tr>
                  <th>Race</th>
                  <th>Date</th>
                  <th>Sport</th>
                  <th>Distance</th>
                  <th>Result</th>
                  <th>Source</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const splits = row.legSplits
                  const showSplits =
                    row.type === RaceType.TRIATHLON && hasRaceResultLegSplits(splits)
                  const hasTimes = Boolean(row.resultTime || showSplits)
                  const isFinished = row.outcome === RaceOutcome.FINISHED
                  return (
                    <tr key={row.id}>
                      <td>
                        <div className="min-w-0">
                          {row.resultsLogOnly ? (
                            <p
                              className={cn('line-clamp-2 leading-snug', DATA_CELL_PRIMARY)}
                              title={row.name}
                            >
                              {row.name}
                            </p>
                          ) : (
                            <Link
                              href={`/season/${row.id}/edit`}
                              className={cn('line-clamp-2 leading-snug hover:underline', DATA_CELL_PRIMARY)}
                              title={row.name}
                            >
                              {row.name}
                            </Link>
                          )}
                          {row.location ? (
                            <p className={cn('mt-0.5 truncate', DATA_CELL_SECONDARY)}>
                              {row.location}
                            </p>
                          ) : null}
                          {row.resultNotes ? (
                            <p className={cn('mt-0.5 line-clamp-1', DATA_CELL_SECONDARY)}>
                              {row.resultNotes}
                            </p>
                          ) : null}
                        </div>
                      </td>
                      <td className={cn(DATA_NUM, DATA_CELL_SECONDARY)}>
                        {row.date}
                      </td>
                      <td className={DATA_CELL_SECONDARY}>
                        {WORKOUT_TYPE_LABELS[row.sport]}
                      </td>
                      <td className={cn(DATA_NUM, DATA_CELL_PRIMARY)}>
                        {raceResultDistanceLabel(row)}
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <div className="min-w-0 space-y-2">
                          {!isFinished ? (
                            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                              {raceResultOutcomeLabel(row.outcome)}
                            </p>
                          ) : null}
                          {isFinished && row.resultTime && !showSplits ? (
                            <p className="text-sm font-semibold tabular-nums leading-none">
                              {row.resultTime}
                            </p>
                          ) : null}
                          {isFinished && !hasTimes ? (
                            <span className="tabular-nums text-muted-foreground">—</span>
                          ) : null}
                          {showSplits && splits ? (
                            <>
                              {isFinished ? (
                                <div>
                                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                    Total
                                  </p>
                                  <p className="mt-0.5 text-sm font-semibold tabular-nums leading-none">
                                    {row.resultTime || '—'}
                                  </p>
                                </div>
                              ) : null}
                              <ul
                                className={cn(
                                  'space-y-1.5',
                                  isFinished && 'border-t border-border/50 pt-2',
                                )}
                              >
                                {(
                                  [
                                    ['Swim', splits.swim],
                                    ['Bike', splits.bike],
                                    ['Run', splits.run],
                                  ] as const
                                ).map(([label, time]) => (
                                  <li
                                    key={label}
                                    className="flex items-baseline justify-between gap-3 text-xs leading-none"
                                  >
                                    <span className="text-muted-foreground">{label}</span>
                                    <span
                                      className={cn(
                                        'tabular-nums',
                                        time
                                          ? 'font-medium text-foreground'
                                          : 'text-muted-foreground/70',
                                      )}
                                    >
                                      {time ?? '—'}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-2 py-3 align-middle text-xs text-muted-foreground">
                        {row.resultsLogOnly ? 'Manual' : 'Season'}
                      </td>
                      <td className="px-1 py-3 align-middle">
                        {row.resultsLogOnly ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                            disabled={pending}
                            onClick={() => handleDelete(row.id)}
                            aria-label={`Delete ${row.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Caption>
        Season-plan races appear here after you log a result. Manual entries stay in Results only
        and do not clutter your season plan.
      </Caption>

      <LogPastResultDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <label className="space-y-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 min-w-[8.5rem]"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </Select>
    </label>
  )
}

function LogPastResultDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [sportId, setSportId] = useState<RaceFormSportId>('RUN')
  const [distance, setDistance] = useState('TEN_K')
  const [outcome, setOutcome] = useState<RaceOutcome>(RaceOutcome.FINISHED)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const distanceChoices =
    sportId === 'RUN'
      ? RUN_DISTANCE_OPTIONS
      : sportId === 'TRIATHLON'
        ? TRI_DISTANCE_OPTIONS.map((o) => ({ id: o.id, label: o.label }))
        : sportId === 'HYROX'
          ? [{ id: 'STANDARD', label: 'Standard' }]
          : [{ id: 'CUSTOM', label: 'Custom' }]

  const showCustomKm =
    (sportId === 'RUN' && distance === 'CUSTOM') ||
    sportId === 'BIKE' ||
    sportId === 'SWIM' ||
    sportId === 'OTHER'

  function onSportChange(next: RaceFormSportId) {
    setSportId(next)
    if (next === 'RUN') setDistance('TEN_K')
    else if (next === 'TRIATHLON') setDistance(TriathlonDistance.OLYMPIC)
    else if (next === 'HYROX') setDistance('STANDARD')
    else setDistance('CUSTOM')
  }

  function submit(formData: FormData) {
    setError(null)
    formData.set('sportId', sportId)
    formData.set('distance', distance)
    formData.set('outcome', outcome)
    startTransition(async () => {
      try {
        await createManualRaceResult(formData)
        onOpenChange(false)
        setSportId('RUN')
        setDistance('TEN_K')
        setOutcome(RaceOutcome.FINISHED)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save result.')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Log past race result</DialogTitle>
          <DialogDescription>
            Add a historical result to your race database without putting it on the season plan.
          </DialogDescription>
        </DialogHeader>

        <form action={submit} className="space-y-3">
          <FormField label="Race name">
            <Input name="name" required placeholder="Vilnius Marathon" autoComplete="off" />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Date">
              <Input name="date" type="date" required />
            </FormField>
            <FormField label="Location" hint="Optional">
              <Input name="location" placeholder="City" autoComplete="off" />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Sport">
              <Select
                value={sportId}
                onChange={(e) => onSportChange(e.target.value as RaceFormSportId)}
              >
                {RACE_FORM_SPORTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Distance">
              <Select value={distance} onChange={(e) => setDistance(e.target.value)}>
                {distanceChoices.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          {showCustomKm ? (
            <FormField label="Distance (km)" hint="Optional">
              <Input
                name="customDistanceKm"
                type="text"
                inputMode="decimal"
                placeholder="10"
              />
            </FormField>
          ) : null}

          <FormField label="Outcome">
            <Select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as RaceOutcome)}
            >
              <option value={RaceOutcome.FINISHED}>{RACE_OUTCOME_LABELS.FINISHED}</option>
              <option value={RaceOutcome.DNF}>{RACE_OUTCOME_LABELS.DNF}</option>
              <option value={RaceOutcome.DID_NOT_START}>
                {RACE_OUTCOME_LABELS.DID_NOT_START}
              </option>
            </Select>
          </FormField>

          {outcome === RaceOutcome.FINISHED || outcome === RaceOutcome.DNF ? (
            <>
              <FormField
                label={sportId === 'TRIATHLON' ? 'Total time' : 'Result time'}
                hint="e.g. 1:25:00"
              >
                <Input
                  name="resultTime"
                  placeholder="1:25:00"
                  inputMode="numeric"
                  autoComplete="off"
                />
              </FormField>
              {sportId === 'TRIATHLON' ? (
                <div className="grid grid-cols-3 gap-2">
                  <FormField label="Swim">
                    <Input
                      name="swimTime"
                      placeholder="0:25:00"
                      inputMode="numeric"
                      autoComplete="off"
                    />
                  </FormField>
                  <FormField label="Bike">
                    <Input
                      name="bikeTime"
                      placeholder="1:05:00"
                      inputMode="numeric"
                      autoComplete="off"
                    />
                  </FormField>
                  <FormField label="Run">
                    <Input
                      name="runTime"
                      placeholder="0:42:00"
                      inputMode="numeric"
                      autoComplete="off"
                    />
                  </FormField>
                </div>
              ) : null}
            </>
          ) : null}

          <FormField label="Notes" hint="Optional">
            <Textarea name="resultNotes" rows={2} placeholder="Conditions, placing…" />
          </FormField>

          {error ? <FormMessage variant="error">{error}</FormMessage> : null}

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
              {pending ? 'Saving…' : 'Save result'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
