'use client'

import { useMemo, useState, useTransition } from 'react'
import { updateCoachWorkoutBuilderPrefs } from '@/app/actions/preferences'
import {
  DEFAULT_INTENSITY_ZONES,
  formatZonePctRange,
  resolveIntensityZones,
  sanitizeIntensityZoneBounds,
  type IntensityZoneBounds,
  type IntensityZoneId,
} from '@/lib/intensity-zones'
import type { WorkoutBuilderPrefs } from '@/lib/workout-builder/workout-builder-prefs'
import { Button } from '@/components/ui/button'
import { FormMessage } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { DATA_TABLE, DATA_TABLE_SHELL } from '@/lib/table-styles'
import { cn } from '@/lib/utils'

type RowState = {
  id: IntensityZoneId
  minPct: string
  maxPct: string
}

function rowsFromPrefs(bounds?: IntensityZoneBounds | null): RowState[] {
  return resolveIntensityZones(bounds).map((z) => ({
    id: z.id,
    minPct: z.minPct == null ? '' : String(z.minPct),
    maxPct: z.maxPct == null ? '' : String(z.maxPct),
  }))
}

function boundsFromRows(rows: RowState[]): IntensityZoneBounds {
  const out: IntensityZoneBounds = {}
  for (const row of rows) {
    const minRaw = row.minPct.trim()
    const maxRaw = row.maxPct.trim()
    out[row.id] = {
      minPct: minRaw === '' ? null : Number(minRaw),
      maxPct: maxRaw === '' ? null : Number(maxRaw),
    }
  }
  return out
}

type CoachIntensityZonesFormProps = {
  initialPrefs: WorkoutBuilderPrefs
}

export function CoachIntensityZonesForm({
  initialPrefs,
}: CoachIntensityZonesFormProps) {
  const [rows, setRows] = useState(() =>
    rowsFromPrefs(initialPrefs.intensityZones),
  )
  const [message, setMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)
  const [pending, startTransition] = useTransition()

  const preview = useMemo(
    () => resolveIntensityZones(boundsFromRows(rows)),
    [rows],
  )

  function updateRow(
    id: IntensityZoneId,
    field: 'minPct' | 'maxPct',
    value: string,
  ) {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    )
  }

  function resetDefaults() {
    setRows(rowsFromPrefs(undefined))
    setMessage(null)
  }

  function save() {
    setMessage(null)
    startTransition(async () => {
      try {
        const intensityZones = sanitizeIntensityZoneBounds(
          boundsFromRows(rows),
        )
        await updateCoachWorkoutBuilderPrefs({
          ...initialPrefs,
          intensityZones,
        })
        setRows(rowsFromPrefs(intensityZones))
        setMessage({ type: 'success', text: 'Intensity zones saved.' })
      } catch (err) {
        setMessage({
          type: 'error',
          text:
            err instanceof Error ? err.message : 'Could not save intensity zones.',
        })
      }
    })
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        % FTP bands used when classifying bike intensity and when prescribing by
        Zones (Z1–Z6). Leave a bound blank for open-ended (&lt; or &gt;).
      </p>
      <div className={cn(DATA_TABLE_SHELL, 'overflow-x-auto')}>
        <table className={DATA_TABLE}>
          <thead>
            <tr>
              <th className="w-14">Zone</th>
              <th>Name</th>
              <th className="w-24 text-right">Min %</th>
              <th className="w-24 text-right">Max %</th>
              <th className="w-28 text-right">Range</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const def = DEFAULT_INTENSITY_ZONES[index]!
              const previewZone = preview[index]!
              return (
                <tr key={row.id}>
                  <td className="font-medium tabular-nums">{def.shortLabel}</td>
                  <td>
                    <div className="text-sm font-medium text-foreground">
                      {def.label}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {def.description}
                    </div>
                  </td>
                  <td className="text-right">
                    <Input
                      value={row.minPct}
                      onChange={(e) =>
                        updateRow(row.id, 'minPct', e.target.value)
                      }
                      inputMode="numeric"
                      placeholder="—"
                      className="ml-auto h-8 w-16 text-right text-sm tabular-nums"
                      aria-label={`${def.shortLabel} min % FTP`}
                    />
                  </td>
                  <td className="text-right">
                    <Input
                      value={row.maxPct}
                      onChange={(e) =>
                        updateRow(row.id, 'maxPct', e.target.value)
                      }
                      inputMode="numeric"
                      placeholder="—"
                      className="ml-auto h-8 w-16 text-right text-sm tabular-nums"
                      aria-label={`${def.shortLabel} max % FTP`}
                    />
                  </td>
                  <td className="text-right text-xs tabular-nums text-muted-foreground">
                    {formatZonePctRange(previewZone)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" onClick={save} disabled={pending}>
          {pending ? 'Saving…' : 'Save zones'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={resetDefaults}
          disabled={pending}
        >
          Reset defaults
        </Button>
        {message ? (
          <FormMessage
            variant={message.type === 'error' ? 'error' : 'success'}
          >
            {message.text}
          </FormMessage>
        ) : null}
      </div>
    </div>
  )
}
