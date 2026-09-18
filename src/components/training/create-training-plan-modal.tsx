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
import { Select } from '@/components/ui/select'
import { createTrainingPlan } from '@/app/actions/training-plans'
import { notifyTrainingPlansChanged } from '@/lib/training-plan'
import { PLANNER_SPORTS, PLANNER_SPORT_LABELS } from '@/lib/season-planner'
import { toUserMessage } from '@/lib/action-error'
import { cn } from '@/lib/utils'
import {
  TrainingPlanAudienceFields,
  type PlanAthleteOption,
} from '@/components/training/training-plan-audience-fields'

const WEEK_PRESETS = [4, 8, 12] as const

type CreateTrainingPlanModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  athletes?: PlanAthleteOption[]
}

export function CreateTrainingPlanModal({
  open,
  onOpenChange,
  athletes = [],
}: CreateTrainingPlanModalProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [weekMode, setWeekMode] = useState<'preset' | 'custom'>('preset')
  const [preset, setPreset] = useState<(typeof WEEK_PRESETS)[number]>(8)

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
          <DialogTitle>New training plan</DialogTitle>
          <DialogDescription>
            Pick a length and who the plan is for. Level defaults (or a linked
            athlete) drive approximate distance and time on the canvas.
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
            const level = String(fd.get('level') ?? '')
            const forAthleteRaw = String(fd.get('forAthleteId') ?? '')
            const customWeeks = Number(fd.get('customWeeks') ?? '')
            const weekCount =
              weekMode === 'preset' ? preset : Math.floor(customWeeks)
            startTransition(async () => {
              try {
                const plan = await createTrainingPlan({
                  title,
                  description: description || undefined,
                  sportFocus:
                    sportRaw && sportRaw !== 'none'
                      ? (sportRaw as WorkoutType)
                      : null,
                  weekCount,
                  level: level || null,
                  forAthleteId:
                    forAthleteRaw && forAthleteRaw !== 'none'
                      ? forAthleteRaw
                      : null,
                })
                notifyTrainingPlansChanged()
                onOpenChange(false)
                router.push(`/workouts/plans/${plan.id}`)
              } catch (err) {
                setError(toUserMessage(err, 'Could not create plan'))
              }
            })
          }}
        >
          <FormError message={error} />
          <FormField label="Title">
            <Input
              name="title"
              required
              placeholder="e.g. Marathon Build 12w"
              autoFocus
            />
          </FormField>
          <FormField label="Description (optional)">
            <Input name="description" placeholder="Optional notes" />
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
          <TrainingPlanAudienceFields athletes={athletes} />
          <div className="space-y-2">
            <p className="text-[12px] font-medium text-[var(--tt-ink,#111)]">
              Length
            </p>
            <div className="flex flex-wrap gap-1.5">
              {WEEK_PRESETS.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={cn(
                    'h-8 rounded-[6px] px-3 text-[12px] font-semibold transition',
                    weekMode === 'preset' && preset === n
                      ? 'bg-[var(--tt-ink,#111)] text-white'
                      : 'border border-[var(--tt-line-strong,#d4d4d4)] text-[var(--tt-ink,#111)] hover:bg-[var(--tt-sidebar,#f5f5f5)]',
                  )}
                  onClick={() => {
                    setWeekMode('preset')
                    setPreset(n)
                  }}
                >
                  {n} weeks
                </button>
              ))}
              <button
                type="button"
                className={cn(
                  'h-8 rounded-[6px] px-3 text-[12px] font-semibold transition',
                  weekMode === 'custom'
                    ? 'bg-[var(--tt-ink,#111)] text-white'
                    : 'border border-[var(--tt-line-strong,#d4d4d4)] text-[var(--tt-ink,#111)] hover:bg-[var(--tt-sidebar,#f5f5f5)]',
                )}
                onClick={() => setWeekMode('custom')}
              >
                Custom
              </button>
            </div>
            {weekMode === 'custom' ? (
              <Input
                name="customWeeks"
                type="number"
                min={1}
                max={52}
                required
                defaultValue={10}
                className="max-w-[8rem]"
              />
            ) : (
              <input type="hidden" name="customWeeks" value={preset} />
            )}
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
              {pending ? 'Creating…' : 'Create plan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
