'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { WorkoutType } from '@prisma/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FormError } from '@/components/ui/form-error'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { DateField } from '@/components/ui/date-field'
import { Select } from '@/components/ui/select'
import { saveTrainingPlanFromRange } from '@/app/actions/training-plans'
import { PLANNER_SPORTS, PLANNER_SPORT_LABELS } from '@/lib/season-planner'
import { startOfWeekDateOnly, parseDateOnly, toDateKey } from '@/lib/dates'

type SaveTrainingPlanModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultStartWeekKey?: string
  defaultEndWeekKey?: string
  athleteId?: string
}

export function SaveTrainingPlanModal({
  open,
  onOpenChange,
  defaultStartWeekKey,
  defaultEndWeekKey,
  athleteId,
}: SaveTrainingPlanModalProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [includeWorkouts, setIncludeWorkouts] = useState(true)
  const [includePhases, setIncludePhases] = useState(true)

  const startDefault = defaultStartWeekKey
    ? toDateKey(startOfWeekDateOnly(parseDateOnly(defaultStartWeekKey)))
    : undefined
  const endDefault = defaultEndWeekKey
    ? toDateKey(startOfWeekDateOnly(parseDateOnly(defaultEndWeekKey)))
    : startDefault

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setError(null)
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Save as training plan</DialogTitle>
          <DialogDescription>
            Snapshot weeks into the plan library. Applied later as independent
            calendar copies — not live-linked.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            setError(null)
            const fd = new FormData(e.currentTarget)
            const title = String(fd.get('title') ?? '')
            const description = String(fd.get('description') ?? '')
            const sportRaw = String(fd.get('sportFocus') ?? '')
            const startWeekKey = String(fd.get('startWeekKey') ?? '')
            const endWeekKey = String(fd.get('endWeekKey') ?? '')
            startTransition(async () => {
              try {
                await saveTrainingPlanFromRange({
                  title,
                  description: description || undefined,
                  sportFocus:
                    sportRaw && sportRaw !== 'none'
                      ? (sportRaw as WorkoutType)
                      : null,
                  startWeekKey,
                  endWeekKey,
                  includeWorkouts,
                  includePhases,
                  athleteId,
                })
                const { notifyTrainingPlansChanged } = await import(
                  '@/lib/training-plan'
                )
                notifyTrainingPlansChanged()
                onOpenChange(false)
                router.refresh()
              } catch (err) {
                setError(
                  err instanceof Error ? err.message : 'Could not save plan',
                )
              }
            })
          }}
        >
          <FormError message={error} />
          <FormField label="Title">
            <Input name="title" required placeholder="e.g. 10K Build" />
          </FormField>
          <FormField label="Description (optional)">
            <Input name="description" placeholder="Short notes for the library" />
          </FormField>
          <FormField label="Sport focus (optional)">
            <Select name="sportFocus" defaultValue="none">
              <option value="none">Any / mixed</option>
              {PLANNER_SPORTS.map((s) => (
                <option key={s} value={s}>
                  {PLANNER_SPORT_LABELS[s]}
                </option>
              ))}
            </Select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Start week (Mon)">
              <DateField
                key={`save-start-${startDefault ?? ''}`}
                name="startWeekKey"
                required
                defaultValue={startDefault}
              />
            </FormField>
            <FormField label="End week (Mon)">
              <DateField
                key={`save-end-${endDefault ?? ''}`}
                name="endWeekKey"
                required
                defaultValue={endDefault}
              />
            </FormField>
          </div>
          <div className="space-y-2 rounded-[8px] border border-[var(--tt-line)] px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Contents
            </p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeWorkouts}
                onChange={(e) => setIncludeWorkouts(e.target.checked)}
              />
              Workouts
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includePhases}
                onChange={(e) => setIncludePhases(e.target.checked)}
              />
              Phase structure (relative weeks)
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? 'Saving…' : 'Save plan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
