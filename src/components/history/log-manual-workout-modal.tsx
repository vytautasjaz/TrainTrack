'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { WorkoutType } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Caption } from '@/components/ui/typography'
import { logManualWorkout } from '@/app/actions/workouts'
import {
  importStravaActivityAsWorkout,
  isStravaConnected,
  listUnmatchedStravaActivities,
} from '@/app/actions/strava'
import type { StravaImportActivityItem } from '@/lib/strava/sync'
import { WORKOUT_TYPE_LABELS } from '@/lib/constants'
import { addDateOnlyDays, parseDateOnly, todayDateKey, toDateKey } from '@/lib/dates'
import { cn, formatDistance, formatDuration } from '@/lib/utils'

const WORKOUT_TYPES = (Object.keys(WORKOUT_TYPE_LABELS) as WorkoutType[]).filter(
  (t) => t !== WorkoutType.REST && t !== WorkoutType.RECOVERY,
)

type LogSource = 'manual' | 'strava'

type LogManualWorkoutModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LogManualWorkoutModal({ open, onOpenChange }: LogManualWorkoutModalProps) {
  const router = useRouter()
  const [source, setSource] = useState<LogSource>('manual')
  const [isPending, startTransition] = useTransition()
  const [stravaConnected, setStravaConnected] = useState<boolean | null>(null)
  const [fromKey, setFromKey] = useState(() =>
    toDateKey(addDateOnlyDays(parseDateOnly(todayDateKey()), -14)),
  )
  const [toKey, setToKey] = useState(todayDateKey)
  const [items, setItems] = useState<StravaImportActivityItem[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [importingId, setImportingId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setSource('manual')
      setLoadError(null)
      setImportingId(null)
      return
    }
    let cancelled = false
    void isStravaConnected()
      .then((value) => {
        if (!cancelled) setStravaConnected(value)
      })
      .catch(() => {
        if (!cancelled) setStravaConnected(false)
      })
    return () => {
      cancelled = true
    }
  }, [open])

  useEffect(() => {
    if (!open || source !== 'strava' || stravaConnected !== true) return
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    void listUnmatchedStravaActivities(fromKey, toKey)
      .then((next) => {
        if (!cancelled) setItems(next)
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Could not load Strava activities')
          setItems([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, source, stravaConnected, fromKey, toKey])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      await logManualWorkout(formData)
      onOpenChange(false)
      router.refresh()
    })
  }

  function handleImport(activityId: string) {
    setImportingId(activityId)
    setLoadError(null)
    startTransition(async () => {
      try {
        await importStravaActivityAsWorkout(activityId)
        onOpenChange(false)
        router.refresh()
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Could not import activity')
      } finally {
        setImportingId(null)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log a workout</DialogTitle>
          <DialogDescription>
            Add a completed workout that wasn&apos;t on your plan — manually or from Strava.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-1 rounded-[8px] bg-[#f3f3f1] p-1">
          <button
            type="button"
            onClick={() => setSource('manual')}
            className={cn(
              'flex-1 rounded-[6px] px-3 py-1.5 text-sm font-medium transition',
              source === 'manual'
                ? 'bg-white text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Manual
          </button>
          <button
            type="button"
            onClick={() => setSource('strava')}
            className={cn(
              'flex-1 rounded-[6px] px-3 py-1.5 text-sm font-medium transition',
              source === 'strava'
                ? 'bg-white text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            From Strava
          </button>
        </div>

        {source === 'manual' ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <FormField label="Date">
              <Input
                name="date"
                type="date"
                required
                defaultValue={todayDateKey()}
                max={todayDateKey()}
              />
            </FormField>

            <FormField label="Sport">
              <Select name="type" required defaultValue={WorkoutType.RUN}>
                {WORKOUT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {WORKOUT_TYPE_LABELS[t]}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Title">
              <Input name="title" placeholder="e.g. Evening run" />
            </FormField>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label="Distance (km)">
                <Input
                  name="actualDistance"
                  type="number"
                  step="0.1"
                  min={0}
                  placeholder="Optional"
                />
              </FormField>
              <FormField label="Duration (min)">
                <Input name="actualDuration" type="number" min={0} placeholder="Optional" />
              </FormField>
            </div>

            <FormField label="RPE (1–10)">
              <Input
                name="rpe"
                type="number"
                min={1}
                max={10}
                placeholder="Optional"
                className="max-w-[8rem]"
              />
            </FormField>

            <FormField label="Notes">
              <Textarea name="athleteNotes" rows={3} placeholder="How did it feel?" />
            </FormField>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="secondary" size="sm" disabled={isPending}>
                {isPending ? 'Saving…' : 'Save workout'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            {stravaConnected === null ? (
              <Caption>Checking Strava connection…</Caption>
            ) : stravaConnected === false ? (
              <div className="space-y-3 rounded-[8px] border border-border/60 bg-[#fafaf8] px-3 py-4">
                <p className="text-sm text-muted-foreground">
                  Connect Strava in preferences to import activities that weren&apos;t on your
                  plan.
                </p>
                <Button asChild variant="secondary" size="sm">
                  <Link href="/settings/preferences">Open preferences</Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FormField label="From">
                    <Input
                      type="date"
                      value={fromKey}
                      max={toKey}
                      onChange={(e) => setFromKey(e.target.value)}
                    />
                  </FormField>
                  <FormField label="To">
                    <Input
                      type="date"
                      value={toKey}
                      min={fromKey}
                      max={todayDateKey()}
                      onChange={(e) => setToKey(e.target.value)}
                    />
                  </FormField>
                </div>

                {loading ? (
                  <Caption>Loading activities…</Caption>
                ) : loadError ? (
                  <p className="text-sm text-destructive">{loadError}</p>
                ) : items.length === 0 ? (
                  <Caption>No importable Strava activities in this range.</Caption>
                ) : (
                  <div className="max-h-[min(50vh,22rem)] space-y-2 overflow-y-auto">
                    {items.map((item) => {
                      const disabled =
                        item.commute || item.linked || isPending || importingId === item.id
                      const meta = [
                        item.date,
                        item.startTimeLocal,
                        WORKOUT_TYPE_LABELS[item.workoutType],
                        item.distanceKm != null ? formatDistance(item.distanceKm) : null,
                        formatDuration(item.durationMin),
                        item.commute ? 'Commute' : null,
                        item.linked ? 'Already linked' : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')

                      return (
                        <button
                          key={item.id}
                          type="button"
                          disabled={disabled}
                          onClick={() => handleImport(item.id)}
                          className={cn(
                            'flex w-full flex-col gap-0.5 rounded-[6px] border border-border/60 px-3 py-2.5 text-left transition',
                            disabled
                              ? 'cursor-not-allowed opacity-50'
                              : 'hover:border-[#FC4C02]/40 hover:bg-[#FC4C02]/5',
                          )}
                        >
                          <span className="text-sm font-semibold text-foreground">
                            {item.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {item.type}
                            {meta ? ` · ${meta}` : ''}
                            {importingId === item.id ? ' · Importing…' : ''}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
